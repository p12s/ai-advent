const Docker = require('dockerode');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DockerTestRunner {
    constructor(config) {
        this.config = config;
        this.docker = new Docker({
            socketPath: config.docker?.socketPath || '/var/run/docker.sock'
        });
        this.runningContainers = new Map();
        this.testResults = new Map();
    }

    /**
     * Запускает тесты в Docker контейнере
     */
    async runTests(testData, language) {
        const testId = uuidv4();
        const containerName = `test-runner-${testId}`;
        
        try {
            // Создаем временную директорию для тестов
            const testDir = await this.createTestEnvironment(testId, testData, language);
            
            // Получаем конфигурацию для языка
            const dockerConfig = this.getDockerConfig(language);
            
            // Создаем и запускаем контейнер
            const container = await this.createContainer(containerName, testDir, dockerConfig);
            this.runningContainers.set(testId, container);
            
            // Запускаем тесты
            const result = await this.executeTests(container, dockerConfig, testId);
            
            // Создаем веб-интерфейс для результатов
            const webUrl = await this.deployTestResults(testId, result, testData);
            
            // Очищаем контейнер
            await this.cleanup(container, testDir);
            this.runningContainers.delete(testId);
            
            return {
                success: true,
                testId,
                result,
                webUrl,
                containerName
            };

        } catch (error) {
            console.error(`Error running tests ${testId}:`, error);
            await this.cleanup(null, null, testId);
            
            return {
                success: false,
                testId,
                error: error.message
            };
        }
    }

    /**
     * Создает тестовое окружение
     */
    async createTestEnvironment(testId, testData, language) {
        const testDir = path.join(__dirname, 'test-runs', testId);
        await fs.ensureDir(testDir);

        // Записываем исходный код
        if (testData.originalCode) {
            const sourceFile = `source.${this.getFileExtension(language)}`;
            let processedCode = testData.originalCode;
            
            // Для JavaScript добавляем экспорт если его нет
            if (language === 'javascript' || language === 'typescript') {
                processedCode = this.addJavaScriptExports(processedCode);
                
                // Обрабатываем браузерный код для Node.js окружения
                processedCode = this.processBrowserCode(processedCode);
                
                // Опционально: добавляем валидацию типов для более строгих тестов
                // Раскомментируйте следующую строку если хотите автоматически добавлять валидацию
                // processedCode = this.addJavaScriptValidation(processedCode);
            }
            
            await fs.writeFile(path.join(testDir, sourceFile), processedCode);
        }

        // Записываем тесты
        const testFile = `test.${this.getTestFileExtension(language)}`;
        await fs.writeFile(path.join(testDir, testFile), testData.compiledTests);

        // Создаем конфигурационные файлы
        await this.createConfigFiles(testDir, language, testData);

        // Создаем Dockerfile
        await this.createDockerfile(testDir, language);

        return testDir;
    }

    /**
     * Создает конфигурационные файлы для тестов
     */
    async createConfigFiles(testDir, language, testData) {
        switch (language) {
            case 'javascript':
            case 'typescript':
                await this.createJavaScriptConfig(testDir, testData);
                break;
            case 'python':
                await this.createPythonConfig(testDir, testData);
                break;
            case 'java':
                await this.createJavaConfig(testDir, testData);
                break;
            case 'go':
                await this.createGoConfig(testDir, testData);
                break;
        }
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

    async createPythonConfig(testDir, testData) {
        const requirements = [
            'pytest>=7.0.0',
            'pytest-html>=3.0.0',
            'pytest-json-report>=1.5.0'
        ].join('\n');

        const pytestIni = `[tool:pytest]
testpaths = .
python_files = test*.py
python_functions = test_*
addopts = --html=test-report.html --json-report --json-report-file=test-results.json -v`;

        await fs.writeFile(path.join(testDir, 'requirements.txt'), requirements);
        await fs.writeFile(path.join(testDir, 'pytest.ini'), pytestIni);
    }

    async createJavaConfig(testDir, testData) {
        const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.test</groupId>
    <artifactId>auto-tests</artifactId>
    <version>1.0.0</version>
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <junit.version>5.8.2</junit.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>\${junit.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.0.0-M7</version>
            </plugin>
        </plugins>
    </build>
</project>`;

        await fs.writeFile(path.join(testDir, 'pom.xml'), pomXml);
    }

    async createGoConfig(testDir, testData) {
        const goMod = `module auto-tests

go 1.21

require (
    github.com/stretchr/testify v1.8.0
)`;

        await fs.writeFile(path.join(testDir, 'go.mod'), goMod);
    }

    /**
     * Создает Dockerfile для тестового окружения
     */
    async createDockerfile(testDir, language) {
        let dockerfile = '';

        switch (language) {
            case 'javascript':
            case 'typescript':
                dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
CMD ["npm", "test"]`;
                break;

            case 'python':
                dockerfile = `FROM python:3.11-alpine
WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY . .
CMD ["pytest", "--json-report", "--json-report-file=test-results.json", "-v"]`;
                break;

            case 'java':
                dockerfile = `FROM openjdk:17-alpine
RUN apk add --no-cache maven
WORKDIR /app
COPY pom.xml ./
RUN mvn dependency:go-offline
COPY . .
CMD ["mvn", "test"]`;
                break;

            case 'go':
                dockerfile = `FROM golang:1.21-alpine
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
CMD ["go", "test", "-v", "-json"]`;
                break;

            default:
                dockerfile = `FROM alpine:latest
WORKDIR /app
COPY . .
CMD ["echo", "No test runner configured for ${language}"]`;
        }

        await fs.writeFile(path.join(testDir, 'Dockerfile'), dockerfile);
    }

    /**
     * Создает Docker контейнер
     */
    async createContainer(containerName, testDir, dockerConfig) {
        // Строим образ
        const buildStream = await this.docker.buildImage({
            context: testDir,
            src: ['.']
        }, {
            t: containerName
        });

        await new Promise((resolve, reject) => {
            this.docker.modem.followProgress(buildStream, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });

        // Создаем контейнер
        const container = await this.docker.createContainer({
            Image: containerName,
            name: containerName,
            WorkingDir: '/app',
            Cmd: dockerConfig.cmd,
            HostConfig: {
                Memory: dockerConfig.memory || 512 * 1024 * 1024, // 512MB
                CpuShares: 512,
                NetworkMode: 'bridge'
            }
        });

        return container;
    }

    /**
     * Выполняет тесты в контейнере
     */
    async executeTests(container, dockerConfig, testId) {
        const startTime = Date.now();
        
        try {
            // Запускаем контейнер
            await container.start();

            // Ждем завершения с таймаутом
            const timeout = this.config.testSettings?.timeout || 300; // 5 минут
            const result = await Promise.race([
                container.wait(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Test timeout')), timeout * 1000)
                )
            ]);

            // Получаем логи
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                timestamps: true
            });

            // Получаем файлы результатов
            const resultFiles = await this.extractResultFiles(container);

            const endTime = Date.now();
            const duration = endTime - startTime;

            return {
                success: result.StatusCode === 0,
                statusCode: result.StatusCode,
                duration: duration,
                logs: logs.toString(),
                resultFiles: resultFiles,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            return {
                success: false,
                error: error.message,
                duration: duration,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Извлекает файлы результатов из контейнера
     */
    async extractResultFiles(container) {
        const files = {};
        const resultFileNames = [
            'test-results.json',
            'test-report.html',
            'coverage/lcov-report/index.html'
        ];

        for (const fileName of resultFileNames) {
            try {
                const stream = await container.getArchive({ path: `/app/${fileName}` });
                const chunks = [];
                
                stream.on('data', chunk => chunks.push(chunk));
                await new Promise((resolve, reject) => {
                    stream.on('end', resolve);
                    stream.on('error', reject);
                });

                files[fileName] = Buffer.concat(chunks);
            } catch (error) {
                // Файл может не существовать
                console.log(`File ${fileName} not found in container`);
            }
        }

        return files;
    }

    /**
     * Развертывает результаты тестов как веб-приложение
     */
    async deployTestResults(testId, result, testData) {
        try {
            const webDir = path.join(__dirname, 'web-results', testId);
            await fs.ensureDir(webDir);

            // Создаем HTML страницу с результатами
            const htmlContent = await this.generateResultsHTML(testId, result, testData);
            await fs.writeFile(path.join(webDir, 'index.html'), htmlContent);

            // Копируем файлы результатов
            if (result.resultFiles) {
                for (const [fileName, content] of Object.entries(result.resultFiles)) {
                    const filePath = path.join(webDir, fileName);
                    await fs.ensureDir(path.dirname(filePath));
                    await fs.writeFile(filePath, content);
                }
            }

            // Создаем простой веб-сервер для результатов
            const port = await this.findAvailablePort(8080);
            const webUrl = await this.startResultsServer(webDir, port, testId);

            return webUrl;

        } catch (error) {
            console.error('Error deploying test results:', error);
            return null;
        }
    }

    /**
     * Генерирует HTML страницу с результатами
     */
    async generateResultsHTML(testId, result, testData) {
        const timestamp = new Date().toLocaleString('ru-RU');
        const status = result.success ? 'success' : 'error';
        const statusText = result.success ? 'Успешно' : 'Ошибка';

        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Результаты тестов - ${testId}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            margin: 0;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .status-${status} {
            background: ${result.success ? '#38a169' : '#e53e3e'};
            color: white;
            padding: 15px 30px;
            border-radius: 25px;
            display: inline-block;
            font-weight: 600;
            margin-top: 15px;
        }
        
        .content {
            padding: 40px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .info-card {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        
        .info-title {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 10px;
        }
        
        .info-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #667eea;
        }
        
        .logs {
            background: #2d3748;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            overflow-x: auto;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .refresh-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            margin: 20px 0;
        }
        
        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Результаты тестов</h1>
            <p>ID: ${testId}</p>
            <div class="status-${status}">${statusText}</div>
        </div>
        
        <div class="content">
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-title">Статус</div>
                    <div class="info-value">${statusText}</div>
                </div>
                <div class="info-card">
                    <div class="info-title">Время выполнения</div>
                    <div class="info-value">${Math.round(result.duration / 1000)}с</div>
                </div>
                <div class="info-card">
                    <div class="info-title">Код завершения</div>
                    <div class="info-value">${result.statusCode || 'N/A'}</div>
                </div>
                <div class="info-card">
                    <div class="info-title">Время создания</div>
                    <div class="info-value">${timestamp}</div>
                </div>
            </div>
            
            <button class="refresh-btn" onclick="location.reload()">🔄 Обновить</button>
            
            <h3>📋 Логи выполнения:</h3>
            <div class="logs">${this.escapeHtml(result.logs || 'Логи недоступны')}</div>
            
            ${result.resultFiles && Object.keys(result.resultFiles).length > 0 ? `
            <h3>📁 Файлы результатов:</h3>
            <ul>
                ${Object.keys(result.resultFiles).map(fileName => 
                    `<li><a href="${fileName}" target="_blank">${fileName}</a></li>`
                ).join('')}
            </ul>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Запускает веб-сервер для результатов
     */
    async startResultsServer(webDir, port, testId) {
        const express = require('express');
        const app = express();
        
        app.use(express.static(webDir));
        
        const server = app.listen(port, () => {
            console.log(`Test results server running on port ${port} for test ${testId}`);
        });

        // Сохраняем сервер для последующей очистки
        this.testResults.set(testId, { server, port, webDir });

        return `http://localhost:${port}`;
    }

    /**
     * Находит доступный порт
     */
    async findAvailablePort(startPort) {
        const net = require('net');
        
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(startPort, () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
            server.on('error', () => {
                resolve(this.findAvailablePort(startPort + 1));
            });
        });
    }

    /**
     * Очистка ресурсов
     */
    async cleanup(container, testDir, testId = null) {
        try {
            if (container) {
                await container.remove({ force: true });
            }
            
            if (testDir && await fs.pathExists(testDir)) {
                await fs.remove(testDir);
            }

            if (testId && this.testResults.has(testId)) {
                const { server, webDir } = this.testResults.get(testId);
                server.close();
                this.testResults.delete(testId);
                
                // Очищаем веб-директорию через некоторое время
                setTimeout(async () => {
                    if (await fs.pathExists(webDir)) {
                        await fs.remove(webDir);
                    }
                }, 60000); // 1 минута
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    /**
     * Получает конфигурацию Docker для языка
     */
    getDockerConfig(language) {
        const configs = {
            javascript: {
                image: 'node:18-alpine',
                cmd: ['npm', 'test'],
                memory: 512 * 1024 * 1024
            },
            python: {
                image: 'python:3.11-alpine',
                cmd: ['pytest', '-v'],
                memory: 512 * 1024 * 1024
            },
            java: {
                image: 'openjdk:17-alpine',
                cmd: ['mvn', 'test'],
                memory: 1024 * 1024 * 1024
            },
            go: {
                image: 'golang:1.21-alpine',
                cmd: ['go', 'test', '-v'],
                memory: 512 * 1024 * 1024
            }
        };

        return configs[language] || configs.javascript;
    }

    getFileExtension(language) {
        const extensions = {
            javascript: 'js',
            typescript: 'ts',
            python: 'py',
            java: 'java',
            go: 'go',
            ruby: 'rb',
            php: 'php',
            csharp: 'cs',
            rust: 'rs'
        };
        return extensions[language] || 'txt';
    }

    getTestFileExtension(language) {
        const extensions = {
            javascript: 'test.js',
            typescript: 'test.ts',
            python: 'test.py',
            java: 'Test.java',
            go: 'test.go',
            ruby: 'test.rb',
            php: 'Test.php',
            csharp: 'Test.cs',
            rust: 'test.rs'
        };
        return extensions[language] || 'test.txt';
    }

    escapeHtml(text) {
        const div = require('util').TextEncoder ? 
            new TextEncoder().encode(text).toString() : 
            text.replace(/[&<>"']/g, (match) => {
                const escape = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                };
                return escape[match];
            });
        return text;
    }

    /**
     * Добавляет экспорты в JavaScript код если их нет
     */
    addJavaScriptExports(code) {
        if (!code || typeof code !== 'string') {
            return code;
        }

        // Если уже есть module.exports, не добавляем
        if (code.includes('module.exports')) {
            return code;
        }

        // Ищем функции в коде
        const functionMatches = code.match(/function\s+(\w+)\s*\(/g);
        const arrowFunctionMatches = code.match(/const\s+(\w+)\s*=\s*\(/g);
        const classMatches = code.match(/class\s+(\w+)/g);

        const functions = [];
        
        if (functionMatches) {
            functionMatches.forEach(match => {
                const funcName = match.match(/function\s+(\w+)/)[1];
                functions.push(funcName);
            });
        }
        
        if (arrowFunctionMatches) {
            arrowFunctionMatches.forEach(match => {
                const funcName = match.match(/const\s+(\w+)/)[1];
                functions.push(funcName);
            });
        }
        
        if (classMatches) {
            classMatches.forEach(match => {
                const className = match.match(/class\s+(\w+)/)[1];
                functions.push(className);
            });
        }

        // Убираем дубликаты
        const uniqueFunctions = [...new Set(functions)];

        if (uniqueFunctions.length > 0) {
            // Добавляем экспорт в конец файла
            const exportStatement = `\n\nmodule.exports = { ${uniqueFunctions.join(', ')} };`;
            return code + exportStatement;
        }

        return code;
    }

    /**
     * Добавляет базовую валидацию типов в JavaScript код если её нет
     */
    addJavaScriptValidation(code) {
        if (!code || typeof code !== 'string') {
            return code;
        }

        // Если уже есть валидация, не добавляем
        if (code.includes('typeof') || code.includes('isNaN') || code.includes('throw new Error')) {
            return code;
        }

        let processedCode = code;

        // Добавляем валидацию для математических функций
        const mathFunctions = code.match(/function\s+(\w+)\s*\([^)]*\)\s*{[^}]*[*\/\-][^}]*}/g);
        if (mathFunctions) {
            mathFunctions.forEach(funcMatch => {
                const funcName = funcMatch.match(/function\s+(\w+)/)[1];
                const params = funcMatch.match(/\(([^)]+)\)/)[1].split(',').map(p => p.trim());
                
                // Создаем валидированную версию функции
                const validationCode = `
function ${funcName}(${params.join(', ')}) {
    // Валидация типов
    if (typeof ${params[0]} !== 'number' || typeof ${params[1]} !== 'number') {
        throw new Error('Invalid type: parameters must be numbers');
    }
    return ${params[0]} ${funcMatch.includes('*') ? '*' : funcMatch.includes('/') ? '/' : '-'} ${params[1]};
}`;
                
                // Заменяем оригинальную функцию
                processedCode = processedCode.replace(funcMatch, validationCode);
            });
        }

        return processedCode;
    }

    /**
     * Обрабатывает браузерный код для Node.js окружения
     */
    processBrowserCode(code) {
        if (!code || typeof code !== 'string') {
            return code;
        }

        let processedCode = code;

        // Если код содержит window, document или другие браузерные API
        if (code.includes('window') || code.includes('document') || code.includes('localStorage') || 
            code.includes('sessionStorage') || code.includes('navigator') || code.includes('location') ||
            code.includes('DockerReportManager')) {
            
            // Удаляем строки с DockerReportManager и window assignments
            processedCode = processedCode.replace(/const\s+dockerReportManager\s*=\s*new\s+DockerReportManager\(\);/g, '// DockerReportManager instantiation removed for Node.js compatibility');
            processedCode = processedCode.replace(/window\.\w+\s*=\s*\w+;/g, '// Window assignment removed for Node.js compatibility');
            
            // Также удаляем строки с DockerReportManager без const
            processedCode = processedCode.replace(/new\s+DockerReportManager\(\);/g, '// DockerReportManager instantiation removed for Node.js compatibility');
            
            // Удаляем все строки с DockerReportManager
            processedCode = processedCode.replace(/.*DockerReportManager.*/g, '// DockerReportManager line removed for Node.js compatibility');
            
            // Добавляем моки для браузерных API в начало файла
            const browserMocks = `
// Browser API mocks for Node.js environment

// Mock DockerReportManager first
global.DockerReportManager = class DockerReportManager {
    constructor() {
        this.isHealthy = true;
    }
    
    deployHtmlReport(htmlContent) {
        return { success: true, content: htmlContent };
    }
    
    checkHealth() {
        return { status: 'healthy', timestamp: new Date().toISOString() };
    }
};

if (typeof window === 'undefined') {
    global.window = {
        localStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
            clear: () => {}
        },
        sessionStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
            clear: () => {}
        },
        location: {
            href: 'http://localhost',
            origin: 'http://localhost',
            pathname: '/',
            search: '',
            hash: ''
        },
        navigator: {
            userAgent: 'Node.js',
            platform: 'node'
        },
        document: {
            createElement: () => ({}),
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: () => {},
            removeEventListener: () => {}
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        setTimeout: setTimeout,
        setInterval: setInterval,
        clearTimeout: clearTimeout,
        clearInterval: clearInterval
    };
    
    global.document = global.window.document;
    global.localStorage = global.window.localStorage;
    global.sessionStorage = global.window.sessionStorage;
    global.location = global.window.location;
    global.navigator = global.window.navigator;
}

// Ensure window is available globally
if (typeof global !== 'undefined' && global.window) {
    global.window = global.window;
}

`;

            processedCode = browserMocks + processedCode;
        }

        return processedCode;
    }
}

module.exports = DockerTestRunner;
