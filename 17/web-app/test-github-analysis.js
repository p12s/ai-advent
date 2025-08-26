/**
 * Скрипт для автоматического тестирования github-analysis.js
 */

const fs = require('fs');
const path = require('path');

// Читаем содержимое файла github-analysis.js
const filePath = path.join(__dirname, 'github-analysis.js');
const content = fs.readFileSync(filePath, 'utf8');

console.log('🧪 Отправка github-analysis.js на автоматическое тестирование...');
console.log(`📄 Файл: ${filePath}`);
console.log(`📊 Размер: ${content.length} символов`);

// Проверяем, что Auto Test Sender доступен
if (typeof window !== 'undefined' && window.autoTestSender) {
    console.log('✅ Auto Test Sender доступен');
    
    // Отправляем файл на тестирование
    window.autoSendJavaScriptToTestAgent('github-analysis.js', content)
        .then(result => {
            if (result && result.success) {
                console.log('✅ Автоматическое тестирование github-analysis.js завершено успешно!');
                console.log('📊 Результаты:', result.data);
            } else {
                console.error('❌ Ошибка автоматического тестирования:', result?.error);
            }
        })
        .catch(error => {
            console.error('❌ Ошибка при отправке на тестирование:', error);
        });
} else {
    console.log('⚠️ Auto Test Sender недоступен в Node.js окружении');
    console.log('💡 Для тестирования откройте веб-интерфейс и используйте кнопку "🚀 Тест примера JavaScript"');
}

// Экспортируем функцию для использования в браузере
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testGitHubAnalysis: function() {
            if (typeof window !== 'undefined' && window.autoSendJavaScriptToTestAgent) {
                return window.autoSendJavaScriptToTestAgent('github-analysis.js', content);
            } else {
                return Promise.reject(new Error('Auto Test Sender недоступен'));
            }
        }
    };
}
