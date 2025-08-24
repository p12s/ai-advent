#!/bin/bash

echo "Starting Yandex Cloud MCP Server..."

if [ ! -f "config.json" ]; then
    echo "Error: config.json not found!"
    echo "Please copy config.example.json to config.json and update with your credentials"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting MCP server on port 3004..."
node mcp-ycloud-server.js
