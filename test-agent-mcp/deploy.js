const fs = require('fs-extra');
const path = require('path');

class Deploy {
    constructor() {
        this.testResults = new Map();
    }

    async deployTestResults(testId, result, testData) {
        try {
            console.log(`🌐 Deploying test results for ${testId}`);
            const webDir = path.join(__dirname, 'web-results', testId);
            await fs.ensureDir(webDir);
            console.log(`📁 Created web directory: ${webDir}`);

            const htmlContent = await this.generateResultsHTML(testId, result, testData);
            await fs.writeFile(path.join(webDir, 'index.html'), htmlContent);
            console.log(`📄 Created HTML file for test ${testId}`);

            if (result.resultFiles) {
                for (const [fileName, content] of Object.entries(result.resultFiles)) {
                    const filePath = path.join(webDir, fileName);
                    await fs.ensureDir(path.dirname(filePath));
                    await fs.writeFile(filePath, content);
                }
                console.log(`📁 Copied ${Object.keys(result.resultFiles).length} result files`);
            }

            const port = await this.findAvailablePort(8080);
            console.log(`🔍 Found available port: ${port}`);
            const webUrl = await this.startResultsServer(webDir, port, testId);
            console.log(`✅ Deployed test results at: ${webUrl}`);

            return webUrl;

        } catch (error) {
            console.error('❌ Error deploying test results:', error);
            return null;
        }
    }

    async generateResultsHTML(testId, result, testData) {
        const timestamp = new Date().toLocaleString('en-US');
        const status = result.success ? 'success' : 'error';
        const statusText = result.success ? 'Success' : 'Error';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Results - ${testId}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            margin: 0;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .status-${status} {
            background: ${result.success ? '#38a169' : '#e53e3e'};
            color: white;
            padding: 15px 30px;
            border-radius: 25px;
            display: inline-block;
            font-weight: 600;
            margin-top: 15px;
        }
        
        .content {
            padding: 40px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .info-card {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        
        .info-title {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 10px;
        }
        
        .info-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #667eea;
        }
        
        .logs {
            background: #2d3748;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            overflow-x: auto;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .refresh-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            margin: 20px 0;
        }
        
        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Results</h1>
            <p>ID: ${testId}</p>
            <div class="status-${status}">${statusText}</div>
        </div>
        
        <div class="content">
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-title">Status</div>
                    <div class="info-value">${statusText}</div>
                </div>
                <div class="info-card">
                    <div class="info-title">Execution Time</div>
                    <div class="info-value">${Math.round(result.duration / 1000)}s</div>
                </div>
                <div class="info-card">
                    <div class="info-title">Exit Code</div>
                    <div class="info-value">${result.statusCode || 'N/A'}</div>
                </div>
                <div class="info-card">
                    <div class="info-title">Created</div>
                    <div class="info-value">${timestamp}</div>
                </div>
            </div>
            
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
            
            <h3>📋 Execution Logs:</h3>
            <div class="logs">${this.escapeHtml(result.logs || 'Logs not available')}</div>
            
            ${result.resultFiles && Object.keys(result.resultFiles).length > 0 ? `
            <h3>📁 Result Files:</h3>
            <ul>
                ${Object.keys(result.resultFiles).map(fileName => 
                    `<li><a href="${fileName}" target="_blank">${fileName}</a></li>`
                ).join('')}
            </ul>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
    }

    async startResultsServer(webDir, port, testId) {
        try {
            console.log(`🔧 Starting results server for test ${testId} on port ${port}`);
            const express = require('express');
            const app = express();
            
            app.use(express.static(webDir));
            
            const server = app.listen(port, () => {
                console.log(`✅ Test results server running on port ${port} for test ${testId}`);
            });

            server.on('error', (error) => {
                console.error(`❌ Error starting results server for test ${testId}:`, error);
            });

            this.testResults.set(testId, { server, port, webDir });
            console.log(`📝 Saved server info for test ${testId}, total active servers: ${this.testResults.size}`);

            return `http://localhost:${port}`;
        } catch (error) {
            console.error(`❌ Failed to start results server for test ${testId}:`, error);
            throw error;
        }
    }

    async findAvailablePort(startPort) {
        const net = require('net');
        
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(startPort, () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
            server.on('error', () => {
                resolve(this.findAvailablePort(startPort + 1));
            });
        });
    }

    async cleanupWebServer(testId) {
        try {
            if (testId && this.testResults.has(testId)) {
                const { server, webDir } = this.testResults.get(testId);
                server.close();
                this.testResults.delete(testId);
                
                setTimeout(async () => {
                    if (await fs.pathExists(webDir)) {
                        await fs.remove(webDir);
                    }
                }, 300000);
            }
        } catch (error) {
            console.error('Web server cleanup error:', error);
        }
    }

    escapeHtml(text) {
        const div = require('util').TextEncoder ? 
            new TextEncoder().encode(text).toString() : 
            text.replace(/[&<>"']/g, (match) => {
                const escape = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                };
                return escape[match];
            });
        return text;
    }
}

module.exports = Deploy;
