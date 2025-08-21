const fetch = require('node-fetch');

class TestGenerator {
    constructor(config) {
        this.config = config;
        this.testFrameworks = {
            javascript: 'jest',
            typescript: 'jest',
            python: 'pytest',
            java: 'junit',
            go: 'testing',
            ruby: 'rspec',
            php: 'phpunit',
            csharp: 'nunit',
            rust: 'cargo test'
        };
    }

    /**
     * Генерирует тесты для всего кода целиком (без разделения на функции)
     */
    async generateTestsForCode(parsedCode, originalCode) {
        const { language } = parsedCode;
        const testSummary = {
            language,
            framework: this.testFrameworks[language] || 'unknown',
            totalFunctions: parsedCode.totalFunctions,
            testsGenerated: 1,
            functions: [],
            classes: []
        };

        try {
            // Для JavaScript генерируем тесты для всего кода целиком
            if (language === 'javascript') {
                const test = await this.generateTestForEntireCode(originalCode, language);
                if (test) {
                    testSummary.testsGenerated = 1;
                    
                    return {
                        success: true,
                        compiledTests: test.testCode,
                        testSummary,
                        individualTests: [test]
                    };
                }
            }
            
            // Fallback для других языков (не должно использоваться согласно требованиям)
            return {
                success: false,
                error: 'Only JavaScript is supported',
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

    /**
     * Генерирует тест для всего кода целиком
     */
    async generateTestForEntireCode(originalCode, language) {
        try {
            const systemPrompt = this.getSystemPrompt(language, 'entire_code');
            
            const prompt = `Create comprehensive tests for the entire JavaScript code below.

Do not split the code into individual functions - analyze and test the entire code as a whole unit.

Complete JavaScript code:
\`\`\`javascript
${originalCode}
\`\`\`

Create complete test suite using Jest that tests all functionality in this code.`;

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
                language: language,
                framework: this.testFrameworks[language]
            };

        } catch (error) {
            console.error('Error generating test for entire code:', error);
            return null;
        }
    }

    /**
     * Генерирует тест для отдельной функции (DEPRECATED - не используется для JS)
     */
    async generateTestForFunction(func, language, originalCode, className = null) {
        try {
            const context = className ? `класса ${className}` : 'модуля';
            const systemPrompt = this.getSystemPrompt(language, func.type);
            
            const prompt = `Create tests for function "${func.name}" from ${context}.

Function information:
- Name: ${func.name}
- Type: ${func.type}
- Parameters: ${func.params?.join(', ') || 'none'}
- Line: ${func.line}

Function code:
\`\`\`${language}
${func.code}
\`\`\`

${className ? `Class context ${className}` : ''}

Create only test code for this function using ${this.testFrameworks[language]}.`;

            console.log('=== DEBUG: System Prompt ===');
            console.log(systemPrompt);
            console.log('=== DEBUG: User Prompt ===');
            console.log(prompt);
            console.log('=== DEBUG: End ===');
            
            const response = await this.callAI(systemPrompt, prompt);
            
            return {
                functionName: func.name,
                className: className,
                testCode: response,
                language: language,
                framework: this.testFrameworks[language]
            };

        } catch (error) {
            console.error(`Error generating test for function ${func.name}:`, error);
            return null;
        }
    }

    /**
     * Генерирует тест для класса с его методами
     */
    async generateTestForClass(cls, methodTests, language) {
        try {
            const systemPrompt = this.getSystemPrompt(language, 'class');
            
            const methodTestsCode = methodTests.map(test => test.testCode).join('\n\n');
            
            const prompt = `Create combined test for class "${cls.name}".

Class information:
- Name: ${cls.name}
- Methods: ${cls.methods?.length || 0}
- Line: ${cls.line}

Class code:
\`\`\`${language}
${cls.code}
\`\`\`

Already created tests for methods:
\`\`\`${language}
${methodTestsCode}
\`\`\`

Create combined class test including setup/teardown if needed.`;

            const response = await this.callAI(systemPrompt, prompt);
            
            return {
                className: cls.name,
                testCode: response,
                language: language,
                framework: this.testFrameworks[language],
                methodTests: methodTests
            };

        } catch (error) {
            console.error(`Error generating test for class ${cls.name}:`, error);
            return null;
        }
    }

    /**
     * Компилирует все тесты в единый файл (для JS - просто возвращает код целиком)
     */
    compileTests(allTests, language, testSummary) {
        // Для JavaScript возвращаем код целиком без дополнительных заголовков
        if (language === 'javascript' && allTests.length === 1) {
            return allTests[0].testCode;
        }
        
        const header = this.generateTestHeader(language, testSummary);
        const testBodies = allTests.map(test => test.testCode).join('\n\n');
        const footer = this.generateTestFooter(language);
        
        return [header, testBodies, footer]
            .filter(section => section.trim())
            .join('\n\n');
    }

    /**
     * Генерирует заголовок тестового файла
     */
    generateTestHeader(language, testSummary) {
        const timestamp = new Date().toISOString();
        
        switch (language) {
            case 'javascript':
            case 'typescript':
                return `/**
 * Автоматически сгенерированные тесты
 * Язык: ${language}
 * Фреймворк: ${testSummary.framework}
 * Функций: ${testSummary.totalFunctions}
 * Тестов: ${testSummary.testsGenerated}
 * Создано: ${timestamp}
 */`;

            case 'python':
                return `"""
Автоматически сгенерированные тесты
Язык: ${language}
Фреймворк: ${testSummary.framework}
Функций: ${testSummary.totalFunctions}
Тестов: ${testSummary.testsGenerated}
Создано: ${timestamp}
"""`;

            case 'java':
                return `/**
 * Автоматически сгенерированные тесты
 * Язык: ${language}
 * Фреймворк: ${testSummary.framework}
 * Функций: ${testSummary.totalFunctions}
 * Тестов: ${testSummary.testsGenerated}
 * Создано: ${timestamp}
 */`;

            default:
                return `// Автоматически сгенерированные тесты для ${language}`;
        }
    }

    /**
     * Генерирует импорты для тестового файла
     * УБРАНО: больше не добавляем автоматические импорты
     */
    generateImports(language) {
        // Возвращаем пустую строку - импорты должны быть в коде от модели
        return '';
    }

    /**
     * Генерирует setup код для тестов
     */
    generateSetup(language) {
        // Убираем пустые beforeEach/afterEach блоки - они не нужны если ничего не делают
        return '';
    }

    /**
     * Генерирует футер тестового файла
     */
    generateTestFooter(language) {
        switch (language) {
            case 'python':
                return `if __name__ == '__main__':
    unittest.main()`;
            
            default:
                return '';
        }
    }

    /**
     * Генерирует системный промпт для модели
     */
    getSystemPrompt(language, type) {
        const framework = this.testFrameworks[language];
        
        let syntaxInstructions = '';
        if (language === 'javascript' || language === 'typescript') {
            syntaxInstructions = `
CRITICAL RULES FOR JAVASCRIPT TESTS:

1. Use ONLY CommonJS syntax: const { func } = require('./source');
2. DO NOT use ES6 import/export syntax
3. Source code is in 'source.js' file
4. DO NOT include ANY import/require statements for testing libraries
5. DO NOT include @jest/globals imports - they are already provided
6. DO NOT include jest, expect, describe, it imports - they are globally available
7. DO NOT include any other library imports unless explicitly needed
8. Start directly with describe() block, no imports at the top

CRITICAL RULE: NEVER use toThrowError() in tests.

Test actual return values using expect(result).toBe(expectedValue) or expect(result).toBeNaN().

EXAMPLE CORRECT STRUCTURE:
describe('functionName', () => {
    const { functionName } = require('./source');
    
    test('should work correctly', () => {
        expect(functionName(1, 2)).toBe(3);
    });
});

DO NOT include any imports at the top of the file!`;
        } else if (language === 'python') {
            syntaxInstructions = `
CRITICAL RULES FOR PYTHON TESTS:

1. Use pytest framework
2. Import functions directly from source file: from source import function_name
3. DO NOT include pytest imports - they are already available
4. DO NOT include any other library imports unless explicitly needed
5. Start directly with test functions, no imports at the top

EXAMPLE CORRECT STRUCTURE:
from source import add

def test_add():
    assert add(1, 2) == 3

DO NOT include any imports at the top of the file!`;
        }
        
        return `You are an expert in testing code in ${language}. 
Create high-quality unit tests using the ${framework} framework.

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

${syntaxInstructions}

For ${type} create appropriate tests with correct structure.

If type is 'entire_code', analyze the complete code and create comprehensive tests for all functionality without splitting into individual function tests.

REMEMBER: 
- NEVER use toThrowError() in tests!
- DO NOT include unnecessary imports!
- Start directly with test code, no imports at the top!`;
    }

    /**
     * Вызов ИИ для генерации тестов
     */
    async callAI(systemPrompt, prompt) {
        try {
            console.log(`🤖 Calling Ollama API at ${this.config.ollama.url}`);
            console.log(`📝 Model: ${this.config.ollama.model}`);
            console.log(`📝 Config:`, JSON.stringify(this.config.ollama, null, 2));
            
            // Проверяем доступность Ollama
            try {
                const healthCheck = await fetch(`${this.config.ollama.url}/api/tags`, { timeout: 5000 });
                if (!healthCheck.ok) {
                    throw new Error('Ollama not available');
                }
                console.log('✅ Ollama is available');
            } catch (healthError) {
                console.log('⚠️ Ollama not available, using fallback');
                return this.generateFallbackTest(prompt);
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
                
                // Fallback to template if AI fails
                return this.generateFallbackTest(prompt);
            }

            const data = await response.json();
            const generatedCode = data.response || '';
            
            console.log(`✅ Generated ${generatedCode.length} characters of test code`);
            
            // Простая очистка от промптов и объяснений, без сложной пост-обработки
            return this.simpleCleanGeneratedCode(generatedCode);

        } catch (error) {
            console.error('❌ Error calling Ollama:', error);
            return this.generateFallbackTest(prompt);
        }
    }

    /**
     * Простая очистка сгенерированного кода от промптов и объяснений
     */
    simpleCleanGeneratedCode(rawCode) {
        if (!rawCode || typeof rawCode !== 'string') {
            return '';
        }

        let cleanedCode = rawCode;

        // Удаляем вводные фразы и объяснения
        const introPatterns = [
            /^.*?Here are the tests for.*?:/gmi,
            /^.*?Вот тесты для.*?:/gmi,
            /^.*?Here's.*?test.*?:/gmi,
            /^.*?Вот.*?тест.*?:/gmi,
            /^.*?I'll create.*?:/gmi,
            /^.*?Я создам.*?:/gmi,
            /^.*?Let me create.*?:/gmi,
            /^.*?Позвольте создать.*?:/gmi,
            /^.*?Below are.*?tests.*?:/gmi,
            /^.*?Ниже.*?тесты.*?:/gmi
        ];

        introPatterns.forEach(pattern => {
            cleanedCode = cleanedCode.replace(pattern, '');
        });

        // Удаляем объяснения после кода
        const explanationPatterns = [
            /Note:.*$/gmi,
            /Примечание:.*$/gmi,
            /В этих тестах.*$/gmi,
            /These tests.*$/gmi,
            /Мы используем.*$/gmi,
            /We use.*$/gmi,
            /The `describe`.*$/gmi,
            /Блок `describe`.*$/gmi
        ];

        explanationPatterns.forEach(pattern => {
            cleanedCode = cleanedCode.replace(pattern, '');
        });

        // Извлекаем код из блоков ```
        const codeBlockMatches = cleanedCode.match(/```(?:javascript|js|typescript|ts|python|java|go|rust|php|csharp)?\s*([\s\S]*?)```/gi);
        
        if (codeBlockMatches && codeBlockMatches.length > 0) {
            // Берем все блоки кода и объединяем их
            const extractedCode = codeBlockMatches.map(block => {
                return block.replace(/```(?:javascript|js|typescript|ts|python|java|go|rust|php|csharp)?\s*/, '')
                           .replace(/```$/, '')
                           .trim();
            }).join('\n\n');
            
            cleanedCode = extractedCode;
        }

        // Удаляем лишние пустые строки
        cleanedCode = cleanedCode.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        // Удаляем начальные и конечные пробелы
        cleanedCode = cleanedCode.trim();

        // Если код пустой или слишком короткий, возвращаем fallback
        if (!cleanedCode || cleanedCode.length < 20) {
            console.warn('⚠️ Cleaned code too short, using original');
            return rawCode.trim();
        }

        return cleanedCode;
    }

    /**
     * Генерирует fallback тест если AI недоступен
     */
    generateFallbackTest(prompt) {
        // Извлекаем информацию о функции из промпта
        const funcNameMatch = prompt.match(/функции "(\w+)"/i);
        const funcName = funcNameMatch ? funcNameMatch[1] : 'testFunction';
        
        const languageMatch = prompt.match(/Код функции:\s*```(\w+)/i);
        const language = languageMatch ? languageMatch[1] : 'javascript';
        
        const codeMatch = prompt.match(/```\w+\s*([\s\S]*?)```/);
        const originalCode = codeMatch ? codeMatch[1].trim() : '';
        
        return this.generateSmartFallbackTest(funcName, language, originalCode);
    }
    
    /**
     * Генерирует умный fallback тест на основе анализа кода
     */
    generateSmartFallbackTest(funcName, language, originalCode) {
        switch (language.toLowerCase()) {
            case 'javascript':
            case 'typescript':
                return this.generateJavaScriptFallbackTest(funcName, originalCode);
            case 'python':
                return this.generatePythonFallbackTest(funcName, originalCode);
            default:
                return this.generateJavaScriptFallbackTest(funcName, originalCode);
        }
    }
    
    /**
     * Генерирует JavaScript fallback тест
     */
    generateJavaScriptFallbackTest(funcName, originalCode) {
        const hasReturn = originalCode.includes('return');
        const hasParams = originalCode.match(/\(([^)]+)\)/);
        const paramList = hasParams ? hasParams[1].split(',').map(p => p.trim()) : [];
        
        // Анализируем тип операции по коду
        const isMathOperation = originalCode.includes('*') || originalCode.includes('/') || originalCode.includes('-');
        const isStringOperation = originalCode.includes('+') && !originalCode.includes('*') && !originalCode.includes('/');
        const isBrowserCode = originalCode.includes('window') || originalCode.includes('document') || 
                             originalCode.includes('localStorage') || originalCode.includes('sessionStorage');
        
        // Добавляем CommonJS импорты в начало
        let testCode = `const { describe, test, expect } = require('@jest/globals');\n`;
        testCode += `const { ${funcName} } = require('./source');\n\n`;
        
        testCode += `describe('${funcName}', () => {\n`;
        
        // Базовый тест существования
        testCode += `  test('should be defined', () => {\n`;
        testCode += `    expect(${funcName}).toBeDefined();\n`;
        testCode += `  });\n\n`;
        
        // Для браузерного кода создаем только базовые тесты
        if (isBrowserCode) {
            testCode += `  test('should be a function', () => {\n`;
            testCode += `    expect(typeof ${funcName}).toBe('function');\n`;
            testCode += `  });\n\n`;
            
            testCode += `  test('should not throw when called', () => {\n`;
            testCode += `    expect(() => ${funcName}()).not.toThrow();\n`;
            testCode += `  });\n\n`;
            
            testCode += `});`;
            return testCode;
        }
        
        // Тест с валидными параметрами
        if (paramList.length > 0) {
            testCode += `  test('should handle valid numeric parameters', () => {\n`;
            const numericParams = paramList.map((_, i) => `${i + 1}`).join(', ');
            testCode += `    const result = ${funcName}(${numericParams});\n`;
            if (hasReturn) {
                testCode += `    expect(result).toBeDefined();\n`;
                if (isMathOperation) {
                    testCode += `    expect(typeof result).toBe('number');\n`;
                }
            }
            testCode += `  });\n\n`;
            
            // Тест с неправильными типами (реалистичный)
            testCode += `  test('should handle non-numeric inputs correctly', () => {\n`;
            if (isMathOperation) {
                // Для математических операций ожидаем NaN
                testCode += `    const result = ${funcName}('a', 2);\n`;
                testCode += `    expect(result).toBeNaN();\n`;
            } else if (isStringOperation) {
                // Для строковых операций ожидаем конкатенацию
                testCode += `    const result = ${funcName}('a', 2);\n`;
                testCode += `    expect(result).toBe('a2');\n`;
            } else {
                // Общий случай
                testCode += `    const result = ${funcName}('a', 2);\n`;
                testCode += `    expect(result).toBeDefined();\n`;
            }
            testCode += `  });\n\n`;
            
            // Тест с null/undefined
            testCode += `  test('should handle null/undefined parameters', () => {\n`;
            const nullParams = paramList.map(() => 'null').join(', ');
            testCode += `    const result = ${funcName}(${nullParams});\n`;
            if (isMathOperation) {
                testCode += `    expect(result).toBeNaN();\n`;
            } else {
                testCode += `    expect(result).toBeDefined();\n`;
            }
            testCode += `  });\n\n`;
        }
        
        // Тест возвращаемого значения
        if (hasReturn) {
            testCode += `  test('should return expected value for valid inputs', () => {\n`;
            const callParams = paramList.length > 0 ? paramList.map((_, i) => `${i + 1}`).join(', ') : '';
            testCode += `    const result = ${funcName}(${callParams});\n`;
            testCode += `    expect(result).not.toBeUndefined();\n`;
            testCode += `  });\n\n`;
        }
        
        testCode += `});`;
        return testCode;
    }
    
    /**
     * Генерирует Python fallback тест
     */
    generatePythonFallbackTest(funcName, originalCode) {
        const hasReturn = originalCode.includes('return');
        const hasParams = originalCode.match(/def\s+\w+\s*\(([^)]+)\)/);
        const paramList = hasParams ? hasParams[1].split(',').map(p => p.trim().split('=')[0].trim()).filter(p => p && p !== 'self') : [];
        
        let testCode = `import unittest\n\n`;
        testCode += `class Test${funcName.charAt(0).toUpperCase() + funcName.slice(1)}(unittest.TestCase):\n\n`;
        
        // Базовый тест существования
        testCode += `    def test_function_exists(self):\n`;
        testCode += `        """Тест существования функции"""\n`;
        testCode += `        self.assertTrue(callable(${funcName}))\n\n`;
        
        // Тест с параметрами
        if (paramList.length > 0) {
            testCode += `    def test_with_valid_parameters(self):\n`;
            testCode += `        """Тест с валидными параметрами"""\n`;
            const testParams = paramList.map((_, i) => `'test${i + 1}'`).join(', ');
            if (hasReturn) {
                testCode += `        result = ${funcName}(${testParams})\n`;
                testCode += `        self.assertIsNotNone(result)\n\n`;
            } else {
                testCode += `        try:\n`;
                testCode += `            ${funcName}(${testParams})\n`;
                testCode += `        except Exception as e:\n`;
                testCode += `            self.fail(f"Function raised {e} unexpectedly!")\n\n`;
            }
            
            // Тест с None
            testCode += `    def test_with_none_parameters(self):\n`;
            testCode += `        """Тест с None параметрами"""\n`;
            const noneParams = paramList.map(() => 'None').join(', ');
            testCode += `        try:\n`;
            testCode += `            ${funcName}(${noneParams})\n`;
            testCode += `        except Exception:\n`;
            testCode += `            pass  # Ожидаем что функция может выбросить исключение\n\n`;
        }
        
        testCode += `if __name__ == '__main__':\n`;
        testCode += `    unittest.main()`;
        
        return testCode;
    }

