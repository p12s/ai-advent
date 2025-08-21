const fs = require('fs-extra');
const path = require('path');

class EnvBuilder {
    async createTestEnvironment(testId, testData) {
        const testDir = path.join(__dirname, 'test-runs', testId);
        await fs.ensureDir(testDir);

        // Сохраняем исходный код как source.js с автоматическим экспортом
        if (testData.originalCode) {
            // Автоматически добавляем экспорт для всех функций
            const wrappedCode = this.wrapCodeWithExports(testData.originalCode);
            await fs.writeFile(path.join(testDir, 'source.js'), wrappedCode);
        }

        await fs.writeFile(path.join(testDir, 'test.js'), testData.compiledTests);
        await this.createJavaScriptConfig(testDir, testData);
        await this.createDockerfile(testDir);

        return testDir;
    }

    wrapCodeWithExports(code) {
        // Автоматически извлекаем имена функций из кода
        const functionNames = this.extractFunctionNames(code);
        if (functionNames.length > 0) {
            const exportStatement = `\n\nmodule.exports = { ${functionNames.join(', ')} };`;
            return code + exportStatement;
        }
        return code;
    }

    extractFunctionNames(code) {
        const functionNames = [];
        // Простой regex для поиска объявлений функций
        const functionRegex = /function\s+(\w+)\s*\(/g;
        let match;
        
        while ((match = functionRegex.exec(code)) !== null) {
            functionNames.push(match[1]);
        }
        
        // Также ищем стрелочные функции и const функции
        const constFunctionRegex = /const\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)/g;
        while ((match = constFunctionRegex.exec(code)) !== null) {
            functionNames.push(match[1]);
        }
        
        return functionNames;
    }

    async createJavaScriptConfig(testDir, testData) {
        const packageJson = {
            name: "auto-generated-tests",
            version: "1.0.0",
            scripts: {
                test: "jest --verbose --json --outputFile=test-results.json"
            },
            devDependencies: {
                jest: "^29.0.0",
                "@jest/globals": "^29.0.0"
            }
        };

        const jestConfig = {
            testEnvironment: "node",
            verbose: true,
            collectCoverage: true,
            coverageDirectory: "coverage",
            testMatch: ["**/test.js", "**/*.test.js"]
        };

        await fs.writeFile(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
        await fs.writeFile(path.join(testDir, 'jest.config.js'), `module.exports = ${JSON.stringify(jestConfig, null, 2)};`);
    }

    async createDockerfile(testDir) {
        const dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
CMD ["npm", "test"]`;

        await fs.writeFile(path.join(testDir, 'Dockerfile'), dockerfile);
    }

    extractFunctions(code) {
        const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(|let\s+(\w+)\s*=\s*(?:async\s+)?\(|var\s+(\w+)\s*=\s*(?:async\s+)?\()/g;
        const functions = [];
        let match;
        
        while ((match = functionRegex.exec(code)) !== null) {
            const functionName = match[1] || match[2] || match[3] || match[4];
            if (functionName && !functions.includes(functionName)) {
                functions.push(functionName);
            }
        }
        
        return functions;
    }
}

module.exports = EnvBuilder;
