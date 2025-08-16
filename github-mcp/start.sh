#!/bin/bash

echo "🚀 Starting GitHub MCP servers..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js to continue."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Install npm to continue."
    exit 1
fi

if [ ! -f "config.json" ]; then
    echo "⚠️  config.json not found. Create it based on config.example.json"
    echo "   cp config.example.json config.json"
    echo "   Then edit config.json with your GitHub data"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $port is already in use. Stop the process on this port."
        return 1
    fi
    return 0
}

echo "🔍 Checking ports..."
if ! check_port 3001; then
    exit 1
fi
if ! check_port 3002; then
    exit 1
fi

echo "🔧 Starting GitHub MCP server on port 3001..."
node mcp-github-server.js &
GITHUB_PID=$!

sleep 2

if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ GitHub MCP server failed to start"
    kill $GITHUB_PID 2>/dev/null
    exit 1
fi

echo "✅ GitHub MCP server started (PID: $GITHUB_PID)"

echo "🌐 Starting HTTP proxy on port 3002..."
node mcp-http-server.js &
PROXY_PID=$!

sleep 2

if ! curl -s http://localhost:3002/health > /dev/null; then
    echo "❌ HTTP proxy failed to start"
    kill $GITHUB_PID $PROXY_PID 2>/dev/null
    exit 1
fi

echo "✅ HTTP proxy started (PID: $PROXY_PID)"

echo ""
echo "🎉 All GitHub MCP services started!"
echo ""
echo "📊 Service status:"
echo "   GitHub MCP Server: http://localhost:3001/health"
echo "   HTTP Proxy:        http://localhost:3002/health"
echo ""
echo "🔗 Available endpoints:"
echo "   POST /mcp/github/init     - Initialize GitHub MCP"
echo "   GET  /mcp/github/user     - Get user data"
echo "   GET  /mcp/github/repos    - Get repositories"
echo "   GET  /mcp/github/analysis - Full GitHub analysis"
echo ""
echo "🛑 Press Ctrl+C to stop"

cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $GITHUB_PID $PROXY_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
