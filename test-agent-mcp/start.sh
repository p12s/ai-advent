#!/bin/bash

echo "🚀 Starting Test Agent server..."

if [ ! -f "config.json" ]; then
    echo "⚠️ config.json not found, copying from example..."
    cp config.example.json config.json
    echo "📝 Please edit config.json with your settings"
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

if [ ! -S /var/run/docker.sock ]; then
    echo "❌ Docker socket not found at /var/run/docker.sock"
    echo "💡 Make sure Docker daemon is running"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "📁 Creating directories..."
mkdir -p uploads test-runs web-results public

echo "🚀 Starting server on port 3006..."
node mcp-http-server.js
