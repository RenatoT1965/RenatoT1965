# 💰 FinanceFlow

**Aplicativo completo de gestão financeira pessoal** com Web App e App Mobile Nativo.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20iOS%20%7C%20Android-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 📋 Índice

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Como Usar](#-como-usar)
- [API Reference](#-api-reference)
- [Publicação nas Lojas](#-publicação-nas-lojas)
- [Suporte](#-suporte)

---

## ✨ Features

### 📊 Dashboard
- [x] Visão geral do saldo atual
- [x] Resumo de receitas e despesas do mês
- [x] Gráfico de progresso das metas
- [x] Transações recentes
- [x] Ações rápidas para adicionar transações

### 💳 Gestão de Cartões de Crédito
- [x] Cadastro ilimitado de cartões (plano Premium)
- [x] Cores personalizadas por banco (Nubank, Inter, Itaú, etc.)
- [x] Controle de limite utilizado
- [x] Datas de fechamento e vencimento
- [x] Fatura atual com detalhes

### 💰 Transações
- [x] Registro de receitas e despesas
- [x] Categorização por tipo
- [x] Múltiplos métodos de pagamento (PIX, Cartão, Dinheiro, etc.)
- [x] Filtros por tipo (todas, receitas, despesas)
- [x] Histórico completo

### 🎯 Metas e Orçamentos
- [x] Definição de limites mensais/semanais
- [x] Barra de progresso visual
- [x] Alertas ao atingir 80% do limite
- [x] Alertas sonoros configuráveis
- [x] Metas por categoria ou total

### 📈 Gráficos e Relatórios
- [x] Gráfico de barras (receitas vs despesas)
- [x] Gráfico de pizza (despesas por categoria)
- [x] Exportação para Excel (.xlsx)
- [x] Análise mensal comparativa

### 🔮 Previsões
- [x] Previsão de gastos futuros
- [x] Análise de tendências
- [x] Sugestões de economia

### 🤖 Assistente IA (Gemini)
- [x] Chat em tempo real
- [x] Análise personalizada dos seus gastos
- [x] Dicas de economia
- [x] Planejamento financeiro
- [x] Respostas contextualizadas

### 📥 Importação de Dados
- [x] Importação de arquivos OFX (extrato bancário)
- [x] Importação de arquivos CSV
- [x] Importação de arquivos PDF (com IA)
- [x] Categorização automática

### 🔔 Notificações
- [x] Central de notificações
- [x] Alertas de metas excedidas
- [x] Lembretes de vencimento de fatura
- [x] Marcar como lida/não lida

### 👤 Gestão de Conta
- [x] Registro e Login seguros (JWT)
- [x] Edição de perfil (nome, senha)
- [x] Visualização do plano atual
- [x] Histórico de uso

### 🎁 Onboarding
- [x] Tour guiado para novos usuários
- [x] Configuração inicial de cartão
- [x] Definição de primeira meta
- [x] Dicas de uso

### 💎 Planos de Assinatura
| Recurso | Teste Grátis | Básico (R$15) | Premium (R$35,90) |
|---------|--------------|---------------|-------------------|
| Duração | 14 dias | Mensal | Mensal |
| Transações/mês | Ilimitado | 50 | Ilimitado |
| Cartões | Ilimitado | 3 | Ilimitado |
| Mensagens IA/mês | Ilimitado | 20 | Ilimitado |
| Importação de arquivos | ✅ | ❌ | ✅ |
| Exportação Excel | ✅ | ❌ | ✅ |
| Suporte prioritário | ❌ | ❌ | ✅ |

### 📱 App Mobile Nativo
- [x] Disponível para iOS e Android
- [x] Interface otimizada para touch
- [x] Navegação por tabs
- [x] Armazenamento seguro de credenciais
- [x] Sincronização em tempo real com o servidor

---

## 🛠 Tecnologias

### Backend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Python | 3.11+ | Linguagem principal |
| FastAPI | 0.104+ | Framework web |
| MongoDB | 6.0+ | Banco de dados |
| Motor | 3.3+ | Driver async MongoDB |
| PyJWT | 2.8+ | Autenticação |
| Pydantic | 2.5+ | Validação de dados |

### Frontend Web
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18+ | Framework UI |
| Tailwind CSS | 3.3+ | Estilização |
| Shadcn/UI | - | Componentes |
| Recharts | 2.10+ | Gráficos |
| Axios | 1.6+ | HTTP Client |
| React Router | 6+ | Navegação |

### Mobile
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React Native | 0.81+ | Framework mobile |
| Expo | 54+ | Plataforma de build |
| React Navigation | 7+ | Navegação |
| Expo SecureStore | 15+ | Armazenamento seguro |

### Integrações
| Serviço | Uso |
|---------|-----|
| Gemini 3 Flash | Assistente IA |
| Stripe | Pagamentos |

---

## 🚀 Instalação

### Pré-requisitos

```bash
# Node.js 18+
node --version

# Python 3.11+
python --version

# MongoDB 6+
mongod --version
```

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/financeflow.git
cd financeflow
```

### 2. Configuração do Backend

```bash
# Acesse a pasta do backend
cd backend

# Crie um ambiente virtual
python -m venv venv

# Ative o ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 3. Configuração do Frontend Web

```bash
# Acesse a pasta do frontend
cd frontend

# Instale as dependências
yarn install
# ou
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com a URL do backend
```

### 4. Configuração do App Mobile

```bash
# Acesse a pasta mobile
cd mobile

# Instale as dependências
npm install

# Configure a URL da API
# Edite src/services/api.js com a URL do seu backend
```

---

## ⚙️ Configuração

### Variáveis de Ambiente - Backend (.env)

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=financeflow

# JWT
JWT_SECRET=sua_chave_secreta_aqui

# Stripe (obtenha em https://dashboard.stripe.com)
STRIPE_API_KEY=sk_test_...

# Gemini AI (Emergent LLM Key ou sua própria)
EMERGENT_LLM_KEY=sk-emergent-...

# CORS
CORS_ORIGINS=*
```

### Variáveis de Ambiente - Frontend (.env)

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Configuração Mobile (src/services/api.js)

```javascript
const API_URL = 'http://SEU_IP:8001/api';
export default API_URL;
```

> **Dica:** Para testar no celular, use o IP da sua máquina na rede local (ex: `http://192.168.1.100:8001/api`)

---

## 🎮 Como Usar

### Iniciar o Backend

```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Iniciar o Frontend Web

```bash
cd frontend
yarn start
# Acesse http://localhost:3000
```

### Iniciar o App Mobile

```bash
cd mobile
npx expo start
```

**Opções de teste mobile:**
- 📱 **Expo Go (Recomendado):** Escaneie o QR Code com o app Expo Go
- 🤖 **Emulador Android:** Pressione `a` no terminal
- 🍎 **Simulador iOS:** Pressione `i` no terminal (requer Mac)
- 🌐 **Web:** Pressione `w` no terminal

### Credenciais de Teste

```
Email: teste@financeflow.com
Senha: senha123
```

---

## 📚 API Reference

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrar novo usuário |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Obter usuário atual |
| PUT | `/api/auth/profile` | Atualizar perfil |
| PUT | `/api/auth/password` | Alterar senha |

### Transações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/transactions` | Listar transações |
| POST | `/api/transactions` | Criar transação |
| PUT | `/api/transactions/{id}` | Atualizar transação |
| DELETE | `/api/transactions/{id}` | Excluir transação |

### Cartões

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/cards` | Listar cartões |
| POST | `/api/cards` | Criar cartão |
| GET | `/api/cards/{id}/invoice` | Obter fatura atual |
| DELETE | `/api/cards/{id}` | Excluir cartão |

### Orçamentos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/budgets` | Listar orçamentos |
| POST | `/api/budgets` | Criar orçamento |
| PUT | `/api/budgets/{id}` | Atualizar orçamento |
| DELETE | `/api/budgets/{id}` | Excluir orçamento |

### IA

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/ai/chat` | Enviar mensagem para IA |
| GET | `/api/ai/insights` | Obter insights automáticos |

### Pagamentos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/payments/checkout` | Criar sessão de checkout |
| GET | `/api/payments/status/{id}` | Verificar status do pagamento |

---

## 🏪 Publicação nas Lojas

### Google Play Store

1. **Criar conta de desenvolvedor**
   - Acesse: https://play.google.com/console
   - Taxa única: US$ 25

2. **Gerar build de produção**
   ```bash
   cd mobile
   npx eas build --platform android
   ```

3. **Fazer upload do APK/AAB**
   - Acesse o Google Play Console
   - Crie um novo app
   - Faça upload do arquivo gerado

### Apple App Store

1. **Criar conta de desenvolvedor**
   - Acesse: https://developer.apple.com
   - Taxa anual: US$ 99

2. **Gerar build de produção**
   ```bash
   cd mobile
   npx eas build --platform ios
   ```

3. **Submeter via App Store Connect**
   - Acesse: https://appstoreconnect.apple.com
   - Crie um novo app
   - Faça upload via Transporter ou EAS

### Checklist antes de publicar

- [ ] Testar todas as funcionalidades
- [ ] Configurar chaves de produção do Stripe
- [ ] Configurar URL de produção da API
- [ ] Criar ícone do app (1024x1024)
- [ ] Criar screenshots para a loja
- [ ] Escrever descrição do app
- [ ] Definir categoria e tags
- [ ] Configurar política de privacidade
- [ ] Configurar termos de uso

---

## 🆘 Suporte

### FAQ

**P: O app funciona offline?**
R: Atualmente, o app requer conexão com a internet. Modo offline está no roadmap.

**P: Como recuperar minha senha?**
R: Acesse a tela de login e clique em "Esqueci minha senha" (em desenvolvimento).

**P: Posso cancelar minha assinatura?**
R: Sim, você pode cancelar a qualquer momento pelo perfil ou Stripe.

### Contato

- 📧 Email: suporte@financeflow.com
- 💬 Discord: [FinanceFlow Community](#)
- 🐛 Bugs: [GitHub Issues](#)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Feito com ❤️ por FinanceFlow Team
</p>
