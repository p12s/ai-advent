# Docker MCP Server

Мощный MCP (Model Context Protocol) сервер для управления Docker контейнерами, развертывания приложений и мониторинга контейнеров.

## Возможности

- 🐳 **Управление контейнерами** - Создание, запуск, остановка и удаление контейнеров
- 📦 **Управление образами** - Загрузка и управление Docker образами
- 📊 **Мониторинг системы** - Информация о Docker системе и ресурсах
- 📋 **Логи контейнеров** - Получение логов контейнеров в реальном времени
- 🔗 **RESTful API** - Чистые HTTP эндпоинты для легкой интеграции
- 🚀 **Двойная архитектура** - MCP сервер + HTTP прокси для максимальной гибкости
- 🛡️ **Безопасность** - Поддержка Docker socket и TCP соединений

## Быстрый старт

### Требования

- Node.js 18+ (с встроенной поддержкой fetch)
- npm или yarn
- Docker (установленный и запущенный)

### Установка

1. **Клонирование и установка зависимостей:**
   ```bash
   cd docker-mcp
   npm install
   ```

2. **Настройка конфигурации:**
   ```bash
   cp config.example.json config.json
   ```

3. **При необходимости отредактируйте `config.json`:**
   ```json
   {
     "docker": {
       "socketPath": "/var/run/docker.sock",
       "host": "localhost",
       "port": 2375
     }
   }
   ```

### Запуск сервисов

#### Вариант 1: Быстрый старт (Рекомендуется)
```bash
./start.sh
```

Этот скрипт автоматически:
- Проверяет установку Node.js и npm
- Устанавливает зависимости
- Проверяет доступность портов
- Запускает Docker MCP сервер (порт 3003)
- Запускает HTTP прокси сервер (порт 3004)

#### Вариант 2: Ручной запуск

**Запуск Docker MCP сервера:**
```bash
npm start
# или
node mcp-docker-server.js
```

**Запуск HTTP прокси (опционально):**
```bash
npm run http-server
# или
node mcp-http-server.js
```

**Запуск тестов:**
```bash
npm test
# или
node test-docker-api.js
```

## API Справочник

### Инициализация

**POST** `/mcp/docker/init`

Инициализация Docker MCP с настройками подключения.

```json
{
  "socketPath": "/var/run/docker.sock",
  "host": "localhost",
  "port": 2375
}
```

### Информация о системе

**GET** `/mcp/docker/system/info`

Получение информации о Docker системе.

**GET** `/mcp/docker/health`

Проверка состояния Docker соединения.

### Управление контейнерами

**GET** `/mcp/docker/containers`

Получение списка всех контейнеров.

**POST** `/mcp/docker/container/create`

Создание нового контейнера.

```json
{
  "imageName": "nginx:alpine",
  "containerName": "my-nginx",
  "options": {
    "HostConfig": {
      "PortBindings": {
        "80/tcp": [{ "HostPort": "8080" }]
      }
    }
  }
}
```

**POST** `/mcp/docker/container/start`

Запуск контейнера.

```json
{
  "containerId": "container_id_here"
}
```

**POST** `/mcp/docker/container/stop`

Остановка контейнера.

```json
{
  "containerId": "container_id_here"
}
```

**DELETE** `/mcp/docker/container/remove`

Удаление контейнера.

```json
{
  "containerId": "container_id_here",
  "force": false
}
```

**GET** `/mcp/docker/container/logs/:containerId`

Получение логов контейнера.

```
GET /mcp/docker/container/logs/container_id?tail=100
```

### Управление образами

**GET** `/mcp/docker/images`

Получение списка всех образов.

**POST** `/mcp/docker/image/pull`

Загрузка образа из реестра.

```json
{
  "imageName": "nginx",
  "tag": "alpine"
}
```

## Примеры использования

### Развертывание веб-приложения

```bash
# Создание контейнера с nginx
curl -X POST http://localhost:3003/mcp/docker/container/create \
  -H "Content-Type: application/json" \
  -d '{
    "imageName": "nginx:alpine",
    "containerName": "my-website",
    "options": {
      "HostConfig": {
        "PortBindings": {
          "80/tcp": [{ "HostPort": "8080" }]
        }
      }
    }
  }'
```

### Мониторинг контейнеров

```bash
# Получение списка контейнеров
curl http://localhost:3003/mcp/docker/containers

# Получение логов контейнера
curl http://localhost:3003/mcp/docker/container/logs/container_id?tail=50
```

### Управление жизненным циклом

```bash
# Остановка контейнера
curl -X POST http://localhost:3003/mcp/docker/container/stop \
  -H "Content-Type: application/json" \
  -d '{"containerId": "container_id"}'

# Удаление контейнера
curl -X DELETE http://localhost:3003/mcp/docker/container/remove \
  -H "Content-Type: application/json" \
  -d '{"containerId": "container_id", "force": true}'
```

## HTTP Прокси

Сервер также предоставляет HTTP прокси на порту 3004 для упрощения интеграции:

```bash
# Через прокси
curl http://localhost:3004/api/mcp/docker/containers
curl http://localhost:3004/api/mcp/docker/system/info
```

## Тестирование

Запустите тесты для проверки функциональности:

```bash
npm test
```

Для очистки тестовых контейнеров:

```bash
node test-docker-api.js --cleanup
```

## Конфигурация

### Docker Socket (Linux/macOS)

По умолчанию используется Unix socket:

```json
{
  "docker": {
    "socketPath": "/var/run/docker.sock"
  }
}
```

### Docker TCP (Windows/Remote)

Для TCP соединения:

```json
{
  "docker": {
    "host": "localhost",
    "port": 2375
  }
}
```

## Безопасность

- Убедитесь, что Docker daemon настроен правильно
- Используйте Docker socket только в доверенной среде
- Для продакшена настройте TLS соединение с Docker daemon

## Устранение неполадок

### Docker не доступен

```bash
# Проверка Docker daemon
docker info

# Проверка прав доступа к socket
ls -la /var/run/docker.sock
```

### Порт занят

Измените порты в файлах:
- `mcp-docker-server.js` (порт 3003)
- `mcp-http-server.js` (порт 3004)

### Ошибки подключения

Проверьте конфигурацию в `config.json` и убедитесь, что Docker daemon запущен.

## Лицензия

MIT License
