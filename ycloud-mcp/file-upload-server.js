const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3006;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const YCLOUD_MCP_SERVER = 'http://localhost:3004';

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Endpoint для загрузки HTML файлов
app.post('/upload/html', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }

        const fileContent = req.file.buffer.toString('utf8');
        const filename = req.body.filename || req.file.originalname || 'index.html';

        console.log(`📤 Uploading file: ${filename} (${fileContent.length} bytes)`);

        // Отправляем файл на MCP сервер для деплоя
        const deployResponse = await fetch(`${YCLOUD_MCP_SERVER}/api/deploy/html`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                htmlContent: fileContent, 
                filename: filename 
            })
        });

        const deployData = await deployResponse.json();

        if (!deployData.success) {
            throw new Error(`Deployment failed: ${deployData.error}`);
        }

        // Получаем IP адрес VM для проверки доступности
        const ipResponse = await fetch(`${YCLOUD_MCP_SERVER}/api/vm/public-ip`);
        const ipData = await ipResponse.json();
        
        let targetURL = null;
        if (ipData.success) {
            targetURL = `http://${ipData.data.publicIP}/${filename}`;
        }

        res.json({
            success: true,
            message: `File ${filename} uploaded and deployed successfully`,
            filename: filename,
            size: fileContent.length,
            targetURL: targetURL,
            deployment: deployData.data
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint для загрузки HTML контента напрямую
app.post('/upload/content', async (req, res) => {
    try {
        const { htmlContent, filename = 'index.html' } = req.body;

        if (!htmlContent) {
            return res.status(400).json({ 
                success: false, 
                error: 'HTML content is required' 
            });
        }

        console.log(`📤 Uploading content: ${filename} (${htmlContent.length} bytes)`);

        // Отправляем контент на MCP сервер для деплоя
        const deployResponse = await fetch(`${YCLOUD_MCP_SERVER}/api/deploy/html`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                htmlContent: htmlContent, 
                filename: filename 
            })
        });

        const deployData = await deployResponse.json();

        if (!deployData.success) {
            throw new Error(`Deployment failed: ${deployData.error}`);
        }

        // Получаем IP адрес VM для проверки доступности
        const ipResponse = await fetch(`${YCLOUD_MCP_SERVER}/api/vm/public-ip`);
        const ipData = await ipResponse.json();
        
        let targetURL = null;
        if (ipData.success) {
            targetURL = `http://${ipData.data.publicIP}/${filename}`;
        }

        res.json({
            success: true,
            message: `Content uploaded and deployed successfully`,
            filename: filename,
            size: htmlContent.length,
            targetURL: targetURL,
            deployment: deployData.data
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint для проверки статуса
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'File Upload Server is running',
        port: PORT,
        endpoints: [
            'POST /upload/html - Upload HTML file',
            'POST /upload/content - Upload HTML content',
            'GET /health - Health check'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`File Upload Server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST /upload/html - Upload HTML file');
    console.log('  POST /upload/content - Upload HTML content');
    console.log('  GET /health - Health check');
});
