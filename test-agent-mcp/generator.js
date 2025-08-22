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
            const systemPrompt = this.getSystemPrompt();
            
            // Определяем, использует ли код браузерные API
            const hasBrowserAPIs = this.detectBrowserAPIs(originalCode);
            
            let prompt = `Create comprehensive tests for the entire code below.

Do not split the code into individual functions - analyze and test the entire code as a whole unit.

Complete code:
\`\`\`javascript
${originalCode}
\`\`\`

Create complete test suite that tests all functionality in this code.`;

            if (hasBrowserAPIs) {
                prompt += `

IMPORTANT: This code uses browser APIs (window, document, etc.). You MUST:
- Mock all browser APIs using jest.fn() and global objects
- Set up beforeEach() to mock window, document, and other browser objects
- Clean up mocks in afterEach()
- Test only the logic that doesn't depend on browser APIs
- Use global.window, global.document, etc. for mocking`;
            }

            prompt += `

IMPORTANT: 
- Return ONLY the JavaScript test code. Do not include any explanations, comments about what you're doing, or markdown formatting. Start directly with the describe() block and end with the test code.
- Tests run in Node.js environment, not browser
- Mock any browser-specific functionality that the code depends on`;

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
        return `You are an expert in testing JavaScript code. 
Create high-quality unit tests using the Jest framework.

CRITICAL OUTPUT FORMAT RULES:
1. Return ONLY pure JavaScript test code
2. NO markdown formatting, NO code blocks with \`\`\`
3. NO explanatory text, NO comments about what you're doing
4. NO numbered lists, NO bullet points, NO markdown headers
5. NO "Here are the tests:" or similar introductory phrases
6. Start directly with the test code
7. End with the test code - no additional explanations
8. NO backticks (\`) in comments or strings unless absolutely necessary
9. NO markdown-style formatting anywhere in the code
10. Write clean, executable JavaScript that can be run immediately

Test requirements:
1. Cover main functionality
2. Include positive and negative scenarios
3. Test edge cases
4. Use correct assertions
5. Add descriptive test names
6. Tests must be runnable
7. Use mocks for external dependencies
8. Test REAL language behavior, not assumed behavior
9. If function does not contain validation, test its actual behavior

CRITICAL RULES FOR JAVASCRIPT TESTS:

1. Use ONLY CommonJS syntax: const source = require('./source');
2. DO NOT use ES6 import/export syntax
3. Source code is in 'source.js' file
4. DO NOT include ANY import/require statements for testing libraries
5. DO NOT include @jest/globals imports - they are already provided
6. DO NOT include jest, expect, describe, it imports - they are globally available
7. DO NOT include any other library imports unless explicitly needed
8. Start directly with describe() block, no imports at the top
9. Tests run in Node.js environment - NO browser APIs (window, document, etc.)
10. If source code uses browser APIs, mock them or test only Node.js compatible parts
11. Use jest.fn() to mock browser functions if needed

CRITICAL RULE: NEVER use toThrow() in tests unless the function actually throws exceptions.

JAVASCRIPT BEHAVIOR RULES - Test REAL behavior, not assumed:

1. **Arithmetic operations with non-numbers:**
   - undefined - number = NaN
   - null - number = -number (null converts to 0)
   - string - number = number (string converts to number if possible, otherwise NaN)

2. **Large numbers and precision:**
   - JavaScript has precision limits for large numbers
   - Use toBeCloseTo() for floating point comparisons
   - Avoid testing exact equality for very large numbers
   - 1e9 - 1e8 = 900000000 (not 900000001)

3. **Edge cases:**
   - Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER = 0
   - Number.MIN_SAFE_INTEGER - Number.MAX_SAFE_INTEGER = -2 * Number.MAX_SAFE_INTEGER
   - Test actual return values, not mathematical expectations

4. **Type coercion:**
   - JavaScript automatically converts types in arithmetic operations
   - Test the actual result, not what you think should happen
   - Use toBeNaN() for NaN results, toBeUndefined() for undefined
   - null converts to 0 in arithmetic operations

5. **Function behavior:**
   - If function doesn't validate inputs, test actual behavior
   - Don't expect exceptions unless function explicitly throws them
   - Test return values, not side effects

EXAMPLE CORRECT STRUCTURE:
describe('source code', () => {
    const source = require('./source');
    
    test('should work correctly', () => {
        expect(source.actualFunctionName(1, 2)).toBe(3);
    });
    
    test('should handle undefined inputs', () => {
        expect(source.actualFunctionName(undefined, 5)).toBeNaN();
    });
    
    test('should handle null inputs', () => {
        expect(source.actualFunctionName(null, 5)).toBe(5);
    });
});

EXAMPLE WITH BROWSER API MOCKS:
describe('source code with browser APIs', () => {
    beforeEach(() => {
        global.window = {
            mcpGithubEnabled: false,
            githubConfig: {}
        };
        global.document = {
            getElementById: jest.fn(),
            querySelector: jest.fn()
        };
    });
    
    afterEach(() => {
        delete global.window;
        delete global.document;
    });
    
    const source = require('./source');
    
    test('should work correctly', () => {
        expect(source.actualFunctionName(1, 2)).toBe(3);
    });
});

DO NOT DO THIS:
- Do not start with "Here are the tests:"
- Do not use markdown code blocks
- Do not include numbered lists like "1. Test basic functionality"
- Do not use backticks in comments like "Test the add function"
- Do not add explanations after the code

Analyze the complete code and create comprehensive tests for all functionality as a whole unit.

REMEMBER: 
- NEVER use toThrow() unless function actually throws!
- Test REAL JavaScript behavior, not mathematical assumptions
- Use appropriate matchers: toBe(), toBeNaN(), toBeUndefined(), toBeCloseTo()
- Write tests that will pass with actual JavaScript behavior
- Return ONLY the test code, nothing else`;
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

        let cleanedCode = rawCode.trim();

        // Извлекаем код из блоков кода если они есть
        const codeBlockMatches = cleanedCode.match(/```(?:javascript|js)?\s*([\s\S]*?)```/gi);
        
        if (codeBlockMatches && codeBlockMatches.length > 0) {
            const extractedCode = codeBlockMatches.map(block => {
                return block.replace(/```(?:javascript|js)?\s*/, '')
                           .replace(/```$/, '')
                           .trim();
            }).join('\n\n');
            
            cleanedCode = extractedCode;
        }

        // Удаляем лишние пустые строки
        cleanedCode = cleanedCode.replace(/\n\s*\n\s*\n/g, '\n\n');
        cleanedCode = cleanedCode.trim();

        // Проверяем что остался валидный JavaScript код
        if (!cleanedCode || cleanedCode.length < 20) {
            console.warn('⚠️ Generated code too short');
            return '';
        }

        // Проверяем наличие тестовых функций
        if (!cleanedCode.includes('describe') && !cleanedCode.includes('test') && !cleanedCode.includes('it(')) {
            console.warn('⚠️ Generated code does not contain test functions');
            return '';
        }

        return cleanedCode;
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
}

module.exports = Generator;
