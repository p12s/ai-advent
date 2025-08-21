const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3006';

async function testHealth() {
    console.log('🔍 Testing health endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/health`);
        const data = await response.json();
        console.log('✅ Health check passed:', data);
        return true;
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return false;
    }
}

async function testLanguages() {
    console.log('🔍 Testing languages endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/api/languages`);
        const data = await response.json();
        console.log('✅ Languages endpoint:', data);
        return true;
    } catch (error) {
        console.error('❌ Languages endpoint failed:', error.message);
        return false;
    }
}

async function testJavaScriptCode() {
    console.log('🔍 Testing JavaScript code...');
    try {
        const testCode = `
function add(a, b) {
    return a + b;
}

function subtract(a, b) {
    return a - b;
}

function multiply(a, b) {
    return a * b;
}

module.exports = { add, subtract, multiply };
        `;

        const response = await fetch(`${BASE_URL}/api/test-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: testCode,
                language: 'javascript',
                filename: 'math.js'
            })
        });

        const data = await response.json();
        
        if (data.success) {
            console.log('✅ JavaScript test completed successfully!');
            console.log('📊 Test results:', data.data.testResults);
            console.log('📄 Generated test code length:', data.data.testCode.length);
            if (data.data.reportUrl) {
                console.log('🌐 Report URL:', data.data.reportUrl);
            }
            return true;
        } else {
            console.error('❌ JavaScript test failed:', data.error);
            return false;
        }
    } catch (error) {
        console.error('❌ JavaScript test error:', error.message);
        return false;
    }
}

async function testPythonCode() {
    console.log('🔍 Testing Python code...');
    try {
        const testCode = `
def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

def multiply(a, b):
    return a * b

def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
        `;

        const response = await fetch(`${BASE_URL}/api/test-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: testCode,
                language: 'python',
                filename: 'math.py'
            })
        });

        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Python test completed successfully!');
            console.log('📊 Test results:', data.data.testResults);
            console.log('📄 Generated test code length:', data.data.testCode.length);
            return true;
        } else {
            console.error('❌ Python test failed:', data.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Python test error:', error.message);
        return false;
    }
}

async function testInit() {
    console.log('🔍 Testing initialization...');
    try {
        const response = await fetch(`${BASE_URL}/api/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Initialization successful:', data.message);
            return true;
        } else {
            console.error('❌ Initialization failed:', data.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Initialization error:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 Starting Test Agent MCP API tests...\n');

    const tests = [
        { name: 'Health Check', fn: testHealth },
        { name: 'Languages Endpoint', fn: testLanguages },
        { name: 'Initialization', fn: testInit },
        { name: 'JavaScript Code Testing', fn: testJavaScriptCode },
        { name: 'Python Code Testing', fn: testPythonCode }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        console.log(`\n🧪 Running: ${test.name}`);
        console.log('─'.repeat(50));
        
        const result = await test.fn();
        
        if (result) {
            passed++;
            console.log(`✅ ${test.name} - PASSED`);
        } else {
            failed++;
            console.log(`❌ ${test.name} - FAILED`);
        }
        
        // Пауза между тестами
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total: ${passed + failed}`);
    
    if (failed === 0) {
        console.log('🎉 All tests passed! Test Agent MCP is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Check the configuration and services.');
    }
}

// Запуск тестов если файл выполняется напрямую
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testHealth,
    testLanguages,
    testJavaScriptCode,
    testPythonCode,
    testInit,
    runAllTests
};
