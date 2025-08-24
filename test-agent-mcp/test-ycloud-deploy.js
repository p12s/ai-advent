const YCloudDeploy = require('./ycloud-deploy.js');
const config = require('./config.json');

// Создаем тестовый HTML отчет
const testHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>🧪 Test Report</h1>
    <p class="success">✅ Test completed successfully</p>
    <p>Generated at: ${new Date().toLocaleString()}</p>
    <h2>Test Results:</h2>
    <ul>
        <li>Function add() - ✅ PASSED</li>
        <li>Function multiply() - ✅ PASSED</li>
        <li>Edge cases - ✅ PASSED</li>
    </ul>
</body>
</html>`;

async function testYCloudDeployment() {
    console.log('🚀 Testing YCloud deployment...');
    
    const ycloudDeploy = new YCloudDeploy(config);
    const testId = 'test-' + Date.now();
    const filename = `report-${testId}.html`;
    
    console.log(`📝 Test ID: ${testId}`);
    console.log(`📁 Filename: ${filename}`);
    console.log(`📊 HTML content length: ${testHtmlContent.length} chars`);
    
    const result = await ycloudDeploy.deployTestResults(testHtmlContent, testId, filename);
    
    console.log('\n📋 Deployment Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
        console.log(`\n🎉 SUCCESS! Report available at: ${result.url}`);
    } else {
        console.log(`\n❌ FAILED: ${result.error}`);
    }
}

testYCloudDeployment().catch(console.error);
