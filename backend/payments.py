"""
Payment processing module for FinanceFlow
Handles Stripe checkout integration for subscription plans
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid
import os
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

# Fixed plan packages - amounts defined server-side only
PLAN_PACKAGES = {
    "basic": {
        "name": "Plano Básico",
        "price": 15.00,
        "currency": "brl"
    },
    "premium": {
        "name": "Plano Premium", 
        "price": 35.90,
        "currency": "brl"
    }
}

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str
    plan_id: str
    amount: float
    currency: str
    payment_status: str = "pending"  # pending, paid, failed, expired
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict = Field(default_factory=dict)

class PaymentManager:
    def __init__(self, db):
        self.db = db
        self.api_key = os.environ.get('STRIPE_API_KEY', '')
    
    async def create_checkout_session(
        self, 
        user_id: str,
        plan_id: str,
        origin_url: str
    ) -> dict:
        """Create Stripe checkout session for plan upgrade"""
        
        # Validate plan exists
        if plan_id not in PLAN_PACKAGES:
            raise ValueError(f"Plano inválido: {plan_id}")
        
        plan = PLAN_PACKAGES[plan_id]
        
        # Build URLs from frontend origin
        success_url = f"{origin_url}/pricing?session_id={{CHECKOUT_SESSION_ID}}&success=true"
        cancel_url = f"{origin_url}/pricing?cancelled=true"
        
        # Initialize Stripe checkout
        webhook_url = f"{origin_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=self.api_key, webhook_url=webhook_url)
        
        # Create checkout request
        checkout_request = CheckoutSessionRequest(
            amount=plan["price"],
            currency=plan["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "plan_id": plan_id,
                "plan_name": plan["name"]
            }
        )
        
        # Create session with Stripe
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            session_id=session.session_id,
            user_id=user_id,
            plan_id=plan_id,
            amount=plan["price"],
            currency=plan["currency"],
            payment_status="pending",
            metadata={
                "plan_name": plan["name"],
                "checkout_url": session.url
            }
        )
        
        # Save to database
        doc = transaction.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await self.db.payment_transactions.insert_one(doc)
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id
        }
    
    async def get_checkout_status(self, session_id: str, origin_url: str) -> dict:
        """Get status of checkout session"""
        
        # Check if already processed
        existing = await self.db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        if existing and existing.get('payment_status') == 'paid':
            return {
                "status": "complete",
                "payment_status": "paid",
                "already_processed": True,
                "plan_id": existing.get('plan_id')
            }
        
        # Initialize Stripe checkout
        webhook_url = f"{origin_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=self.api_key, webhook_url=webhook_url)
        
        # Get status from Stripe
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update database
        new_status = "pending"
        if status.payment_status == "paid":
            new_status = "paid"
        elif status.status == "expired":
            new_status = "expired"
        
        await self.db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "payment_status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata,
            "plan_id": status.metadata.get('plan_id') if status.metadata else None
        }
    
    async def handle_successful_payment(self, session_id: str, user_id: str, plan_id: str):
        """Process successful payment - upgrade user plan"""
        # This is called after verifying payment is complete
        # Update user's plan in the database
        await self.db.users.update_one(
            {"id": user_id},
            {"$set": {"plan_type": plan_id}}
        )
        
        # Update plan manager's user_plans collection
        await self.db.user_plans.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "plan_type": plan_id,
                    "plan_status": "active",
                    "expires_at": None  # Paid plans don't expire
                }
            }
        )
    
    async def get_payment_history(self, user_id: str) -> list:
        """Get user's payment history"""
        transactions = await self.db.payment_transactions.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return transactions
