#!/bin/bash

echo "📋 Viewing MCP service logs..."
echo ""

if [ "$1" = "web" ]; then
    echo "🌐 Web application logs:"
    docker-compose logs -f web-app
elif [ "$1" = "telegram" ]; then
    echo "📱 Telegram MCP logs:"
    docker-compose logs -f telegram-mcp
elif [ "$1" = "github" ]; then
    echo "🐙 GitHub MCP logs:"
    docker-compose logs -f github-mcp
elif [ "$1" = "docker" ]; then
    echo "🐳 Docker MCP logs:"
    docker-compose logs -f docker-mcp
elif [ "$1" = "test" ]; then
    echo "🧪 Test Agent MCP logs:"
    docker-compose logs -f test-agent-mcp
else
    echo "📊 All service logs:"
    docker-compose logs -f
fi
