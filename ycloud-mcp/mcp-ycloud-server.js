const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { Client } = require('ssh2');

const app = express();
const PORT = 3004;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let config = {};
try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (error) {
    console.error('Error loading config:', error);
}

const ycloudConfig = {
    oauthToken: config.ycloud?.oauthToken,
    folderId: config.ycloud?.folderId,
    vmId: config.ycloud?.vmId
};

const sshConfig = {
    host: config.ssh?.host,
    port: config.ssh?.port || 22,
    username: config.ssh?.username,
    privateKeyPath: config.ssh?.privateKeyPath,
    password: config.ssh?.password
};

const deploymentConfig = {
    htmlDirectory: config.deployment?.htmlDirectory || '/var/www/html',
    backupDirectory: config.deployment?.backupDirectory || '/var/www/backup'
};

const YCLOUD_API_BASE = 'https://compute.api.cloud.yandex.net/compute/v1';

async function makeYCloudRequest(endpoint, method = 'GET', body = null) {
    try {
        const url = `${YCLOUD_API_BASE}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${ycloudConfig.oauthToken}`,
            'Content-Type': 'application/json'
        };

        const options = {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        };

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`Yandex Cloud API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Yandex Cloud API request failed:', error);
        throw error;
    }
}

async function getVMInfo() {
    try {
        const endpoint = `/instances/${ycloudConfig.vmId}`;
        const vmInfo = await makeYCloudRequest(endpoint);
        return {
            id: vmInfo.id,
            name: vmInfo.name,
            status: vmInfo.status,
            platformId: vmInfo.platformId,
            zoneId: vmInfo.zoneId,
            networkInterfaces: vmInfo.networkInterfaces,
            metadata: vmInfo.metadata
        };
    } catch (error) {
        console.error('Error getting VM info:', error);
        throw error;
    }
}

async function getVMPublicIP() {
    try {
        const vmInfo = await getVMInfo();
        const networkInterface = vmInfo.networkInterfaces?.[0];
        if (networkInterface && networkInterface.primaryV4Address) {
            return networkInterface.primaryV4Address.address;
        }
        throw new Error('No public IP found for VM');
    } catch (error) {
        console.error('Error getting VM public IP:', error);
        throw error;
    }
}

async function executeSSHCommand(command) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        
        conn.on('ready', () => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    conn.end();
                    reject(err);
                    return;
                }

                let stdout = '';
                let stderr = '';

                stream.on('close', (code) => {
                    conn.end();
                    if (code === 0) {
                        resolve({ stdout, stderr, code });
                    } else {
                        reject(new Error(`Command failed with code ${code}: ${stderr}`));
                    }
                }).on('data', (data) => {
                    stdout += data.toString();
                }).stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            });
        }).on('error', (err) => {
            reject(err);
        }).connect({
            host: sshConfig.host,
            port: sshConfig.port,
            username: sshConfig.username,
            privateKey: sshConfig.privateKeyPath ? fs.readFileSync(sshConfig.privateKeyPath) : undefined,
            password: sshConfig.password
        });
    });
}

async function uploadFileToVM(localFilePath, remoteFilePath) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        
        conn.on('ready', () => {
            conn.sftp((err, sftp) => {
                if (err) {
                    conn.end();
                    reject(err);
                    return;
                }

                sftp.fastPut(localFilePath, remoteFilePath, (err) => {
                    conn.end();
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }).on('error', (err) => {
            reject(err);
        }).connect({
            host: sshConfig.host,
            port: sshConfig.port,
            username: sshConfig.username,
            privateKey: sshConfig.privateKeyPath ? fs.readFileSync(sshConfig.privateKeyPath) : undefined,
            password: sshConfig.password
        });
    });
}

async function deployHTMLFile(htmlContent, filename = 'index.html') {
    try {
        const tempFilePath = path.join(__dirname, 'temp', filename);
        const tempDir = path.dirname(tempFilePath);
        
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        fs.writeFileSync(tempFilePath, htmlContent);
        
        const remoteFilePath = `${deploymentConfig.htmlDirectory}/${filename}`;
        
        await uploadFileToVM(tempFilePath, remoteFilePath);
        
        fs.unlinkSync(tempFilePath);
        
        return {
            success: true,
            message: `HTML file ${filename} deployed successfully`,
            remotePath: remoteFilePath
        };
    } catch (error) {
        console.error('Error deploying HTML file:', error);
        throw error;
    }
}

async function checkWebsiteAccessibility(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            timeout: 10000
        });
        
        return {
            accessible: response.ok,
            statusCode: response.status,
            statusText: response.statusText,
            url: url
        };
    } catch (error) {
        return {
            accessible: false,
            error: error.message,
            url: url
        };
    }
}

app.get('/api/vm/info', async (req, res) => {
    try {
        const vmInfo = await getVMInfo();
        res.json({ success: true, data: vmInfo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/vm/public-ip', async (req, res) => {
    try {
        const publicIP = await getVMPublicIP();
        res.json({ success: true, data: { publicIP } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/deploy/html', async (req, res) => {
    try {
        const { htmlContent, filename } = req.body;
        
        if (!htmlContent) {
            return res.status(400).json({ success: false, error: 'HTML content is required' });
        }

        const result = await deployHTMLFile(htmlContent, filename);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/deploy/check', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        const result = await checkWebsiteAccessibility(url);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/ssh/execute', async (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ success: false, error: 'Command is required' });
        }

        const result = await executeSSHCommand(command);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'healthy',
        config: {
            ycloudConfigured: !!ycloudConfig.oauthToken,
            sshConfigured: !!(sshConfig.host && sshConfig.username),
            deploymentConfigured: true
        }
    });
});

app.listen(PORT, () => {
    console.log(`Yandex Cloud MCP Server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET  /api/vm/info - Get VM information');
    console.log('  GET  /api/vm/public-ip - Get VM public IP');
    console.log('  POST /api/deploy/html - Deploy HTML file');
    console.log('  POST /api/deploy/check - Check website accessibility');
    console.log('  POST /api/ssh/execute - Execute SSH command');
    console.log('  GET  /api/health - Health check');
});
