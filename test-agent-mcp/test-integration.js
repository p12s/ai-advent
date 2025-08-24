const fetch = require('node-fetch');
const YCloudDeploy = require('./ycloud-deploy');

async function testIntegration() {
    console.log('🧪 Тестирование интеграции test-agent-mcp с ycloud-mcp...\n');

    try {
        // Загружаем конфигурацию
        const config = require('./config.json');
        console.log('✅ Конфигурация загружена');
        console.log(`📡 YCloud URL: ${config.ycloud?.url || 'http://localhost:3004'}`);

        // Создаем экземпляр YCloudDeploy
        const ycloudDeploy = new YCloudDeploy(config);
        console.log('✅ YCloudDeploy инициализирован');

        // Тестовый HTML контент
        const testHtmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Тест интеграции</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f0f0f0; }
        .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .success { color: green; }
        .timestamp { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Тест интеграции успешен!</h1>
        <p class="success">HTML файл успешно развернут через ycloud-mcp</p>
        <p class="timestamp">Развернуто: ${new Date().toISOString()}</p>
        <p>Этот файл был создан для тестирования интеграции между test-agent-mcp и ycloud-mcp.</p>
    </div>
</body>
</html>`;

        const testId = 'integration-test-' + Date.now();
        console.log(`🆔 Test ID: ${testId}`);

        // Тестируем деплой
        console.log('\n🚀 Тестирование деплоя на Yandex Cloud...');
        const filename = `integration-test-${Date.now()}.html`;
        const result = await ycloudDeploy.deployTestResults(testHtmlContent, testId, filename);

        if (result.success) {
            console.log('\n✅ Интеграция работает корректно!');
            console.log(`📱 URL отчета: ${result.url}`);
            console.log(`🌐 Public IP: ${result.publicIP}`);
            console.log(`📄 Файл: ${result.filename}`);
            
            console.log('\n📋 Проверьте в браузере:');
            console.log(`   ${result.url}`);
            
            return {
                success: true,
                url: result.url,
                message: 'Интеграция работает корректно'
            };
        } else {
            console.log('\n❌ Ошибка интеграции:');
            console.log(`   ${result.error}`);
            
            return {
                success: false,
                error: result.error,
                message: 'Интеграция не работает'
            };
        }

    } catch (error) {
        console.error('\n❌ Ошибка тестирования интеграции:', error.message);
        return {
            success: false,
            error: error.message,
            message: 'Ошибка тестирования'
        };
    }
}

// Запуск теста если файл вызван напрямую
if (require.main === module) {
    testIntegration().then(result => {
        console.log('\n📊 Результат тестирования:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { testIntegration };
