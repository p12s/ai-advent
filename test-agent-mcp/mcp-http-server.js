const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const CodeParser = require('./code-parser');
const TestGenerator = require('./test-generator');
const DockerTestRunner = require('./docker-test-runner');

const app = express();
const PORT = process.env.HTTP_PORT || 3006;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let config = {};
let codeParser = null;
let testGenerator = null;
let dockerTestRunner = null;

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
        
        // Пересоздание компонентов с новой конфигурацией
        initializeComponents();
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Инициализация компонентов
function initializeComponents() {
    try {
        codeParser = new CodeParser();
        testGenerator = new TestGenerator(config);
        dockerTestRunner = new DockerTestRunner(config);
        console.log('✅ All components initialized');
    } catch (error) {
        console.error('❌ Error initializing components:', error);
    }
}

// Загрузка конфигурации при старте
loadConfig();

// Инициализация компонентов после загрузки конфигурации
initializeComponents();

// Проверка здоровья сервиса
app.get('/health', async (req, res) => {
    try {
        // Проверка основного MCP сервера
        const mcpResponse = await fetch(`http://localhost:${config.server.port}/health`);
        const mcpHealth = await mcpResponse.json();
        
        res.json({
            status: 'ok',
            service: 'test-agent-http-server',
            mcp_server: mcpHealth,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            service: 'test-agent-http-server',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Перезагрузка конфигурации
app.post('/api/reload-config', (req, res) => {
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

// Прокси для MCP API
app.post('/mcp/test-agent/*', async (req, res) => {
    try {
        const mcpPath = req.path.replace('/mcp/test-agent', '');
        const mcpUrl = `http://localhost:${config.server.port}/mcp/test-agent${mcpPath}`;
        
        const response = await fetch(mcpUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                ...req.headers
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Получение списка поддерживаемых языков
app.get('/api/languages', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:${config.server.port}/mcp/test-agent/languages`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Тестирование кода через HTTP API
app.post('/api/test-code', async (req, res) => {
    try {
        let { code, language, filename } = req.body;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Код обязателен для анализа'
            });
        }

        // Автоматическое определение языка если не указан
        if (!language) {
            language = detectLanguageFromCode(code, filename);
            console.log(`🔍 Auto-detected language: ${language}`);
        }
        
        if (!language || language === 'unknown') {
            return res.status(400).json({
                success: false,
                error: 'Не удалось определить язык программирования. Попробуйте указать расширение файла или добавить больше характерного синтаксиса.'
            });
        }

        // Проверяем что язык - JavaScript (согласно требованиям)
        if (language !== 'javascript') {
            return res.status(400).json({
                success: false,
                error: 'Поддерживается только JavaScript код.'
            });
        }

        console.log(`🔍 Processing code for language: ${language}`);
        
        // 1. Парсим код
        const parsedCode = codeParser.parseCode(code, language);
        console.log(`📊 Found ${parsedCode.totalFunctions} functions/methods`);
        
        // 2. Генерируем тесты
        const testResult = await testGenerator.generateTestsForCode(parsedCode, code);
        
        if (!testResult.success) {
            return res.status(500).json({
                success: false,
                error: testResult.error
            });
        }
        
        console.log(`🧪 Generated ${testResult.testSummary.testsGenerated} tests`);
        
        // 3. Запускаем тесты в Docker
        const dockerResult = await dockerTestRunner.runTests({
            originalCode: code,
            compiledTests: testResult.compiledTests,
            testSummary: testResult.testSummary,
            language: language,
            filename: filename || `code.${getFileExtension(language)}`
        }, language);
        
        console.log(`🐳 Docker execution ${dockerResult.success ? 'successful' : 'failed'}`);
        
        // 4. Формируем ответ
        const response = {
            success: true,
            data: {
                codeInfo: {
                    language: parsedCode.language,
                    filename: filename || `code.${getFileExtension(language)}`,
                    functionsCount: parsedCode.totalFunctions,
                    functions: parsedCode.functions?.map(f => ({ name: f.name, type: f.type })) || [],
                    classes: parsedCode.classes?.map(c => ({ name: c.name, methodCount: c.methods?.length || 0 })) || []
                },
                generatedTests: testResult.compiledTests,
                testSummary: testResult.testSummary,
                testResults: dockerResult.success ? {
                    success: dockerResult.result?.success || false,
                    duration: dockerResult.result?.duration || 0,
                    output: dockerResult.result?.logs || '',
                    statusCode: dockerResult.result?.statusCode
                } : {
                    success: false,
                    error: dockerResult.error
                },
                testUrl: dockerResult.webUrl,
                testId: dockerResult.testId
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error in test-code:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

function getFileExtension(language) {
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

// Загрузка файла и тестирование
const upload = multer({ dest: 'uploads/' });

app.post('/api/test-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Файл не загружен'
            });
        }
        
        const filename = req.file.originalname;
        const language = detectLanguageFromFilename(filename);
        
        if (language === 'unknown') {
            await fs.remove(req.file.path);
            return res.status(400).json({
                success: false,
                error: 'Неподдерживаемый тип файла'
            });
        }
        
        const code = await fs.readFile(req.file.path, 'utf8');
        
        // Очистка загруженного файла
        await fs.remove(req.file.path);
        
        // Используем тот же процесс что и для кода
        const testCodeReq = {
            body: { code, language, filename }
        };
        
        // Переиспользуем логику из /api/test-code
        req.body = { code, language, filename };
        
        // Вызываем обработчик напрямую
        let { code: testCode, language: testLang, filename: testFilename } = req.body;
        
        // Автоматическое определение языка если не указан
        if (!testLang) {
            testLang = detectLanguageFromCode(testCode, testFilename);
            console.log(`🔍 Auto-detected language for file: ${testLang}`);
        }
        
        if (!testLang || testLang === 'unknown') {
            return res.status(400).json({
                success: false,
                error: 'Не удалось определить язык программирования из загруженного файла.'
            });
        }
        
        console.log(`🔍 Processing file: ${testFilename} for language: ${testLang}`);
        
        // 1. Парсим код
        const parsedCode = codeParser.parseCode(testCode, testLang);
        console.log(`📊 Found ${parsedCode.totalFunctions} functions/methods`);
        
        // 2. Генерируем тесты
        const testResult = await testGenerator.generateTestsForCode(parsedCode, testCode);
        
        if (!testResult.success) {
            return res.status(500).json({
                success: false,
                error: testResult.error
            });
        }
        
        console.log(`🧪 Generated ${testResult.testSummary.testsGenerated} tests`);
        
        // 3. Запускаем тесты в Docker
        const dockerResult = await dockerTestRunner.runTests({
            originalCode: testCode,
            compiledTests: testResult.compiledTests,
            testSummary: testResult.testSummary,
            language: testLang,
            filename: testFilename
        }, testLang);
        
        console.log(`🐳 Docker execution ${dockerResult.success ? 'successful' : 'failed'}`);
        
        // 4. Формируем ответ
        const response = {
            success: true,
            data: {
                codeInfo: {
                    language: parsedCode.language,
                    filename: testFilename,
                    functionsCount: parsedCode.totalFunctions,
                    functions: parsedCode.functions?.map(f => ({ name: f.name, type: f.type })) || [],
                    classes: parsedCode.classes?.map(c => ({ name: c.name, methodCount: c.methods?.length || 0 })) || []
                },
                generatedTests: testResult.compiledTests,
                testSummary: testResult.testSummary,
                testResults: dockerResult.success ? {
                    success: dockerResult.result?.success || false,
                    duration: dockerResult.result?.duration || 0,
                    output: dockerResult.result?.logs || '',
                    statusCode: dockerResult.result?.statusCode
                } : {
                    success: false,
                    error: dockerResult.error
                },
                testUrl: dockerResult.webUrl,
                testId: dockerResult.testId
            }
        };
        
        res.json(response);
        
    } catch (error) {
        if (req.file) {
            await fs.remove(req.file.path).catch(() => {});
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

function detectLanguageFromFilename(filename) {
    if (!filename) return 'unknown';
    const ext = path.extname(filename).toLowerCase();
    const languageMap = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.jsx': 'javascript',
        '.tsx': 'typescript',
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

function detectLanguageFromCode(code, filename = null) {
    // Сначала пытаемся определить по расширению файла
    if (filename) {
        const langFromFile = detectLanguageFromFilename(filename);
        if (langFromFile !== 'unknown') {
            return langFromFile;
        }
    }

    // Паттерны для определения языка по коду
    const patterns = {
        javascript: [
            /function\s+\w+/, /const\s+\w+\s*=/, /let\s+\w+\s*=/, /var\s+\w+\s*=/, 
            /=>\s*{/, /console\.log/, /require\s*\(/, /import\s+.*from/, 
            /module\.exports/, /export\s+(default\s+)?/, /\$\(/, /document\./
        ],
        python: [
            /def\s+\w+\s*\(/, /import\s+\w+/, /from\s+\w+\s+import/, /print\s*\(/, 
            /if\s+__name__\s*==\s*['"]__main__['"]/, /class\s+\w+.*:/, 
            /self\s*\./, /\brange\s*\(/, /\blen\s*\(/
        ],
        java: [
            /public\s+class\s+\w+/, /public\s+static\s+void\s+main/, 
            /System\.out\.println/, /private\s+\w+/, /public\s+\w+/, 
            /import\s+java/, /\@Override/, /new\s+\w+\s*\(/
        ],
        go: [
            /func\s+\w+\s*\(/, /package\s+\w+/, /import\s+['"]/, 
            /fmt\.Print/, /var\s+\w+\s+\w+/, /func\s+main\s*\(/, 
            /go\s+func/, /defer\s+/
        ],
        ruby: [
            /def\s+\w+/, /class\s+\w+/, /puts\s+/, /require\s+['"]/, 
            /end$/m, /\@\w+/, /attr_accessor/, /\|\w+\|/, /\bdo\b/
        ],
        php: [
            /<\?php/, /function\s+\w+\s*\(/, /echo\s+/, /\$\w+\s*=/, 
            /class\s+\w+/, /namespace\s+\w+/, /->/, /\$this->/
        ],
        csharp: [
            /public\s+class\s+\w+/, /using\s+System/, /Console\.WriteLine/, 
            /public\s+static\s+void\s+Main/, /namespace\s+\w+/, 
            /public\s+static/, /\[\w+\]/, /\bstring\b/
        ],
        rust: [
            /fn\s+\w+\s*\(/, /let\s+\w+\s*=/, /println!/, /use\s+\w+/, 
            /struct\s+\w+/, /impl\s+\w+/, /fn\s+main\s*\(/, 
            /\bmut\b/, /\&str/, /Vec</
        ]
    };

    let bestMatch = { language: 'unknown', score: 0 };

    // Подсчитываем совпадения для каждого языка
    for (const [language, langPatterns] of Object.entries(patterns)) {
        let score = 0;
        for (const pattern of langPatterns) {
            if (pattern.test(code)) {
                score++;
            }
        }
        
        if (score > bestMatch.score) {
            bestMatch = { language, score };
        }
    }

    // Возвращаем язык только если есть достаточно совпадений
    return bestMatch.score >= 2 ? bestMatch.language : 'unknown';
}

// Запуск готовых тестов в Docker
app.post('/api/run-tests', async (req, res) => {
    try {
        const { testCode, language } = req.body;
        
        if (!testCode) {
            return res.status(400).json({
                success: false,
                error: 'Код тестов обязателен для выполнения'
            });
        }
        
        if (!language) {
            return res.status(400).json({
                success: false,
                error: 'Язык программирования обязателен для выполнения тестов'
            });
        }
        
        console.log(`🚀 Running tests for language: ${language}`);
        
        // Запускаем тесты в Docker
        const dockerResult = await dockerTestRunner.runTests({
            originalCode: '', // Для запуска готовых тестов оригинальный код не нужен
            compiledTests: testCode,
            testSummary: {
                language: language,
                framework: getTestFramework(language),
                testsGenerated: 1
            },
            language: language,
            filename: `test.${getFileExtension(language)}`
        }, language);
        
        console.log(`🐳 Docker test execution ${dockerResult.success ? 'successful' : 'failed'}`);
        
        if (!dockerResult.success) {
            return res.status(500).json({
                success: false,
                error: dockerResult.error || 'Ошибка при выполнении тестов в Docker'
            });
        }
        
        // Формируем ответ
        const response = {
            success: true,
            data: {
                success: dockerResult.result?.success || false,
                duration: dockerResult.result?.duration || 0,
                output: dockerResult.result?.logs || '',
                statusCode: dockerResult.result?.statusCode,
                testUrl: dockerResult.webUrl,
                testId: dockerResult.testId
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error in run-tests:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

function getTestFramework(language) {
    const frameworks = {
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
    return frameworks[language] || 'unknown';
}

// Инициализация сервиса
app.post('/api/init', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:${config.server.port}/mcp/test-agent/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Статические файлы для веб-интерфейса
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Agent MCP - HTTP Server</title>
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
                    max-width: 800px;
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
                
                .status-card {
                    background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 16px;
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 1.2rem;
                    font-weight: 600;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .info-card {
                    background: white;
                    border: 2px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 25px;
                    text-align: center;
                    transition: all 0.3s ease;
                }
                
                .info-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                    border-color: #667eea;
                }
                
                .info-icon {
                    font-size: 2.5rem;
                    margin-bottom: 15px;
                }
                
                .info-title {
                    font-size: 1.2rem;
                    font-weight: 600;
                    margin-bottom: 10px;
                    color: #1a202c;
                }
                
                .info-text {
                    color: #4a5568;
                    font-size: 0.9rem;
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
                    <h1>🧪 Test Agent MCP</h1>
                    <div class="subtitle">HTTP Server for Code Testing</div>
                </div>
                
                <div class="content">
                    <div class="status-card">
                        ✅ HTTP Server is running
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="info-icon">🚀</div>
                            <div class="info-title">MCP Server</div>
                            <div class="info-text">Port ${config.server.port}</div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-icon">🌐</div>
                            <div class="info-title">HTTP Server</div>
                            <div class="info-text">Port ${PORT}</div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-icon">🤖</div>
                            <div class="info-title">AI Integration</div>
                            <div class="info-text">Ollama ${config.ollama.model}</div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-icon">🐳</div>
                            <div class="info-title">Docker</div>
                            <div class="info-text">Container Testing</div>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-title">📋 Supported Languages</div>
                        <div class="info-text">${config.testSettings.supportedLanguages.join(', ')}</div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>🔗 Integrated with existing MCP services</p>
                    <p class="timestamp">🕐 ${new Date().toLocaleString('ru-RU')}</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🌐 Test Agent HTTP Server running on port ${PORT}`);
    console.log(`🔗 MCP Server: http://localhost:${config.server.port}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
