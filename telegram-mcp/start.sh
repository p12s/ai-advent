#!/bin/bash

echo "🚀 Starting MCP Telegram Integration..."

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🤖 Starting MCP HTTP server on port 3000..."
npm run http-server &
MCP_PID=$!

sleep 2

if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ MCP HTTP server started successfully"
else
    echo "❌ Failed to start MCP HTTP server"
    exit 1
fi

echo "🌐 Starting web application on port 8080..."
cd ../06
npx http-server -p 8080 --cors &
WEB_PID=$!
cd ..

sleep 2

echo ""
echo "🎉 All services are running!"
echo ""
echo "📱 Web application: http://localhost:8080"
echo "🔧 MCP Health check: http://localhost:3000/health"
echo ""
echo "💡 Remember to update Telegram configuration in:"
echo "   - config.json"
echo "   - ../06/app.js (telegramConfig variable)"
echo ""
echo "🛑 Press Ctrl+C to stop"

cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $MCP_PID 2>/dev/null
    kill $WEB_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
