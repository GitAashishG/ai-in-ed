#!/bin/bash

echo "🚀 Starting AI Usage Tracking System..."
echo ""

# Check if .env exists in backend
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Creating backend/.env from root .env..."
    cp .env backend/.env
fi

# Start backend in background
echo "📡 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm run dev
