#!/bin/bash

echo "🧪 Запуск тестирования интеграции test-agent-mcp с ycloud-mcp..."
echo ""

# Проверяем, что ycloud-mcp запущен
echo "🔍 Проверка доступности ycloud-mcp..."
if curl -s http://localhost:3004/health > /dev/null; then
    echo "✅ ycloud-mcp доступен"
else
    echo "❌ ycloud-mcp недоступен. Убедитесь, что сервис запущен на порту 3004"
    exit 1
fi

echo ""

# Запускаем тест интеграции
echo "🚀 Запуск теста интеграции..."
node test-integration.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Тест интеграции прошел успешно!"
    echo "📋 Теперь можно тестировать через веб-интерфейс"
else
    echo ""
    echo "❌ Тест интеграции провалился!"
    echo "🔧 Проверьте конфигурацию и доступность сервисов"
    exit 1
fi
