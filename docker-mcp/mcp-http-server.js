const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3004;

const DOCKER_MCP_URL = process.env.DOCKER_MCP_URL || 'http://localhost:3003';

app.use(cors());
app.use(express.json());

app.use('/api', async (req, res) => {
    try {
        const url = `${DOCKER_MCP_URL}${req.url}`;
        const method = req.method;
        const headers = {
            'Content-Type': 'application/json',
            ...req.headers
        };
        
        delete headers.host;
        
        const options = {
            method,
            headers,
            body: method !== 'GET' ? JSON.stringify(req.body) : undefined
        };
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Proxy error', 
            details: error.message 
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Docker MCP HTTP Proxy is running',
        docker_mcp_url: DOCKER_MCP_URL
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'Docker MCP HTTP Proxy',
        version: '1.0.0',
        description: 'HTTP proxy for Docker MCP Server',
        endpoints: {
            health: '/health',
            api: '/api/*',
            docker_mcp: DOCKER_MCP_URL
        },
        usage: {
            init: 'POST /api/mcp/docker/init',
            containers: 'GET /api/mcp/docker/containers',
            images: 'GET /api/mcp/docker/images',
            create_container: 'POST /api/mcp/docker/container/create',
            start_container: 'POST /api/mcp/docker/container/start',
            stop_container: 'POST /api/mcp/docker/container/stop',
            remove_container: 'DELETE /api/mcp/docker/container/remove',
            container_logs: 'GET /api/mcp/docker/container/logs/:containerId',
            container_inspect: 'GET /api/mcp/docker/container/inspect/:containerId',
            container_exec: 'POST /api/mcp/docker/container/exec',
            pull_image: 'POST /api/mcp/docker/image/pull',
            system_info: 'GET /api/mcp/docker/system/info',
            health_check: 'GET /api/mcp/docker/health'
        }
    });
});

app.listen(PORT, () => {
    console.log(`Docker MCP HTTP Proxy running on port ${PORT}`);
    console.log(`Proxy URL: http://localhost:${PORT}`);
    console.log(`Docker MCP URL: ${DOCKER_MCP_URL}`);
});
