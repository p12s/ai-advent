/**
 * GitHub Analysis Module
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

window.mcpGithubEnabled = false;
let autoUpdateInterval = null;

window.githubConfig = {
    url: '',
    token: ''
};

window.autoUpdateConfig = {
    enabled: true,
    intervalMinutes: 60,
    startMinute: 15
};

/**
 * GitHub Agent - main class for working with GitHub API
 */
class GitHubAgent {
    /**
     * Creates new instance of GitHub Agent
     */
    constructor() {
        this.isActive = false;
    }

    /**
     * Gets data from GitHub through MCP server
     * @returns {Promise<Object>} GitHub data analysis result
     */
    async getGitHubData() {
        if (!window.mcpGithubEnabled) {
            return {
                type: 'error',
                content: '❌ GitHub MCP не подключен. Проверьте конфигурацию.',
                message: 'GitHub MCP недоступен'
            };
        }

        try {
            const analysisResponse = await fetch('http://localhost:3002/mcp/github/analysis', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!analysisResponse.ok) {
                return {
                    type: 'error',
                    content: '❌ Не удалось получить данные от GitHub MCP сервера',
                    message: 'Ошибка получения данных'
                };
            }

            const result = await analysisResponse.json();
            
            if (!result.success) {
                return {
                    type: 'error',
                    content: '❌ Ошибка GitHub MCP сервера: ' + result.error,
                    message: 'Ошибка сервера'
                };
            }

            const analysis = result.data;
            
            const report = `# 📊 GitHub Анализ

## 📈 Общая статистика
- **Пользователь**: ${analysis.user}
- **Всего репозиториев**: ${analysis.totalRepositories}
- **Неразрешенных задач**: ${analysis.totalIssues}

## 📋 Детали по репозиториям
${analysis.repositories.map(repo => `
### ${repo.owner}/${repo.name}
- **Описание**: ${repo.description}
- **Открытых задач**: ${repo.issues}
${repo.error ? `- **Ошибка**: ${repo.error}` : ''}
`).join('\n')}

## ⚠️ Рекомендации
${analysis.totalIssues > 0 ? `- 🔴 Требуется внимание: ${analysis.totalIssues} неразрешенных задач` : '- ✅ Все задачи разрешены'}

---
*Отчет сгенерирован: ${new Date(analysis.generatedAt).toLocaleString('ru-RU')}*`;

            return {
                type: 'success',
                content: report,
                message: '✅ GitHub анализ завершен!'
            };

        } catch (error) {
            console.error('Error in GitHub analysis:', error);
            return {
                type: 'error',
                content: '❌ Ошибка при получении данных с GitHub MCP: ' + error.message,
                message: 'Ошибка анализа'
            };
        }
    }
}

/**
 * Gets GitHub repositories and issues data
 * @returns {Promise<Object|null>} GitHub data or null on error
 */
async function getGithubData() {
    if (!window.mcpGithubEnabled) return null;
    
    try {
        const reposResponse = await fetch('http://localhost:3002/tools/call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.githubConfig.token}`
            },
            body: JSON.stringify({
                name: "list_repositories",
                arguments: {}
            })
        });
        
        const reposResult = await reposResponse.json();
        
        if (reposResult.result && reposResult.result.content) {
            const repos = JSON.parse(reposResult.result.content[0].text);
            
            const issuesResponse = await fetch('http://localhost:3002/tools/call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.githubConfig.token}`
                },
                body: JSON.stringify({
                    name: "list_issues",
                    arguments: {
                        owner: repos[0]?.owner?.login || "user",
                        repo: repos[0]?.name || "ai-advent",
                        state: "open"
                    }
                })
            });
            
            const issuesResult = await issuesResponse.json();
            
            return {
                repositories: repos,
                issues: issuesResult.result ? JSON.parse(issuesResult.result.content[0].text) : []
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error getting GitHub data:', error);
        return null;
    }
}

/**
 * Creates report based on GitHub data
 * @param {Object} githubData - GitHub repositories and issues data
 * @returns {string|null} Markdown report or null on error
 */
async function createGithubReport(githubData) {
    if (!githubData) return null;
    
    const report = `# GitHub Отчет

## Репозитории
${githubData.repositories.map(repo => `- **${repo.name}**: ${repo.description || 'Без описания'}`).join('\n')}

## Открытые задачи
${githubData.issues.map(issue => `- **${issue.title}**: ${issue.state} (${issue.created_at})`).join('\n')}

## Статистика
- Всего репозиториев: ${githubData.repositories.length}
- Открытых задач: ${githubData.issues.length}
- Последнее обновление: ${new Date().toLocaleString('ru-RU')}
`;

    return report;
}

