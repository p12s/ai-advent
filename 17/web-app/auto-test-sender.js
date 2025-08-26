/**
 * Auto Test Sender Module - JavaScript Only
 * Модуль для автоматической отправки измененных JavaScript скриптов в test-agent-mcp
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

class AutoTestSender {
    constructor() {
        this.testAgentUrl = 'http://localhost:3006';
        this.lastSentFiles = new Map(); // Хранит хеши последних отправленных файлов
        this.isEnabled = true;
        this.autoTestEnabled = true;
    }

    /**
     * Инициализация модуля
     */
    async init() {
        try {
            console.log('🔧 Initializing Auto Test Sender (JavaScript only)...');
            
            // Проверяем доступность test-agent-mcp
            const isHealthy = await this.checkTestAgentHealth();
            if (!isHealthy) {
                console.warn('⚠️ Test Agent MCP недоступен. Автоматическое тестирование отключено.');
                this.autoTestEnabled = false;
                return false;
            }
            
            console.log('✅ Auto Test Sender initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Error initializing Auto Test Sender:', error);
            this.autoTestEnabled = false;
            return false;
        }
    }

    /**
     * Проверка здоровья test-agent-mcp
     */
    async checkTestAgentHealth() {
        try {
            const response = await fetch(`${this.testAgentUrl}/health`);
            const result = await response.json();
            return result.status === 'ok';
        } catch (error) {
            console.error('❌ Test Agent health check failed:', error);
            return false;
        }
    }

    /**
     * Вычисление хеша содержимого файла
     */
    calculateHash(content) {
        let hash = 0;
        if (content.length === 0) return hash.toString();
        
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    /**
     * Проверка, изменился ли файл
     */
    hasFileChanged(filePath, content) {
        const currentHash = this.calculateHash(content);
        const lastHash = this.lastSentFiles.get(filePath);
        
        if (lastHash !== currentHash) {
            this.lastSentFiles.set(filePath, currentHash);
            return true;
        }
        return false;
    }

    /**
     * Проверка, является ли файл JavaScript файлом
     */
    isJavaScriptFile(filename) {
        return filename.endsWith('.js') || filename.endsWith('.mjs');
    }

    /**
     * Отправка JavaScript кода в test-agent-mcp
     */
    async sendJavaScriptToTestAgent(code, filename) {
        try {
            console.log(`🧪 Sending ${filename} to Test Agent MCP...`);
            
            const response = await fetch(`${this.testAgentUrl}/api/test-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    language: 'javascript',
                    filename: filename
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ ${filename} успешно отправлен в Test Agent MCP`);
                return {
                    success: true,
                    data: result.result,
                    testData: result.testData
                };
            } else {
                throw new Error(result.error || 'Unknown error from Test Agent MCP');
            }
        } catch (error) {
            console.error(`❌ Error sending ${filename} to Test Agent MCP:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Автоматическая отправка JavaScript файла в test-agent-mcp
     */
    async autoSendJavaScriptFile(filePath, content) {
        if (!this.autoTestEnabled) {
            console.log('⚠️ Auto testing is disabled');
            return null;
        }

        if (!this.isJavaScriptFile(filePath)) {
            console.log(`⚠️ File ${filePath} is not a JavaScript file, skipping auto test`);
            return null;
        }

        if (!this.hasFileChanged(filePath, content)) {
            console.log(`ℹ️ File ${filePath} has not changed, skipping auto test`);
            return null;
        }

        const filename = filePath.split('/').pop();

        console.log(`🚀 Auto sending ${filename} to Test Agent MCP...`);

        // Показываем уведомление пользователю
        this.showAutoTestNotification(filename);

        const result = await this.sendJavaScriptToTestAgent(content, filename);
        
        if (result.success) {
            this.showTestResults(filename, result);
        } else {
            this.showTestError(filename, result.error);
        }

        return result;
    }

    /**
     * Показ уведомления о начале автоматического тестирования
     */
    showAutoTestNotification(filename) {
        const message = `🧪 Автоматическое тестирование JavaScript файла ${filename}...`;
        window.addMessage(message, false, false, 'System', 'testing');
    }

    /**
     * Показ результатов тестирования
     */
    showTestResults(filename, result) {
        const { data } = result;
        const testResults = data.testResults;
        const successRate = testResults.totalTests > 0 ? 
            Math.round((testResults.passedTests / testResults.totalTests) * 100) : 0;

        const resultMessage = `
✅ **Автоматическое тестирование ${filename} завершено**

📊 **Результаты:**
- Всего тестов: ${testResults.totalTests}
- Пройдено: ${testResults.passedTests}
- Провалено: ${testResults.failedTests}
- Успешность: ${successRate}%

${testResults.failedTests === 0 ? '🎉 Все тесты прошли успешно!' : '⚠️ Некоторые тесты провалились'}
        `;

        window.addMessage(resultMessage, false, false, 'Agent4', 'testing');

        // Создаем кнопки для действий
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
            const htmlReport = window.createTestReportHtml ? 
                window.createTestReportHtml(data) : 
                this.createSimpleTestReport(data);
            window.showFullPlanModal(htmlReport, 'Отчет о тестировании JavaScript');
        };
        
        buttonContainer.appendChild(copyTestsButton);
        buttonContainer.appendChild(viewReportButton);
        
        const testingMessages = document.getElementById('testing-messages');
        if (testingMessages) {
            testingMessages.appendChild(buttonContainer);
            testingMessages.scrollTop = testingMessages.scrollHeight;
        }
    }

    /**
     * Показ ошибки тестирования
     */
    showTestError(filename, error) {
        const errorMessage = `❌ Ошибка автоматического тестирования ${filename}: ${error}`;
        window.addMessage(errorMessage, false, false, 'System', 'testing');
    }

    /**
     * Создание простого HTML отчета
     */
    createSimpleTestReport(data) {
        const { filename, testResults, testCode } = data;
        const timestamp = new Date().toLocaleString('ru-RU');
        const successRate = testResults.totalTests > 0 ? 
            Math.round((testResults.passedTests / testResults.totalTests) * 100) : 0;

        return `
# Отчет о тестировании JavaScript файла ${filename}

## Результаты
- **Файл:** ${filename}
- **Язык:** JavaScript
- **Всего тестов:** ${testResults.totalTests}
- **Пройдено:** ${testResults.passedTests}
- **Провалено:** ${testResults.failedTests}
- **Успешность:** ${successRate}%

## Сгенерированные тесты
\`\`\`javascript
${testCode}
\`\`\`

---
*Отчет сгенерирован: ${timestamp}*
        `;
    }

    /**
     * Ручная отправка JavaScript файла
     */
    async sendJavaScriptFile(filePath, content) {
        return await this.autoSendJavaScriptFile(filePath, content);
    }

    /**
     * Ручная отправка JavaScript кода
     */
    async sendJavaScriptCode(code, filename) {
        return await this.sendJavaScriptToTestAgent(code, filename);
    }

    /**
     * Включение/выключение автоматического тестирования
     */
    setAutoTestEnabled(enabled) {
        this.autoTestEnabled = enabled;
        console.log(`🔄 Auto testing ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Очистка истории отправленных файлов
     */
    clearHistory() {
        this.lastSentFiles.clear();
        console.log('🗑️ Auto test history cleared');
    }
}

// Создаем глобальный экземпляр
const autoTestSender = new AutoTestSender();

// Функции для интеграции с существующим кодом
window.autoTestSender = autoTestSender;

/**
 * Функция для автоматической отправки JavaScript файла (вызывается после изменений)
 */
window.autoSendJavaScriptToTestAgent = async function(filePath, content) {
    return await autoTestSender.autoSendJavaScriptFile(filePath, content);
};

/**
 * Функция для ручной отправки JavaScript файла
 */
window.sendJavaScriptFileToTestAgent = async function(filePath, content) {
    return await autoTestSender.sendJavaScriptFile(filePath, content);
};

/**
 * Функция для ручной отправки JavaScript кода
 */
window.sendJavaScriptCodeToTestAgent = async function(code, filename) {
    return await autoTestSender.sendJavaScriptCode(code, filename);
};

/**
 * Инициализация модуля при загрузке страницы
 */
window.initAutoTestSender = async function() {
    return await autoTestSender.init();
};

/**
 * Функция для демонстрации работы системы автоматического тестирования
 */
window.demoAutoTestSystem = async function() {
    console.log('🚀 Демонстрация системы автоматического тестирования JavaScript...');
    
    // Пример JavaScript кода для тестирования
    const demoCode = `
// Демонстрационный JavaScript модуль
class MathUtils {
    static add(a, b) {
        return a + b;
    }
    
    static subtract(a, b) {
        return a - b;
    }
    
    static multiply(a, b) {
        return a * b;
    }
    
    static divide(a, b) {
        if (b === 0) {
            throw new Error('Division by zero');
        }
        return a / b;
    }
    
    static factorial(n) {
        if (n < 0) {
            throw new Error('Factorial is not defined for negative numbers');
        }
        if (n === 0 || n === 1) {
            return 1;
        }
        return n * this.factorial(n - 1);
    }
    
    static isPrime(number) {
        if (number < 2) return false;
        if (number === 2) return true;
        if (number % 2 === 0) return false;
        
        for (let i = 3; i <= Math.sqrt(number); i += 2) {
            if (number % i === 0) return false;
        }
        return true;
    }
}

module.exports = MathUtils;
    `;
    
    const filename = 'demo-math-utils.js';
    
    // Показываем уведомление
    window.addMessage('🧪 Запуск демонстрации автоматического тестирования...', false, false, 'System', 'testing');
    
    try {
        // Отправляем код в test-agent-mcp
        const result = await window.sendJavaScriptCodeToTestAgent(demoCode, filename);
        
        if (result && result.success) {
            window.addMessage('✅ Демонстрация завершена успешно!', false, false, 'System', 'testing');
            console.log('✅ Демонстрация успешна:', result);
        } else {
            throw new Error(result?.error || 'Неизвестная ошибка');
        }
    } catch (error) {
        console.error('❌ Ошибка демонстрации:', error);
        window.addMessage(`❌ Ошибка демонстрации: ${error.message}`, false, false, 'System', 'testing');
    }
};

/**
 * Функция для автоматического тестирования github-analysis.js
 */
window.testGitHubAnalysis = async function() {
    console.log('🧪 Автоматическое тестирование github-analysis.js...');
    
    // Показываем уведомление
    window.addMessage('🧪 Запуск автоматического тестирования github-analysis.js...', false, false, 'System', 'testing');
    
    try {
        // Загружаем содержимое github-analysis.js
        const response = await fetch('./github-analysis.js');
        const content = await response.text();
        
        // Отправляем github-analysis.js на тестирование
        const result = await window.autoSendJavaScriptToTestAgent('github-analysis.js', content);
        
        if (result && result.success) {
            window.addMessage('✅ Автоматическое тестирование github-analysis.js завершено успешно!', false, false, 'System', 'testing');
            console.log('✅ Тестирование github-analysis.js успешно:', result);
        } else {
            throw new Error(result?.error || 'Неизвестная ошибка');
        }
    } catch (error) {
        console.error('❌ Ошибка тестирования github-analysis.js:', error);
        window.addMessage(`❌ Ошибка тестирования github-analysis.js: ${error.message}`, false, false, 'System', 'testing');
    }
};

// Автоматическая инициализация при загрузке модуля
if (typeof window !== 'undefined') {
    // Инициализируем после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                window.initAutoTestSender();
            }, 1000); // Небольшая задержка для инициализации других модулей
        });
    } else {
        setTimeout(() => {
            window.initAutoTestSender();
        }, 1000);
    }
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AutoTestSender,
        autoTestSender
    };
}
