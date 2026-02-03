from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import io
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Existing Models
class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["expense", "income"]
    amount: float
    date: datetime
    description: str
    category_id: Optional[str] = None
    payment_method: Literal["cash", "credit_card", "debit_card", "pix", "bank_transfer", "other"]
    card_id: Optional[str] = None
    installments: Optional[int] = 1
    current_installment: Optional[int] = 1
    tags: Optional[List[str]] = []
    notes: Optional[str] = None

class TransactionCreate(BaseModel):
    type: Literal["expense", "income"]
    amount: float
    date: datetime
    description: str
    category_id: Optional[str] = None
    payment_method: Literal["cash", "credit_card", "debit_card", "pix", "bank_transfer", "other"]
    card_id: Optional[str] = None
    installments: Optional[int] = 1
    current_installment: Optional[int] = 1
    tags: Optional[List[str]] = []
    notes: Optional[str] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    color: Optional[str] = None

class Budget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    period: Literal["weekly", "monthly", "custom_range"]
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit_amount: float
    scope: Literal["total_expenses", "by_category"]
    category_id: Optional[str] = None
    alerts_enabled: bool = True
    alert_sound_enabled: bool = True
    alert_threshold: float = 0.8
    last_alerted_at: Optional[datetime] = None

class BudgetCreate(BaseModel):
    name: str
    period: Literal["weekly", "monthly", "custom_range"]
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit_amount: float
    scope: Literal["total_expenses", "by_category"]
    category_id: Optional[str] = None
    alerts_enabled: bool = True
    alert_sound_enabled: bool = True
    alert_threshold: float = 0.8

# New Models for Credit Cards
class CreditCard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    brand: Literal["visa", "mastercard", "elo", "amex", "hipercard", "other"]
    last_four_digits: str
    credit_limit: float
    closing_day: int
    due_day: int
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreditCardCreate(BaseModel):
    name: str
    brand: Literal["visa", "mastercard", "elo", "amex", "hipercard", "other"]
    last_four_digits: str
    credit_limit: float
    closing_day: int
    due_day: int
    active: bool = True

# Invoice Model
class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    card_id: str
    month_ref: str
    total_amount: float
    paid_amount: float = 0.0
    status: Literal["open", "closed", "paid", "overdue"]
    closing_date: datetime
    due_date: datetime
    transactions: List[str] = []

# Recurring Transaction
class RecurringTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    amount: float
    category_id: Optional[str] = None
    payment_method: str
    frequency: Literal["daily", "weekly", "monthly", "yearly"]
    next_date: datetime
    active: bool = True

class RecurringTransactionCreate(BaseModel):
    description: str
    amount: float
    category_id: Optional[str] = None
    payment_method: str
    frequency: Literal["daily", "weekly", "monthly", "yearly"]
    next_date: datetime
    active: bool = True

# Notification Model
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["invoice_due", "budget_alert", "card_sync", "prediction"]
    title: str
    message: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    related_id: Optional[str] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    currency: str = "BRL"
    locale: str = "pt-BR"
    week_starts_on: Literal["monday", "sunday"] = "monday"
    timezone: str = "America/Sao_Paulo"
    notifications_enabled: bool = True

class DashboardSummary(BaseModel):
    total_income: float
    total_expenses: float
    balance: float
    budgets_status: List[dict]
    recent_transactions: List[Transaction]
    cards_summary: List[dict]
    pending_invoices: int

class BudgetAlert(BaseModel):
    budget_id: str
    budget_name: str
    current_amount: float
    limit_amount: float
    percentage: float
    exceeded: bool
    should_alert: bool
    play_sound: bool

