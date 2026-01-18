# PeerBond

**AI-powered peer support groups for mental health and recovery**

PeerBond connects people in small, carefully matched groups with AI-facilitated discussions to improve engagement and outcomes in mental health and recovery support.

## 🚀 Quick Start

```bash
# Install dependencies
npm install
cd server && npm install

# Set up environment
cp server/.env.example server/.env
# Add your GEMINI_API_KEY to server/.env

# Start development
npm run dev
```

## 📁 Project Structure

```
peerbond/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── services/          # API and business logic
│   ├── store/             # State management (Zustand)
│   └── types/             # TypeScript definitions
├── server/                # Backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic & AI
│   │   ├── middleware/    # Express middleware
│   │   └── types/         # TypeScript definitions
│   └── prisma/            # Database schema & migrations
├── docs/                  # Documentation
└── scripts/               # Build and deployment scripts
```

## ✨ Features

- 🤖 **AI Facilitator** powered by Gemini 2.0 Flash
- 💬 **Real-time Chat** with WebSocket support
- 🔐 **HIPAA Compliance** with data encryption
- 📊 **Analytics Dashboard** for therapists
- 💳 **Subscription Management** with Stripe
- 🎯 **Smart Matching** algorithm for group formation

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS + Radix UI
- Zustand + React Query
- Vite build tool

**Backend:**
- Node.js + Express + TypeScript
- Prisma ORM + SQLite
- Socket.IO for real-time features
- Google Gemini 2.0 Flash AI

## 📚 Documentation

- [Project Overview](docs/README.md)
- [Gemini AI Setup](docs/GEMINI_SETUP.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 🧑‍💻 Development

```bash
# Frontend development
npm run dev:frontend

# Backend development  
npm run dev:server

# Full stack development
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Code quality
npm run lint
npm run typecheck
```

## 🔐 Security

### ⚠️ CRITICAL: Never Commit Secrets!

**ALWAYS follow these security practices:**

1. **Copy environment templates** (these files are already gitignored):
   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

2. **Add your actual API keys** to `.env` files (NOT to `.env.example`)

3. **Verify files are gitignored:**
   ```bash
   git check-ignore .env server/.env
   # Should output: .env and server/.env
   ```

### 🔑 API Key Management

**Get your API keys:**
- **Gemini API:** https://aistudio.google.com/
- **OpenAI API:** https://platform.openai.com/api-keys

**Security rules:**
- ✅ Store keys in `.env` files ONLY
- ✅ Use environment variables in code: `process.env.GEMINI_API_KEY`
- ❌ NEVER hardcode keys in source code
- ❌ NEVER commit `.env` files
- ❌ NEVER share keys via email/chat
- 🔄 Rotate keys every 90 days

### 🚨 If You Expose a Key

**Act immediately:**

1. **Revoke the key** in provider's console
2. **Generate a new key** 
3. **Update local `.env`** with new key
4. **Remove from git history** (see [docs/SECURITY.md](docs/SECURITY.md))

### 📚 Security Documentation

- **[Full Security Guide](docs/SECURITY.md)** - Comprehensive security practices
- **[Quick Reference](docs/SECURITY_QUICK_REFERENCE.md)** - Quick security checklist

### 🛡️ Automated Security

This repository includes:
- ✅ Pre-commit hooks to detect secrets
- ✅ GitHub Actions security scanning
- ✅ Comprehensive `.gitignore` patterns

## 🔑 Environment Setup

Copy the example environment file and configure:

```bash
cp server/.env.example server/.env
```

Required environment variables:
- `GEMINI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com/)
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `DATABASE_URL` - Database connection string

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for mental health and recovery support**