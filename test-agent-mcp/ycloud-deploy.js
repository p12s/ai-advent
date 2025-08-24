const fetch = require('node-fetch');

class YCloudDeploy {
    constructor(config) {
        this.config = config;
        this.uploadUrl = config.ycloud?.uploadUrl || 'http://localhost:3006'; // file-upload-server
        this.baseUrl = config.ycloud?.url || 'http://localhost:3004'; // основной mcp-ycloud-server
    }

    async deployTestResults(htmlContent, testId, filename = null) {
        try {
            console.log(`🚀 Deploying test results to Yandex Cloud for test ${testId}`);
            
            // Используем IP из конфигурации
            const publicIP = this.config.host?.replace('http://', '').replace('https://', '') || 'localhost';
            console.log(`✅ Using configured VM public IP: ${publicIP}`);

            // 2. Deploy HTML file - ВСЕГДА используем переданное название от test-agent-mcp
            if (!filename) {
                throw new Error('Filename is required from test-agent-mcp');
            }
            console.log(`📁 Using filename from test-agent-mcp: ${filename}`);
            console.log('📤 Deploying HTML file...');
            const deployResponse = await fetch(`${this.uploadUrl}/upload/content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    htmlContent, 
                    filename 
                })
            });
            
            const deployData = await deployResponse.json();
            console.log('🔍 Deploy response data:', JSON.stringify(deployData, null, 2));
            
            if (!deployData.success) {
                throw new Error(`Failed to deploy HTML: ${deployData.error}`);
            }
            
            if (deployData.data && deployData.data.message) {
                console.log(`✅ HTML file deployed: ${deployData.data.message}`);
            } else {
                console.log(`✅ HTML file deployed successfully (no message)`);
            }

            // 3. Check accessibility
            const targetURL = `http://${publicIP}/${filename}`;
            console.log(`🔍 Checking accessibility at: ${targetURL}`);
            
            const checkResponse = await fetch(`${this.baseUrl}/api/deploy/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetURL })
            });
            
            const checkData = await checkResponse.json();
            
            if (!checkData.success || !checkData.data.accessible) {
                throw new Error(`Website not accessible: ${checkData.data.error || 'Unknown error'}`);
            }

            console.log(`🎉 Deployment successful!`);
            console.log(`📱 Test results available at: ${targetURL}`);
            
            return {
                success: true,
                url: targetURL,
                publicIP,
                filename
            };

        } catch (error) {
            console.error(`❌ Yandex Cloud deployment failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getVMInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/api/vm/info`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(`Failed to get VM info: ${data.error}`);
            }
            
            return data.data;
        } catch (error) {
            console.error('Error getting VM info:', error);
            throw error;
        }
    }
}

module.exports = YCloudDeploy;
