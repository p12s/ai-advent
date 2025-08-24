const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3004';

async function deployDirect(htmlContent, filename = 'index.html') {
    console.log(`🚀 Starting direct deployment of ${filename}...`);

    try {
        // 1. Deploy HTML file directly via SSH
        console.log('📤 Deploying HTML file via SSH...');
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

        // 2. Get SSH host from config
        const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
        const sshHost = config.ssh.host;
        
        if (!sshHost) {
            throw new Error('SSH host not configured');
        }

        // 3. Check accessibility
        const targetURL = `http://${sshHost}/${filename}`;
        console.log(`🔍 Checking accessibility at: ${targetURL}`);
        
        const checkResponse = await fetch(`${BASE_URL}/api/deploy/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetURL })
        });
        
        const checkData = await checkResponse.json();
        
        if (checkData.success && checkData.data.accessible) {
            console.log(`✅ Website is accessible! Status: ${checkData.data.statusCode}`);
            console.log(`🎉 Deployment successful!`);
            console.log(`📱 Your website is available at: ${targetURL}`);
            
            return {
                success: true,
                url: targetURL,
                host: sshHost,
                filename
            };
        } else {
            console.log(`❌ Website not accessible: ${checkData.data.error || 'Unknown error'}`);
            return {
                success: false,
                error: 'Website not accessible after deployment',
                url: targetURL
            };
        }

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
        
        return await deployDirect(htmlContent, deployFilename);
    } catch (error) {
        console.error(`❌ Failed to deploy from file: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage:');
        console.log('  node deploy-direct.js <file-path> [filename]');
        console.log('');
        console.log('Examples:');
        console.log('  node deploy-direct.js ./simple-test.html');
        console.log('  node deploy-direct.js ./simple-test.html custom-name.html');
        process.exit(1);
    }

    const filePath = args[0];
    const filename = args[1] || null;
    
    deployFromFile(filePath, filename);
}

module.exports = {
    deployDirect,
    deployFromFile
};
