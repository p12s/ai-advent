# Secrets Configuration

## Important! Security

Secret files (`config.json`) are not tracked by Git and have been added to `.gitignore`.

## Telegram Setup

1. Create a bot through [@BotFather](https://t.me/BotFather) on Telegram
2. Get your bot token
3. Add the bot to a group
4. Get the group's chat ID (you can use [@userinfobot](https://t.me/userinfobot))

## GitHub Setup

1. Create a Personal Access Token on GitHub with the necessary permissions
2. Copy the token

## Configuration

### For the `07/` folder:
Create a file `07/config.json`:
```json
{
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  },
  "github": {
    "url": "http://localhost:3001",
    "token": "YOUR_GITHUB_TOKEN"
  }
}
```

### For the `github-mcp/` folder:
Create a file `github-mcp/config.json`:
```json
{
  "github": {
    "token": "YOUR_GITHUB_TOKEN"
  }
}
```

### For the `telegram-mcp/` folder:
Create a file `telegram-mcp/config.json`:
```json
{
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  }
}
```

## Running the Services

After setting up all configurations, start the services:

```bash
# GitHub MCP
cd github-mcp && ./start.sh

# Telegram MCP  
cd telegram-mcp && ./start.sh

# Web application
cd 07 && npx http-server -p 8080 --cors
```

## Security

- Never commit files with real tokens
- Use environment variables in production
- Regularly update your tokens
- Limit token permissions to the minimum necessary

