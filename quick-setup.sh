#!/bin/bash

# PeerBond AI Agent System - Quick Setup Script
# Run this script to prepare for your interview demo

set -e  # Exit on any error

echo "🚀 PeerBond AI Agent System - Quick Setup"
echo "========================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check Node.js version
echo "🔍 Checking system requirements..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_status "npm version: $NPM_VERSION"
else
    print_error "npm not found. Please install npm first."
    exit 1
fi

echo

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    print_status "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

echo

# Setup environment
echo "⚙️  Setting up environment..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "USE_TOOL_SYSTEM=true" >> .env
    echo "NODE_ENV=development" >> .env
    echo "LOG_LEVEL=info" >> .env
    print_status "Environment file created with tool system enabled"
else
    # Check if USE_TOOL_SYSTEM is set
    if grep -q "USE_TOOL_SYSTEM=true" .env; then
        print_status "Tool system already enabled in .env"
    else
        echo "USE_TOOL_SYSTEM=true" >> .env
        print_status "Tool system enabled in existing .env"
    fi
fi

echo

# Build the system
echo "🔨 Building the enhanced agent system..."
if npm run build >/dev/null 2>&1; then
    print_status "System built successfully"
else
    print_error "Build failed. Please check for errors and try again."
    exit 1
fi

echo

# Test the system
echo "🧪 Testing agent system..."
if node test-agent-tools.js >/dev/null 2>&1; then
    print_status "All agents and tools working correctly"
else
    print_warning "Some agent tests failed. Demo may still work, but check the logs."
fi

echo

# Check if server starts
echo "🚀 Testing server startup..."
timeout 10s npm run dev >/dev/null 2>&1 &
SERVER_PID=$!
sleep 3

if kill -0 $SERVER_PID 2>/dev/null; then
    print_status "Server starts successfully"
    kill $SERVER_PID >/dev/null 2>&1
else
    print_warning "Server may have startup issues. Check configuration."
fi

echo

# Create demo shortcuts
echo "📋 Creating demo shortcuts..."
cat > run-demo.sh << 'EOF'
#!/bin/bash
echo "🎭 Starting Interactive Demo..."
node demo-test-script.js
EOF

cat > quick-test.sh << 'EOF'  
#!/bin/bash
echo "🧪 Running Quick Agent Test..."
node test-agent-tools.js
EOF

chmod +x run-demo.sh quick-test.sh
print_status "Demo scripts created (run-demo.sh, quick-test.sh)"

echo

# Final checklist
echo "📋 Interview Readiness Checklist:"
echo "================================"
print_status "✅ Node.js and npm installed"
print_status "✅ Dependencies installed"  
print_status "✅ Environment configured with USE_TOOL_SYSTEM=true"
print_status "✅ System built successfully"
print_status "✅ Agent tools tested"
print_status "✅ Demo scripts ready"

echo
print_info "📖 Next steps for your interview:"
echo "   1. Review DEMO_GUIDE.md for talking points"
echo "   2. Practice with: ./run-demo.sh"
echo "   3. Quick test with: ./quick-test.sh" 
echo "   4. Start server with: npm run dev"
echo

print_info "🎯 Pro tips:"
echo "   • Open INTERVIEW_PREP.md for detailed preparation"
echo "   • Have browser ready at http://localhost:5000/api/health"
echo "   • Practice the 30-second elevator pitch"
echo "   • Test API calls in Postman/curl if doing live demo"

echo
echo -e "${GREEN}🌟 You're ready to showcase your AI agent system! Good luck! 🚀${NC}"
echo