    /**
     * Подсчитывает количество тестов в коде
     */
    countTests(testCode) {
        if (!testCode || typeof testCode !== 'string') {
            return 1;
        }
        
        const patterns = {
            javascript: [/test\s*\(/g, /it\s*\(/g],
            python: [/def\s+test_\w+/g],
            java: [/@Test/g],
            go: [/func\s+Test\w+/g]
        };

        let count = 0;
        const langPatterns = patterns.javascript; // По умолчанию

        langPatterns.forEach(pattern => {
            const matches = testCode.match(pattern);
            if (matches) count += matches.length;
        });

        return count || 1; // Минимум 1 тест
    }

    /**
     * Генерирует конфигурацию для запуска тестов
     */
    generateTestConfig(language, testSummary) {
        switch (language) {
            case 'javascript':
            case 'typescript':
                return {
                    framework: 'jest',
                    configFile: 'jest.config.js',
                    runCommand: 'npm test',
                    dependencies: ['jest', '@jest/globals']
                };

            case 'python':
                return {
                    framework: 'pytest',
                    configFile: 'pytest.ini',
                    runCommand: 'pytest',
                    dependencies: ['pytest', 'unittest']
                };

            case 'java':
                return {
                    framework: 'junit',
                    configFile: 'pom.xml',
                    runCommand: 'mvn test',
                    dependencies: ['junit-jupiter', 'mockito-core']
                };

            case 'go':
                return {
                    framework: 'testing',
                    configFile: 'go.mod',
                    runCommand: 'go test',
                    dependencies: []
                };

            default:
                return {
                    framework: 'unknown',
                    runCommand: 'echo "No test runner configured"',
                    dependencies: []
                };
        }
    }
}

module.exports = TestGenerator;
