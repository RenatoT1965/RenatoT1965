# 🚀 Guia Rápido - FinanceFlow

## Instalação em 3 Passos

### Passo 1: Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --port 8001
```

### Passo 2: Frontend Web
```bash
cd frontend
yarn install
yarn start
```

### Passo 3: App Mobile
```bash
cd mobile
npm install
npx expo start
# Escaneie o QR Code com Expo Go
```

---

## 📱 Baixar Expo Go

| Android | iOS |
|---------|-----|
| [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) | [App Store](https://apps.apple.com/app/expo-go/id982107779) |

---

## 🔑 Credenciais de Teste

```
Email: teste@financeflow.com
Senha: senha123
```

---

## 📦 Estrutura do Projeto

```
financeflow/
├── backend/          → API FastAPI + MongoDB
├── frontend/         → Web App React
├── mobile/           → App Nativo Expo
└── README.md         → Documentação completa
```

---

## 🏪 Publicar nas Lojas

```bash
# Android
npx eas build --platform android

# iOS
npx eas build --platform ios
```

| Loja | Custo |
|------|-------|
| Google Play | US$ 25 (única vez) |
| Apple App Store | US$ 99/ano |

---

## ✨ Features Principais

| Feature | Web | Mobile |
|---------|-----|--------|
| Dashboard | ✅ | ✅ |
| Transações | ✅ | ✅ |
| Cartões | ✅ | ✅ |
| Metas | ✅ | ✅ |
| Gráficos | ✅ | 🔜 |
| IA Chat | ✅ | ✅ |
| Importar arquivos | ✅ | 🔜 |
| Notificações | ✅ | 🔜 |

---

## 🆘 Precisa de Ajuda?

1. Leia o `README.md` completo
2. Verifique se o MongoDB está rodando
3. Confirme as variáveis de ambiente
4. Teste primeiro no navegador web
