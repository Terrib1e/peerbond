#!/bin/bash

# PeerBond Development Setup Script

set -e

echo "🚀 Setting up PeerBond development environment..."

# Check Node.js version
echo "📋 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit server/.env and add your GEMINI_API_KEY"
else
    echo "✅ Environment file already exists"
fi

# Generate Prisma client
echo "🗄️  Setting up database..."
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your Gemini API key to server/.env"
echo "2. Run 'npm run dev' to start development servers"
echo ""
echo "📚 Documentation: docs/README.md"
echo "🔑 API Setup: docs/GEMINI_SETUP.md"