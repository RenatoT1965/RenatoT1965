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
- **Dispositivos**: Desktop, Mobile (responsive), App Nativo (iOS/Android)

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
- [x] **Tela de Login/Registro** com validação
- [x] **Página de Perfil** do usuário com estatísticas
- [x] **Proteção de rotas** - redirecionamento automático para login
- [x] **Tela de Onboarding** para novos usuários (4 passos)
- [x] **Edição de Perfil** (nome e senha)
- [x] **App Mobile Nativo** (React Native/Expo) para iOS e Android

## Mobile App (/app/mobile)
### Telas Implementadas
- **AuthScreen** - Login e Registro
- **DashboardScreen** - Resumo financeiro, ações rápidas, metas
- **TransactionsScreen** - Lista de transações com filtros
- **CardsScreen** - Cartões de crédito com cores das bandeiras
- **AIAssistantScreen** - Chat com IA (Gemini)
- **ProfileScreen** - Perfil, uso do plano, logout

### Como Testar o App Mobile
1. Instale o app **Expo Go** no celular:
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

2. No terminal, execute:
   ```bash
   cd /app/mobile
   npx expo start
   ```

3. Escaneie o QR Code com o Expo Go

### Como Publicar nas Lojas
1. Criar conta de desenvolvedor:
   - Google Play: US$ 25 (única vez)
   - Apple Developer: US$ 99/ano

2. Gerar build de produção:
   ```bash
   npx eas build --platform all
   ```

3. Submeter para revisão nas lojas

### Backlog P1
- [ ] Sincronização automática de cartões (Plaid/Belvo)
- [ ] Categorização automática por IA
- [ ] Notificações por email

### Backlog P2/P3
- [ ] Página detalhada de fatura do cartão
- [ ] Notificações push (vencimento de faturas)
- [ ] Multi-idioma
- [ ] Temas (dark mode)

## Technical Architecture
```
/app
├── backend/           # API FastAPI
├── frontend/          # Web App React
└── mobile/            # App Nativo Expo/React Native
    ├── App.js         # Entry point com navegação
    └── src/
        ├── screens/   # Telas do app
        ├── contexts/  # AuthContext
        ├── services/  # API config
        └── utils/     # Theme, helpers
```

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: FastAPI, Pydantic, Motor (MongoDB async)
- **Database**: MongoDB
- **AI**: Gemini 3 Flash (emergentintegrations)
- **Payments**: Stripe (emergentintegrations)
- **Auth**: JWT (PyJWT)

## Key API Endpoints
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual (requires Bearer token)
- `PUT /api/auth/profile` - Atualizar nome
- `PUT /api/auth/password` - Alterar senha
- `POST /api/payments/checkout` - Criar sessão Stripe
- `GET /api/payments/status/{session_id}` - Status do pagamento
- `GET /api/plans/current` - Plano do usuário

## Onboarding Flow
1. **Welcome** - Boas-vindas e apresentação das funcionalidades
2. **Card** - Adicionar primeiro cartão (opcional)
3. **Budget** - Definir meta de gastos mensais (opcional)
4. **Complete** - Confirmação e próximos passos

## Test Credentials
- Email: teste@financeflow.com
- Password: senha123

## Integrações de Terceiros
- **Gemini 3 Flash** - Emergent LLM Key ✅
- **Stripe** - Test key sk_test_emergent ✅

