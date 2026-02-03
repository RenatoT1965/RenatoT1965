# FinanceFlow - Personal Finance Management App

## Original Problem Statement
Aplicativo de gerenciamento de finanças pessoais com funcionalidades de:
- Rastreamento de despesas e receitas
- Categorização de transações
- Gerenciamento de cartões de crédito
- Metas de orçamento
- Previsões de gastos
- Assistente IA (Gemini 3 Flash)
- Importação de extratos bancários (OFX, CSV, PDF)
- Sistema de assinaturas com planos pagos

## User Personas
- **Usuário Principal**: Brasileiro que quer controlar suas finanças pessoais
- **Idioma**: Português (Brasil)
- **Dispositivos**: Desktop, Mobile (responsive)

## Core Requirements
### Implementado ✅
- [x] Dashboard com resumo financeiro
- [x] CRUD de transações com categorias
- [x] Gestão de orçamentos/metas
- [x] Gerenciamento de cartões de crédito
- [x] Gráficos (barras e pizza)
- [x] Previsões de gastos
- [x] Assistente IA com Gemini 3 Flash
- [x] Importação de arquivos bancários
- [x] Sistema de notificações
- [x] Exportação para Excel
- [x] **Autenticação JWT** (registro, login, verificação de token)
- [x] **Integração Stripe** para pagamentos
- [x] **Planos de assinatura** (Teste, Básico R$15, Premium R$35.90)

### Em Progresso 🔄
- [ ] Integração completa de autenticação no frontend
- [ ] Fluxo completo de upgrade de plano com Stripe

### Backlog P1
- [ ] Página de perfil do usuário
- [ ] Sincronização automática de cartões (Plaid/Belvo)
- [ ] Categorização automática por IA

### Backlog P2/P3
- [ ] Página detalhada de fatura do cartão
- [ ] Notificações push (vencimento de faturas)
- [ ] Multi-idioma

## Technical Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI main app (1200+ lines)
│   ├── auth.py            # JWT authentication
│   ├── payments.py        # Stripe integration
│   ├── ai_assistant.py    # Gemini AI chat
│   ├── bank_file_processor.py  # OFX/CSV/PDF parser
│   └── plan_manager.py    # Subscription limits
├── frontend/
│   └── src/
│       ├── App.js         # Router & Navigation
│       ├── pages/         # Dashboard, Cards, Pricing, etc.
│       └── components/    # UI components
```

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: FastAPI, Pydantic, Motor (MongoDB async)
- **Database**: MongoDB
- **AI**: Gemini 3 Flash (emergentintegrations)
- **Payments**: Stripe (emergentintegrations)

## Key API Endpoints
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual
- `POST /api/payments/checkout` - Criar sessão Stripe
- `GET /api/payments/status/{session_id}` - Status do pagamento
- `GET /api/plans/current` - Plano do usuário
- `POST /api/transactions` - Nova transação
- `POST /api/ai/chat` - Chat com IA

## Database Collections
- `users` - Usuários e autenticação
- `transactions` - Transações financeiras
- `categories` - Categorias
- `budgets` - Orçamentos/metas
- `cards` - Cartões de crédito
- `user_plans` - Planos de assinatura
- `payment_transactions` - Histórico de pagamentos
- `notifications` - Notificações

## Bugs Corrigidos (Sessão Atual)
1. ✅ Menu mobile - link Dashboard não clicável (z-index fix)
2. ✅ Cartões mostrando "R$ NaN" (used_amount || 0)
3. ✅ UsageIndicator não renderizado no Dashboard

## Integrações de Terceiros
- **Gemini 3 Flash** - Emergent LLM Key ✅
- **Stripe** - Test key sk_test_emergent ✅

## Test Credentials
- Email: teste@financeflow.com
- Password: senha123
