FROM node:18-alpine

WORKDIR /app

# Установка зависимостей для сборки и Docker
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    docker \
    docker-compose \
    git \
    curl

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm install --production

# Копирование исходного кода
COPY . .

# Создание необходимых директорий
RUN mkdir -p uploads test-runs web-results logs public

# Установка прав на скрипты
RUN chmod +x start-agent.sh start-both-servers.sh start-simple.sh

# Открытие портов
EXPOSE 3005 3006

# Переменные окружения
ENV NODE_ENV=production
ENV HTTP_PORT=3006
ENV MCP_PORT=3005

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3006/health || exit 1

# Команда запуска обоих серверов
CMD ["./start-simple.sh"]