/**
 * Creates and deploys HTML report in Docker container
 * @param {Object} githubData - GitHub data for report
 * @returns {Promise<Object>} Deployment result
 */
async function createAndDeployHtmlReport(githubData) {
    try {
        console.log('📊 Creating HTML report from GitHub data...');
        
        const htmlContent = await window.createHtmlReport(githubData);
        if (!htmlContent) {
            throw new Error('Failed to create HTML report');
        }
        
        console.log('✅ HTML content created successfully');
        
        if (!window.dockerReportManager) {
            throw new Error('Docker Report Manager not initialized');
        }
        
        const isHealthy = await window.dockerReportManager.checkHealth();
        if (!isHealthy) {
            throw new Error('Docker MCP service unavailable');
        }
        
        const deploymentResult = await window.dockerReportManager.deployHtmlReport(htmlContent);
        
        if (!deploymentResult.success) {
            throw new Error(`Deployment error: ${deploymentResult.error}`);
        }
        
        return deploymentResult;
        
    } catch (error) {
        console.error('❌ Error creating and deploying HTML report:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Initializes connection to GitHub MCP server
 * @returns {Promise<void>}
 */
async function initMCPGithub() {
    try {
        console.log('🔍 Initializing GitHub MCP connection...');
        const response = await fetch('http://localhost:3001/health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const healthData = await response.json();
            console.log('📊 GitHub MCP health data:', healthData);
            
            if (healthData.github_initialized) {
                window.mcpGithubEnabled = true;
                console.log('✅ GitHub MCP successfully initialized');
            } else {
                console.error('❌ GitHub MCP server is running but not initialized');
                window.mcpGithubEnabled = false;
            }
        } else {
            console.error('❌ Failed to connect to GitHub MCP server:', response.status);
            window.mcpGithubEnabled = false;
        }
    } catch (error) {
        console.error('❌ Error initializing GitHub MCP:', error);
        window.mcpGithubEnabled = false;
    }
}

/**
 * Performs automatic GitHub data update
 * @returns {Promise<void>}
 */
async function performAutoGitHubUpdate() {
    if (!window.mcpGithubEnabled) {

        return;
    }


    
    window.addMessage('🕐 Автоматическое обновление GitHub данных...', false, false, 'System', 'github');
    
    const loadingMessage = window.addMessage('...', false, true, 'Agent3', 'github');
    
    try {
        const agent3 = new GitHubAgent();
        const result = await agent3.getGitHubData();
        loadingMessage.remove();
        
        window.addMessage(result.content, false, false, 'Agent3', 'github');
        
        if (result.type === 'success') {
            window.addMessage('✅ Автоматическое обновление завершено!', false, false, 'System', 'github');
            
            if (window.sendGitHubReportToTelegram) {
                try {
                    await window.sendGitHubReportToTelegram(result.content);
                    window.addMessage('📱 Report sent to Telegram', false, false, 'System', 'github');
                } catch (error) {
                    window.addMessage('❌ Error sending report to Telegram: ' + error.message, false, false, 'System', 'github');
                }
            }
            
            try {
                const githubData = window.parseGitHubDataFromReport(result.content);
                const htmlReportResult = await createAndDeployHtmlReport(githubData);
                if (htmlReportResult.success) {
                    window.addMessage(`🌐 HTML-отчет развернут в Docker: <a href="${htmlReportResult.url}" target="_blank" style="color: #007bff; text-decoration: underline;">${htmlReportResult.url}</a>`, false, false, 'System', 'github');
                    
                    setTimeout(() => {
                        window.open(htmlReportResult.url, '_blank');
                    }, 1000);
                    
                    const viewHtmlButton = document.createElement('button');
                    viewHtmlButton.textContent = '🌐 Открыть HTML-отчет';
                    viewHtmlButton.className = 'copy-plan-button';
                    viewHtmlButton.style.marginLeft = '10px';
                    viewHtmlButton.onclick = () => {
                        window.open(htmlReportResult.url, '_blank');
                    };
                    
                    const buttonContainer = document.querySelector('.copy-container');
                    if (buttonContainer) {
                        buttonContainer.appendChild(viewHtmlButton);
                    }
                } else {
                    window.addMessage('❌ Ошибка создания HTML-отчета: ' + htmlReportResult.error, false, false, 'System', 'github');
                }
            } catch (error) {
                window.addMessage('❌ Ошибка развертывания HTML-отчета: ' + error.message, false, false, 'System', 'github');
            }
            
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'copy-container';
            
            const copyButton = document.createElement('button');
            copyButton.textContent = '📋 Копировать отчет';
            copyButton.className = 'copy-plan-button';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(result.content).then(() => {
                    copyButton.textContent = '✅ Скопировано!';
                    setTimeout(() => {
                        copyButton.textContent = '📋 Копировать отчет';
                    }, 2000);
                });
            };
            
            const viewButton = document.createElement('button');
            viewButton.textContent = '👁️ Показать полный отчет';
            viewButton.className = 'copy-plan-button';
            viewButton.style.marginLeft = '10px';
            viewButton.onclick = () => {
                window.showFullPlanModal(result.content, 'Полный GitHub отчет');
            };
            
            buttonContainer.appendChild(copyButton);
            buttonContainer.appendChild(viewButton);
            
            const githubMessages = document.getElementById('github-messages');
            githubMessages.appendChild(buttonContainer);
            githubMessages.scrollTop = githubMessages.scrollHeight;
        } else {
            window.addMessage('❌ Автоматическое обновление не удалось', false, false, 'System', 'github');
        }
        
    } catch (error) {
        loadingMessage.remove();
        window.addMessage('❌ Ошибка при автоматическом обновлении: ' + error.message, false, false, 'Agent3', 'github');
    }
}

/**
 * Starts automatic GitHub data update on schedule
 */
function startAutoUpdate() {
    if (!window.autoUpdateConfig.enabled) {

        return;
    }
    
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }
    
    const now = new Date();
    const nextUpdate = new Date(now);
    nextUpdate.setMinutes(window.autoUpdateConfig.startMinute, 0, 0);
    
    if (nextUpdate <= now) {
        nextUpdate.setHours(nextUpdate.getHours() + 1);
    }
    
    const timeUntilNextUpdate = nextUpdate.getTime() - now.getTime();
    

    
    setTimeout(() => {
        performAutoGitHubUpdate();
        
        autoUpdateInterval = setInterval(performAutoGitHubUpdate, window.autoUpdateConfig.intervalMinutes * 60 * 1000);
    }, timeUntilNextUpdate);
    const githubMessages = document.getElementById('github-messages');
    if (githubMessages) {
        const scheduleInfo = document.createElement('div');
        scheduleInfo.className = 'message system-message';
        scheduleInfo.innerHTML = `
            <div class="message-content">
                ⏰ Автоматическое обновление GitHub данных настроено на каждые ${window.autoUpdateConfig.intervalMinutes} минут в *:${window.autoUpdateConfig.startMinute.toString().padStart(2, '0')} минут
                <br>Следующее обновление: ${nextUpdate.toLocaleTimeString('ru-RU')}
            </div>
        `;
        githubMessages.appendChild(scheduleInfo);
    }
}

/**
 * Stops automatic GitHub data update
 */
function stopAutoUpdate() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    
    }
}

