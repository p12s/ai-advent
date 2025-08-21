#!/bin/bash

echo "🚀 Starting Test Agent MCP Server..."

# Проверка наличия config.json
if [ ! -f "config.json" ]; then
    echo "⚠️ config.json not found, copying from example..."
    cp config.example.json config.json
    echo "📝 Please edit config.json with your settings"
fi

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Проверка Docker socket
if [ ! -S /var/run/docker.sock ]; then
    echo "❌ Docker socket not found at /var/run/docker.sock"
    echo "💡 Make sure Docker daemon is running"
    exit 1
fi

# Установка зависимостей
echo "📦 Installing dependencies..."
npm install

# Создание директорий
echo "📁 Creating directories..."
mkdir -p temp uploads

# Запуск сервера
echo "🚀 Starting MCP server on port 3005..."
echo "🌐 Starting HTTP server on port 3006..."
echo ""

# Запуск в фоновом режиме
npm start &
MCP_PID=$!

# Запуск HTTP сервера
npm run http-server &
HTTP_PID=$!

echo "✅ Test Agent MCP servers started!"
echo "📋 MCP Server PID: $MCP_PID"
echo "📋 HTTP Server PID: $HTTP_PID"
echo ""
echo "🔗 MCP Server: http://localhost:3005"
echo "🌐 HTTP Server: http://localhost:3006"
echo "📋 Health check: http://localhost:3006/health"
echo ""
echo "Press Ctrl+C to stop servers"

# Ожидание сигнала завершения
trap "echo ''; echo '🛑 Stopping servers...'; kill $MCP_PID $HTTP_PID; exit 0" INT TERM

# Ожидание завершения процессов
wait
