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

# Models
class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["expense", "income"]
    amount: float
    date: datetime
    description: str
    category_id: Optional[str] = None
    payment_method: Literal["cash", "credit_card", "debit_card", "pix", "bank_transfer", "other"]
    tags: Optional[List[str]] = []
    notes: Optional[str] = None

class TransactionCreate(BaseModel):
    type: Literal["expense", "income"]
    amount: float
    date: datetime
    description: str
    category_id: Optional[str] = None
    payment_method: Literal["cash", "credit_card", "debit_card", "pix", "bank_transfer", "other"]
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

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    currency: str = "BRL"
    locale: str = "pt-BR"
    week_starts_on: Literal["monday", "sunday"] = "monday"
    timezone: str = "America/Sao_Paulo"

class DashboardSummary(BaseModel):
    total_income: float
    total_expenses: float
    balance: float
    budgets_status: List[dict]
    recent_transactions: List[Transaction]

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

# Routes
@api_router.get("/")
async def root():
    return {"message": "Organizze API"}

# Transactions
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    if transaction.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    trans_obj = Transaction(**transaction.model_dump())
    doc = trans_obj.model_dump()
    doc['date'] = doc['date'].isoformat()
    await db.transactions.insert_one(doc)
    
    # Check budget alerts
    if trans_obj.type == "expense":
        await check_budget_alerts(trans_obj)
    
    return trans_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    type: Optional[str] = None,
    category_id: Optional[str] = None,
    payment_method: Optional[str] = None,
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

# Budgets
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

# Budget alerts
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
        
        # Check if should alert
        should_alert = percentage >= budget.alert_threshold
        now = datetime.now(timezone.utc)
        
        # Anti-spam: only alert once per hour
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
    
    recent = sorted(transactions, key=lambda x: x['date'], reverse=True)[:5]
    
    return DashboardSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        balance=balance,
        budgets_status=budgets_status,
        recent_transactions=[Transaction(**t) for t in recent]
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
    
    # Group by granularity
    grouped = {}
    for t in transactions:
        if granularity == "day":
            key = t['date'].strftime("%Y-%m-%d")
        elif granularity == "week":
            key = t['date'].strftime("%Y-W%W")
        else:  # month
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

# Export
@api_router.get("/export/excel")
async def export_excel():
    # Get all data
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    budgets = await db.budgets.find({}, {"_id": 0}).to_list(100)
    
    # Create workbook
    wb = Workbook()
    
    # Transactions sheet
    ws1 = wb.active
    ws1.title = "Transactions"
    headers = ["ID", "Type", "Amount", "Date", "Description", "Category ID", "Payment Method", "Tags", "Notes"]
    ws1.append(headers)
    
    for h in ws1[1]:
        h.font = Font(bold=True)
        h.fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
    
    for t in transactions:
        ws1.append([
            t['id'], t['type'], t['amount'],
            t['date'] if isinstance(t['date'], str) else t['date'].isoformat(),
            t['description'], t.get('category_id', ''),
            t['payment_method'], ','.join(t.get('tags', [])),
            t.get('notes', '')
        ])
    
    # Categories sheet
    ws2 = wb.create_sheet("Categories")
    ws2.append(["ID", "Name", "Color"])
    for h in ws2[1]:
        h.font = Font(bold=True)
        h.fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
    
    for c in categories:
        ws2.append([c['id'], c['name'], c.get('color', '')])
    
    # Budgets sheet
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
    
    # Summary sheet
    ws4 = wb.create_sheet("Summary")
    ws4.append(["Metric", "Value"])
    ws4[1][0].font = Font(bold=True)
    ws4[1][1].font = Font(bold=True)
    
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    ws4.append(["Total Income", total_income])
    ws4.append(["Total Expenses", total_expenses])
    ws4.append(["Balance", total_income - total_expenses])
    ws4.append(["Total Transactions", len(transactions)])
    ws4.append(["Total Categories", len(categories)])
    ws4.append(["Total Budgets", len(budgets)])
    
    # Save to bytes
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