/**
 * Initializes GitHub analysis module
 * Sets up event handlers and starts automatic update
 */
function initGitHubModule() {
    const agent3Button = document.getElementById('agent3-button');
    
    if (agent3Button) {
        agent3Button.addEventListener('click', async function() {
            agent3Button.disabled = true;
            agent3Button.textContent = '⏳ Получение данных...';
            
            const loadingMessage = window.addMessage('...', false, true, 'Agent3', 'github');
            
            try {
                const agent3 = new GitHubAgent();
                const result = await agent3.getGitHubData();
                loadingMessage.remove();
                
                window.addMessage(result.content, false, false, 'Agent3', 'github');
                
                if (result.type === 'success') {
                    window.addMessage(result.message, false, false, 'System', 'github');
                    
                    if (window.sendGitHubReportToTelegram) {
                        try {
                            await window.sendGitHubReportToTelegram(result.content);
                            window.addMessage('📱 Отчет отправлен в Telegram', false, false, 'System', 'github');
                        } catch (error) {
                            window.addMessage('❌ Ошибка отправки отчета в Telegram: ' + error.message, false, false, 'System', 'github');
                        }
                    }
                    
                    try {
                        const githubData = window.parseGitHubDataFromReport(result.content);
                        const htmlReportResult = await createAndDeployHtmlReport(githubData);
                        if (htmlReportResult.success) {
                            window.addMessage(`🌐 HTML-отчет развернут в Docker: <a href="${htmlReportResult.url}" target="_blank" style="color: #007bff; text-decoration: underline;">${htmlReportResult.url}</a>`, false, false, 'System', 'github');
                            
                            setTimeout(() => {
                                window.open(htmlReportResult.url, '_blank');
                            }, 1000);
                            
                            const viewHtmlButton = document.createElement('button');
                            viewHtmlButton.textContent = '🌐 Открыть HTML-отчет';
                            viewHtmlButton.className = 'copy-plan-button';
                            viewHtmlButton.style.marginLeft = '10px';
                            viewHtmlButton.onclick = () => {
                                window.open(htmlReportResult.url, '_blank');
                            };
                            
                            const buttonContainer = document.querySelector('.copy-container');
                            if (buttonContainer) {
                                buttonContainer.appendChild(viewHtmlButton);
                            }
                        } else {
                            window.addMessage('❌ Ошибка создания HTML-отчета: ' + htmlReportResult.error, false, false, 'System', 'github');
                        }
                    } catch (error) {
                        window.addMessage('❌ Ошибка развертывания HTML-отчета: ' + error.message, false, false, 'System', 'github');
                    }
                    
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'copy-container';
                    
                    const copyButton = document.createElement('button');
                    copyButton.textContent = '📋 Копировать отчет';
                    copyButton.className = 'copy-plan-button';
                    copyButton.onclick = () => {
                        navigator.clipboard.writeText(result.content).then(() => {
                            copyButton.textContent = '✅ Скопировано!';
                            setTimeout(() => {
                                copyButton.textContent = '📋 Копировать отчет';
                            }, 2000);
                        });
                    };
                    
                    const viewButton = document.createElement('button');
                    viewButton.textContent = '👁️ Показать полный отчет';
                    viewButton.className = 'copy-plan-button';
                    viewButton.style.marginLeft = '10px';
                    viewButton.onclick = () => {
                        window.showFullPlanModal(result.content, 'Полный GitHub отчет');
                    };
                    
                    buttonContainer.appendChild(copyButton);
                    buttonContainer.appendChild(viewButton);
                    
                    const githubMessages = document.getElementById('github-messages');
                    githubMessages.appendChild(buttonContainer);
                    githubMessages.scrollTop = githubMessages.scrollHeight;
                }
                
            } catch (error) {
                loadingMessage.remove();
                window.addMessage('❌ Ошибка при получении данных: ' + error.message, false, false, 'Agent3', 'github');
            } finally {
                agent3Button.disabled = false;
                agent3Button.textContent = '🔍 Получить данные с GitHub';
            }
        });
    }
    
    startAutoUpdate();
}

