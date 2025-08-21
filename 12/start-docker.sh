#!/bin/bash

echo "🚀 Starting MCP services in Docker..."

echo "🛑 Stopping existing containers..."
docker-compose down

echo "🔨 Building and starting containers..."
docker-compose up --build -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "📊 Container status:"
docker-compose ps

echo "🔍 Checking service availability..."

echo "📱 Checking Telegram MCP..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Telegram MCP available"
else
    echo "❌ Telegram MCP unavailable"
fi

echo "🐙 Checking GitHub MCP..."
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ GitHub MCP available"
else
    echo "❌ GitHub MCP unavailable"
fi

echo "🐳 Checking Docker MCP..."
if curl -s http://localhost:3004/health > /dev/null; then
    echo "✅ Docker MCP available"
else
    echo "❌ Docker MCP unavailable"
fi

echo "🧪 Checking Test Agent MCP..."
if curl -s http://localhost:3006/health > /dev/null; then
    echo "✅ Test Agent MCP available"
else
    echo "❌ Test Agent MCP unavailable"
fi

echo "🌐 Checking web application..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Web application available"
else
    echo "❌ Web application unavailable"
fi

echo ""
echo "🎉 All services started!"
echo "📱 Telegram MCP: http://localhost:3000"
echo "🐙 GitHub MCP: http://localhost:3002"
echo "🐳 Docker MCP: http://localhost:3004"
echo "🧪 Test Agent MCP: http://localhost:3006"
echo "🌐 Web application: http://localhost:8080"
echo ""
echo "To view logs use: docker-compose logs -f"
echo "To stop use: docker-compose down"
