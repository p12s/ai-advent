# Test Agent MCP Server

🧪 **Test Agent MCP Server** - интеллектуальный сервис для автоматической генерации и выполнения тестов кода с помощью ИИ.

## 🚀 Возможности

- **🤖 AI-генерация тестов** - автоматическое создание unit тестов с помощью Ollama
- **🐳 Docker-изоляция** - выполнение тестов в изолированных контейнерах
- **📊 Детальная отчетность** - красивые HTML отчеты с результатами тестирования
- **🔗 MCP интеграция** - полная интеграция с существующими MCP сервисами
- **🌐 HTTP API** - удобный REST API для интеграции с веб-приложениями

## 📋 Поддерживаемые языки

- **JavaScript/TypeScript** - Jest
- **Python** - pytest
- **Java** - JUnit
- **Go** - testing
- **Ruby** - RSpec
- **PHP** - PHPUnit
- **C#** - NUnit
- **Rust** - cargo test

## 🏗️ Архитектура

```
test-agent-mcp/
├── mcp-test-server.js      # Основной MCP сервер
├── mcp-http-server.js      # HTTP API сервер
├── config.example.json     # Конфигурация
├── Dockerfile             # Docker образ
├── start.sh              # Скрипт запуска
└── README.md             # Документация
```

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd test-agent-mcp
npm install
```

### 2. Настройка конфигурации

```bash
cp config.example.json config.json
# Отредактируйте config.json под ваши нужды
```

### 3. Запуск сервиса

```bash
./start.sh
```

### 4. Проверка работоспособности

```bash
curl http://localhost:3006/health
```

## ⚙️ Конфигурация

### config.json

```json
{
  "ollama": {
    "url": "http://localhost:11434",
    "model": "phi4:14b"
  },
  "docker": {
    "url": "http://docker-mcp:3004",
    "socketPath": "/var/run/docker.sock"
  },
  "telegram": {
    "url": "http://telegram-mcp:3000"
  },
  "github": {
    "url": "http://github-mcp:3002"
  },
  "testSettings": {
    "timeout": 300,
    "memoryLimit": "512m",
    "supportedLanguages": ["javascript", "python", "java", "go"],
    "testImages": {
      "javascript": "node:18-alpine",
      "python": "python:3.11-alpine",
      "java": "openjdk:17-alpine",
      "go": "golang:1.21-alpine"
    }
  },
  "server": {
    "port": 3005,
    "httpPort": 3006
  }
}
```

## 🔌 API Endpoints

### MCP API (Port 3005)

#### Инициализация
```bash
POST /mcp/test-agent/init
```

#### Тестирование файла
```bash
POST /mcp/test-agent/test-file
Content-Type: multipart/form-data
file: <file>
```

#### Тестирование кода
```bash
POST /mcp/test-agent/test-code
Content-Type: application/json
{
  "code": "function add(a, b) { return a + b; }",
  "language": "javascript",
  "filename": "math.js"
}
```

#### Получение поддерживаемых языков
```bash
GET /mcp/test-agent/languages
```

### HTTP API (Port 3006)

#### Проверка здоровья
```bash
GET /health
```

#### Тестирование кода
```bash
POST /api/test-code
Content-Type: application/json
{
  "code": "def add(a, b): return a + b",
  "language": "python",
  "filename": "math.py"
}
```

#### Загрузка файла
```bash
POST /api/test-file
Content-Type: multipart/form-data
file: <file>
```

## 🐳 Docker

### Сборка образа

```bash
docker build -t test-agent-mcp .
```

### Запуск контейнера

```bash
docker run -d \
  --name test-agent-mcp \
  -p 3005:3005 \
  -p 3006:3006 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/config.json:/app/config.json \
  test-agent-mcp
```

## 🔗 Интеграция с другими MCP сервисами

### Docker MCP
- Развертывание HTML отчетов в контейнерах
- Управление тестовыми контейнерами

### Telegram MCP
- Отправка уведомлений о результатах тестирования
- Отправка ссылок на HTML отчеты

### GitHub MCP
- Получение кода из репозиториев
- Анализ структуры проекта

## 📊 Примеры использования

### Тестирование JavaScript кода

```javascript
const response = await fetch('http://localhost:3006/api/test-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: `
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

module.exports = { add, subtract };
    `,
    language: 'javascript',
    filename: 'math.js'
  }
});

const result = await response.json();
console.log(result.data.testResults);
```

### Тестирование Python кода

```python
import requests

response = requests.post('http://localhost:3006/api/test-code', json={
    'code': '''
def add(a, b):
    return a + b

def multiply(a, b):
    return a * b
    ''',
    'language': 'python',
    'filename': 'math.py'
})

result = response.json()
print(result['data']['testResults'])
```

## 🧪 Процесс тестирования

1. **📄 Анализ кода** - определение языка программирования
2. **🤖 Генерация тестов** - создание тестов с помощью ИИ
3. **🐳 Создание контейнера** - подготовка среды для тестирования
4. **🚀 Запуск тестов** - выполнение тестов в изолированной среде
5. **📊 Анализ результатов** - парсинг и анализ результатов
6. **📄 Создание отчета** - генерация HTML отчета
7. **🌐 Развертывание** - публикация отчета в Docker контейнере

## 🔧 Настройка тестовых фреймворков

### JavaScript/TypeScript (Jest)
```json
{
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

### Python (pytest)
```
pytest
```

### Java (JUnit)
```xml
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.8.2</version>
    <scope>test</scope>
</dependency>
```

### Go (testing)
```go
package main

import "testing"

func TestAdd(t *testing.T) {
    result := add(2, 3)
    if result != 5 {
        t.Errorf("Expected 5, got %d", result)
    }
}
```

## 🚨 Устранение неполадок

### Docker не доступен
```bash
# Проверьте статус Docker
sudo systemctl status docker

# Убедитесь что Docker socket доступен
ls -la /var/run/docker.sock
```

### Ollama не отвечает
```bash
# Проверьте статус Ollama
curl http://localhost:11434/api/tags

# Запустите Ollama если не запущен
ollama serve
```

### Проблемы с портами
```bash
# Проверьте занятые порты
netstat -tulpn | grep :3005
netstat -tulpn | grep :3006

# Измените порты в config.json если нужно
```

## 📈 Мониторинг

### Логи сервера
```bash
# Просмотр логов MCP сервера
tail -f logs/mcp-server.log

# Просмотр логов HTTP сервера
tail -f logs/http-server.log
```

### Метрики
- Количество выполненных тестов
- Время выполнения тестов
- Успешность тестов
- Использование ресурсов

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License - см. файл LICENSE для деталей.

## 🆘 Поддержка

- 📧 Email: support@ai-advent.com
- 💬 Telegram: @ai_advent_support
- 🐛 Issues: GitHub Issues

---

**🧪 Test Agent MCP Server** - автоматизируйте тестирование кода с помощью ИИ!
