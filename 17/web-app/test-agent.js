/**
 * Test Agent Module
 * Module for integrating with test-agent-mcp service
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

/**
 * Test Agent - main class for working with test-agent-mcp
 */
class TestAgent {
    constructor() {
        this.baseUrl = 'http://localhost:3005';
        this.isInitialized = false;
        this.supportedLanguages = [];
    }

    async init() {
        try {
            const response = await fetch(`${this.baseUrl}/mcp/test-agent/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                this.isInitialized = true;
                console.log('✅ Test Agent MCP initialized successfully');
                return true;
            } else {
                console.error('❌ Failed to initialize Test Agent MCP:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error initializing Test Agent MCP:', error);
            return false;
        }
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const result = await response.json();
            return result.status === 'ok' && result.initialized;
        } catch (error) {
            console.error('❌ Test Agent MCP health check failed:', error);
            return false;
        }
    }

    async getSupportedLanguages() {
        try {
            const response = await fetch(`${this.baseUrl}/mcp/test-agent/languages`);
            const result = await response.json();
            if (result.success) {
                this.supportedLanguages = result.data.supportedLanguages;
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('❌ Error getting supported languages:', error);
            return null;
        }
    }

    async testFile(file) {
        try {
            if (!this.isInitialized) {
                const initialized = await this.init();
                if (!initialized) {
                    throw new Error('Test Agent MCP not initialized');
                }
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.baseUrl}/mcp/test-agent/test-file`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error testing file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async testCode(code, language, filename) {
        try {
            if (!this.isInitialized) {
                const initialized = await this.init();
                if (!initialized) {
                    throw new Error('Test Agent MCP not initialized');
                }
            }

            const response = await fetch(`${this.baseUrl}/mcp/test-agent/test-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code,
                    language,
                    filename
                })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error testing code:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    detectLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'java': 'java',
            'go': 'go',
            'rb': 'ruby',
            'php': 'php',
            'cs': 'csharp',
            'rs': 'rust'
        };
        return languageMap[ext] || 'unknown';
    }
}

/**
 * Creates HTML report from test results
 * @param {Object} testData - Test results data
 * @returns {string} HTML report
 */
function createTestReportHtml(testData) {
    const { filename, language, testResults, testCode, htmlReport } = testData;
    
    if (htmlReport) {
        return htmlReport;
    }
    
    const timestamp = new Date().toLocaleString('ru-RU');
    const successRate = testResults.totalTests > 0 ? 
        Math.round((testResults.passedTests / testResults.totalTests) * 100) : 0;
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${filename}</title>
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
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .header {
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .content {
            padding: 40px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        .status-card {
            background: ${testResults.failedTests === 0 ? 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)' : 'linear-gradient(135deg, #d69e2e 0%, #b7791f 100%)'};
            color: white;
            padding: 20px;
            border-radius: 16px;
            text-align: center;
            margin-bottom: 30px;
            font-size: 1.2rem;
            font-weight: 600;
        }
        
        .code-section {
            margin-bottom: 30px;
        }
        
        .code-section h3 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #1a202c;
        }
        
        .code-block {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .footer {
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
            color: white;
            text-align: center;
            padding: 30px;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Report</h1>
            <div class="subtitle">${filename} - ${language.toUpperCase()}</div>
        </div>
        
        <div class="content">
            <div class="status-card">
                ${testResults.failedTests === 0 ? '✅ All tests passed!' : `⚠️ ${testResults.failedTests} tests failed`}
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${testResults.totalTests}</div>
                    <div class="stat-label">Total Tests</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${testResults.passedTests}</div>
                    <div class="stat-label">Passed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${testResults.failedTests}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${successRate}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            </div>
            
            <div class="code-section">
                <h3>🧪 Generated Tests</h3>
                <div class="code-block">${testCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
        </div>
        
        <div class="footer">
            <p>📊 Test report generated by Test Agent MCP</p>
            <p class="timestamp">🕐 ${timestamp}</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Initializes test agent module
 */
function initTestAgentModule() {
    const testAgent = new TestAgent();
    
    // Инициализация при загрузке страницы
    testAgent.init().then(success => {
        if (success) {
            console.log('✅ Test Agent module initialized successfully');
            setupTestAgentUI();
        } else {
            console.warn('⚠️ Test Agent module initialization failed');
        }
    });
    
    // Экспорт в глобальную область
    window.testAgent = testAgent;
    window.createTestReportHtml = createTestReportHtml;
}

/**
 * Sets up UI for test agent functionality
 */
function setupTestAgentUI() {
    const testCodeButton = document.getElementById('test-code-button');
    const testFileButton = document.getElementById('test-file-button');
    
    if (testCodeButton) {
        testCodeButton.addEventListener('click', handleTestCode);
    }
    
    if (testFileButton) {
        testFileButton.addEventListener('click', handleTestFile);
    }
}

/**
 * Handles code testing
 */
async function handleTestCode() {
    const codeInput = document.getElementById('code-input');
    const languageSelect = document.getElementById('language-select');
    const filenameInput = document.getElementById('filename-input');
    const testButton = document.getElementById('test-code-button');
    
    const code = codeInput.value.trim();
    const language = languageSelect.value;
    const filename = filenameInput.value.trim() || 'test.js';
    
    if (!code) {
        window.addMessage('❌ Пожалуйста, введите код для тестирования', false, false, 'System', 'testing');
        return;
    }
    
    testButton.disabled = true;
    testButton.textContent = '⏳ Тестирование...';
    
    const loadingMessage = window.addMessage('...', false, true, 'Agent4', 'testing');
    
    try {
        const result = await window.testAgent.testCode(code, language, filename);
        loadingMessage.remove();
        
        if (result.success) {
            const { data } = result;
            
            // Отображение результатов
            const resultMessage = `
🧪 **Результаты тестирования**

📄 Файл: ${data.filename}
🔤 Язык: ${data.language}
📊 Тестов: ${data.testResults.totalTests}
✅ Пройдено: ${data.testResults.passedTests}
❌ Провалено: ${data.testResults.failedTests}
📈 Успешность: ${data.testResults.totalTests > 0 ? Math.round((data.testResults.passedTests / data.testResults.totalTests) * 100) : 0}%

${data.testResults.failedTests === 0 ? '🎉 Все тесты прошли успешно!' : '⚠️ Некоторые тесты провалились'}
            `;
            
            window.addMessage(resultMessage, false, false, 'Agent4', 'testing');
            
            // Создание кнопок для действий
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'copy-container';
            
            const copyTestsButton = document.createElement('button');
            copyTestsButton.textContent = '📋 Копировать тесты';
            copyTestsButton.className = 'copy-plan-button';
            copyTestsButton.onclick = () => {
                navigator.clipboard.writeText(data.testCode).then(() => {
                    copyTestsButton.textContent = '✅ Скопировано!';
                    setTimeout(() => {
                        copyTestsButton.textContent = '📋 Копировать тесты';
                    }, 2000);
                });
            };
            
            const viewReportButton = document.createElement('button');
            viewReportButton.textContent = '👁️ Показать отчет';
            viewReportButton.className = 'copy-plan-button';
            viewReportButton.style.marginLeft = '10px';
            viewReportButton.onclick = () => {
                const htmlReport = window.createTestReportHtml(data);
                window.showFullPlanModal(htmlReport, 'Отчет о тестировании');
            };
            
            buttonContainer.appendChild(copyTestsButton);
            buttonContainer.appendChild(viewReportButton);
            
            // Если есть URL отчета, добавляем кнопку для открытия
            if (data.reportUrl) {
                const openReportButton = document.createElement('button');
                openReportButton.textContent = '🌐 Открыть отчет';
                openReportButton.className = 'copy-plan-button';
                openReportButton.style.marginLeft = '10px';
                openReportButton.onclick = () => {
                    window.open(data.reportUrl, '_blank');
                };
                buttonContainer.appendChild(openReportButton);
            }
            
            const testingMessages = document.getElementById('testing-messages');
            testingMessages.appendChild(buttonContainer);
            testingMessages.scrollTop = testingMessages.scrollHeight;
            
        } else {
            window.addMessage(`❌ Ошибка тестирования: ${result.error}`, false, false, 'System', 'testing');
        }
        
    } catch (error) {
        loadingMessage.remove();
        window.addMessage(`❌ Ошибка: ${error.message}`, false, false, 'System', 'testing');
    } finally {
        testButton.disabled = false;
        testButton.textContent = '🧪 Протестировать код';
    }
}

/**
 * Handles file testing
 */
async function handleTestFile() {
    const fileInput = document.getElementById('file-input');
    const testButton = document.getElementById('test-file-button');
    
    const file = fileInput.files[0];
    
    if (!file) {
        window.addMessage('❌ Пожалуйста, выберите файл для тестирования', false, false, 'System', 'testing');
        return;
    }
    
    testButton.disabled = true;
    testButton.textContent = '⏳ Тестирование...';
    
    const loadingMessage = window.addMessage('...', false, true, 'Agent4', 'testing');
    
    try {
        const result = await window.testAgent.testFile(file);
        loadingMessage.remove();
        
        if (result.success) {
            const { data } = result;
            
            // Отображение результатов
            const resultMessage = `
🧪 **Результаты тестирования файла**

📄 Файл: ${data.filename}
🔤 Язык: ${data.language}
📊 Тестов: ${data.testResults.totalTests}
✅ Пройдено: ${data.testResults.passedTests}
❌ Провалено: ${data.testResults.failedTests}
📈 Успешность: ${data.testResults.totalTests > 0 ? Math.round((data.testResults.passedTests / data.testResults.totalTests) * 100) : 0}%

${data.testResults.failedTests === 0 ? '🎉 Все тесты прошли успешно!' : '⚠️ Некоторые тесты провалились'}
            `;
            
            window.addMessage(resultMessage, false, false, 'Agent4', 'testing');
            
            // Создание кнопок для действий
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'copy-container';
            
            const copyTestsButton = document.createElement('button');
            copyTestsButton.textContent = '📋 Копировать тесты';
            copyTestsButton.className = 'copy-plan-button';
            copyTestsButton.onclick = () => {
                navigator.clipboard.writeText(data.testCode).then(() => {
                    copyTestsButton.textContent = '✅ Скопировано!';
                    setTimeout(() => {
                        copyTestsButton.textContent = '📋 Копировать тесты';
                    }, 2000);
                });
            };
            
            const viewReportButton = document.createElement('button');
            viewReportButton.textContent = '👁️ Показать отчет';
            viewReportButton.className = 'copy-plan-button';
            viewReportButton.style.marginLeft = '10px';
            viewReportButton.onclick = () => {
                const htmlReport = window.createTestReportHtml(data);
                window.showFullPlanModal(htmlReport, 'Отчет о тестировании');
            };
            
            buttonContainer.appendChild(copyTestsButton);
            buttonContainer.appendChild(viewReportButton);
            
            // Если есть URL отчета, добавляем кнопку для открытия
            if (data.reportUrl) {
                const openReportButton = document.createElement('button');
                openReportButton.textContent = '🌐 Открыть отчет';
                openReportButton.className = 'copy-plan-button';
                openReportButton.style.marginLeft = '10px';
                openReportButton.onclick = () => {
                    window.open(data.reportUrl, '_blank');
                };
                buttonContainer.appendChild(openReportButton);
            }
            
            const testingMessages = document.getElementById('testing-messages');
            testingMessages.appendChild(buttonContainer);
            testingMessages.scrollTop = testingMessages.scrollHeight;
            
        } else {
            window.addMessage(`❌ Ошибка тестирования: ${result.error}`, false, false, 'System', 'testing');
        }
        
    } catch (error) {
        loadingMessage.remove();
        window.addMessage(`❌ Ошибка: ${error.message}`, false, false, 'System', 'testing');
    } finally {
        testButton.disabled = false;
        testButton.textContent = '🧪 Протестировать файл';
    }
}

// Автоматическая инициализация при загрузке модуля
if (typeof window !== 'undefined') {
    window.initTestAgentModule = initTestAgentModule;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TestAgent,
        createTestReportHtml,
        initTestAgentModule
    };
}
