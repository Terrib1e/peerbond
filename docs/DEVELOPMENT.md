# Development Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Setup
```bash
# Clone and setup
git clone <your-repo>
cd peerbond
npm run setup
```

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
src/
├── components/         # Reusable UI components
│   ├── ui/            # Basic UI primitives (Button, Input, etc.)
│   ├── chat/          # Chat-specific components
│   └── ai/            # AI-related components
├── pages/             # Page components (routing)
├── services/          # API calls and business logic
├── store/             # State management (Zustand)
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

### Backend (Node.js + TypeScript)
```
server/src/
├── routes/            # Express route handlers
├── services/          # Business logic
│   ├── database.ts    # Database operations
│   ├── geminiService.ts # AI facilitator logic
│   └── websocket.ts   # Real-time communication
├── middleware/        # Express middleware
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## 🔧 Development Workflow

### Starting Development
```bash
# Start both frontend and backend
npm run dev

# Start individually
npm run dev:frontend  # React dev server (port 5174)
npm run dev:server    # Node.js server (port 3003)
```

### Code Quality
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Database Development
```bash
# View database in browser
npm run db:studio

# Create new migration
cd server && npx prisma migrate dev --name your_migration_name

# Reset database (careful!)
npm run db:reset

# Seed development data
npm run db:seed
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🎯 Key Features Development

### AI Facilitator
- Logic in `server/src/services/geminiService.ts`
- Prompts are context-aware and therapeutic-focused
- Triggers based on conversation patterns and keywords
- Responses include action items and insights

### Real-time Chat
- WebSocket implementation in `server/src/services/websocket.ts`
- Frontend connection in `src/lib/websocket.ts`
- Message broadcasting and typing indicators
- Reaction system and presence tracking

### State Management
- Zustand stores in `src/store/`
- Auth state: `authStore.ts`
- Group state: `groupStore.ts`
- Minimal, focused state management

## 📱 Component Development

### UI Components
- Base components in `src/components/ui/`
- Follow Radix UI patterns
- Tailwind CSS for styling
- TypeScript for props validation

### Page Components
- Each page in `src/pages/`
- Use React Query for data fetching
- Error boundaries for resilience
- Loading states for UX

## 🔐 Security Considerations

### Frontend
- No sensitive data in localStorage
- JWT tokens in httpOnly cookies (when implemented)
- Input validation with Zod schemas
- XSS protection via React's built-in escaping

### Backend
- JWT authentication on all protected routes
- Rate limiting on authentication endpoints
- CORS configuration for specific origins
- Environment variables for secrets

## 🚀 Performance

### Frontend
- Code splitting with React.lazy
- Image optimization
- Bundle analysis with `npm run build:analyze`
- React Query for caching

### Backend
- Database query optimization
- Connection pooling
- Compression middleware
- Response caching where appropriate

## 🐛 Debugging

### Frontend Debugging
- React Developer Tools
- Browser DevTools Network tab
- Redux DevTools (for Zustand)
- Console logging in development

### Backend Debugging
- Winston logging system
- Database query logging in development
- Prisma Studio for database inspection
- PM2 for process monitoring (production)

## 📊 Monitoring

### Development
- Hot reload for instant feedback
- TypeScript errors in terminal
- ESLint warnings/errors
- Build-time error reporting

### Production
- Winston logging to files
- Error tracking (ready for Sentry integration)
- Performance monitoring
- Database query performance

## 🔄 Deployment Workflow

```bash
# Build for production
npm run build

# Test production build locally
npm run preview

# Deploy (customize for your platform)
npm run deploy
```

## 📋 Code Standards

### TypeScript
- Strict mode enabled
- Explicit return types for functions
- Interface over type when possible
- Proper error handling with try/catch

### React
- Functional components with hooks
- Custom hooks for reusable logic
- Props interfaces for all components
- Error boundaries for fault tolerance

### Node.js
- Async/await over callbacks
- Proper error handling
- Express middleware pattern
- Service layer for business logic

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes with tests
3. Ensure linting and type checking pass
4. Update documentation if needed
5. Submit PR with clear description

## 📚 Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Gemini AI Documentation](https://ai.google.dev/docs)