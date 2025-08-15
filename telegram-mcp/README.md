# MCP Telegram Server

MCP (Model Context Protocol) server for Telegram bot integration.

## Overview

This server enables sending messages and development plans to Telegram groups through the MCP protocol.

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
