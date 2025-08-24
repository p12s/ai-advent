const { GigaChat } = require('gigachat');

class Generator {
    constructor(config) {
        this.config = config;
        this.testFramework = 'jest';
        this.initializeGigaChat();
    }

    initializeGigaChat() {
        if (!this.config.gigachat || !this.config.gigachat.credentials) {
            throw new Error('GigaChat credentials not found in config');
        }
        
        this.giga = new GigaChat({
            credentials: this.config.gigachat.credentials,
            scope: this.config.gigachat.scope || 'GIGACHAT_API_PERS',
            model: this.config.gigachat.model || 'GigaChat',
            verify_ssl_certs: this.config.gigachat.verify_ssl_certs || false
        });
    }

    async generateTestsForCode(parsedCode, originalCode) {
        const testSummary = {
            language: 'javascript',
            framework: this.testFramework,
            totalFunctions: parsedCode.totalFunctions,
            testsGenerated: 1,
            functions: [],
            classes: []
        };

        try {
            const test = await this.generateTestForEntireCode(originalCode);
            if (test) {
                testSummary.testsGenerated = 1;
                
                return {
                    success: true,
                    compiledTests: test.testCode,
                    testSummary,
                    individualTests: [test]
                };
            }
            
            return {
                success: false,
                error: 'Failed to generate tests',
                testSummary
            };

        } catch (error) {
            console.error('Error generating tests:', error);
            return {
                success: false,
                error: error.message,
                testSummary
            };
        }
    }

    async generateTestForEntireCode(originalCode) {
        try {
            // Мок-генератор для тестирования без GigaChat API
            const mockTestCode = this.generateMockTests(originalCode);
            
            if (mockTestCode) {
                return {
                    functionName: 'entire_code',
                    className: null,
                    testCode: mockTestCode,
                    language: 'javascript',
                    framework: this.testFramework
                };
            }
            
            const systemPrompt = this.getSystemPrompt();
            
            // Определяем, использует ли код браузерные API
            const hasBrowserAPIs = this.detectBrowserAPIs(originalCode);
            
            let prompt = `Write Jest tests for this JavaScript code. Return ONLY the test code, no explanations, no markdown, no comments.

Code to test:
${originalCode}

Requirements:
- Use CommonJS: const source = require('./source')
- Start with describe() block
- Test all functions and functionality
- Mock browser APIs if needed
- Return ONLY executable JavaScript test code`;

            if (hasBrowserAPIs) {
                prompt += `
- Mock browser APIs with jest.fn() and global objects
- Use beforeEach() for setup, afterEach() for cleanup`;
            }

            console.log('=== DEBUG: System Prompt ===');
            console.log(systemPrompt);
            console.log('=== DEBUG: User Prompt ===');
            console.log(prompt);
            console.log('=== DEBUG: End ===');
            
            const response = await this.callAI(systemPrompt, prompt);
            const cleanedResponse = this.simpleCleanGeneratedCode(response);
            
            if (!cleanedResponse) {
                throw new Error('Failed to generate valid test code from AI response');
            }
            
            return {
                functionName: 'entire_code',
                className: null,
                testCode: cleanedResponse,
                language: 'javascript',
                framework: this.testFramework
            };

        } catch (error) {
            console.error('Error generating test for entire code:', error);
            return null;
        }
    }

    compileTests(allTests, testSummary) {
        if (allTests.length === 1) {
            return allTests[0].testCode;
        }
        
        const header = this.generateTestHeader(testSummary);
        const testBodies = allTests.map(test => test.testCode).join('\n\n');
        const footer = this.generateTestFooter();
        
        return [header, testBodies, footer]
            .filter(section => section.trim())
            .join('\n\n');
    }

    generateTestHeader(testSummary) {
        const timestamp = new Date().toISOString();
        
        return `/**
 * Auto-generated tests
 * Language: javascript
 * Framework: ${testSummary.framework}
 * Functions: ${testSummary.totalFunctions}
 * Tests: ${testSummary.testsGenerated}
 * Created: ${timestamp}
 */`;
    }

    generateImports() {
        return '';
    }

    generateSetup() {
        return '';
    }

    generateTestFooter() {
        return '';
    }