# Utility functions
def get_period_dates(period: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
    now = datetime.now(timezone.utc)
    if period == "weekly":
        start = now - timedelta(days=now.weekday())
        end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    elif period == "monthly":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = start.replace(day=28) + timedelta(days=4)
        end = next_month.replace(day=1) - timedelta(seconds=1)
    else:
        start = start_date
        end = end_date
    return start, end

def get_current_invoice_period(closing_day: int):
    now = datetime.now(timezone.utc)
    if now.day >= closing_day:
        start = now.replace(day=closing_day, hour=0, minute=0, second=0, microsecond=0)
        next_month = start + timedelta(days=32)
        end = next_month.replace(day=closing_day) - timedelta(seconds=1)
    else:
        end = now.replace(day=closing_day, hour=23, minute=59, second=59, microsecond=0)
        prev_month = now - timedelta(days=now.day + 10)
        start = prev_month.replace(day=closing_day, hour=0, minute=0, second=0, microsecond=0)
    return start, end

# Routes
@api_router.get("/")
async def root():
    return {"message": "FinanceFlow API"}

# Transactions
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    if transaction.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Check plan limit
    limit_check = await plan_manager.check_limit("default_user", "transaction")
    if not limit_check["allowed"]:
        raise HTTPException(status_code=403, detail=limit_check.get("message", "Limite atingido"))
    
    trans_obj = Transaction(**transaction.model_dump())
    doc = trans_obj.model_dump()
    doc['date'] = doc['date'].isoformat()
    await db.transactions.insert_one(doc)
    
    # Increment usage
    await plan_manager.increment_usage("default_user", "transaction")
    
    if trans_obj.type == "expense":
        await check_budget_alerts(trans_obj)
    
    return trans_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    type: Optional[str] = None,
    category_id: Optional[str] = None,
    payment_method: Optional[str] = None,
    card_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {}
    if type:
        query['type'] = type
    if category_id:
        query['category_id'] = category_id
    if payment_method:
        query['payment_method'] = payment_method
    if card_id:
        query['card_id'] = card_id
    if start_date or end_date:
        query['date'] = {}
        if start_date:
            query['date']['$gte'] = start_date
        if end_date:
            query['date']['$lte'] = end_date
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    for t in transactions:
        if isinstance(t['date'], str):
            t['date'] = datetime.fromisoformat(t['date'])
    return transactions

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    trans = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not trans:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if isinstance(trans['date'], str):
        trans['date'] = datetime.fromisoformat(trans['date'])
    return trans

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction: TransactionCreate):
    if transaction.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    trans_obj = Transaction(id=transaction_id, **transaction.model_dump())
    doc = trans_obj.model_dump()
    doc['date'] = doc['date'].isoformat()
    
    result = await db.transactions.replace_one({"id": transaction_id}, doc)
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if trans_obj.type == "expense":
        await check_budget_alerts(trans_obj)
    
    return trans_obj

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

# Categories
@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    cat_obj = Category(**category.model_dump())
    await db.categories.insert_one(cat_obj.model_dump())
    return cat_obj

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category: CategoryCreate):
    cat_obj = Category(id=category_id, **category.model_dump())
    result = await db.categories.replace_one({"id": category_id}, cat_obj.model_dump())
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat_obj

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# Credit Cards
@api_router.post("/cards", response_model=CreditCard)
async def create_card(card: CreditCardCreate):
    card_obj = CreditCard(**card.model_dump())
    doc = card_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.cards.insert_one(doc)
    return card_obj

@api_router.get("/cards", response_model=List[CreditCard])
async def get_cards(active_only: bool = False):
    query = {"active": True} if active_only else {}
    cards = await db.cards.find(query, {"_id": 0}).to_list(100)
    for c in cards:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return cards

