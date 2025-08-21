const fetch = require('node-fetch');

class Generator {
    constructor(config) {
        this.config = config;
        this.testFramework = 'jest';
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
            
            const prompt = `Create comprehensive tests for the entire code below.

Do not split the code into individual functions - analyze and test the entire code as a whole unit.

Complete code:
\`\`\`javascript
${originalCode}
\`\`\`

Create complete test suite that tests all functionality in this code.`;

            console.log('=== DEBUG: System Prompt ===');
            console.log(systemPrompt);
            console.log('=== DEBUG: User Prompt ===');
            console.log(prompt);
            console.log('=== DEBUG: End ===');
            
            const response = await this.callAI(systemPrompt, prompt);
            
            return {
                functionName: 'entire_code',
                className: null,
                testCode: response,
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

Test requirements:
1. Cover main functionality
2. Include positive and negative scenarios
3. Test edge cases
4. Use correct assertions
5. Add descriptive test names
6. Include comments where necessary
7. Tests must be runnable
8. Use mocks for external dependencies
9. Test REAL language behavior, not assumed behavior
10. If function does not contain validation, test its actual behavior

CRITICAL RULES FOR JAVASCRIPT TESTS:

1. Use ONLY CommonJS syntax: const source = require('./source');
2. DO NOT use ES6 import/export syntax
3. Source code is in 'source.js' file
4. DO NOT include ANY import/require statements for testing libraries
5. DO NOT include @jest/globals imports - they are already provided
6. DO NOT include jest, expect, describe, it imports - they are globally available
7. DO NOT include any other library imports unless explicitly needed
8. Start directly with describe() block, no imports at the top

CRITICAL RULE: NEVER use toThrowError() in tests.

Test actual return values using expect(result).toBe(expectedValue) or expect(result).toBeNaN().

IMPORTANT: The source code will be automatically wrapped with module.exports to make functions available for testing.

EXAMPLE CORRECT STRUCTURE:
describe('source code', () => {
    const source = require('./source');
    
    test('should work correctly', () => {
        // Use the actual function names from the code
        expect(source.actualFunctionName(1, 2)).toBe(3);
    });
});

Analyze the complete code and create comprehensive tests for all functionality as a whole unit.

REMEMBER: 
- NEVER use toThrowError() in tests!
- write a javascript file so that it is ready to run, without any modifications
- Use the actual function/class names from the provided code`;
    }

    async callAI(systemPrompt, prompt) {
        try {
            console.log(`🤖 Calling Ollama API at ${this.config.ollama.url}`);
            console.log(`📝 Model: ${this.config.ollama.model}`);
            console.log(`📝 Config:`, JSON.stringify(this.config.ollama, null, 2));
            
            try {
                const healthCheck = await fetch(`${this.config.ollama.url}/api/tags`, { timeout: 5000 });
                if (!healthCheck.ok) {
                    throw new Error('Ollama not available');
                }
                console.log('✅ Ollama is available');
            } catch (healthError) {
                console.log('⚠️ Ollama not available, returning empty test');
                return '';
            }
            
            const requestBody = {
                model: this.config.ollama.model,
                system: systemPrompt,
                prompt: prompt,
                temperature: 0.3,
                stream: false,
                options: {
                    num_predict: 1000,
                    top_k: 40,
                    top_p: 0.9
                }
            };
            
            console.log('=== DEBUG: Request Body ===');
            console.log(JSON.stringify(requestBody, null, 2));
            console.log('=== DEBUG: End Request Body ===');
            
            const response = await fetch(`${this.config.ollama.url}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                timeout: 30000
            });

            if (!response.ok) {
                console.error(`❌ Ollama API error: ${response.status} ${response.statusText}`);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                
                return '';
            }

            const data = await response.json();
            const generatedCode = data.response || '';
            
            console.log(`✅ Generated ${generatedCode.length} characters of test code`);
            
            return this.simpleCleanGeneratedCode(generatedCode);

        } catch (error) {
            console.error('❌ Error calling Ollama:', error);
            return '';
        }
    }

    simpleCleanGeneratedCode(rawCode) {
        if (!rawCode || typeof rawCode !== 'string') {
            return '';
        }

        let cleanedCode = rawCode;

        const introPatterns = [
            /^.*?Here are the tests for.*?:/gmi,
            /^.*?Here's.*?test.*?:/gmi,
            /^.*?I'll create.*?:/gmi,
            /^.*?Let me create.*?:/gmi,
            /^.*?Below are.*?tests.*?:/gmi
        ];

        introPatterns.forEach(pattern => {
            cleanedCode = cleanedCode.replace(pattern, '');
        });

        const explanationPatterns = [
            /Note:.*$/gmi,
            /These tests.*$/gmi,
            /We use.*$/gmi,
            /The `describe`.*$/gmi
        ];

        explanationPatterns.forEach(pattern => {
            cleanedCode = cleanedCode.replace(pattern, '');
        });

        const codeBlockMatches = cleanedCode.match(/```(?:javascript|js)?\s*([\s\S]*?)```/gi);
        
        if (codeBlockMatches && codeBlockMatches.length > 0) {
            const extractedCode = codeBlockMatches.map(block => {
                return block.replace(/```(?:javascript|js)?\s*/, '')
                           .replace(/```$/, '')
                           .trim();
            }).join('\n\n');
            
            cleanedCode = extractedCode;
        }

        cleanedCode = cleanedCode.replace(/\n\s*\n\s*\n/g, '\n\n');
        cleanedCode = cleanedCode.trim();

        if (!cleanedCode || cleanedCode.length < 20) {
            console.warn('⚠️ Cleaned code too short, using original');
            return rawCode.trim();
        }

        return cleanedCode;
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
