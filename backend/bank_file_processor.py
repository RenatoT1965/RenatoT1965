import ofxparse
import csv
import io
import re
from datetime import datetime
from typing import List, Dict, Optional
from PyPDF2 import PdfReader
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
import os

class BankFileProcessor:
    def __init__(self, db, api_key: str):
        self.db = db
        self.api_key = api_key
    
    async def process_ofx(self, file_content: bytes) -> List[Dict]:
        """Process OFX file and extract transactions"""
        try:
            ofx = ofxparse.OfxParser.parse(io.BytesIO(file_content))
            transactions = []
            
            for account in ofx.accounts:
                for transaction in account.statement.transactions:
                    trans_type = 'income' if transaction.amount > 0 else 'expense'
                    
                    transactions.append({
                        'type': trans_type,
                        'amount': abs(float(transaction.amount)),
                        'date': transaction.date.isoformat() if transaction.date else datetime.now().isoformat(),
                        'description': transaction.memo or transaction.payee or 'Transação importada',
                        'payment_method': 'bank_transfer',
                        'raw_data': {
                            'id': transaction.id,
                            'payee': transaction.payee,
                            'memo': transaction.memo
                        }
                    })
            
            return transactions
        except Exception as e:
            raise ValueError(f"Erro ao processar arquivo OFX: {str(e)}")
    
    async def process_csv(self, file_content: bytes, delimiter: str = ',') -> List[Dict]:
        """Process CSV file and extract transactions"""
        try:
            content = file_content.decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)
            
            transactions = []
            for row in reader:
                # Try to identify columns (flexible mapping)
                date = self._extract_date(row)
                description = self._extract_description(row)
                amount = self._extract_amount(row)
                
                if date and amount:
                    trans_type = 'income' if amount > 0 else 'expense'
                    transactions.append({
                        'type': trans_type,
                        'amount': abs(amount),
                        'date': date.isoformat(),
                        'description': description,
                        'payment_method': 'bank_transfer',
                        'raw_data': dict(row)
                    })
            
            return transactions
        except Exception as e:
            raise ValueError(f"Erro ao processar arquivo CSV: {str(e)}")
    
    async def process_pdf(self, file_content: bytes) -> List[Dict]:
        """Process PDF bank statement and extract transactions using AI"""
        try:
            reader = PdfReader(io.BytesIO(file_content))
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            
            # Use AI to extract transactions from PDF text
            transactions = await self._extract_transactions_with_ai(text)
            return transactions
        except Exception as e:
            raise ValueError(f"Erro ao processar arquivo PDF: {str(e)}")
    
    def _extract_date(self, row: Dict) -> Optional[datetime]:
        """Extract date from CSV row"""
        date_fields = ['data', 'date', 'Data', 'Date', 'DATA', 'DATE', 'data_transacao', 'dt_transacao']
        for field in date_fields:
            if field in row and row[field]:
                try:
                    # Try different date formats
                    for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d']:
                        try:
                            return datetime.strptime(row[field], fmt)
                        except:
                            continue
                except:
                    continue
        return None
    
    def _extract_description(self, row: Dict) -> str:
        """Extract description from CSV row"""
        desc_fields = ['descricao', 'description', 'historico', 'memo', 'Description', 'Descrição', 'DESCRIÇÃO']
        for field in desc_fields:
            if field in row and row[field]:
                return row[field]
        return 'Transação importada'
    
    def _extract_amount(self, row: Dict) -> Optional[float]:
        """Extract amount from CSV row"""
        amount_fields = ['valor', 'amount', 'value', 'Valor', 'Value', 'VALOR', 'credito', 'debito']
        
        for field in amount_fields:
            if field in row and row[field]:
                try:
                    # Clean amount string
                    amount_str = row[field].replace('R$', '').replace('.', '').replace(',', '.').strip()
                    amount = float(amount_str)
                    
                    # Check if it's debit or credit
                    if 'debito' in field.lower() or 'débito' in field.lower():
                        return -abs(amount)
                    elif 'credito' in field.lower() or 'crédito' in field.lower():
                        return abs(amount)
                    
                    return amount
                except:
                    continue
        return None
    
    async def _extract_transactions_with_ai(self, text: str) -> List[Dict]:
        """Use AI to extract transactions from unstructured text (PDF)"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id="pdf_extraction",
            system_message="Você é um especialista em extrair transações bancárias de extratos em PDF."
        ).with_model("gemini", "gemini-2.5-flash")
        
        prompt = f"""
