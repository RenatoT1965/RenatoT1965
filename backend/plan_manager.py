from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime, timezone, timedelta
import uuid

class UserPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    plan_type: Literal["free_trial", "basic", "premium"] = "free_trial"
    plan_status: Literal["active", "expired", "cancelled"] = "active"
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    monthly_price: float = 0.0
    
    # Usage limits per plan
    limits: dict = Field(default_factory=dict)
    
    # Current usage (reset monthly)
    current_usage: dict = Field(default_factory=lambda: {
        "transactions": 0,
        "cards": 0,
        "ai_messages": 0,
        "last_reset": datetime.now(timezone.utc).isoformat()
    })

PLAN_LIMITS = {
    "free_trial": {
        "transactions_per_month": -1,  # Unlimited
        "max_cards": -1,  # Unlimited
        "ai_messages_per_month": -1,  # Unlimited
        "can_import": True,
        "can_predict": True,
        "trial_days": 14,
        "price": 0.0
    },
    "basic": {
        "transactions_per_month": 20,
        "max_cards": 2,
        "ai_messages_per_month": 10,
        "can_import": False,
        "can_predict": False,
        "price": 15.00
    },
    "premium": {
        "transactions_per_month": -1,  # Unlimited
        "max_cards": -1,  # Unlimited
        "ai_messages_per_month": -1,  # Unlimited
        "can_import": True,
        "can_predict": True,
        "price": 35.90
    }
}

class PlanManager:
    def __init__(self, db):
        self.db = db
    
    async def get_user_plan(self, user_id: str = "default_user") -> UserPlan:
        """Get user's current plan"""
        plan_doc = await self.db.user_plans.find_one({"user_id": user_id})
        
        if not plan_doc:
            # Create free trial for new user
            plan = UserPlan(
                user_id=user_id,
                plan_type="free_trial",
                limits=PLAN_LIMITS["free_trial"],
                expires_at=datetime.now(timezone.utc) + timedelta(days=14)
            )
            doc = plan.model_dump()
            doc['started_at'] = doc['started_at'].isoformat()
            doc['expires_at'] = doc['expires_at'].isoformat()
            doc['current_usage']['last_reset'] = doc['current_usage']['last_reset']
            await self.db.user_plans.insert_one(doc)
            return plan
        
        # Parse dates
        if isinstance(plan_doc['started_at'], str):
            plan_doc['started_at'] = datetime.fromisoformat(plan_doc['started_at'])
        if plan_doc.get('expires_at') and isinstance(plan_doc['expires_at'], str):
            plan_doc['expires_at'] = datetime.fromisoformat(plan_doc['expires_at'])
        if isinstance(plan_doc['current_usage']['last_reset'], str):
            plan_doc['current_usage']['last_reset'] = datetime.fromisoformat(plan_doc['current_usage']['last_reset'])
        
        plan = UserPlan(**plan_doc)
        
        # Check if trial expired
        if plan.plan_type == "free_trial" and plan.expires_at:
            if datetime.now(timezone.utc) > plan.expires_at:
                # Auto-downgrade to basic
                plan.plan_type = "basic"
                plan.plan_status = "active"
                plan.limits = PLAN_LIMITS["basic"]
                await self.update_plan(user_id, plan)
        
        return plan
    
    async def update_plan(self, user_id: str, plan: UserPlan):
        """Update user plan"""
        doc = plan.model_dump()
        doc['started_at'] = doc['started_at'].isoformat()
        if doc.get('expires_at'):
            doc['expires_at'] = doc['expires_at'].isoformat()
        doc['current_usage']['last_reset'] = doc['current_usage']['last_reset'].isoformat()
        
        await self.db.user_plans.replace_one(
            {"user_id": user_id},
            doc,
            upsert=True
        )
    
    async def check_limit(self, user_id: str, resource: str) -> dict:
        """Check if user can perform action"""
        plan = await self.get_user_plan(user_id)
        
        # Reset monthly usage if needed
        last_reset = plan.current_usage['last_reset']
        if isinstance(last_reset, str):
            last_reset = datetime.fromisoformat(last_reset)
        
        days_since_reset = (datetime.now(timezone.utc) - last_reset).days
        if days_since_reset >= 30:
            plan.current_usage['transactions'] = 0
            plan.current_usage['ai_messages'] = 0
            plan.current_usage['last_reset'] = datetime.now(timezone.utc).isoformat()
            await self.update_plan(user_id, plan)
        
        limits = plan.limits or PLAN_LIMITS.get(plan.plan_type, {})
        
        if resource == "transaction":
            limit = limits.get("transactions_per_month", 0)
            current = plan.current_usage['transactions']
            
            if limit == -1:  # Unlimited
                return {"allowed": True, "limit": "Ilimitado", "current": current}
            
            if current >= limit:
                return {
                    "allowed": False,
                    "limit": limit,
                    "current": current,
                    "message": f"Limite de {limit} transações/mês atingido. Faça upgrade!"
                }
            
            return {"allowed": True, "limit": limit, "current": current}
        
        elif resource == "card":
            limit = limits.get("max_cards", 0)
            current = plan.current_usage['cards']
            
            if limit == -1:
                return {"allowed": True, "limit": "Ilimitado", "current": current}
            
            if current >= limit:
                return {
                    "allowed": False,
                    "limit": limit,
                    "current": current,
                    "message": f"Limite de {limit} cartões atingido. Faça upgrade!"
                }
            
            return {"allowed": True, "limit": limit, "current": current}
        
        elif resource == "ai_message":
            limit = limits.get("ai_messages_per_month", 0)
            current = plan.current_usage['ai_messages']
            
            if limit == -1:
                return {"allowed": True, "limit": "Ilimitado", "current": current}
            
            if current >= limit:
                return {
                    "allowed": False,
                    "limit": limit,
                    "current": current,
                    "message": f"Limite de {limit} mensagens IA/mês atingido. Faça upgrade!"
                }
            
            return {"allowed": True, "limit": limit, "current": current}
        
        elif resource == "import":
            can_import = limits.get("can_import", False)
            if not can_import:
                return {
                    "allowed": False,
                    "message": "Importação disponível apenas nos planos Premium. Faça upgrade!"
                }
            return {"allowed": True}
        
        elif resource == "predict":
            can_predict = limits.get("can_predict", False)
            if not can_predict:
                return {
                    "allowed": False,
                    "message": "Previsões disponíveis apenas nos planos Premium. Faça upgrade!"
                }
            return {"allowed": True}
        
        return {"allowed": True}
    
    async def increment_usage(self, user_id: str, resource: str):
        """Increment usage counter"""
        plan = await self.get_user_plan(user_id)
        
        if resource == "transaction":
            plan.current_usage['transactions'] += 1
        elif resource == "card":
            plan.current_usage['cards'] += 1
        elif resource == "ai_message":
            plan.current_usage['ai_messages'] += 1
        
        await self.update_plan(user_id, plan)
    
    async def upgrade_plan(self, user_id: str, new_plan_type: Literal["basic", "premium"]):
        """Upgrade user to paid plan"""
        plan = await self.get_user_plan(user_id)
        plan.plan_type = new_plan_type
        plan.plan_status = "active"
        plan.limits = PLAN_LIMITS[new_plan_type]
        plan.monthly_price = PLAN_LIMITS[new_plan_type]["price"]
        plan.expires_at = None  # No expiration for paid plans
        
        await self.update_plan(user_id, plan)
        return plan
