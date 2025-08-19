/**
 * Docker Report Manager
 * Module for managing Docker containers with HTML reports
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

/**
 * Parses GitHub data from markdown report
 * @param {string} reportContent - Markdown report content
 * @returns {Object|null} Structured GitHub data or null on error
 */
function parseGitHubDataFromReport(reportContent) {
    const data = {
        user: 'Unknown',
        totalRepositories: 0,
        totalIssues: 0,
        repositories: []
    };
    
    try {
        const userMatch = reportContent.match(/Пользователь.*?(\w+)/);
        if (userMatch) {
            data.user = userMatch[1];
        }
        
        const totalReposMatch = reportContent.match(/Всего репозиториев.*?(\d+)/);
        if (totalReposMatch) {
            data.totalRepositories = parseInt(totalReposMatch[1]);
        }
        
        const totalIssuesMatch = reportContent.match(/Неразрешенных задач.*?(\d+)/);
        if (totalIssuesMatch) {
            data.totalIssues = parseInt(totalIssuesMatch[1]);
        }
        
        const repoMatches = reportContent.match(/### (.*?)\n- \*\*Описание\*\*: (.*?)\n- \*\*Открытых задач\*\*: (\d+)/g);
        if (repoMatches) {
            data.repositories = repoMatches.map(match => {
                const parts = match.match(/### (.*?)\n- \*\*Описание\*\*: (.*?)\n- \*\*Открытых задач\*\*: (\d+)/);
                if (parts) {
                    const [fullName, description, issues] = parts.slice(1);
                    const [owner, name] = fullName.split('/');
                    return {
                        owner: owner || 'Unknown',
                        name: name || fullName,
                        description: description,
                        issues: parseInt(issues)
                    };
                }
                return null;
            }).filter(repo => repo !== null);
        }
        
    } catch (error) {
        console.error('Error parsing GitHub data from report:', error);
    }
    
    return data;
}

/**
 * Creates HTML report based on GitHub data
 * @param {Object} githubData - Structured GitHub data
 * @returns {string|null} HTML report or null on error
 */
function createHtmlReport(githubData) {
    if (!githubData) return null;
    
    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Analysis - ${githubData.user || 'User'}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .header {
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
            color: white;
            padding: 60px 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }
        
        .header h1 {
            font-size: 3.5rem;
            margin-bottom: 15px;
            font-weight: 700;
            position: relative;
            z-index: 1;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .header .subtitle {
            font-size: 1.3rem;
            opacity: 0.9;
            position: relative;
            z-index: 1;
            font-weight: 300;
        }
        
        .content {
            padding: 50px 40px;
        }
        
        .section {
            margin-bottom: 50px;
        }
        
        .section h2 {
            font-size: 2.2rem;
            color: #1a202c;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 4px solid #667eea;
            display: flex;
            align-items: center;
            font-weight: 600;
        }
        
        .section h2::before {
            content: '';
            width: 12px;
            height: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            margin-right: 15px;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 35px 25px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        .stat-card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            transform: rotate(45deg);
            transition: all 0.3s ease;
        }
        
        .stat-card:hover::before {
            transform: rotate(45deg) translate(50%, 50%);
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
        }
        
        .stat-number {
            font-size: 3.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        
        .stat-label {
            font-size: 1.1rem;
            opacity: 0.9;
            font-weight: 500;
            position: relative;
            z-index: 1;
        }
        
        .repo-list {
            display: grid;
            gap: 25px;
        }
        
        .repo-card {
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 30px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .repo-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            transform: scaleY(0);
            transition: transform 0.3s ease;
        }
        
        .repo-card:hover::before {
            transform: scaleY(1);
        }
        
        .repo-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            border-color: #667eea;
        }
        
        .repo-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .repo-name {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1a202c;
            display: flex;
            align-items: center;
        }
        
        .repo-name::before {
            content: '📁';
            margin-right: 10px;
            font-size: 1.2rem;
        }
        
        .repo-issues {
            background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(229, 62, 62, 0.3);
        }
        
        .repo-issues.zero {
            background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
            box-shadow: 0 4px 12px rgba(56, 161, 105, 0.3);
        }
        
        .repo-description {
            color: #4a5568;
            margin-bottom: 20px;
            font-size: 1.1rem;
            line-height: 1.6;
        }
        
        .status-section {
            margin-top: 40px;
        }
        
        .status-card {
            border-radius: 16px;
            padding: 25px;
            text-align: center;
            font-weight: 600;
            font-size: 1.1rem;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .status-card.success {
            background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
            color: white;
        }
        
        .status-card.warning {
            background: linear-gradient(135deg, #d69e2e 0%, #b7791f 100%);
            color: white;
        }
        
        .footer {
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
            color: white;
            text-align: center;
            padding: 40px;
            margin-top: 50px;
        }
        
        .footer p {
            margin-bottom: 10px;
            font-size: 1.1rem;
        }
        
        .timestamp {
            font-size: 0.9rem;
            opacity: 0.8;
            font-weight: 300;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .header {
                padding: 40px 20px;
            }
            
            .header h1 {
                font-size: 2.5rem;
            }
            
            .content {
                padding: 30px 20px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .repo-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }
            
            .section h2 {
                font-size: 1.8rem;
            }
        }
        
        @media (max-width: 480px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .stat-number {
                font-size: 2.5rem;
            }
            
            .repo-name {
                font-size: 1.3rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐙 GitHub Analysis</h1>
            <div class="subtitle">Detailed report on repositories and issues</div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>📊 General Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${githubData.totalRepositories || 0}</div>
                        <div class="stat-label">Repositories</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${githubData.totalIssues || 0}</div>
                        <div class="stat-label">Open Issues</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${githubData.user || 'N/A'}</div>
                        <div class="stat-label">User</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>📋 Repositories</h2>
                <div class="repo-list">
                    ${githubData.repositories ? githubData.repositories.map(repo => `
                        <div class="repo-card">
                            <div class="repo-header">
                                <div class="repo-name">${repo.owner}/${repo.name}</div>
                                <div class="repo-issues ${repo.issues === 0 ? 'zero' : ''}">${repo.issues || 0} issues</div>
                            </div>
                            <div class="repo-description">${repo.description || 'No description'}</div>
                            ${repo.error ? `<div style="color: #e53e3e; font-size: 0.9rem; background: #fed7d7; padding: 10px; border-radius: 8px; margin-top: 10px;">⚠️ Error: ${repo.error}</div>` : ''}
                        </div>
                    `).join('') : '<p style="text-align: center; color: #4a5568; font-size: 1.1rem;">No repositories found</p>'}
                </div>
            </div>
            
            <div class="section status-section">
                ${githubData.totalIssues > 0 ? `
                <h2>⚠️ Recommendations</h2>
                <div class="status-card warning">
                    🔴 Attention required: ${githubData.totalIssues} unresolved issues
                </div>
                ` : `
                <h2>✅ Status</h2>
                <div class="status-card success">
                    ✅ All issues resolved! Great work!
                </div>
                `}
            </div>
        </div>
        
        <div class="footer">
            <p>📊 Report generated automatically</p>
            <p class="timestamp">🕐 ${new Date().toLocaleString('ru-RU')}</p>
        </div>
    </div>
</body>
</html>`;
    
    return htmlContent;
}

class DockerReportManager {
    constructor() {
        this.baseUrl = 'http://localhost:3004/api/mcp/docker';
        this.nginxImage = 'rancher/mirrored-library-nginx:1.19.9-alpine';
        this.containerNamePrefix = 'github-report';
        this.portRange = { min: 8000, max: 8999 };
        this.cleanupDelay = 2000;
        this.startupDelay = 2000;
    }

    /**
     * Creates and deploys HTML report in Docker container
     * @param {string} htmlContent - HTML content of the report
     * @returns {Promise<Object>} Deployment result
     */
    async deployHtmlReport(htmlContent) {
        try {
            console.log('🚀 Starting HTML report deployment...');
            
            if (!htmlContent) {
                throw new Error('HTML content is required');
            }

            await this.cleanupOldContainers();
            
            const containerConfig = this.createContainerConfig();
            const container = await this.createContainer(containerConfig);
            
            await this.startContainer(container.id);
            
            await this.createHtmlFile(container.id, htmlContent);
            
            await this.waitForContainerStartup();
            
            const result = {
                success: true,
                containerId: container.id,
                containerName: containerConfig.containerName,
                url: `http://localhost:${containerConfig.port}`,
                port: containerConfig.port
            };
            
            console.log('✅ HTML report deployed successfully:', result.url);
            return result;
            
        } catch (error) {
            console.error('❌ HTML report deployment failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cleans up old report containers
     */
    async cleanupOldContainers() {
        try {
            console.log('🧹 Cleaning up old report containers...');
            
            const containers = await this.getContainers();
            const oldContainers = containers.filter(container => 
                container.names && container.names.some(name => 
                    name.includes(this.containerNamePrefix)
                )
            );
            
            for (const container of oldContainers) {
                await this.removeContainer(container.id);
            }
            
            if (oldContainers.length > 0) {
                console.log(`🗑️ Removed ${oldContainers.length} old containers`);
            }
            
        } catch (error) {
            console.warn('⚠️ Could not clean up old containers:', error.message);
        }
    }

    /**
     * Creates configuration for new container
     * @returns {Object} Container configuration
     */
    createContainerConfig() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const containerName = `${this.containerNamePrefix}-${timestamp}`;
        const port = this.getRandomPort();
        
        return {
            containerName,
            port,
            imageName: this.nginxImage,
            options: {
                ExposedPorts: {
                    '80/tcp': {}
                },
                HostConfig: {
                    PortBindings: {
                        '80/tcp': [{
                            HostPort: port.toString()
                        }]
                    }
                }
            }
        };
    }

    /**
     * Creates new container
     * @param {Object} config - Container configuration
     * @returns {Promise<Object>} Created container information
     */
    async createContainer(config) {
        console.log('📦 Creating container:', config.containerName);
        
        const response = await this.makeRequest('/container/create', {
            method: 'POST',
            body: {
                imageName: config.imageName,
                containerName: config.containerName,
                options: config.options
            }
        });
        
        if (!response.success) {
            throw new Error(`Container creation failed: ${response.error}`);
        }
        
        console.log('✅ Container created:', response.container.id);
        return response.container;
    }

    /**
     * Starts container
     * @param {string} containerId - Container ID
     */
    async startContainer(containerId) {
        console.log('▶️ Starting container:', containerId);
        
        const containerInfo = await this.getContainerInfo(containerId);
        
        if (containerInfo.state === 'running') {
            console.log('ℹ️ Container is already running');
            return;
        }
        
        const response = await this.makeRequest('/container/start', {
            method: 'POST',
            body: { containerId }
        });
        
        if (!response.success) {
            throw new Error(`Container start failed: ${response.error}`);
        }
        
        console.log('✅ Container started successfully');
    }

    /**
     * Creates HTML file inside container
     * @param {string} containerId - Container ID
     * @param {string} htmlContent - HTML content
     */
    async createHtmlFile(containerId, htmlContent) {
        console.log('📄 Creating HTML file in container...');
        
        const base64Html = this.encodeHtmlContent(htmlContent);
        const command = `echo '${base64Html}' | base64 -d > /usr/share/nginx/html/index.html`;
        
        const response = await this.makeRequest('/container/exec', {
            method: 'POST',
            body: {
                containerId,
                command: ['sh', '-c', command]
            }
        });
        
        if (!response.success) {
            throw new Error(`HTML file creation failed: ${response.error}`);
        }
        
        console.log('✅ HTML file created successfully');
    }

    /**
     * Gets list of containers
     * @returns {Promise<Array>} List of containers
     */
    async getContainers() {
        const response = await this.makeRequest('/containers', {
            method: 'GET'
        });
        
        return response.success ? response.containers : [];
    }

    /**
     * Gets container information
     * @param {string} containerId - Container ID
     * @returns {Promise<Object>} Container information
     */
    async getContainerInfo(containerId) {
        const response = await this.makeRequest(`/container/inspect/${containerId}`, {
            method: 'GET'
        });
        
        if (!response.success) {
            throw new Error(`Failed to get container info: ${response.error}`);
        }
        
        return response.container;
    }

    /**
     * Removes container
     * @param {string} containerId - Container ID
     */
    async removeContainer(containerId) {
        try {
            await this.makeRequest('/container/stop', {
                method: 'POST',
                body: { containerId }
            });
            
            await this.makeRequest('/container/remove', {
                method: 'DELETE',
                body: { containerId, force: true }
            });
            
            console.log(`🗑️ Container removed: ${containerId}`);
            
        } catch (error) {
            console.warn(`⚠️ Could not remove container ${containerId}:`, error.message);
        }
    }

    /**
     * Makes HTTP request to Docker MCP API
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} API response
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        if (options.body && config.method !== 'GET') {
            config.body = JSON.stringify(options.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
            }
            
            return data;
            
        } catch (error) {
            console.error(`❌ API request failed (${endpoint}):`, error);
            throw error;
        }
    }

    /**
     * Generates random port in specified range
     * @returns {number} Random port
     */
    getRandomPort() {
        return Math.floor(Math.random() * (this.portRange.max - this.portRange.min + 1)) + this.portRange.min;
    }

    /**
     * Encodes HTML content to base64
     * @param {string} htmlContent - HTML content
     * @returns {string} Encoded content
     */
    encodeHtmlContent(htmlContent) {
        return btoa(unescape(encodeURIComponent(htmlContent)));
    }

    /**
     * Waits for container startup completion
     */
    async waitForContainerStartup() {
        console.log('⏳ Waiting for container startup...');
        await new Promise(resolve => setTimeout(resolve, this.startupDelay));
    }

    /**
     * Checks Docker MCP service availability
     * @returns {Promise<boolean>} Service availability
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl.replace('/api/mcp/docker', '')}/health`);
            return response.ok;
        } catch (error) {
            console.error('❌ Docker MCP health check failed:', error);
            return false;
        }
    }
}

const dockerReportManager = new DockerReportManager();

window.dockerReportManager = dockerReportManager;
window.deployHtmlReport = (htmlContent) => dockerReportManager.deployHtmlReport(htmlContent);
window.checkDockerHealth = () => dockerReportManager.checkHealth();
window.parseGitHubDataFromReport = parseGitHubDataFromReport;
window.createHtmlReport = createHtmlReport;
