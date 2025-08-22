const Generator = require('./generator');

async function testGenerator() {
    const config = {
        gigachat: {
            credentials: "N2FjYTczM2MtODgyYy00NWE4LWI2NjItYTQ4NTgzMTQ0ZDFkOjUzMjc5OTM4LTRmMDYtNGJiZC05MjI4LWZhZTIxZmM1ODk1Mg==",
            scope: "GIGACHAT_API_PERS",
            model: "GigaChat",
            verify_ssl_certs: false
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
