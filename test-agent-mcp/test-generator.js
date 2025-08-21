const Generator = require('./generator');

async function testGenerator() {
    const config = {
        ollama: {
            url: "http://localhost:11434",
            model: "codestral:22b"
        }
    };
    
    const generator = new Generator(config);
    
    console.log('🧪 Testing generator...');
    
    const testCode = `function add(a, b) { 
        return a + b; 
    }`;
    
    try {
        const result = await generator.generateTestsForCode({ totalFunctions: 1 }, testCode);
        console.log('✅ Generator result:', JSON.stringify(result, null, 2));
        
        if (result.success && result.compiledTests) {
            console.log('📝 Generated test code:');
            console.log(result.compiledTests);
        } else {
            console.log('❌ No test code generated');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testGenerator();