window.initGitHubModule = initGitHubModule;
window.initMCPGithub = initMCPGithub;
window.getGithubData = getGithubData;
window.createGithubReport = createGithubReport;

window.createAndDeployHtmlReport = createAndDeployHtmlReport;
window.performAutoGitHubUpdate = performAutoGitHubUpdate;
window.startAutoUpdate = startAutoUpdate;
window.stopAutoUpdate = stopAutoUpdate;

window.testHtmlReport = async function() {
    console.log('Testing HTML report creation...');
    
    const testData = {
        user: 'testuser',
        totalRepositories: 3,
        totalIssues: 5,
        repositories: [
            {
                owner: 'testuser',
                name: 'ai-advent',
                description: 'AI Advent project repository',
                issues: 3
            },
            {
                owner: 'testuser',
                name: 'test-repo',
                description: 'Test repository for development',
                issues: 2
            }
        ]
    };
    
    try {
        const result = await createAndDeployHtmlReport(testData);
        console.log('HTML report result:', result);
        
        if (result.success) {
            console.log('✅ HTML report created successfully!');
            console.log('URL:', result.url);
            
            setTimeout(() => {
                window.open(result.url, '_blank');
            }, 1000);
            
            return result;
        } else {
            console.error('❌ Failed to create HTML report:', result.error);
            return result;
        }
    } catch (error) {
        console.error('❌ Error in test:', error);
        return { success: false, error: error.message };
    }
};
