#!/bin/sh

node mcp-docker-server.js &

sleep 2

node mcp-http-server.js
