const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fetch = require('node-fetch');
const Docker = require('dockerode');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let config = {};
let docker = null;
let testAgentInitialized = false;

// Функция загрузки конфигурации
function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } else {
            config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.example.json'), 'utf8'));
        }
        console.log(`📝 Loaded config with model: ${config.ollama?.model || 'unknown'}`);
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Загрузка конфигурации при старте
loadConfig();

// Инициализация Docker
function initDocker() {
    try {
        if (config.docker?.socketPath && fs.existsSync(config.docker.socketPath)) {
            docker = new Docker({ socketPath: config.docker.socketPath });
        } else {
            docker = new Docker({
                host: config.docker?.host || 'localhost',
                port: config.docker?.port || 2375
            });
        }
        console.log('✅ Docker connection initialized');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Docker:', error);
        return false;
    }
}

// Определение языка программирования по расширению файла
function detectLanguage(filename) {
    const ext = path.extname(filename).toLowerCase();
    const languageMap = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.go': 'go',
        '.rb': 'ruby',
        '.php': 'php',
        '.cs': 'csharp',
        '.rs': 'rust'
    };
    return languageMap[ext] || 'unknown';
}

// Генерация тестов с помощью ИИ
async function generateTests(code, language, filename) {
    try {
        const systemPrompt = `Ты - эксперт по тестированию кода. Создай качественные unit тесты для следующего кода на языке ${language}.

Требования:
1. Тесты должны покрывать основную функциональность
2. Используй стандартные фреймворки тестирования для ${language}
3. Включи позитивные и негативные тесты
4. Добавь комментарии к тестам
5. Убедись что тесты могут быть запущены

Код для тестирования:
\`\`\`${language}
${code}
\`\`\`

Создай только код тестов, без дополнительных объяснений.`;

        const response = await fetch(`${config.ollama.url}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.ollama.model,
                system: systemPrompt,
                prompt: `Создай тесты для файла ${filename}`,
                temperature: 0.7,
                max_tokens: 4000,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        return data.response || '';
    } catch (error) {
        console.error('Error generating tests:', error);
        throw error;
    }
}

// Создание Dockerfile для тестирования
function createTestDockerfile(language, testCode, originalCode) {
    const testImages = config.testSettings.testImages;
    const testFrameworks = config.testSettings.testFrameworks;
    
    const baseImage = testImages[language] || 'alpine:latest';
    const framework = testFrameworks[language] || 'basic';
    
    let dockerfile = `FROM ${baseImage}\n`;
    dockerfile += `WORKDIR /app\n\n`;
    
    // Установка зависимостей в зависимости от языка
    switch (language) {
        case 'javascript':
        case 'typescript':
            dockerfile += `RUN npm install -g ${framework}\n`;
            dockerfile += `COPY package*.json ./\n`;
            dockerfile += `RUN npm install\n\n`;
            break;
        case 'python':
            dockerfile += `RUN pip install ${framework}\n`;
            dockerfile += `COPY requirements.txt ./\n`;
            dockerfile += `RUN pip install -r requirements.txt\n\n`;
            break;
        case 'java':
            dockerfile += `COPY pom.xml ./\n`;
            dockerfile += `RUN mvn dependency:resolve\n\n`;
            break;
        case 'go':
            dockerfile += `COPY go.mod go.sum ./\n`;
            dockerfile += `RUN go mod download\n\n`;
            break;
    }
    
    // Копирование исходного кода и тестов
    dockerfile += `COPY . .\n\n`;
    
    // Команда запуска тестов
    switch (language) {
        case 'javascript':
        case 'typescript':
            dockerfile += `CMD ["npm", "test"]\n`;
            break;
        case 'python':
            dockerfile += `CMD ["python", "-m", "pytest", "-v"]\n`;
            break;
        case 'java':
            dockerfile += `CMD ["mvn", "test"]\n`;
            break;
        case 'go':
            dockerfile += `CMD ["go", "test", "-v", "./..."]\n`;
            break;
        default:
            dockerfile += `CMD ["echo", "Language not supported"]\n`;
    }
    
    return dockerfile;
}

// Создание файлов для тестирования
async function createTestFiles(language, testCode, originalCode, filename) {
    const testDir = path.join(__dirname, 'temp', uuidv4());
    await fs.ensureDir(testDir);
    
    // Создание исходного файла
    const sourcePath = path.join(testDir, filename);
    await fs.writeFile(sourcePath, originalCode);
    
    // Создание тестового файла
    let testFilename;
    switch (language) {
        case 'javascript':
            testFilename = filename.replace('.js', '.test.js');
            break;
        case 'typescript':
            testFilename = filename.replace('.ts', '.test.ts');
            break;
        case 'python':
            testFilename = `test_${filename.replace('.py', '.py')}`;
            break;
        case 'java':
            testFilename = filename.replace('.java', 'Test.java');
            break;
        case 'go':
            testFilename = filename.replace('.go', '_test.go');
            break;
        default:
            testFilename = `test_${filename}`;
    }
    
    const testPath = path.join(testDir, testFilename);
    await fs.writeFile(testPath, testCode);
    
    // Создание Dockerfile
    const dockerfile = createTestDockerfile(language, testCode, originalCode);
    const dockerfilePath = path.join(testDir, 'Dockerfile');
    await fs.writeFile(dockerfilePath, dockerfile);
    
    // Создание дополнительных файлов
    if (language === 'javascript' || language === 'typescript') {
        const packageJson = {
            name: "test-project",
            version: "1.0.0",
            scripts: {
                test: "jest"
            },
            devDependencies: {
                jest: "^29.0.0"
            }
        };
        await fs.writeFile(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    }
    
    if (language === 'python') {
        const requirementsTxt = "pytest\n";
        await fs.writeFile(path.join(testDir, 'requirements.txt'), requirementsTxt);
    }
    
    return testDir;
}

// Запуск тестов в Docker контейнере
async function runTestsInContainer(testDir, language) {
    try {
        const containerName = `test-${uuidv4()}`;
        const imageName = `test-image-${uuidv4()}`;
        
        // Сборка образа
        console.log(`🔨 Building test image for ${language}...`);
        const buildStream = await docker.buildImage({
            context: testDir,
            src: ['Dockerfile', '*']
        }, { t: imageName });
        
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(buildStream, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
        
        // Создание и запуск контейнера
        console.log(`🚀 Running tests in container...`);
        const container = await docker.createContainer({
            Image: imageName,
            name: containerName,
            HostConfig: {
                Memory: 512 * 1024 * 1024, // 512MB
                MemorySwap: 0,
                CpuPeriod: 100000,
                CpuQuota: 50000 // 50% CPU
            }
        });
        
        await container.start();
        
        // Ожидание завершения
        const timeout = config.testSettings.timeout * 1000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const containerInfo = await container.inspect();
            if (containerInfo.State.Status === 'exited') {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Получение логов
        const logs = await container.logs({
            stdout: true,
            stderr: true
        });
        
        const logOutput = logs.toString('utf8');
        
        // Очистка
        await container.remove({ force: true });
        await docker.getImage(imageName).remove();
        await fs.remove(testDir);
        
        return {
            success: true,
            logs: logOutput,
            exitCode: (await container.inspect()).State.ExitCode
        };
        
    } catch (error) {
        console.error('Error running tests:', error);
        await fs.remove(testDir);
        return {
            success: false,
            error: error.message,
            logs: error.toString()
        };
    }
}

// Анализ результатов тестов
function analyzeTestResults(logs, language) {
    const analysis = {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: 0,
        duration: 0,
        errors: []
    };
    
    try {
        switch (language) {
            case 'javascript':
            case 'typescript':
                // Парсинг Jest результатов
                const jestMatch = logs.match(/(\d+) tests? passed, (\d+) tests? failed/);
                if (jestMatch) {
                    analysis.passedTests = parseInt(jestMatch[1]);
                    analysis.failedTests = parseInt(jestMatch[2]);
                    analysis.totalTests = analysis.passedTests + analysis.failedTests;
                }
                
                const coverageMatch = logs.match(/All files\s+\|\s+(\d+)/);
                if (coverageMatch) {
                    analysis.coverage = parseInt(coverageMatch[1]);
                }
                break;
                
            case 'python':
                // Парсинг pytest результатов
                const pytestMatch = logs.match(/(\d+) passed, (\d+) failed/);
                if (pytestMatch) {
                    analysis.passedTests = parseInt(pytestMatch[1]);
                    analysis.failedTests = parseInt(pytestMatch[2]);
                    analysis.totalTests = analysis.passedTests + analysis.failedTests;
                }
                break;
                
            case 'java':
                // Парсинг JUnit результатов
                const junitMatch = logs.match(/Tests run: (\d+), Failures: (\d+)/);
                if (junitMatch) {
                    analysis.totalTests = parseInt(junitMatch[1]);
                    analysis.failedTests = parseInt(junitMatch[2]);
                    analysis.passedTests = analysis.totalTests - analysis.failedTests;
                }
                break;
                
            case 'go':
                // Парсинг Go test результатов
                const goMatch = logs.match(/PASS\s+(\d+)\s+tests?/);
                if (goMatch) {
                    analysis.passedTests = parseInt(goMatch[1]);
                    analysis.totalTests = analysis.passedTests;
                }
                break;
        }
        
        // Извлечение ошибок
        const errorLines = logs.split('\n').filter(line => 
            line.toLowerCase().includes('error') || 
            line.toLowerCase().includes('fail') ||
            line.toLowerCase().includes('exception')
        );
        analysis.errors = errorLines.slice(0, 10); // Первые 10 ошибок
        
    } catch (error) {
        console.error('Error analyzing test results:', error);
    }
    
    return analysis;
}

// Создание HTML отчета
function createHtmlReport(testResults, originalCode, testCode, language, filename) {
    const timestamp = new Date().toLocaleString('ru-RU');
    const successRate = testResults.totalTests > 0 ? 
        Math.round((testResults.passedTests / testResults.totalTests) * 100) : 0;
    
    const statusClass = testResults.failedTests === 0 ? 'success' : 'warning';
    const statusIcon = testResults.failedTests === 0 ? '✅' : '⚠️';
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${filename}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .header {
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        .status-card {
            background: ${testResults.failedTests === 0 ? 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)' : 'linear-gradient(135deg, #d69e2e 0%, #b7791f 100%)'};
            color: white;
            padding: 20px;
            border-radius: 16px;
            text-align: center;
            margin-bottom: 30px;
            font-size: 1.2rem;
            font-weight: 600;
        }
        
        .code-section {
            margin-bottom: 30px;
        }
        
        .code-section h3 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #1a202c;
        }
        
        .code-block {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .errors-section {
            margin-top: 30px;
        }
        
        .error-item {
            background: #fed7d7;
            border: 1px solid #feb2b2;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            color: #c53030;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }
        
        .footer {
            background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
            color: white;
            text-align: center;
            padding: 30px;
            margin-top: 40px;
        }
        
        .timestamp {
            font-size: 0.9rem;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Report</h1>
            <div class="subtitle">${filename} - ${language.toUpperCase()}</div>
        </div>
        
        <div class="content">
            <div class="status-card">
                ${statusIcon} ${testResults.failedTests === 0 ? 'All tests passed!' : `${testResults.failedTests} tests failed`}
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${testResults.totalTests}</div>
                    <div class="stat-label">Total Tests</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${testResults.passedTests}</div>
                    <div class="stat-label">Passed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${testResults.failedTests}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${successRate}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            </div>
            
            <div class="code-section">
                <h3>📄 Original Code</h3>
                <div class="code-block">${originalCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
            
            <div class="code-section">
                <h3>🧪 Generated Tests</h3>
                <div class="code-block">${testCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
            
            ${testResults.errors.length > 0 ? `
            <div class="errors-section">
                <h3>❌ Test Errors</h3>
                ${testResults.errors.map(error => `<div class="error-item">${error}</div>`).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>📊 Test report generated automatically</p>
            <p class="timestamp">🕐 ${timestamp}</p>
        </div>
    </div>
</body>
</html>`;
}

// API endpoints

// Проверка здоровья сервиса
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'test-agent-mcp',
        initialized: testAgentInitialized,
        timestamp: new Date().toISOString()
    });
});

// Инициализация сервиса
app.post('/mcp/test-agent/init', async (req, res) => {
    try {
        if (initDocker()) {
            testAgentInitialized = true;
            res.json({
                success: true,
                message: 'Test Agent MCP initialized successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to initialize Docker connection'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Загрузка файла и генерация тестов
const upload = multer({ dest: 'uploads/' });

app.post('/mcp/test-agent/test-file', upload.single('file'), async (req, res) => {
    try {
        if (!testAgentInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Test Agent MCP not initialized'
            });
        }
        
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        const originalCode = await fs.readFile(file.path, 'utf8');
        const filename = file.originalname;
        const language = detectLanguage(filename);
        
        if (language === 'unknown') {
            return res.status(400).json({
                success: false,
                error: 'Unsupported file type'
            });
        }
        
        console.log(`🔍 Analyzing ${filename} (${language})...`);
        
        // Генерация тестов
        console.log(`🤖 Generating tests with AI...`);
        const testCode = await generateTests(originalCode, language, filename);
        
        // Создание тестовых файлов
        console.log(`📁 Creating test files...`);
        const testDir = await createTestFiles(language, testCode, originalCode, filename);
        
        // Запуск тестов
        console.log(`🚀 Running tests in Docker...`);
        const testResults = await runTestsInContainer(testDir, language);
        
        if (!testResults.success) {
            return res.json({
                success: false,
                error: testResults.error,
                logs: testResults.logs
            });
        }
        
        // Анализ результатов
        console.log(`📊 Analyzing test results...`);
        const analysis = analyzeTestResults(testResults.logs, language);
        
        // Создание HTML отчета
        console.log(`📄 Creating HTML report...`);
        const htmlReport = createHtmlReport(analysis, originalCode, testCode, language, filename);
        
        // Развертывание отчета в Docker (если доступен Docker MCP)
        let reportUrl = null;
        if (config.docker?.url) {
            try {
                const dockerResponse = await fetch(`${config.docker.url}/api/mcp/docker/deploy-html`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        htmlContent: htmlReport,
                        containerName: `test-report-${uuidv4()}`
                    })
                });
                
                if (dockerResponse.ok) {
                    const dockerResult = await dockerResponse.json();
                    if (dockerResult.success) {
                        reportUrl = dockerResult.url;
                    }
                }
            } catch (error) {
                console.warn('Could not deploy HTML report:', error.message);
            }
        }
        
        // Очистка загруженного файла
        await fs.remove(file.path);
        
        res.json({
            success: true,
            data: {
                filename,
                language,
                testResults: analysis,
                logs: testResults.logs,
                testCode,
                reportUrl,
                htmlReport
            }
        });
        
    } catch (error) {
        console.error('Error processing test request:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Перезагрузка конфигурации
app.post('/mcp/test-agent/reload-config', (req, res) => {
    try {
        loadConfig();
        res.json({
            success: true,
            message: 'Configuration reloaded successfully',
            model: config.ollama?.model || 'unknown'
        });
    } catch (error) {
        console.error('Error reloading config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Тестирование кода из строки
app.post('/mcp/test-agent/test-code', async (req, res) => {
    try {
        if (!testAgentInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Test Agent MCP not initialized'
            });
        }
        
        const { code, language, filename = 'test.js' } = req.body;
        
        if (!code || !language) {
            return res.status(400).json({
                success: false,
                error: 'Code and language are required'
            });
        }
        
        console.log(`🔍 Testing code (${language})...`);
        
        // Генерация тестов
        console.log(`🤖 Generating tests with AI...`);
        const testCode = await generateTests(code, language, filename);
        
        // Создание тестовых файлов
        console.log(`📁 Creating test files...`);
        const testDir = await createTestFiles(language, testCode, code, filename);
        
        // Запуск тестов
        console.log(`🚀 Running tests in Docker...`);
        const testResults = await runTestsInContainer(testDir, language);
        
        if (!testResults.success) {
            return res.json({
                success: false,
                error: testResults.error,
                logs: testResults.logs
            });
        }
        
        // Анализ результатов
        console.log(`📊 Analyzing test results...`);
        const analysis = analyzeTestResults(testResults.logs, language);
        
        // Создание HTML отчета
        console.log(`📄 Creating HTML report...`);
        const htmlReport = createHtmlReport(analysis, code, testCode, language, filename);
        
        res.json({
            success: true,
            data: {
                filename,
                language,
                testResults: analysis,
                logs: testResults.logs,
                testCode,
                htmlReport
            }
        });
        
    } catch (error) {
        console.error('Error processing test request:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Получение списка поддерживаемых языков
app.get('/mcp/test-agent/languages', (req, res) => {
    res.json({
        success: true,
        data: {
            supportedLanguages: config.testSettings.supportedLanguages,
            testImages: config.testSettings.testImages,
            testFrameworks: config.testSettings.testFrameworks
        }
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Test Agent MCP Server running on port ${PORT}`);
    console.log(`📋 Supported languages: ${config.testSettings.supportedLanguages.join(', ')}`);
    
    // Автоматическая инициализация
    if (initDocker()) {
        testAgentInitialized = true;
        console.log('✅ Test Agent MCP initialized successfully');
    } else {
        console.log('⚠️ Test Agent MCP initialization failed - Docker not available');
    }
});

module.exports = app;
