# GitHub Push MCP Server

MCP сервер для автоматического пуша файлов в GitHub репозиторий `https://github.com/p12s/ai-advent-package.git`.

## Возможности

- Загрузка любого файла в указанный GitHub репозиторий
- Автоматическое создание коммитов с осмысленными сообщениями
- Поддержка кастомных путей в репозитории
- Обновление существующих файлов

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Получите GitHub Personal Access Token:
   - Перейдите на https://github.com/settings/tokens
   - Создайте новый token с правами `repo` (для приватных репозиториев) или `public_repo` (для публичных)
   - Добавьте токен в файл `.env`:
   ```
   GITHUB_TOKEN=your_actual_token_here
   ```

## Запуск

```bash
npm start
```

Для разработки с автоперезагрузкой:
```bash
npm run dev
```

## Использование

MCP сервер предоставляет один инструмент: `push_file_to_github`

### Параметры:

- `filePath` (обязательный) - путь к файлу для загрузки
- `targetPath` (опциональный) - путь в репозитории, по умолчанию используется имя файла
- `commitMessage` (опциональный) - сообщение коммита, по умолчанию генерируется автоматически

### Пример использования:

```json
{
  "name": "push_file_to_github",
  "arguments": {
    "filePath": "/path/to/your/file.txt",
    "targetPath": "docs/file.txt",
    "commitMessage": "Add documentation file"
  }
}
```

## Конфигурация MCP клиента

Добавьте в конфигурацию вашего MCP клиента:

```json
{
  "mcpServers": {
    "github-push": {
      "command": "node",
      "args": ["/path/to/github-mcp2/index.js"],
      "env": {
        "GITHUB_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Безопасность

- Никогда не коммитьте файл `.env` с реальными токенами
- Используйте минимально необходимые права для GitHub токена
- Регулярно обновляйте токены доступа

## Лицензия

MIT
