/**
 * Пример использования Auto Test Sender для JavaScript
 * Этот файл демонстрирует, как использовать автоматическое тестирование JavaScript кода
 */

// Пример 1: Автоматическая отправка JavaScript файла после изменений
async function exampleAutoSendJavaScriptFile() {
    const filePath = 'example.js';
    const content = `
function add(a, b) {
    return a + b;
}

function multiply(a, b) {
    return a * b;
}

function divide(a, b) {
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}

module.exports = { add, multiply, divide };
    `;
    
    // Автоматическая отправка в test-agent-mcp
    const result = await window.autoSendJavaScriptToTestAgent(filePath, content);
    
    if (result && result.success) {
        console.log('✅ JavaScript файл автоматически протестирован:', result);
    } else {
        console.error('❌ Ошибка автоматического тестирования:', result?.error);
    }
}

// Пример 2: Ручная отправка JavaScript кода
async function exampleManualSendJavaScriptCode() {
    const code = `
function factorial(n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

function fibonacci(n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

function isPrime(number) {
    if (number < 2) return false;
    if (number === 2) return true;
    if (number % 2 === 0) return false;
    
    for (let i = 3; i <= Math.sqrt(number); i += 2) {
        if (number % i === 0) return false;
    }
    return true;
}

module.exports = { factorial, fibonacci, isPrime };
    `;
    
    const filename = 'math_functions.js';
    
    const result = await window.sendJavaScriptCodeToTestAgent(code, filename);
    
    if (result && result.success) {
        console.log('✅ JavaScript код протестирован:', result);
    } else {
        console.error('❌ Ошибка тестирования:', result?.error);
    }
}

// Пример 3: Интеграция с редактором кода
function setupJavaScriptEditorIntegration() {
    // Предположим, что у нас есть редактор кода с событием onChange
    const codeEditor = document.getElementById('code-input');
    const filenameInput = document.getElementById('filename-input');
    
    if (codeEditor && filenameInput) {
        let debounceTimer;
        
        codeEditor.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            
            // Задержка в 3 секунды после последнего изменения
            debounceTimer = setTimeout(async () => {
                const content = codeEditor.value;
                const filename = filenameInput.value;
                
                if (content.trim() && filename && filename.endsWith('.js')) {
                    console.log('🔄 Auto testing JavaScript code...');
                    await window.autoSendJavaScriptToTestAgent(filename, content);
                }
            }, 3000);
        });
    }
}

// Пример 4: Обработка результатов тестирования JavaScript
function handleJavaScriptTestResults(result) {
    if (result.success) {
        const { data } = result;
        const { testResults, testCode } = data;
        
        console.log('📊 Результаты тестирования JavaScript:');
        console.log(`- Всего тестов: ${testResults.totalTests}`);
        console.log(`- Пройдено: ${testResults.passedTests}`);
        console.log(`- Провалено: ${testResults.failedTests}`);
        
        if (testResults.failedTests === 0) {
            console.log('🎉 Все JavaScript тесты прошли успешно!');
        } else {
            console.log('⚠️ Некоторые JavaScript тесты провалились');
        }
        
        // Можно сохранить сгенерированные тесты
        console.log('🧪 Сгенерированные JavaScript тесты:', testCode);
    }
}

// Пример 5: Тестирование конкретного JavaScript файла
async function testSpecificJavaScriptFile() {
    const filePath = 'my-script.js';
    const content = `
// Пример JavaScript модуля для тестирования
class Calculator {
    constructor() {
        this.history = [];
    }
    
    add(a, b) {
        const result = a + b;
        this.history.push(\`\${a} + \${b} = \${result}\`);
        return result;
    }
    
    subtract(a, b) {
        const result = a - b;
        this.history.push(\`\${a} - \${b} = \${result}\`);
        return result;
    }
    
    multiply(a, b) {
        const result = a * b;
        this.history.push(\`\${a} * \${b} = \${result}\`);
        return result;
    }
    
    divide(a, b) {
        if (b === 0) {
            throw new Error('Division by zero');
        }
        const result = a / b;
        this.history.push(\`\${a} / \${b} = \${result}\`);
        return result;
    }
    
    getHistory() {
        return this.history;
    }
    
    clearHistory() {
        this.history = [];
    }
}

module.exports = Calculator;
    `;
    
    const result = await window.sendJavaScriptFileToTestAgent(filePath, content);
    handleJavaScriptTestResults(result);
}

// Экспорт функций для использования
window.exampleAutoSendJavaScriptFile = exampleAutoSendJavaScriptFile;
window.exampleManualSendJavaScriptCode = exampleManualSendJavaScriptCode;
window.setupJavaScriptEditorIntegration = setupJavaScriptEditorIntegration;
window.handleJavaScriptTestResults = handleJavaScriptTestResults;
window.testSpecificJavaScriptFile = testSpecificJavaScriptFile;

// Автоматическая настройка интеграции с редактором при загрузке
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                setupJavaScriptEditorIntegration();
            }, 2000);
        });
    } else {
        setTimeout(() => {
            setupJavaScriptEditorIntegration();
        }, 2000);
    }
}
