class TestAgent {
    constructor() {
        this.baseUrl = window.location.origin;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Форма ввода кода
        document.getElementById('code-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitCode();
        });

        // Форма загрузки файла
        document.getElementById('file-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitFile();
        });

        // Drag & Drop для файлов
        const fileUpload = document.getElementById('file-upload');
        const fileInput = document.getElementById('file-input');

        fileUpload.addEventListener('click', () => fileInput.click());
        fileUpload.addEventListener('dragover', this.handleDragOver.bind(this));
        fileUpload.addEventListener('dragleave', this.handleDragLeave.bind(this));
        fileUpload.addEventListener('drop', this.handleDrop.bind(this));

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.updateFileUploadUI(e.target.files[0]);
                document.querySelector('#file-form .btn').disabled = false;
            }
        });

        // Автоматическое определение языка по коду
        document.getElementById('code').addEventListener('input', this.detectAndDisplayLanguage.bind(this));
    }

    switchTab(tabName) {
        // Убираем активные классы
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Добавляем активные классы
        document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('file-input').files = files;
            this.updateFileUploadUI(files[0]);
            document.querySelector('#file-form .btn').disabled = false;
        }
    }

    updateFileUploadUI(file) {
        const fileUpload = document.getElementById('file-upload');
        fileUpload.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 15px;">📄</div>
            <p style="font-size: 1.2rem; margin-bottom: 10px;">${file.name}</p>
            <p style="color: #718096;">Размер: ${this.formatFileSize(file.size)}</p>
        `;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    detectAndDisplayLanguage() {
        const code = document.getElementById('code').value;
        const detectedLanguageDiv = document.getElementById('detected-language');
        
        if (!code.trim()) {
            detectedLanguageDiv.textContent = '';
            return null;
        }

        // Простое определение языка по ключевым словам и синтаксису
        const patterns = {
            javascript: [/function\s+\w+/, /const\s+\w+\s*=/, /let\s+\w+\s*=/, /var\s+\w+\s*=/, /=>\s*{/, /console\.log/, /require\s*\(/, /import\s+.*from/],
            python: [/def\s+\w+\s*\(/, /import\s+\w+/, /from\s+\w+\s+import/, /print\s*\(/, /if\s+__name__\s*==\s*['"]__main__['"]/, /class\s+\w+.*:/],
            java: [/public\s+class\s+\w+/, /public\s+static\s+void\s+main/, /System\.out\.println/, /private\s+\w+/, /public\s+\w+/, /import\s+java/],
            go: [/func\s+\w+\s*\(/, /package\s+\w+/, /import\s+['"]/, /fmt\.Print/, /var\s+\w+\s+\w+/, /func\s+main\s*\(/],
            ruby: [/def\s+\w+/, /class\s+\w+/, /puts\s+/, /require\s+['"]/, /end$/m, /\@\w+/, /attr_accessor/],
            php: [/<\?php/, /function\s+\w+\s*\(/, /echo\s+/, /\$\w+\s*=/, /class\s+\w+/, /namespace\s+\w+/],
            csharp: [/public\s+class\s+\w+/, /using\s+System/, /Console\.WriteLine/, /public\s+static\s+void\s+Main/, /namespace\s+\w+/, /public\s+static/],
            rust: [/fn\s+\w+\s*\(/, /let\s+\w+\s*=/, /println!/, /use\s+\w+/, /struct\s+\w+/, /impl\s+\w+/, /fn\s+main\s*\(/]
        };

        let detectedLanguage = null;
        let maxMatches = 0;

        // Подсчитываем совпадения для каждого языка
        for (const [lang, langPatterns] of Object.entries(patterns)) {
            const matches = langPatterns.filter(pattern => pattern.test(code)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedLanguage = lang;
            }
        }

        // Дополнительная проверка по расширению файла если указано
        const filename = document.getElementById('filename').value;
        if (filename && !detectedLanguage) {
            detectedLanguage = this.detectLanguageFromFilename(filename);
        }

        // Отображаем результат
        if (detectedLanguage && detectedLanguage !== 'unknown') {
            const languageNames = {
                javascript: 'JavaScript',
                python: 'Python',
                java: 'Java',
                go: 'Go',
                ruby: 'Ruby',
                php: 'PHP',
                csharp: 'C#',
                rust: 'Rust'
            };
            detectedLanguageDiv.textContent = `🔍 Обнаружен язык: ${languageNames[detectedLanguage]}`;
        } else {
            detectedLanguageDiv.textContent = '❓ Язык не определен (будет определен автоматически при обработке)';
        }

        return detectedLanguage;
    }

    detectLanguageFromFilename(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'javascript',
            'tsx': 'javascript',
            'py': 'python',
            'java': 'java',
            'go': 'go',
            'rb': 'ruby',
            'php': 'php',
            'cs': 'csharp',
            'rs': 'rust'
        };
        return languageMap[ext] || 'unknown';
    }

    async submitCode() {
        const code = document.getElementById('code').value;
        const filename = document.getElementById('filename').value;

        if (!code.trim()) {
            this.showError('Пожалуйста, введите код для тестирования');
            return;
        }

        // Пытаемся определить язык автоматически
        let detectedLanguage = this.detectAndDisplayLanguage();
        
        // Если язык не определен, отправляем на сервер для автоматического определения
        if (!detectedLanguage || detectedLanguage === 'unknown') {
            detectedLanguage = null; // Сервер сам определит
        }

        this.showLoading();

        try {
            const requestBody = {
                code: code,
                filename: filename
            };

            // Добавляем язык только если он определен на клиенте
            if (detectedLanguage) {
                requestBody.language = detectedLanguage;
            }

            const response = await fetch(`${this.baseUrl}/api/test-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            this.hideLoading();

            if (data.success) {
                this.showResults(data.data);
            } else {
                this.showError(data.error || 'Произошла ошибка при генерации тестов');
            }
        } catch (error) {
            this.hideLoading();
            this.showError('Ошибка соединения с сервером');
            console.error('Error:', error);
        }
    }

    async submitFile() {
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];

        if (!file) {
            this.showError('Пожалуйста, выберите файл');
            return;
        }

        this.showLoading();

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.baseUrl}/api/test-file`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            this.hideLoading();

            if (data.success) {
                this.showResults(data.data);
            } else {
                this.showError(data.error || 'Произошла ошибка при обработке файла');
            }
        } catch (error) {
            this.hideLoading();
            this.showError('Ошибка соединения с сервером');
            console.error('Error:', error);
        }
    }

    getFileExtension(language) {
        const extensions = {
            javascript: 'js',
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

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        this.clearMessages();
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showResults(data) {
        const resultsDiv = document.getElementById('results');
        const resultsContent = document.getElementById('results-content');
        
        let html = '';

        // Информация о коде
        if (data.codeInfo) {
            html += `
                <div class="result-card">
                    <div class="result-header">
                        <div class="result-title">📄 Информация о коде</div>
                        <div class="result-status status-success">Обработан</div>
                    </div>
                    <p><strong>Язык:</strong> ${data.codeInfo.language}</p>
                    <p><strong>Файл:</strong> ${data.codeInfo.filename}</p>
                    <p><strong>Функций найдено:</strong> ${data.codeInfo.functionsCount || 0}</p>
                </div>
            `;
        }

        // Сгенерированные тесты с кнопками копирования и скачивания
        if (data.generatedTests) {
            const testId = 'test-code-' + Date.now();
            const filename = data.codeInfo ? this.getTestFilename(data.codeInfo.filename, data.codeInfo.language) : 'test.js';
            
            html += `
                <div class="result-card">
                    <div class="code-header">
                        <div class="result-title">🧪 Сгенерированные тесты</div>
                        <div class="code-actions">
                            <button class="btn-small" onclick="testAgent.copyToClipboard('${testId}')">
                                📋 Копировать
                            </button>
                            <button class="btn-small btn-success" onclick="testAgent.downloadTestFile('${testId}', '${filename}')">
                                💾 Скачать
                            </button>
                            <button class="btn-small btn-run" onclick="testAgent.runTests('${testId}', '${data.codeInfo.language}')" id="run-tests-btn">
                                🚀 Запустить
                            </button>
                        </div>
                    </div>
                    <pre class="code-block" id="${testId}"><code class="language-${data.codeInfo.language}">${this.escapeHtml(data.generatedTests)}</code></pre>
                </div>
            `;
        }

        // Результаты выполнения тестов с улучшенным отображением
        if (data.testResults) {
            const isSuccess = data.testResults.success;
            const testsRun = this.parseTestResults(data.testResults.output);
            const formattedOutput = this.formatTestOutput(data.testResults.output);
            
            html += `
                <div class="result-card">
                    <div class="result-header">
                        <div class="result-title">🚀 Результаты тестирования</div>
                        <div class="result-status ${isSuccess ? 'status-success' : 'status-error'}">
                            ${isSuccess ? 'Успешно' : 'Ошибки'}
                        </div>
                    </div>
                    
                    <div class="test-results-grid">
                        <div class="test-stat stat-total">
                            <div class="test-stat-number">${testsRun.total}</div>
                            <div class="test-stat-label">Тестов выполнено</div>
                        </div>
                        <div class="test-stat stat-success">
                            <div class="test-stat-number">${testsRun.passed}</div>
                            <div class="test-stat-label">Успешных</div>
                        </div>
                        <div class="test-stat stat-error">
                            <div class="test-stat-number">${testsRun.failed}</div>
                            <div class="test-stat-label">Неудачных</div>
                        </div>
                    </div>
                    
                    ${formattedOutput ? `
                        <div class="test-output-container">
                            <div class="test-output-header">
                                <span class="test-output-title">📋 Детальный вывод</span>
                                <button class="btn-small" onclick="testAgent.toggleTestOutput()" id="toggle-output-btn">
                                    👁️ Показать
                                </button>
                            </div>
                            <div class="test-output collapsed" id="test-output">${formattedOutput}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Ссылка на веб-интерфейс тестов
        if (data.testUrl) {
            html += `
                <div class="result-card">
                    <div class="result-header">
                        <div class="result-title">🌐 Веб-интерфейс тестов</div>
                        <div class="result-status status-success">Доступен</div>
                    </div>
                    <p>Тесты развернуты и доступны по ссылке:</p>
                    <a href="${data.testUrl}" target="_blank" class="test-link">
                        🚀 Открыть тесты в браузере
                    </a>
                </div>
            `;
        }

        resultsContent.innerHTML = html;
        resultsDiv.style.display = 'block';

        // Подсветка синтаксиса
        Prism.highlightAll();
    }

    showError(message) {
        this.clearMessages();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.querySelector('.main-card').appendChild(errorDiv);
    }

    showSuccess(message) {
        this.clearMessages();
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.querySelector('.main-card').appendChild(successDiv);
    }

    clearMessages() {
        document.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getTestFilename(originalFilename, language) {
        if (!originalFilename) {
            const ext = this.getFileExtension(language);
            return `test.${ext}`;
        }
        
        const parts = originalFilename.split('.');
        const ext = parts.pop();
        const name = parts.join('.');
        return `${name}.test.${ext}`;
    }

    parseTestResults(output) {
        if (!output) return { total: 0, passed: 0, failed: 0 };
        
        // Парсинг результатов для разных фреймворков
        let total = 0, passed = 0, failed = 0;
        
        // Jest/JavaScript
        const jestMatch = output.match(/(\d+) passing|Tests:\s+(\d+) passed|✓ (\d+)|✗ (\d+)/g);
        if (jestMatch) {
            jestMatch.forEach(match => {
                const passedMatch = match.match(/(\d+) passing|Tests:\s+(\d+) passed|✓ (\d+)/);
                const failedMatch = match.match(/✗ (\d+)/);
                if (passedMatch) passed += parseInt(passedMatch[1] || passedMatch[2] || passedMatch[3] || 0);
                if (failedMatch) failed += parseInt(failedMatch[1] || 0);
            });
        }
        
        // Python pytest
        const pytestMatch = output.match(/(\d+) passed|passed, (\d+) failed|(\d+) failed/);
        if (pytestMatch) {
            if (pytestMatch[1]) passed = parseInt(pytestMatch[1]);
            if (pytestMatch[2]) failed = parseInt(pytestMatch[2]);
            if (pytestMatch[3]) failed = parseInt(pytestMatch[3]);
        }
        
        // Go testing
        const goMatch = output.match(/PASS|FAIL/g);
        if (goMatch) {
            passed = (goMatch.filter(m => m === 'PASS')).length;
            failed = (goMatch.filter(m => m === 'FAIL')).length;
        }
        
        total = passed + failed;
        return { total, passed, failed };
    }

    formatTestOutput(output) {
        if (!output) return '';
        
        // Разбиваем вывод на строки
        const lines = output.split('\n');
        let formattedLines = [];
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            // Форматируем разные типы строк
            if (line.includes('✓') || line.includes('PASS') || line.includes('passing')) {
                formattedLines.push(`<div class="test-line test-pass">✅ ${this.escapeHtml(line)}</div>`);
            } else if (line.includes('✗') || line.includes('FAIL') || line.includes('failed') || line.includes('Error')) {
                formattedLines.push(`<div class="test-line test-fail">❌ ${this.escapeHtml(line)}</div>`);
            } else if (line.includes('describe') || line.includes('it(') || line.includes('test(')) {
                formattedLines.push(`<div class="test-line test-describe">🧪 ${this.escapeHtml(line)}</div>`);
            } else if (line.includes('Expected') || line.includes('Actual') || line.includes('at ')) {
                formattedLines.push(`<div class="test-line test-detail">📋 ${this.escapeHtml(line)}</div>`);
            } else if (line.match(/^\s*\d+\)/)) {
                formattedLines.push(`<div class="test-line test-number">🔢 ${this.escapeHtml(line)}</div>`);
            } else {
                formattedLines.push(`<div class="test-line test-info">${this.escapeHtml(line)}</div>`);
            }
        }
        
        return formattedLines.join('');
    }

    toggleTestOutput() {
        const output = document.getElementById('test-output');
        const btn = document.getElementById('toggle-output-btn');
        
        if (output.classList.contains('collapsed')) {
            output.classList.remove('collapsed');
            btn.textContent = '👁️ Скрыть';
        } else {
            output.classList.add('collapsed');
            btn.textContent = '👁️ Показать';
        }
    }

    async copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const text = element.textContent;
        
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess('Код скопирован в буфер обмена!');
        } catch (err) {
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess('Код скопирован в буфер обмена!');
        }
    }

    downloadTestFile(elementId, filename) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const text = element.textContent;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showSuccess(`Файл ${filename} загружен!`);
    }

    async runTests(elementId, language) {
        const element = document.getElementById(elementId);
        if (!element) {
            this.showError('Не удалось найти код тестов');
            return;
        }

        const testCode = element.textContent;
        const runBtn = document.getElementById('run-tests-btn');
        
        // Отключаем кнопку и показываем загрузку
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.textContent = '⏳ Запуск...';
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/run-tests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    testCode: testCode,
                    language: language
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Обновляем блок результатов тестирования
                this.updateTestResults(data.data);
                this.showSuccess('Тесты успешно выполнены!');
            } else {
                this.showError(data.error || 'Ошибка при выполнении тестов');
            }
        } catch (error) {
            this.showError('Ошибка соединения с сервером');
            console.error('Error running tests:', error);
        } finally {
            // Возвращаем кнопку в исходное состояние
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.textContent = '🚀 Запустить';
            }
        }
    }

    updateTestResults(testResults) {
        const resultsDiv = document.getElementById('results');
        const resultsContent = document.getElementById('results-content');
        
        if (!resultsDiv || !resultsContent) return;

        const isSuccess = testResults.success;
        const testsRun = this.parseTestResults(testResults.output);
        const formattedOutput = this.formatTestOutput(testResults.output);
        
        // Находим существующий блок результатов или создаем новый
        let testResultsCard = resultsContent.querySelector('.test-results-card');
        
        const testResultsHtml = `
            <div class="result-card test-results-card">
                <div class="result-header">
                    <div class="result-title">🚀 Результаты тестирования</div>
                    <div class="result-status ${isSuccess ? 'status-success' : 'status-error'}">
                        ${isSuccess ? 'Успешно' : 'Ошибки'}
                    </div>
                </div>
                
                <div class="test-results-grid">
                    <div class="test-stat stat-total">
                        <div class="test-stat-number">${testsRun.total}</div>
                        <div class="test-stat-label">Тестов выполнено</div>
                    </div>
                    <div class="test-stat stat-success">
                        <div class="test-stat-number">${testsRun.passed}</div>
                        <div class="test-stat-label">Успешных</div>
                    </div>
                    <div class="test-stat stat-error">
                        <div class="test-stat-number">${testsRun.failed}</div>
                        <div class="test-stat-label">Неудачных</div>
                    </div>
                </div>
                
                ${formattedOutput ? `
                    <div class="test-output-container">
                        <div class="test-output-header">
                            <span class="test-output-title">📋 Детальный вывод</span>
                            <button class="btn-small" onclick="testAgent.toggleTestOutput()" id="toggle-output-btn">
                                👁️ Показать
                            </button>
                        </div>
                        <div class="test-output collapsed" id="test-output">${formattedOutput}</div>
                    </div>
                ` : ''}
            </div>
        `;

        if (testResultsCard) {
            // Обновляем существующий блок
            testResultsCard.outerHTML = testResultsHtml;
        } else {
            // Добавляем новый блок
            resultsContent.insertAdjacentHTML('beforeend', testResultsHtml);
        }

        // Показываем результаты
        resultsDiv.style.display = 'block';
    }
}

// Глобальные функции для переключения вкладок
function switchTab(tabName) {
    window.testAgent.switchTab(tabName);
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.testAgent = new TestAgent();
});
