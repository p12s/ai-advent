const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3004';

async function deployHTMLWithCheck(htmlContent, filename = 'index.html', maxRetries = 3) {
    console.log(`🚀 Starting deployment of ${filename}...`);

    try {
        // 1. Get VM public IP
        console.log('📡 Getting VM public IP...');
        const ipResponse = await fetch(`${BASE_URL}/api/vm/public-ip`);
        const ipData = await ipResponse.json();
        
        if (!ipData.success) {
            throw new Error(`Failed to get VM public IP: ${ipData.error}`);
        }
        
        const publicIP = ipData.data.publicIP;
        console.log(`✅ VM public IP: ${publicIP}`);

        // 2. Deploy HTML file
        console.log('📤 Deploying HTML file...');
        const deployResponse = await fetch(`${BASE_URL}/api/deploy/html`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ htmlContent, filename })
        });
        
        const deployData = await deployResponse.json();
        
        if (!deployData.success) {
            throw new Error(`Failed to deploy HTML: ${deployData.error}`);
        }
        
        console.log(`✅ HTML file deployed: ${deployData.data.message}`);

        // 3. Check accessibility with retries
        const targetURL = `http://${publicIP}/${filename}`;
        console.log(`🔍 Checking accessibility at: ${targetURL}`);
        
        let accessible = false;
        let attempts = 0;
        
        while (!accessible && attempts < maxRetries) {
            attempts++;
            console.log(`Attempt ${attempts}/${maxRetries}...`);
            
            const checkResponse = await fetch(`${BASE_URL}/api/deploy/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetURL })
            });
            
            const checkData = await checkResponse.json();
            
            if (checkData.success && checkData.data.accessible) {
                accessible = true;
                console.log(`✅ Website is accessible! Status: ${checkData.data.statusCode}`);
                break;
            } else {
                console.log(`❌ Website not accessible yet: ${checkData.data.error || 'Unknown error'}`);
                if (attempts < maxRetries) {
                    console.log('⏳ Waiting 5 seconds before retry...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        if (!accessible) {
            throw new Error(`Website not accessible after ${maxRetries} attempts`);
        }

        console.log(`🎉 Deployment successful!`);
        console.log(`📱 Your website is available at: ${targetURL}`);
        
        return {
            success: true,
            url: targetURL,
            publicIP,
            filename
        };

    } catch (error) {
        console.error(`❌ Deployment failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function deployFromFile(filePath, filename = null) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const htmlContent = fs.readFileSync(filePath, 'utf8');
        const deployFilename = filename || path.basename(filePath);
        
        return await deployHTMLWithCheck(htmlContent, deployFilename);
    } catch (error) {
        console.error(`❌ Failed to deploy from file: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function createTestPage() {
    const testHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yandex Cloud MCP Test Page</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: white;
            padding: 2rem;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        
        .success-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        
        h1 {
            color: #333;
            margin-bottom: 1rem;
            font-size: 2rem;
        }
        
        .status {
            color: #28a745;
            font-weight: bold;
            margin-bottom: 1rem;
            font-size: 1.2rem;
        }
        
        .timestamp {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }
        
        .info {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
        }
        
        .info h3 {
            color: #495057;
            margin-bottom: 0.5rem;
        }
        
        .info p {
            color: #6c757d;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">🎉</div>
        <h1>Yandex Cloud MCP</h1>
        <div class="status">Deployment Successful!</div>
        <div class="timestamp">Deployed at: ${new Date().toLocaleString()}</div>
        
        <div class="info">
            <h3>What's working:</h3>
            <p>✅ Yandex Cloud API connection</p>
            <p>✅ SSH file upload</p>
            <p>✅ Web server configuration</p>
            <p>✅ Public accessibility</p>
        </div>
        
        <div class="info">
            <h3>Technical details:</h3>
            <p>This page was deployed using the Yandex Cloud MCP client</p>
            <p>Server: Yandex Cloud VM</p>
            <p>Protocol: HTTP/HTTPS</p>
        </div>
    </div>
</body>
</html>`;

    return testHTML;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage:');
        console.log('  node deploy-html.js <file-path> [filename]');
        console.log('  node deploy-html.js --test');
        console.log('');
        console.log('Examples:');
        console.log('  node deploy-html.js ./my-page.html');
        console.log('  node deploy-html.js ./my-page.html custom-name.html');
        console.log('  node deploy-html.js --test');
        process.exit(1);
    }

    if (args[0] === '--test') {
        console.log('🧪 Deploying test page...');
        createTestPage().then(testHTML => {
            deployHTMLWithCheck(testHTML, 'test-mcp.html');
        });
    } else {
        const filePath = args[0];
        const filename = args[1] || null;
        
        deployFromFile(filePath, filename);
    }
}

module.exports = {
    deployHTMLWithCheck,
    deployFromFile,
    createTestPage
};
