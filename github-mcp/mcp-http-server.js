const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const GITHUB_MCP_URL = process.env.GITHUB_MCP_URL || 'http://localhost:3001';

app.use('/mcp/github/*', async (req, res) => {
    try {
        const originalUrl = req.originalUrl || req.url;
        const targetUrl = `${GITHUB_MCP_URL}${originalUrl}`;
        const method = req.method;
        const headers = {
            'Content-Type': 'application/json',
            ...req.headers
        };
        
        delete headers.host;
        
        const response = await fetch(targetUrl, {
            method: method,
            headers: headers,
            body: method !== 'GET' ? JSON.stringify(req.body) : undefined
        });
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            res.status(response.status).json(data);
        } else {
            const text = await response.text();
            res.status(response.status).send(text);
        }
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to proxy request to GitHub MCP server' 
        });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'github-mcp-http-proxy',
        target: GITHUB_MCP_URL,
        timestamp: new Date().toISOString()
    });
});

app.get('/mcp/github/analysis', async (req, res) => {
    try {
        const response = await fetch(`${GITHUB_MCP_URL}/mcp/github/analysis`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json(data);
        } else {
            res.status(response.status).json({
                success: false,
                error: 'Failed to get analysis from GitHub MCP'
            });
        }
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analysis from GitHub MCP'
        });
    }
});

app.post('/tools/call', async (req, res) => {
    try {
        const response = await fetch(`${GITHUB_MCP_URL}/tools/call`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...req.headers
            },
            body: JSON.stringify(req.body)
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json(data);
        } else {
            res.status(response.status).json({
                success: false,
                error: 'Failed to call tool from GitHub MCP'
            });
        }
    } catch (error) {
        console.error('Tool call error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to call tool from GitHub MCP'
        });
    }
});

app.listen(PORT, () => {
    console.log(`GitHub MCP HTTP Proxy running on port ${PORT}`);
    console.log(`Proxying to: ${GITHUB_MCP_URL}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
