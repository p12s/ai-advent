const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const Generator = require('./generator');
const Runner = require('./runner');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let config = {};
let generator = null;
let runner = null;

try {
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) {
        throw new Error('config.json not found. Please create config.json from config.example.json');
    }
    
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`📝 Loaded config with model: ${config.ollama?.model || 'unknown'}`);
    
    generator = new Generator(config);
    runner = new Runner(config);
    console.log('✅ All components initialized');
} catch (error) {
    console.error('❌ Error initializing:', error.message);
    process.exit(1);
}

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'test-agent-server',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/test-code', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        console.log('🧪 Generating tests for code...');
        const testData = await generator.generateTestsForCode({ totalFunctions: 1 }, code);
        testData.originalCode = code; // Добавляем исходный код для создания source.js
        
        if (!testData.success) {
            return res.status(500).json({
                success: false,
                error: testData.error || 'Failed to generate tests'
            });
        }

        console.log('🚀 Running tests...');
        const result = await runner.runTests(testData);
        
        res.json({
            success: true,
            result,
            testData
        });
    } catch (error) {
        console.error('Error in test-code:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const upload = multer({ dest: 'uploads/' });

app.post('/api/test-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }

        const code = req.file.buffer.toString('utf8');
        
        console.log('🧪 Generating tests for file...');
        const testData = await generator.generateTestsForCode({ totalFunctions: 1 }, code);
        testData.originalCode = code; // Добавляем исходный код для создания source.js
        
        if (!testData.success) {
            return res.status(500).json({
                success: false,
                error: testData.error || 'Failed to generate tests'
            });
        }

        console.log('🚀 Running tests...');
        const result = await runner.runTests(testData);
        
        res.json({
            success: true,
            result,
            testData
        });
    } catch (error) {
        console.error('Error in test-file:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Test Agent server running on port ${PORT}`);
    console.log(`🌐 Web interface: http://localhost:${PORT}`);
    console.log(`🔧 Health check: http://localhost:${PORT}/health`);
});
