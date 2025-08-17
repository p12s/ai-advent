#!/bin/bash

echo "🛑 Stopping MCP services..."

docker-compose down

echo "✅ All services stopped"
echo ""
echo "To start use: ./start-docker.sh"
