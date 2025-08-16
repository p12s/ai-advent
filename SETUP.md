# Настройка секретов

## Важно! Безопасность

Файлы с секретами (`config.json`) не отслеживаются Git и добавлены в `.gitignore`.

## Настройка Telegram

1. Создайте бота через [@BotFather](https://t.me/BotFather) в Telegram
2. Получите токен бота
3. Добавьте бота в группу
4. Получите chat ID группы (можно использовать [@userinfobot](https://t.me/userinfobot))

## Настройка GitHub

1. Создайте Personal Access Token на GitHub с необходимыми правами
2. Скопируйте токен

## Конфигурация

### Для папки `07/`:
Создайте файл `07/config.json`:
```json
{
  "telegram": {
    "botToken": "ВАШ_ТОКЕН_БОТА",
    "chatId": "ВАШ_CHAT_ID"
  },
  "github": {
    "url": "http://localhost:3001",
    "token": "ВАШ_GITHUB_TOKEN"
  }
}
```

### Для папки `github-mcp/`:
Создайте файл `github-mcp/config.json`:
```json
{
  "github": {
    "token": "ВАШ_GITHUB_TOKEN"
  }
}
```

### Для папки `telegram-mcp/`:
Создайте файл `telegram-mcp/config.json`:
```json
{
  "telegram": {
    "botToken": "ВАШ_ТОКЕН_БОТА",
    "chatId": "ВАШ_CHAT_ID"
  }
}
```

## Запуск

После настройки всех конфигураций запустите сервисы:

```bash
# GitHub MCP
cd github-mcp && ./start.sh

# Telegram MCP  
cd telegram-mcp && ./start.sh

# Веб-приложение
cd 07 && npx http-server -p 8080 --cors
```

## Безопасность

- Никогда не коммитьте файлы с реальными токенами
- Используйте переменные окружения в продакшене
- Регулярно обновляйте токены
- Ограничивайте права токенов минимально необходимыми
