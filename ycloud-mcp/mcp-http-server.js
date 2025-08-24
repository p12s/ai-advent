const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const YCLOUD_MCP_SERVER = 'http://localhost:3004';

app.use('/api', async (req, res) => {
    try {
        const url = `${YCLOUD_MCP_SERVER}${req.url}`;
        const method = req.method;
        const headers = {
            'Content-Type': 'application/json'
        };

        const options = {
            method,
            headers,
            body: method !== 'GET' ? JSON.stringify(req.body) : undefined
        };

        const response = await fetch(url, options);
        
        if (response.headers.get('content-type')?.includes('application/json')) {
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
            error: 'Failed to proxy request to Yandex Cloud MCP server' 
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'Yandex Cloud MCP HTTP Server is running',
        port: PORT,
        target: YCLOUD_MCP_SERVER
    });
});

app.listen(PORT, () => {
    console.log(`Yandex Cloud MCP HTTP Server running on port ${PORT}`);
    console.log(`Proxying requests to: ${YCLOUD_MCP_SERVER}`);
});
