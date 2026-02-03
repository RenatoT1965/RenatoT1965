from emergentintegrations.llm.chat import LlmChat, UserMessage
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
import json
import os
from dotenv import load_dotenv

load_dotenv()

class FinancialAssistant:
    def __init__(self, db):
        self.db = db
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment")
    
    def _create_chat(self, session_id: str, system_message: str):
        """Create a new chat instance with Gemini"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        return chat
    
    async def get_financial_context(self, days: int = 30) -> Dict:
        """Get financial data context for AI"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)
        
        # Get transactions
        transactions = await self.db.transactions.find({
            "date": {"$gte": start_date.isoformat()}
        }, {"_id": 0}).to_list(1000)
        
        # Get categories
        categories = await self.db.categories.find({}, {"_id": 0}).to_list(100)
        
        # Get budgets
        budgets = await self.db.budgets.find({}, {"_id": 0}).to_list(100)
        
        # Get cards
        cards = await self.db.cards.find({"active": True}, {"_id": 0}).to_list(100)
        
        # Calculate totals
        total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
        total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
        
        # Group by category
        expenses_by_category = {}
        for t in transactions:
            if t['type'] == 'expense':
                cat_id = t.get('category_id', 'uncategorized')
                cat = next((c for c in categories if c['id'] == cat_id), None)
                cat_name = cat['name'] if cat else 'Sem categoria'
                expenses_by_category[cat_name] = expenses_by_category.get(cat_name, 0) + t['amount']
        
        return {
            "period_days": days,
            "total_income": total_income,
            "total_expenses": total_expenses,
            "balance": total_income - total_expenses,
            "transactions_count": len(transactions),
            "expenses_by_category": expenses_by_category,
            "active_budgets": len(budgets),
            "active_cards": len(cards),
            "recent_transactions": [
                {
                    "type": t['type'],
                    "amount": t['amount'],
                    "description": t['description'],
                    "date": t['date']
                } for t in sorted(transactions, key=lambda x: x['date'], reverse=True)[:10]
            ]
        }
    
    async def chat_with_assistant(self, user_id: str, message: str, include_context: bool = True) -> str:
        """Chat with financial assistant"""
        system_message = """Você é um assistente financeiro inteligente do app Organizze.
Você ajuda usuários a entenderem suas finanças, responde perguntas sobre gastos, 
oferece insights e sugestões personalizadas.

Seja amigável, claro e objetivo. Use valores em R$ (Real brasileiro).
Quando relevante, ofereça dicas práticas de economia e planejamento financeiro.
"""
        
        # Get user's chat history
        chat_history = await self.db.ai_chats.find({
            "user_id": user_id
        }).sort("created_at", -1).limit(10).to_list(10)
        
        # Create context message
        context_text = ""
        if include_context:
            context = await self.get_financial_context()
            context_text = f"""
CONTEXTO FINANCEIRO DO USUÁRIO (últimos 30 dias):
- Total de receitas: R$ {context['total_income']:.2f}
- Total de despesas: R$ {context['total_expenses']:.2f}
- Saldo: R$ {context['balance']:.2f}
- {context['transactions_count']} transações registradas
- {context['active_budgets']} metas ativas
- {context['active_cards']} cartões cadastrados

DESPESAS POR CATEGORIA:
{json.dumps(context['expenses_by_category'], indent=2, ensure_ascii=False)}

TRANSAÇÕES RECENTES:
{json.dumps(context['recent_transactions'][:5], indent=2, ensure_ascii=False)}
"""
        
        full_message = f"{context_text}\n\nPERGUNTA DO USUÁRIO: {message}"
        
        # Create chat
        chat = self._create_chat(f"user_{user_id}", system_message)
        
        # Send message
        user_msg = UserMessage(text=full_message)
        response = await chat.send_message(user_msg)
        
        # Save to history
        await self.db.ai_chats.insert_one({
            "user_id": user_id,
            "message": message,
            "response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return response
    
    async def analyze_spending_patterns(self) -> Dict:
        """Analyze spending patterns with AI"""
        context = await self.get_financial_context(days=90)
        
        system_message = """Você é um analista financeiro especializado.
Analise os padrões de gastos e forneça insights objetivos e acionáveis."""
        
        analysis_prompt = f"""
Analise os seguintes dados financeiros dos últimos 90 dias:

Total de Receitas: R$ {context['total_income']:.2f}
Total de Despesas: R$ {context['total_expenses']:.2f}
Saldo: R$ {context['balance']:.2f}

Despesas por Categoria:
{json.dumps(context['expenses_by_category'], indent=2, ensure_ascii=False)}

Por favor, forneça:
1. **Análise de Padrões**: Identifique padrões de gastos (3-4 pontos principais)
2. **Alertas**: Gastos incomuns ou preocupantes
3. **Oportunidades**: 3 sugestões específicas de economia
4. **Resumo**: Uma frase resumindo a situação financeira

Formato da resposta em JSON:
{{
  "patterns": ["padrão 1", "padrão 2", "padrão 3"],
  "alerts": ["alerta 1", "alerta 2"],
  "opportunities": ["oportunidade 1", "oportunidade 2", "oportunidade 3"],
  "summary": "resumo em uma frase"
}}
"""
        
        chat = self._create_chat("analysis", system_message)
        response = await chat.send_message(UserMessage(text=analysis_prompt))
        
        try:
            # Try to parse JSON response
            analysis = json.loads(response)
            return analysis
        except:
            # Fallback to structured response
            return {
                "patterns": ["Análise em progresso"],
                "alerts": [],
                "opportunities": ["Revise seus gastos regularmente"],
                "summary": response[:200],
                "raw_response": response
            }
    
    async def suggest_category(self, description: str, amount: float) -> str:
        """Suggest category for a transaction using AI"""
        # Get existing categories
        categories = await self.db.categories.find({}, {"_id": 0}).to_list(100)
        category_names = [c['name'] for c in categories]
        
        # Get similar past transactions
        similar_transactions = await self.db.transactions.find({
            "$text": {"$search": description}
        }, {"_id": 0}).limit(5).to_list(5)
        
        system_message = """Você é um especialista em categorização de transações financeiras.
Baseado na descrição e valor, sugira a categoria mais apropriada."""
        
        prompt = f"""
Categorias disponíveis: {', '.join(category_names)}

Transação para categorizar:
- Descrição: {description}
- Valor: R$ {amount:.2f}

Transações similares anteriores:
{json.dumps([{{'desc': t.get('description', ''), 'cat': t.get('category_id', 'N/A')}} for t in similar_transactions], ensure_ascii=False)}

Responda apenas com o nome da categoria mais apropriada.
"""
        
        chat = self._create_chat("categorization", system_message)
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Find best match
        response_lower = response.lower().strip()
        for cat in categories:
            if cat['name'].lower() in response_lower:
                return cat['id']
        
        return None
    
    async def generate_insights(self) -> List[Dict]:
        """Generate AI insights for dashboard"""
        context = await self.get_financial_context(days=30)
        
        system_message = """Você é um consultor financeiro. 
Gere insights curtos e acionáveis (máximo 2 frases cada)."""
        
        prompt = f"""
Baseado nestes dados dos últimos 30 dias:
- Receitas: R$ {context['total_income']:.2f}
- Despesas: R$ {context['total_expenses']:.2f}
- Saldo: R$ {context['balance']:.2f}
- Despesas por categoria: {json.dumps(context['expenses_by_category'], ensure_ascii=False)}

Gere 3 insights curtos e práticos em formato JSON:
[
  {{"type": "warning|success|info", "title": "Título", "message": "Mensagem curta"}},
  {{"type": "...", "title": "...", "message": "..."}}
]
"""
        
        chat = self._create_chat("insights", system_message)
        response = await chat.send_message(UserMessage(text=prompt))
        
        try:
            insights = json.loads(response)
            return insights if isinstance(insights, list) else []
        except:
            return [{
                "type": "info",
                "title": "Análise em processamento",
                "message": "Continue registrando suas transações para insights mais precisos."
            }]
