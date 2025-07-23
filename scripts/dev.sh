#!/bin/bash

# PeerBond Development Script

echo "🚀 Starting PeerBond development servers..."

# Check if environment is set up
if [ ! -f "server/.env" ]; then
    echo "❌ Environment file not found. Run 'npm run setup' first."
    exit 1
fi

# Start both frontend and backend in parallel
npm run dev