# Auto Test Sender - Автоматическое тестирование JavaScript

🤖 **Auto Test Sender** - система для автоматической отправки измененных JavaScript скриптов в test-agent-mcp для тестирования.

## 🚀 Возможности

- **🤖 Автоматическое тестирование** - JavaScript файлы автоматически отправляются в test-agent-mcp при изменении
- **📝 Ручное тестирование** - возможность вручную отправить JavaScript код
- **🔄 Отслеживание изменений** - система помнит хеши файлов и отправляет только измененные
- **📊 Детальная отчетность** - показ результатов тестирования с кнопками действий
- **⚙️ Управление** - включение/выключение автоматического тестирования

## 🎯 Как использовать

### 1. Автоматическое тестирование

После внесения изменений в JavaScript файл:

```javascript
// Отправка измененного файла
await window.autoSendJavaScriptToTestAgent('my-script.js', newContent);
```

### 2. Ручное тестирование

```javascript
// Отправка JavaScript кода
await window.sendJavaScriptCodeToTestAgent(code, 'test.js');

// Отправка JavaScript файла
await window.sendJavaScriptFileToTestAgent('path/to/file.js', content);
```

### 3. Управление системой

```javascript
// Включить/выключить автотестирование
window.autoTestSender.setAutoTestEnabled(true);

// Очистить историю
window.autoTestSender.clearHistory();
```

## 📁 Структура файлов

```
web-app/
├── auto-test-sender.js          # Основной модуль автоматического тестирования
├── example-usage.js            # Примеры использования
├── AUTO-TEST-README.md         # Этот файл
└── ...                         # Остальные файлы проекта
```

## 🔧 Интеграция

### Автоматическая инициализация

Система автоматически инициализируется при загрузке страницы:

```javascript
// Проверка доступности test-agent-mcp
const isHealthy = await window.autoTestSender.checkTestAgentHealth();
```

### Интеграция с редактором кода

```javascript
// Настройка автоматического тестирования при изменении кода
function setupJavaScriptEditorIntegration() {
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
                    await window.autoSendJavaScriptToTestAgent(filename, content);
                }
            }, 3000);
        });
    }
}
```

## 🧪 Примеры использования

### Пример 1: Тестирование простого JavaScript модуля

```javascript
const code = `
function add(a, b) {
    return a + b;
}

function multiply(a, b) {
    return a * b;
}

module.exports = { add, multiply };
`;

const result = await window.sendJavaScriptCodeToTestAgent(code, 'math.js');
```

### Пример 2: Тестирование класса

```javascript
const code = `
class Calculator {
    constructor() {
        this.history = [];
    }
    
    add(a, b) {
        const result = a + b;
        this.history.push(\`\${a} + \${b} = \${result}\`);
        return result;
    }
    
    getHistory() {
        return this.history;
    }
}

module.exports = Calculator;
`;

const result = await window.sendJavaScriptCodeToTestAgent(code, 'calculator.js');
```

### Пример 3: Демонстрация системы

```javascript
// Запуск демонстрации
await window.demoAutoTestSystem();
```

## 📊 Результаты тестирования

После тестирования вы получите:

- **📊 Статистику тестов** - общее количество, пройденные, проваленные
- **📈 Процент успешности** - соотношение пройденных к общему количеству тестов
- **📄 Сгенерированные тесты** - код тестов, созданных ИИ
- **🔗 Кнопки действий** - копирование тестов, просмотр отчетов

## ⚙️ Конфигурация

### URL test-agent-mcp

По умолчанию система использует `http://localhost:3006`. Для изменения:

```javascript
window.autoTestSender.testAgentUrl = 'http://your-test-agent-url:port';
```

### Поддерживаемые форматы файлов

- `.js` - JavaScript файлы
- `.mjs` - ES модули

## 🚨 Устранение неполадок

### Test Agent MCP недоступен

```javascript
// Проверка здоровья сервиса
const isHealthy = await window.autoTestSender.checkTestAgentHealth();
console.log('Test Agent доступен:', isHealthy);
```

### Ошибки отправки

```javascript
try {
    const result = await window.sendJavaScriptCodeToTestAgent(code, filename);
    if (!result.success) {
        console.error('Ошибка:', result.error);
    }
} catch (error) {
    console.error('Сетевая ошибка:', error);
}
```

### Файл не отправляется

```javascript
// Проверка, изменился ли файл
const hasChanged = window.autoTestSender.hasFileChanged(filePath, content);
console.log('Файл изменился:', hasChanged);

// Принудительная очистка истории
window.autoTestSender.clearHistory();
```

## 🎯 Результат

Система обеспечивает:

✅ **Автоматическую отправку** JavaScript файлов в test-agent-mcp  
✅ **Отслеживание изменений** для оптимизации  
✅ **Детальную отчетность** с результатами тестирования  
✅ **Простой API** для интеграции  
✅ **Управление состоянием** системы  

---

**🤖 Auto Test Sender** - автоматизируйте тестирование JavaScript кода с помощью ИИ!
