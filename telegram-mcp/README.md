# MCP Telegram Server

MCP (Model Context Protocol) server for Telegram bot integration.

## Overview

This server enables sending messages and development plans to Telegram groups through the MCP protocol.

### Getting Telegram Chat ID for Private Groups

If you need to integrate with Telegram private groups, follow these steps to get the chat ID:

1. **Create a Telegram bot and get the bot token:**
   - Message @BotFather on Telegram
   - Use `/newbot` command to create a new bot
   - Save the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Add your bot to the private group:**
   - Add the bot as an administrator to your private group
   - Ensure the bot has permission to read messages

3. **Get the chat ID using Telegram API:**
   ```bash
   # Replace YOUR_BOT_TOKEN with your actual bot token
   curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates"
   ```

4. **Send a test message to the group:**
   - Have someone send a message in the group
   - Or send a message yourself if you're a member

5. **Retrieve the chat ID from the response:**
   ```bash
   # Run the getUpdates command again
   curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates"
   ```

   The response will contain the chat ID in the format:
   ```json
   {
     "ok": true,
     "result": [
       {
         "update_id": 123456789,
         "message": {
           "message_id": 1,
           "from": {...},
           "chat": {
             "id": -1001234567890,  // This is your chat ID
             "title": "Your Group Name",
             "type": "supergroup"
           },
           "date": 1234567890,
           "text": "Hello"
         }
       }
     ]
   }
   ```

6. **Use the chat ID in your configuration:**
   - For private groups, the chat ID will be negative (e.g., `-1001234567890`)
   - For public groups, it might start with `@` (e.g., `@groupname`)
   - For direct messages, it will be positive (e.g., `123456789`)

## Installation

```bash
cd telegram-mcp
npm install
```

## Configuration

1. Copy `config.example.json` to `config.json`
2. Fill in your actual data:
   - `botToken` - your Telegram bot token
   - `chatId` - your Telegram group ID

## Usage

### Quick Start - All Services
```bash
./start.sh
```

This script automatically:
- Installs dependencies
- Starts MCP HTTP server on port 3000
- Launches web application on port 8080

### Manual Launch

#### MCP HTTP Server
```bash
npm run http-server
```

#### MCP Telegram Server
```bash
npm start
```

## API Endpoints

- `POST /mcp/telegram/init` - Initialize bot
- `POST /mcp/telegram/send-dialog-start` - Send dialog start message
- `POST /mcp/telegram/send-plan` - Send final plan
- `GET /health` - Server health check

## File Structure

```
telegram-mcp/
├── mcp-telegram-server.js    # MCP server
├── mcp-http-server.js        # HTTP server
├── package.json              # Dependencies
├── config.json              # Configuration (not in git)
├── config.example.json      # Configuration example
├── start.sh                 # All services launcher
└── README.md                # Documentation
```