Extraia todas as transações bancárias do seguinte extrato:

{text[:4000]}

Retorne um JSON array com as transações no formato:
[
  {{
    "date": "YYYY-MM-DD",
    "description": "descrição",
    "amount": 123.45,
    "type": "income ou expense"
  }}
]

Considere valores positivos como receitas (income) e negativos como despesas (expense).
"""
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        try:
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                transactions_data = json.loads(json_match.group())
                
                transactions = []
                for t in transactions_data:
                    transactions.append({
                        'type': t.get('type', 'expense'),
                        'amount': abs(float(t.get('amount', 0))),
                        'date': t.get('date', datetime.now().isoformat()),
                        'description': t.get('description', 'Transação importada'),
                        'payment_method': 'bank_transfer',
                        'raw_data': t
                    })
                
                return transactions
        except Exception as e:
            print(f"AI extraction error: {str(e)}")
        
        return []
    
    async def categorize_transactions(self, transactions: List[Dict]) -> List[Dict]:
        """Use AI to categorize imported transactions"""
        categories = await self.db.categories.find({}, {"_id": 0}).to_list(100)
        category_names = {c['id']: c['name'] for c in categories}
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id="categorization",
            system_message="Você é um especialista em categorizar transações financeiras."
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Batch categorize
        transactions_text = "\n".join([
            f"{i+1}. {t['description']} - R$ {t['amount']:.2f}"
            for i, t in enumerate(transactions[:20])  # Limit to 20 per batch
        ])
        
        prompt = f"""
Categorias disponíveis:
{json.dumps(list(category_names.values()), ensure_ascii=False)}

Transações para categorizar:
{transactions_text}

Retorne um JSON array com os IDs das categorias sugeridas (ou null se não souber):
["id1", "id2", null, "id3", ...]
"""
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        try:
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                suggested_ids = json.loads(json_match.group())
                
                for i, cat_id in enumerate(suggested_ids):
                    if i < len(transactions) and cat_id:
                        transactions[i]['category_id'] = cat_id
        except:
            pass
        
        return transactions
    
    async def detect_duplicates(self, new_transactions: List[Dict]) -> List[Dict]:
        """Detect if transactions already exist"""
        for transaction in new_transactions:
            # Check for duplicates (same date, amount, and similar description)
            existing = await self.db.transactions.find_one({
                "date": transaction['date'],
                "amount": transaction['amount'],
                "type": transaction['type']
            })
            
            if existing:
                transaction['is_duplicate'] = True
                transaction['duplicate_id'] = existing.get('id')
            else:
                transaction['is_duplicate'] = False
        
        return new_transactions
    
    async def import_transactions(self, transactions: List[Dict], skip_duplicates: bool = True) -> Dict:
        """Import transactions to database"""
        imported = 0
        skipped = 0
        errors = 0
        
        for transaction in transactions:
            if skip_duplicates and transaction.get('is_duplicate'):
                skipped += 1
                continue
            
            try:
                # Remove processing flags
                transaction.pop('is_duplicate', None)
                transaction.pop('duplicate_id', None)
                transaction.pop('raw_data', None)
                
                # Add default fields
                if 'tags' not in transaction:
                    transaction['tags'] = ['importado']
                
                await self.db.transactions.insert_one(transaction)
                imported += 1
            except Exception as e:
                print(f"Error importing transaction: {str(e)}")
                errors += 1
        
        return {
            'imported': imported,
            'skipped': skipped,
            'errors': errors,
            'total': len(transactions)
        }
