#!/bin/sh

# Start both MCP and HTTP servers
echo "Starting MCP server..."
node mcp-test-server.js &
MCP_PID=$!

echo "Starting HTTP server..."
node mcp-http-server.js &
HTTP_PID=$!

echo "Both servers started. PIDs: MCP=$MCP_PID, HTTP=$HTTP_PID"

# Wait for both processes
wait $MCP_PID $HTTP_PID
