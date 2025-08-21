class TestAgent {
    constructor() {
        this.baseUrl = window.location.origin;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('code-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitCode();
        });

        document.getElementById('file-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitFile();
        });

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
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

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

    async submitCode() {
        const code = document.getElementById('code').value;
        const filename = document.getElementById('filename').value;

        if (!code.trim()) {
            this.showError('Пожалуйста, введите код для тестирования');
            return;
        }

        this.showLoading();

        try {
            const requestBody = {
                code: code,
                filename: filename
            };

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
                this.showResults(data.result, data.testData);
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
                this.showResults(data.result, data.testData);
            } else {
                this.showError(data.error || 'Произошла ошибка при обработке файла');
            }
        } catch (error) {
            this.hideLoading();
            this.showError('Ошибка соединения с сервером');
            console.error('Error:', error);
        }
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        this.clearMessages();
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showResults(result, testData) {
        const resultsDiv = document.getElementById('results');
        const resultsContent = document.getElementById('results-content');
        
        let html = '';

        if (testData && testData.compiledTests) {
            const testId = 'test-code-' + Date.now();
            
            html += `
                <div class="result-card">
                    <div class="code-header">
                        <div class="result-title">🧪 Сгенерированные тесты</div>
                        <div class="code-actions">
                            <button class="btn-small" onclick="testAgent.copyToClipboard('${testId}')">
                                📋 Копировать
                            </button>
                            <button class="btn-small btn-success" onclick="testAgent.downloadTestFile('${testId}', 'test.js')">
                                💾 Скачать
                            </button>
                        </div>
                    </div>
                    <pre class="code-block" id="${testId}"><code class="language-javascript">${this.escapeHtml(testData.compiledTests)}</code></pre>
                </div>
            `;
        }

        if (result && result.success !== undefined) {
            const isSuccess = result.success;
            const testsRun = this.parseTestResults(result.logs);
            const formattedOutput = this.formatTestOutput(result.logs);
            
            // Если логи пустые, используем данные из testData
            if (testsRun.total === 0 && testData && testData.testSummary) {
                testsRun.total = testData.testSummary.testsGenerated || 0;
                testsRun.passed = testData.testSummary.testsGenerated || 0;
                testsRun.failed = 0;
            }
            
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

        if (result && result.webUrl) {
            html += `
                <div class="result-card">
                    <div class="result-header">
                        <div class="result-title">🌐 Веб-интерфейс тестов</div>
                        <div class="result-status status-success">Доступен</div>
                    </div>
                    <p>Тесты развернуты и доступны по ссылке:</p>
                    <a href="${result.webUrl}" target="_blank" class="test-link">
                        🚀 Открыть тесты в браузере
                    </a>
                </div>
            `;
        }

        resultsContent.innerHTML = html;
        resultsDiv.style.display = 'block';

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

    parseTestResults(output) {
        if (!output) return { total: 0, passed: 0, failed: 0 };
        
        let total = 0, passed = 0, failed = 0;
        
        const jestMatch = output.match(/(\d+) passing|Tests:\s+(\d+) passed|✓ (\d+)|✗ (\d+)/g);
        if (jestMatch) {
            jestMatch.forEach(match => {
                const passedMatch = match.match(/(\d+) passing|Tests:\s+(\d+) passed|✓ (\d+)/);
                const failedMatch = match.match(/✗ (\d+)/);
                if (passedMatch) passed += parseInt(passedMatch[1] || passedMatch[2] || passedMatch[3] || 0);
                if (failedMatch) failed += parseInt(failedMatch[1] || 0);
            });
        }
        
        total = passed + failed;
        return { total, passed, failed };
    }

    formatTestOutput(output) {
        if (!output) return '';
        
        const lines = output.split('\n');
        let formattedLines = [];
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
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
}

function switchTab(tabName) {
    window.testAgent.switchTab(tabName);
}

document.addEventListener('DOMContentLoaded', () => {
    window.testAgent = new TestAgent();
});
