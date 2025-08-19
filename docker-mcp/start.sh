#!/bin/bash

echo "🐳 Docker MCP Server Setup"
echo "=========================="

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Пожалуйста, установите Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Требуется Node.js 18+. Текущая версия: $(node -v)"
    exit 1
fi

echo "✅ Node.js версия: $(node -v)"

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен"
    exit 1
fi

echo "✅ npm версия: $(npm -v)"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Пожалуйста, установите Docker"
    exit 1
fi

echo "✅ Docker версия: $(docker --version)"

# Проверка Docker daemon
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon не запущен. Пожалуйста, запустите Docker"
    exit 1
fi

echo "✅ Docker daemon запущен"

# Установка зависимостей
echo ""
echo "📦 Установка зависимостей..."
if [ ! -d "node_modules" ]; then
    npm install
else
    npm install
fi

# Проверка портов
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Порт $port уже занят"
        return 1
    fi
    return 0
}

if ! check_port 3003; then
    echo "Пожалуйста, освободите порт 3003 или измените его в mcp-docker-server.js"
    exit 1
fi

if ! check_port 3004; then
    echo "Пожалуйста, освободите порт 3004 или измените его в mcp-http-server.js"
    exit 1
fi

echo "✅ Порты 3003 и 3004 свободны"

# Создание конфигурации
if [ ! -f "config.json" ]; then
    echo ""
    echo "⚙️  Создание конфигурации..."
    cp config.example.json config.json
    echo "✅ Конфигурация создана. При необходимости отредактируйте config.json"
fi

# Запуск серверов
echo ""
echo "🚀 Запуск серверов..."

# Запуск Docker MCP сервера в фоне
echo "Запуск Docker MCP сервера на порту 3003..."
node mcp-docker-server.js &
DOCKER_MCP_PID=$!

# Ожидание запуска
sleep 2

# Проверка запуска Docker MCP сервера
if ! curl -s http://localhost:3003/mcp/docker/health > /dev/null; then
    echo "❌ Docker MCP сервер не запустился"
    kill $DOCKER_MCP_PID 2>/dev/null
    exit 1
fi

echo "✅ Docker MCP сервер запущен (PID: $DOCKER_MCP_PID)"

# Запуск HTTP прокси в фоне
echo "Запуск HTTP прокси на порту 3004..."
node mcp-http-server.js &
PROXY_PID=$!

# Ожидание запуска
sleep 2

# Проверка запуска прокси
if ! curl -s http://localhost:3004/health > /dev/null; then
    echo "❌ HTTP прокси не запустился"
    kill $DOCKER_MCP_PID $PROXY_PID 2>/dev/null
    exit 1
fi

echo "✅ HTTP прокси запущен (PID: $PROXY_PID)"

# Сохранение PID в файл
echo $DOCKER_MCP_PID > .docker-mcp.pid
echo $PROXY_PID > .proxy.pid

echo ""
echo "🎉 Все серверы запущены успешно!"
echo ""
echo "📋 Информация о серверах:"
echo "   Docker MCP Server: http://localhost:3003"
echo "   HTTP Proxy:        http://localhost:3004"
echo ""
echo "🔗 Основные эндпоинты:"
echo "   Health Check:      http://localhost:3003/mcp/docker/health"
echo "   Containers:        http://localhost:3003/mcp/docker/containers"
echo "   Images:            http://localhost:3003/mcp/docker/images"
echo "   System Info:       http://localhost:3003/mcp/docker/system/info"
echo ""
echo "🧪 Запуск тестов:"
echo "   npm test"
echo ""
echo "🛑 Остановка серверов:"
echo "   kill \$(cat .docker-mcp.pid) \$(cat .proxy.pid)"
echo "   или"
echo "   pkill -f 'mcp-docker-server.js'"
echo "   pkill -f 'mcp-http-server.js'"
echo ""

# Ожидание сигнала завершения
trap 'echo ""; echo "🛑 Остановка серверов..."; kill $DOCKER_MCP_PID $PROXY_PID 2>/dev/null; rm -f .docker-mcp.pid .proxy.pid; echo "✅ Серверы остановлены"; exit 0' INT TERM

# Ожидание
echo "Нажмите Ctrl+C для остановки серверов..."
wait
