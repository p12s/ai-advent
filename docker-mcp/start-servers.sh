#!/bin/sh

# Запускаем Docker MCP сервер в фоне
node mcp-docker-server.js &

# Ждем немного чтобы сервер запустился
sleep 2

# Запускаем HTTP прокси сервер
node mcp-http-server.js
