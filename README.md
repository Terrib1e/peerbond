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
│   │   ├── agents/        # AI agent implementations
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic & AI
│   │   ├── tools/         # AI tool implementations
│   │   ├── middleware/    # Express middleware
│   │   └── types/         # TypeScript definitions
│   ├── tests/
│   │   └── manual/        # Manual integration tests
│   └── prisma/            # Database schema & migrations
├── docs/                  # Comprehensive documentation
│   ├── README.md          # Documentation index
│   ├── CLAUDE.md          # AI agent architecture guide
│   ├── INTERVIEW_PREP.md  # Project demo & pitch guide
│   ├── GEMINI_SETUP.md    # AI setup instructions
│   └── ...                # Architecture, deployment, etc.
├── scripts/               # Build and setup scripts
│   ├── setup.sh           # Main setup script
│   ├── quick-setup.sh     # Quick demo setup
│   └── dev.sh             # Development helper
├── examples/              # Code examples
└── [configuration files]  # Package.json, tsconfig, etc.
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

**Getting Started:**
- [Project Overview](docs/README.md) - Comprehensive project documentation
- [Gemini AI Setup](docs/GEMINI_SETUP.md) - Configure AI integration
- [Development Guide](docs/DEVELOPMENT.md) - Development workflow

**AI System:**
- [AI Agent Architecture](docs/CLAUDE.md) - Multi-agent system design
- [Tool System Guide](docs/TOOL_SYSTEM_GUIDE.md) - AI tool implementation
- [Interview Prep](docs/INTERVIEW_PREP.md) - Demo guide and pitch

**Deployment:**
- [Deployment Guide](docs/deployment.md) - Production deployment
- [Architecture](docs/architecture.md) - System architecture
- [Monitoring](docs/monitoring.md) - Observability setup

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

## 🔑 Environment Setup

Copy the example environment file and configure:

```bash
cp server/.env.example server/.env
```

Required environment variables:
- `GEMINI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com/)
- `JWT_SECRET` - Random secure string
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