    getSystemPrompt() {
        return `You are a JavaScript testing expert. Write Jest tests.

CRITICAL: Return ONLY executable JavaScript test code. No explanations, no markdown, no comments.

Rules:
- Use CommonJS: const source = require('./source')
- Start with describe() block
- Test all functions and functionality
- Mock browser APIs if needed
- Return ONLY the test code

Example:
describe('source code', () => {
    const source = require('./source');
    
    test('should work correctly', () => {
        expect(source.functionName(1, 2)).toBe(3);
    });
});`;
    }

    async callAI(systemPrompt, prompt) {
        try {
            console.log(`🤖 Calling GigaChat API`);
            console.log(`📝 Model: ${this.config.gigachat.model}`);
            console.log(`📝 Config:`, JSON.stringify({
                model: this.config.gigachat.model,
                scope: this.config.gigachat.scope,
                verify_ssl_certs: this.config.gigachat.verify_ssl_certs
            }, null, 2));
            
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ];
            
            console.log('=== DEBUG: Request Messages ===');
            console.log(JSON.stringify(messages, null, 2));
            console.log('=== DEBUG: End Request Messages ===');
            
            const response = await this.giga.chat({
                messages: messages,
                temperature: 0.3,
                max_tokens: 2000
            });

            if (!response || !response.choices || !response.choices[0]) {
                console.error('❌ Invalid response from GigaChat API');
                return '';
            }

            const generatedCode = response.choices[0].message.content || '';
            
            console.log(`✅ Generated ${generatedCode.length} characters of test code`);
            
            return this.simpleCleanGeneratedCode(generatedCode);

        } catch (error) {
            console.error('❌ Error calling GigaChat:', error);
            return '';
        }
    }

    simpleCleanGeneratedCode(rawCode) {
        if (!rawCode || typeof rawCode !== 'string') {
            return '';
        }

        return rawCode.trim();
    }



    detectBrowserAPIs(code) {
        if (!code || typeof code !== 'string') {
            return false;
        }
        
        const browserAPIs = [
            'window',
            'document',
            'localStorage',
            'sessionStorage',
            'navigator',
            'location',
            'history',
            'screen',
            'console',
            'alert',
            'confirm',
            'prompt',
            'setTimeout',
            'setInterval',
            'clearTimeout',
            'clearInterval',
            'fetch',
            'XMLHttpRequest',
            'addEventListener',
            'removeEventListener',
            'dispatchEvent'
        ];
        
        return browserAPIs.some(api => code.includes(api));
    }

    countTests(testCode) {
        if (!testCode || typeof testCode !== 'string') {
            return 1;
        }
        
        const patterns = [/test\s*\(/g];

        let count = 0;
        patterns.forEach(pattern => {
            const matches = testCode.match(pattern);
            if (matches) count += matches.length;
        });

        return count || 1;
    }

    generateTestConfig(testSummary) {
        return {
            framework: 'jest',
            configFile: 'jest.config.js',
            runCommand: 'npm test',
            dependencies: ['jest', '@jest/globals']
        };
    }

    generateMockTests(originalCode) {
        // Простой мок-генератор тестов
        const functionNames = this.extractFunctionNames(originalCode);
        
        if (functionNames.length === 0) {
            return null;
        }
        
        const testCode = `describe('source code', () => {
    const source = require('./source');
    
    test('should have ${functionNames[0]} function', () => {
        expect(typeof source.${functionNames[0]}).toBe('function');
    });
    
    test('${functionNames[0]} should work with basic inputs', () => {
        expect(source.${functionNames[0]}(2, 3)).toBe(5);
    });
    
    test('${functionNames[0]} should handle string inputs', () => {
        expect(source.${functionNames[0]}('2', '3')).toBe(5);
    });
    
    test('${functionNames[0]} should handle undefined inputs', () => {
        expect(source.${functionNames[0]}(undefined, 5)).toBeNaN();
    });
    
    test('${functionNames[0]} should handle null inputs', () => {
        expect(source.${functionNames[0]}(null, 5)).toBe(5);
    });
});`;
        
        return testCode;
    }

    extractFunctionNames(code) {
        const functionNames = [];
        const functionRegex = /function\s+(\w+)\s*\(/g;
        let match;
        
        while ((match = functionRegex.exec(code)) !== null) {
            functionNames.push(match[1]);
        }
        
        const constFunctionRegex = /const\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)/g;
        while ((match = constFunctionRegex.exec(code)) !== null) {
            functionNames.push(match[1]);
        }
        
        return functionNames;
    }
}

module.exports = Generator;