@api_router.get("/cards/{card_id}", response_model=CreditCard)
async def get_card(card_id: str):
    card = await db.cards.find_one({"id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if isinstance(card.get('created_at'), str):
        card['created_at'] = datetime.fromisoformat(card['created_at'])
    return card

@api_router.put("/cards/{card_id}", response_model=CreditCard)
async def update_card(card_id: str, card: CreditCardCreate):
    existing_card = await db.cards.find_one({"id": card_id}, {"_id": 0})
    if not existing_card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    card_obj = CreditCard(id=card_id, created_at=datetime.fromisoformat(existing_card['created_at']), **card.model_dump())
    doc = card_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.cards.replace_one({"id": card_id}, doc)
    return card_obj

@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str):
    result = await db.cards.update_one({"id": card_id}, {"$set": {"active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Card not found")
    return {"message": "Card deactivated"}

# Card Invoice
@api_router.get("/cards/{card_id}/invoice")
async def get_card_invoice(card_id: str):
    card = await db.cards.find_one({"id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    card_obj = CreditCard(**card)
    start, end = get_current_invoice_period(card_obj.closing_day)
    
    transactions = await db.transactions.find({
        "card_id": card_id,
        "type": "expense",
        "date": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    total = sum(t['amount'] for t in transactions)
    available = card_obj.credit_limit - total
    
    now = datetime.now(timezone.utc)
    closing = now.replace(day=card_obj.closing_day)
    if now.day >= card_obj.closing_day:
        closing = (closing + timedelta(days=32)).replace(day=card_obj.closing_day)
    
    due = closing + timedelta(days=(card_obj.due_day - card_obj.closing_day))
    
    return {
        "card_id": card_id,
        "card_name": card_obj.name,
        "credit_limit": card_obj.credit_limit,
        "used_amount": total,
        "available_amount": available,
        "usage_percentage": (total / card_obj.credit_limit * 100) if card_obj.credit_limit > 0 else 0,
        "closing_date": closing.isoformat(),
        "due_date": due.isoformat(),
        "transactions": transactions,
        "total_transactions": len(transactions)
    }

# Sync Card (Simulate)
@api_router.post("/cards/{card_id}/sync")
async def sync_card(card_id: str):
    card = await db.cards.find_one({"id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Simulate syncing - create notification
    notification = Notification(
        type="card_sync",
        title=f"Cartão {card['name']} sincronizado",
        message=f"3 novas transações foram importadas do cartão {card['name']}",
        related_id=card_id
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return {"message": "Card synced successfully", "new_transactions": 3}

# Recurring Transactions
@api_router.post("/recurring-transactions", response_model=RecurringTransaction)
async def create_recurring(recurring: RecurringTransactionCreate):
    rec_obj = RecurringTransaction(**recurring.model_dump())
    doc = rec_obj.model_dump()
    doc['next_date'] = doc['next_date'].isoformat()
    await db.recurring_transactions.insert_one(doc)
    return rec_obj

@api_router.get("/recurring-transactions", response_model=List[RecurringTransaction])
async def get_recurring_transactions():
    recurring = await db.recurring_transactions.find({}, {"_id": 0}).to_list(100)
    for r in recurring:
        if isinstance(r['next_date'], str):
            r['next_date'] = datetime.fromisoformat(r['next_date'])
    return recurring

@api_router.delete("/recurring-transactions/{recurring_id}")
async def delete_recurring(recurring_id: str):
    result = await db.recurring_transactions.delete_one({"id": recurring_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return {"message": "Recurring transaction deleted"}

# Predictions
@api_router.get("/predictions")
async def get_predictions(months: int = 3):
    now = datetime.now(timezone.utc)
    
    # Get last 6 months average
    six_months_ago = now - timedelta(days=180)
    transactions = await db.transactions.find({
        "type": "expense",
        "date": {"$gte": six_months_ago.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    categories_avg = {}
    for t in transactions:
        cat_id = t.get('category_id', 'uncategorized')
        if cat_id not in categories_avg:
            categories_avg[cat_id] = []
        categories_avg[cat_id].append(t['amount'])
    
    predictions = []
    for i in range(months):
        future_date = now + timedelta(days=30 * (i + 1))
        month_predictions = []
        total = 0
        
        for cat_id, amounts in categories_avg.items():
            avg = sum(amounts) / len(amounts) if amounts else 0
            category = await db.categories.find_one({"id": cat_id}, {"_id": 0})
            month_predictions.append({
                "category_id": cat_id,
                "category_name": category['name'] if category else "Sem categoria",
                "predicted_amount": round(avg, 2)
            })
            total += avg
        
        # Add recurring transactions
        recurring = await db.recurring_transactions.find({"active": True}, {"_id": 0}).to_list(100)
        for rec in recurring:
            total += rec['amount']
            month_predictions.append({
                "description": rec['description'],
                "amount": rec['amount'],
                "type": "recurring"
            })
        
        predictions.append({
            "month": future_date.strftime("%Y-%m"),
            "month_name": future_date.strftime("%B %Y"),
            "predicted_total": round(total, 2),
            "details": month_predictions
        })
    
    return {"predictions": predictions}

# Notifications
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(unread_only: bool = False):
    query = {"read": False} if unread_only else {}
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for n in notifications:
        if isinstance(n['created_at'], str):
            n['created_at'] = datetime.fromisoformat(n['created_at'])
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    result = await db.notifications.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

# Budgets (existing code continues...)
@api_router.post("/budgets", response_model=Budget)
async def create_budget(budget: BudgetCreate):
    if budget.limit_amount <= 0:
        raise HTTPException(status_code=400, detail="Limit amount must be greater than 0")
    budget_obj = Budget(**budget.model_dump())
    doc = budget_obj.model_dump()
    if doc.get('start_date'):
        doc['start_date'] = doc['start_date'].isoformat()
    if doc.get('end_date'):
        doc['end_date'] = doc['end_date'].isoformat()
    await db.budgets.insert_one(doc)
    return budget_obj

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets():
    budgets = await db.budgets.find({}, {"_id": 0}).to_list(100)
    for b in budgets:
        if b.get('start_date') and isinstance(b['start_date'], str):
            b['start_date'] = datetime.fromisoformat(b['start_date'])
        if b.get('end_date') and isinstance(b['end_date'], str):
            b['end_date'] = datetime.fromisoformat(b['end_date'])
        if b.get('last_alerted_at') and isinstance(b['last_alerted_at'], str):
            b['last_alerted_at'] = datetime.fromisoformat(b['last_alerted_at'])
    return budgets

@api_router.put("/budgets/{budget_id}", response_model=Budget)
async def update_budget(budget_id: str, budget: BudgetCreate):
    if budget.limit_amount <= 0:
        raise HTTPException(status_code=400, detail="Limit amount must be greater than 0")
    budget_obj = Budget(id=budget_id, **budget.model_dump())
    doc = budget_obj.model_dump()
    if doc.get('start_date'):
        doc['start_date'] = doc['start_date'].isoformat()
    if doc.get('end_date'):
        doc['end_date'] = doc['end_date'].isoformat()
    if doc.get('last_alerted_at'):
        doc['last_alerted_at'] = doc['last_alerted_at'].isoformat()
    result = await db.budgets.replace_one({"id": budget_id}, doc)
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget_obj

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str):
    result = await db.budgets.delete_one({"id": budget_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted"}

async def check_budget_alerts(transaction: Transaction):
    budgets = await db.budgets.find({"alerts_enabled": True}, {"_id": 0}).to_list(100)
    
    for b in budgets:
        if b.get('start_date') and isinstance(b['start_date'], str):
            b['start_date'] = datetime.fromisoformat(b['start_date'])
        if b.get('end_date') and isinstance(b['end_date'], str):
            b['end_date'] = datetime.fromisoformat(b['end_date'])
        if b.get('last_alerted_at') and isinstance(b['last_alerted_at'], str):
            b['last_alerted_at'] = datetime.fromisoformat(b['last_alerted_at'])
        
        budget = Budget(**b)
        start, end = get_period_dates(budget.period, budget.start_date, budget.end_date)
        
        query = {
            "type": "expense",
            "date": {"$gte": start.isoformat(), "$lte": end.isoformat()}
        }
        
        if budget.scope == "by_category" and budget.category_id:
            query["category_id"] = budget.category_id
        
        transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
        total = sum(t['amount'] for t in transactions)
        percentage = total / budget.limit_amount if budget.limit_amount > 0 else 0
        
        should_alert = percentage >= budget.alert_threshold
        now = datetime.now(timezone.utc)
        
        if budget.last_alerted_at:
            time_since_last = (now - budget.last_alerted_at).total_seconds()
            if time_since_last < 3600:
                should_alert = False
        
        if should_alert:
            await db.budgets.update_one(
                {"id": budget.id},
                {"$set": {"last_alerted_at": now.isoformat()}}
            )

@api_router.get("/budgets/{budget_id}/status", response_model=BudgetAlert)
async def get_budget_status(budget_id: str):
    budget_doc = await db.budgets.find_one({"id": budget_id}, {"_id": 0})
    if not budget_doc:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    if budget_doc.get('start_date') and isinstance(budget_doc['start_date'], str):
        budget_doc['start_date'] = datetime.fromisoformat(budget_doc['start_date'])
    if budget_doc.get('end_date') and isinstance(budget_doc['end_date'], str):
        budget_doc['end_date'] = datetime.fromisoformat(budget_doc['end_date'])
    if budget_doc.get('last_alerted_at') and isinstance(budget_doc['last_alerted_at'], str):
        budget_doc['last_alerted_at'] = datetime.fromisoformat(budget_doc['last_alerted_at'])
    
    budget = Budget(**budget_doc)
    start, end = get_period_dates(budget.period, budget.start_date, budget.end_date)
    
    query = {
        "type": "expense",
        "date": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }
    
    if budget.scope == "by_category" and budget.category_id:
        query["category_id"] = budget.category_id
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    total = sum(t['amount'] for t in transactions)
    percentage = total / budget.limit_amount if budget.limit_amount > 0 else 0
    
    should_alert = budget.alerts_enabled and percentage >= budget.alert_threshold
    now = datetime.now(timezone.utc)
    
    if budget.last_alerted_at:
        time_since_last = (now - budget.last_alerted_at).total_seconds()
        if time_since_last < 3600:
            should_alert = False
    
    return BudgetAlert(
        budget_id=budget.id,
        budget_name=budget.name,
        current_amount=total,
        limit_amount=budget.limit_amount,
        percentage=percentage,
        exceeded=percentage >= 1.0,
        should_alert=should_alert,
        play_sound=budget.alert_sound_enabled and should_alert
    )

# Dashboard
@api_router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary():
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    transactions = await db.transactions.find(
        {"date": {"$gte": start_of_month.isoformat()}},
        {"_id": 0}
    ).to_list(10000)
    
    for t in transactions:
        if isinstance(t['date'], str):
            t['date'] = datetime.fromisoformat(t['date'])
    
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    balance = total_income - total_expenses
    
    # Get budgets status
    budgets = await db.budgets.find({}, {"_id": 0}).to_list(100)
    budgets_status = []
    
    for b in budgets:
        if b.get('start_date') and isinstance(b['start_date'], str):
            b['start_date'] = datetime.fromisoformat(b['start_date'])
        if b.get('end_date') and isinstance(b['end_date'], str):
            b['end_date'] = datetime.fromisoformat(b['end_date'])
        if b.get('last_alerted_at') and isinstance(b['last_alerted_at'], str):
            b['last_alerted_at'] = datetime.fromisoformat(b['last_alerted_at'])
        
        budget = Budget(**b)
        start, end = get_period_dates(budget.period, budget.start_date, budget.end_date)
        
        query = {
            "type": "expense",
            "date": {"$gte": start.isoformat(), "$lte": end.isoformat()}
        }
        
        if budget.scope == "by_category" and budget.category_id:
            query["category_id"] = budget.category_id
        
        budget_trans = await db.transactions.find(query, {"_id": 0}).to_list(10000)
        spent = sum(t['amount'] for t in budget_trans)
        percentage = (spent / budget.limit_amount * 100) if budget.limit_amount > 0 else 0
        
        budgets_status.append({
            "id": budget.id,
            "name": budget.name,
            "spent": spent,
            "limit": budget.limit_amount,
            "percentage": percentage,
            "exceeded": percentage >= 100
        })
    
    # Get cards summary
    cards = await db.cards.find({"active": True}, {"_id": 0}).to_list(100)
    cards_summary = []
    
    for card in cards:
        card_obj = CreditCard(**card)
        start, end = get_current_invoice_period(card_obj.closing_day)
        
        card_transactions = await db.transactions.find({
            "card_id": card_obj.id,
            "type": "expense",
            "date": {"$gte": start.isoformat(), "$lte": end.isoformat()}
        }, {"_id": 0}).to_list(1000)
        
        used = sum(t['amount'] for t in card_transactions)
        available = card_obj.credit_limit - used
        
        cards_summary.append({
            "id": card_obj.id,
            "name": card_obj.name,
            "used": used,
            "limit": card_obj.credit_limit,
            "available": available,
            "usage_percentage": (used / card_obj.credit_limit * 100) if card_obj.credit_limit > 0 else 0
        })
    
    # Count pending invoices
    pending_invoices = sum(1 for c in cards_summary if c['used'] > 0)
    
    recent = sorted(transactions, key=lambda x: x['date'], reverse=True)[:5]
    
    return DashboardSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        balance=balance,
        budgets_status=budgets_status,
        recent_transactions=[Transaction(**t) for t in recent],
        cards_summary=cards_summary,
        pending_invoices=pending_invoices
    )

# Charts
@api_router.get("/reports/chart-data")
async def get_chart_data(
    granularity: str = "day",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category_id: Optional[str] = None,
    payment_method: Optional[str] = None
):
    query = {}
    if start_date or end_date:
        query['date'] = {}
        if start_date:
            query['date']['$gte'] = start_date
        if end_date:
            query['date']['$lte'] = end_date
    if category_id:
        query['category_id'] = category_id
    if payment_method:
        query['payment_method'] = payment_method
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    
    for t in transactions:
        if isinstance(t['date'], str):
            t['date'] = datetime.fromisoformat(t['date'])
    
    grouped = {}
    for t in transactions:
        if granularity == "day":
            key = t['date'].strftime("%Y-%m-%d")
        elif granularity == "week":
            key = t['date'].strftime("%Y-W%W")
        else:
            key = t['date'].strftime("%Y-%m")
        
        if key not in grouped:
            grouped[key] = {"income": 0, "expenses": 0}
        
        if t['type'] == 'income':
            grouped[key]['income'] += t['amount']
        else:
            grouped[key]['expenses'] += t['amount']
    
    result = []
    for key, values in sorted(grouped.items()):
        result.append({
            "date": key,
            "income": values['income'],
            "expenses": values['expenses'],
            "balance": values['income'] - values['expenses']
        })
    
    return result

# Pie Chart Data
@api_router.get("/reports/pie-chart")
async def get_pie_chart_data(
    type: str = "expenses",
    group_by: str = "category",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {"type": "expense" if type == "expenses" else "income"}
    
    if start_date or end_date:
        query['date'] = {}
        if start_date:
            query['date']['$gte'] = start_date
        if end_date:
            query['date']['$lte'] = end_date
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    
    grouped = {}
    total = 0
    
    for t in transactions:
        if group_by == "category":
            key = t.get('category_id', 'uncategorized')
            cat = next((c for c in categories if c['id'] == key), None)
            label = cat['name'] if cat else "Sem categoria"
            color = cat.get('color', '#94A3B8') if cat else '#94A3B8'
        else:  # payment_method
            key = t.get('payment_method', 'other')
            labels_map = {
                "cash": "Dinheiro",
                "credit_card": "Cartão de Crédito",
                "debit_card": "Cartão de Débito",
                "pix": "PIX",
                "bank_transfer": "Transferência",
                "other": "Outro"
            }
            label = labels_map.get(key, key)
            color = None
        
        if key not in grouped:
            grouped[key] = {"label": label, "value": 0, "color": color}
        
        grouped[key]['value'] += t['amount']
        total += t['amount']
    
    result = []
    for key, data in grouped.items():
        percentage = (data['value'] / total * 100) if total > 0 else 0
        result.append({
            "id": key,
            "label": data['label'],
            "value": data['value'],
            "percentage": round(percentage, 1),
            "color": data['color']
        })
    
    result.sort(key=lambda x: x['value'], reverse=True)
    
    return {
        "data": result,
        "total": total
    }

# Export
@api_router.get("/export/excel")
async def export_excel():
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    budgets = await db.budgets.find({}, {"_id": 0}).to_list(100)
    cards = await db.cards.find({}, {"_id": 0}).to_list(100)
    
    wb = Workbook()
    
    # Transactions
    ws1 = wb.active
    ws1.title = "Transactions"
    headers = ["ID", "Type", "Amount", "Date", "Description", "Category ID", "Payment Method", "Card ID", "Tags", "Notes"]
    ws1.append(headers)
    
    for h in ws1[1]:
        h.font = Font(bold=True)
        h.fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
    
    for t in transactions:
        ws1.append([
            t['id'], t['type'], t['amount'],
            t['date'] if isinstance(t['date'], str) else t['date'].isoformat(),
            t['description'], t.get('category_id', ''),
            t['payment_method'], t.get('card_id', ''),
            ','.join(t.get('tags', [])), t.get('notes', '')
        ])
    
    # Categories
    ws2 = wb.create_sheet("Categories")
    ws2.append(["ID", "Name", "Color"])
    for h in ws2[1]:
        h.font = Font(bold=True)
        h.fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
    
    for c in categories:
        ws2.append([c['id'], c['name'], c.get('color', '')])
    
    # Budgets
    ws3 = wb.create_sheet("Budgets")
    ws3.append(["ID", "Name", "Period", "Limit Amount", "Scope", "Category ID", "Alerts Enabled"])
    for h in ws3[1]:
        h.font = Font(bold=True)
        h.fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
    
    for b in budgets:
        ws3.append([
            b['id'], b['name'], b['period'], b['limit_amount'],
            b['scope'], b.get('category_id', ''), b['alerts_enabled']
        ])
    
    # Cards
    ws4 = wb.create_sheet("Cards")
    ws4.append(["ID", "Name", "Brand", "Last 4 Digits", "Credit Limit", "Closing Day", "Due Day", "Active"])
    for h in ws4[1]:
        h.font = Font(bold=True)
        h.fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
    
    for c in cards:
        ws4.append([
            c['id'], c['name'], c['brand'], c['last_four_digits'],
            c['credit_limit'], c['closing_day'], c['due_day'], c['active']
        ])
    
    # Summary
    ws5 = wb.create_sheet("Summary")
    ws5.append(["Metric", "Value"])
    ws5[1][0].font = Font(bold=True)
    ws5[1][1].font = Font(bold=True)
    
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    ws5.append(["Total Income", total_income])
    ws5.append(["Total Expenses", total_expenses])
    ws5.append(["Balance", total_income - total_expenses])
    ws5.append(["Total Transactions", len(transactions)])
    ws5.append(["Total Categories", len(categories)])
    ws5.append(["Total Budgets", len(budgets)])
    ws5.append(["Total Cards", len(cards)])
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=organizze_export.xlsx"}
    )

# Settings
@api_router.get("/settings", response_model=Settings)
async def get_settings():
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings:
        default_settings = Settings()
        await db.settings.insert_one(default_settings.model_dump())
        return default_settings
    return Settings(**settings)

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings: Settings):
    settings.id = "settings"
    await db.settings.replace_one(
        {"id": "settings"},
        settings.model_dump(),
        upsert=True
    )
    return settings

# AI Assistant Endpoints
from ai_assistant import FinancialAssistant
from bank_file_processor import BankFileProcessor
from fastapi import UploadFile, File, Request, Header
from auth import AuthManager, UserCreate, UserLogin
from payments import PaymentManager, PLAN_PACKAGES

assistant = FinancialAssistant(db)
bank_processor = BankFileProcessor(db, os.environ.get('EMERGENT_LLM_KEY', ''))
auth_manager = AuthManager(db)
payment_manager = PaymentManager(db)

# Authentication Endpoints
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        result = await auth_manager.register(user_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao criar conta")

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    """Login user"""
    try:
        result = await auth_manager.login(login_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao fazer login")

@api_router.get("/auth/me")
async def get_current_user(authorization: str = Header(None)):
    """Get current authenticated user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    token = authorization.replace("Bearer ", "")
    user = await auth_manager.get_current_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    
    return user

class ProfileUpdate(BaseModel):
    name: str

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

@api_router.put("/auth/profile")
async def update_profile(profile_data: ProfileUpdate, authorization: str = Header(None)):
    """Update user profile"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    token = authorization.replace("Bearer ", "")
    user = await auth_manager.get_current_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    
    # Update user name
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"name": profile_data.name}}
    )
    
    return {"message": "Perfil atualizado", "name": profile_data.name}

@api_router.put("/auth/password")
async def update_password(password_data: PasswordUpdate, authorization: str = Header(None)):
    """Update user password"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    token = authorization.replace("Bearer ", "")
    user = await auth_manager.get_current_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    
    # Get full user data with password hash
    user_doc = await db.users.find_one({"id": user['id']})
    
    # Verify current password
    if not auth_manager.verify_password(password_data.current_password, user_doc['password_hash']):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    
    # Update password
    new_hash = auth_manager.hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Senha atualizada"}

@api_router.post("/users/complete-onboarding")
async def complete_onboarding(authorization: str = Header(None)):
    """Mark user onboarding as complete"""
    if not authorization or not authorization.startswith("Bearer "):
        # Allow without auth for now (using localStorage)
        return {"message": "OK"}
    
    token = authorization.replace("Bearer ", "")
    user = await auth_manager.get_current_user(token)
    
    if user:
        await db.users.update_one(
            {"id": user['id']},
            {"$set": {"onboarding_completed": True}}
        )
    
    return {"message": "Onboarding completo"}

# Payment Endpoints
@api_router.post("/payments/checkout")
async def create_checkout(plan_id: str, request: Request):
    """Create Stripe checkout session for plan upgrade"""
    try:
        # Get origin from request
        origin = request.headers.get('origin') or str(request.base_url).rstrip('/')
        
        # For now, use default user (will be updated when auth is fully integrated)
        user_id = "default_user"
        
        result = await payment_manager.create_checkout_session(
            user_id=user_id,
            plan_id=plan_id,
            origin_url=origin
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao criar sessão de pagamento")

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    """Get checkout session status and process payment if complete"""
    try:
        origin = request.headers.get('origin') or str(request.base_url).rstrip('/')
        
        status = await payment_manager.get_checkout_status(session_id, origin)
        
        # If payment is successful and not already processed
        if status.get('payment_status') == 'paid' and not status.get('already_processed'):
            plan_id = status.get('plan_id') or status.get('metadata', {}).get('plan_id')
            user_id = status.get('metadata', {}).get('user_id', 'default_user')
            
            if plan_id:
                await payment_manager.handle_successful_payment(session_id, user_id, plan_id)
                
                # Also update plan_manager
                await plan_manager.upgrade_plan(user_id, plan_id)
        
        return status
    except Exception as e:
        logger.error(f"Payment status error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao verificar status do pagamento")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        # Log webhook received
        logger.info(f"Stripe webhook received")
        
        return {"status": "received"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error"}

class ChatMessage(BaseModel):
    message: str
    include_context: bool = True

class ChatResponse(BaseModel):
    response: str
    timestamp: datetime

@api_router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(chat_msg: ChatMessage):
    """Chat with AI financial assistant"""
    try:
        response = await assistant.chat_with_assistant(
            user_id="default_user",
            message=chat_msg.message,
            include_context=chat_msg.include_context
        )
        return ChatResponse(
            response=response,
            timestamp=datetime.now(timezone.utc)
        )
    except Exception as e:
        logger.error(f"AI Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

@api_router.get("/ai/insights")
async def get_ai_insights():
    """Get AI-generated financial insights"""
    try:
        insights = await assistant.generate_insights()
        return {"insights": insights}
    except Exception as e:
        logger.error(f"AI Insights error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

@api_router.get("/ai/analysis")
async def get_spending_analysis():
    """Get AI spending pattern analysis"""
    try:
        analysis = await assistant.analyze_spending_patterns()
        return analysis
    except Exception as e:
        logger.error(f"AI Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

@api_router.post("/ai/suggest-category")
async def suggest_transaction_category(description: str, amount: float):
    """Suggest category for transaction using AI"""
    try:
        category_id = await assistant.suggest_category(description, amount)
        return {"suggested_category_id": category_id}
    except Exception as e:
        logger.error(f"AI Category suggestion error: {str(e)}")
        return {"suggested_category_id": None}

@api_router.get("/ai/chat-history")
async def get_chat_history(limit: int = 20):
    """Get chat history"""
    history = await db.ai_chats.find({
        "user_id": "default_user"
    }).sort("created_at", -1).limit(limit).to_list(limit)
    
    for h in history:
        if isinstance(h['created_at'], str):
            h['created_at'] = datetime.fromisoformat(h['created_at'])
    
    return {"history": history}

# Bank File Import Endpoints
from plan_manager import PlanManager, PLAN_LIMITS

plan_manager = PlanManager(db)

@api_router.get("/plans/current")
async def get_current_plan():
    """Get user's current plan and usage"""
    plan = await plan_manager.get_user_plan()
    return plan.model_dump()

@api_router.get("/plans/available")
async def get_available_plans():
    """Get available plans and pricing"""
    return {
        "plans": [
            {
                "id": "free_trial",
                "name": "Teste Grátis",
                "price": 0.00,
                "duration": "14 dias",
                "features": [
                    "✅ Transações ilimitadas",
                    "✅ Cartões ilimitados",
                    "✅ Assistente IA ilimitado",
                    "✅ Importação de extratos",
                    "✅ Previsões avançadas",
                    "⏰ Por 14 dias"
                ]
            },
            {
                "id": "basic",
                "name": "Básico",
                "price": 15.00,
                "duration": "mensal",
                "features": [
                    "📊 20 transações/mês",
                    "💳 2 cartões",
                    "🤖 10 mensagens IA/mês",
                    "❌ Sem importação",
                    "❌ Sem previsões avançadas"
                ]
            },
            {
                "id": "premium",
                "name": "Premium",
                "price": 35.90,
                "duration": "mensal",
                "popular": True,
                "features": [
                    "✅ Transações ilimitadas",
                    "✅ Cartões ilimitados",
                    "✅ Assistente IA ilimitado",
                    "✅ Importação de extratos",
                    "✅ Previsões avançadas",
                    "✅ Suporte prioritário"
                ]
            }
        ]
    }

@api_router.post("/plans/upgrade")
async def upgrade_plan(plan_type: str):
    """Upgrade to paid plan"""
    if plan_type not in ["basic", "premium"]:
        raise HTTPException(status_code=400, detail="Plano inválido")
    
    plan = await plan_manager.upgrade_plan("default_user", plan_type)
    
    # Create notification
    notification = Notification(
        type="card_sync",
        title=f"Bem-vindo ao plano {plan_type.title()}!",
        message=f"Seu plano foi atualizado com sucesso. Aproveite todas as funcionalidades!",
        related_id=None
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return {"success": True, "plan": plan.model_dump()}

@api_router.get("/plans/check-limit/{resource}")
async def check_resource_limit(resource: str):
    """Check if user can use a resource"""
    result = await plan_manager.check_limit("default_user", resource)
    return result

# Bank File Import Endpoints
@api_router.post("/import/upload")
async def upload_bank_file(
    file: UploadFile = File(...),
    auto_categorize: bool = True,
    skip_duplicates: bool = True
):
    """Upload and process bank file (OFX, CSV, PDF)"""
    try:
        content = await file.read()
        file_extension = file.filename.split('.')[-1].lower()
        
        # Process file based on type
        if file_extension == 'ofx':
            transactions = await bank_processor.process_ofx(content)
        elif file_extension == 'csv':
            transactions = await bank_processor.process_csv(content)
        elif file_extension == 'pdf':
            transactions = await bank_processor.process_pdf(content)
        else:
            raise HTTPException(status_code=400, detail="Formato não suportado. Use OFX, CSV ou PDF")
        
        if not transactions:
            raise HTTPException(status_code=400, detail="Nenhuma transação encontrada no arquivo")
        
        # Detect duplicates
        transactions = await bank_processor.detect_duplicates(transactions)
        
        # Auto-categorize if requested
        if auto_categorize:
            transactions = await bank_processor.categorize_transactions(transactions)
        
        # Return preview for user confirmation
        return {
            "success": True,
            "preview": transactions[:50],  # Show first 50 for review
            "total_found": len(transactions),
            "duplicates": sum(1 for t in transactions if t.get('is_duplicate')),
            "new_transactions": sum(1 for t in transactions if not t.get('is_duplicate'))
        }
    
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/import/confirm")
async def confirm_import(transactions: List[dict], skip_duplicates: bool = True):
    """Confirm and import transactions after preview"""
    try:
        result = await bank_processor.import_transactions(transactions, skip_duplicates)
        
        # Create notification
        notification = Notification(
            type="card_sync",
            title="Importação concluída",
            message=f"{result['imported']} transações importadas com sucesso. {result['skipped']} duplicatas ignoradas.",
            related_id=None
        )
        await db.notifications.insert_one(notification.model_dump())
        
        return result
    except Exception as e:
        logger.error(f"Import confirmation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/import/history")
async def get_import_history():
    """Get import history"""
    # Get transactions with 'importado' tag
    transactions = await db.transactions.find({
        "tags": "importado"
    }, {"_id": 0}).sort("date", -1).limit(100).to_list(100)
    
    for t in transactions:
        if isinstance(t['date'], str):
            t['date'] = datetime.fromisoformat(t['date'])
    
    return {"imports": transactions, "total": len(transactions)}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
