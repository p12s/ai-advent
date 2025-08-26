/**
 * Test Agent Module - интеграция с test-agent-mcp
 */

let testAgentInitialized = false;

async function initTestAgentModule() {
    try {
        console.log('🔍 Initializing Test Agent module...');
        
        // Инициализация Test Agent
        const initialized = await window.initTestAgent();
        if (initialized) {
            testAgentInitialized = true;
            console.log('✅ Test Agent module initialized successfully');
            
            // Добавляем кнопку для тестирования в интерфейс
            addTestAgentButton();
        } else {
            console.error('❌ Test Agent module initialization failed');
        }
    } catch (error) {
        console.error('❌ Error initializing Test Agent module:', error);
    }
}

function addTestAgentButton() {
    // Добавляем кнопку в панель управления
    const controlsContainer = document.querySelector('.controls');
    if (controlsContainer) {
        const testButton = document.createElement('button');
        testButton.className = 'control-button test-agent-button';
        testButton.innerHTML = '🧪 Test Code';
        testButton.onclick = showTestAgentModal;
        controlsContainer.appendChild(testButton);
    }
}

function showTestAgentModal() {
    if (!testAgentInitialized) {
        addMessage('❌ Test Agent не инициализирован. Проверьте подключение к test-agent-mcp серверу.', false, false, 'System');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content test-agent-modal">
            <div class="modal-header">
                <h3>🧪 Test Agent - Тестирование кода</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="test-agent-tabs">
                    <button class="tab-button active" data-tab="file">📁 Загрузить файл</button>
                    <button class="tab-button" data-tab="code">📝 Ввести код</button>
                </div>
                
                <div class="tab-content active" id="file-tab">
                    <div class="file-upload-area">
                        <input type="file" id="test-file-input" accept=".js,.ts,.py,.java,.go,.rb,.php,.cs,.rs" style="display: none;">
                        <button class="upload-button" onclick="document.getElementById('test-file-input').click()">
                            📁 Выбрать файл для тестирования
                        </button>
                        <div id="selected-file-info" class="file-info" style="display: none;"></div>
                    </div>
                </div>
                
                <div class="tab-content" id="code-tab">
                    <div class="code-input-area">
                        <label for="test-code-language">Язык программирования:</label>
                        <select id="test-code-language">
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="go">Go</option>
                            <option value="ruby">Ruby</option>
                            <option value="php">PHP</option>
                            <option value="csharp">C#</option>
                            <option value="rust">Rust</option>
                        </select>
                        
                        <label for="test-code-filename">Имя файла:</label>
                        <input type="text" id="test-code-filename" placeholder="example.js" value="test.js">
                        
                        <label for="test-code-content">Код для тестирования:</label>
                        <textarea id="test-code-content" placeholder="Введите код для тестирования..." rows="10"></textarea>
                    </div>
                </div>
                
                <div class="test-agent-actions">
                    <button class="test-button" onclick="runTestAgent()">🚀 Запустить тесты</button>
                    <button class="cancel-button" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики для табов
    const tabButtons = modal.querySelectorAll('.tab-button');
    const tabContents = modal.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
        });
    });
    
    // Обработчик для загрузки файла
    const fileInput = modal.querySelector('#test-file-input');
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const fileInfo = modal.querySelector('#selected-file-info');
            fileInfo.innerHTML = `
                <div class="file-details">
                    <strong>📄 ${file.name}</strong><br>
                    <small>Размер: ${(file.size / 1024).toFixed(2)} KB</small><br>
                    <small>Тип: ${window.testAgent.detectLanguage(file.name)}</small>
                </div>
            `;
            fileInfo.style.display = 'block';
        }
    });
    
    // Обработчик для изменения языка в поле кода
    const languageSelect = modal.querySelector('#test-code-language');
    const filenameInput = modal.querySelector('#test-code-filename');
    
    languageSelect.addEventListener('change', function() {
        const language = this.value;
        const extensions = {
            'javascript': '.js',
            'typescript': '.ts',
            'python': '.py',
            'java': '.java',
            'go': '.go',
            'ruby': '.rb',
            'php': '.php',
            'csharp': '.cs',
            'rust': '.rs'
        };
        
        const currentFilename = filenameInput.value;
        const baseName = currentFilename.split('.')[0];
        filenameInput.value = baseName + extensions[language];
    });
}

async function runTestAgent() {
    const modal = document.querySelector('.test-agent-modal');
    if (!modal) return;
    
    const activeTab = modal.querySelector('.tab-button.active').getAttribute('data-tab');
    const testButton = modal.querySelector('.test-button');
    const originalText = testButton.textContent;
    
    testButton.textContent = '⏳ Выполняется...';
    testButton.disabled = true;
    
    try {
        let result;
        
        if (activeTab === 'file') {
            const fileInput = modal.querySelector('#test-file-input');
            const file = fileInput.files[0];
            
            if (!file) {
                throw new Error('Выберите файл для тестирования');
            }
            
            addMessage('🧪 Запуск тестирования файла...', false, false, 'System', 'testing');
            result = await window.testFileWithAgent(file);
            
        } else if (activeTab === 'code') {
            const language = modal.querySelector('#test-code-language').value;
            const filename = modal.querySelector('#test-code-filename').value;
            const code = modal.querySelector('#test-code-content').value;
            
            if (!code.trim()) {
                throw new Error('Введите код для тестирования');
            }
            
            addMessage('🧪 Запуск тестирования кода...', false, false, 'System', 'testing');
            result = await window.testCodeWithAgent(code, language, filename);
        }
        
        if (result.success) {
            const data = result.data;
            
            // Показываем результаты тестирования
            const testResults = data.testResults;
            const successRate = testResults.totalTests > 0 ? 
                Math.round((testResults.passedTests / testResults.totalTests) * 100) : 0;
            
            const resultMessage = `
🧪 **Результаты тестирования ${data.filename}**

📊 **Статистика:**
- Всего тестов: ${testResults.totalTests}
- Пройдено: ${testResults.passedTests}
- Провалено: ${testResults.failedTests}
- Успешность: ${successRate}%

${testResults.failedTests === 0 ? '✅ Все тесты прошли успешно!' : '⚠️ Некоторые тесты провалились'}

${data.reportUrl ? `📄 **Отчет:** [Открыть отчет](${data.reportUrl})` : ''}
            `;
            
            addMessage(resultMessage, false, false, 'Agent4', 'testing');
            
            // Если есть ссылка на отчет, открываем её
            if (data.reportUrl) {
                setTimeout(() => {
                    window.open(data.reportUrl, '_blank');
                }, 1000);
            }
            
            // Закрываем модальное окно
            modal.closest('.modal-overlay').remove();
            
        } else {
            throw new Error(result.error || 'Неизвестная ошибка при тестировании');
        }
        
    } catch (error) {
        console.error('❌ Error running test agent:', error);
        addMessage(`❌ Ошибка при тестировании: ${error.message}`, false, false, 'Agent4', 'testing');
    } finally {
        testButton.textContent = originalText;
        testButton.disabled = false;
    }
}

// Добавляем стили для Test Agent
const testAgentStyles = `
.test-agent-modal {
    max-width: 800px;
    width: 90%;
}

.test-agent-tabs {
    display: flex;
    margin-bottom: 20px;
    border-bottom: 2px solid #e2e8f0;
}

.test-agent-tabs .tab-button {
    background: none;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.3s ease;
}

.test-agent-tabs .tab-button.active {
    border-bottom-color: #667eea;
    color: #667eea;
    font-weight: 600;
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

.file-upload-area {
    text-align: center;
    padding: 40px;
    border: 2px dashed #cbd5e0;
    border-radius: 12px;
    margin-bottom: 20px;
}

.upload-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.upload-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.file-info {
    margin-top: 15px;
    padding: 15px;
    background: #f7fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.code-input-area {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.code-input-area label {
    font-weight: 600;
    color: #2d3748;
}

.code-input-area select,
.code-input-area input,
.code-input-area textarea {
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
}

.code-input-area textarea {
    resize: vertical;
    min-height: 200px;
}

.test-agent-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
}

.test-button {
    background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
}

.test-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(56, 161, 105, 0.3);
}

.test-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.cancel-button {
    background: #e2e8f0;
    color: #4a5568;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
}

.cancel-button:hover {
    background: #cbd5e0;
}

.test-agent-button {
    background: linear-gradient(135deg, #d69e2e 0%, #b7791f 100%) !important;
}
`;

// Добавляем стили в head
const styleElement = document.createElement('style');
styleElement.textContent = testAgentStyles;
document.head.appendChild(styleElement);

// Экспорт функций
window.initTestAgentModule = initTestAgentModule;
window.showTestAgentModal = showTestAgentModal;
window.runTestAgent = runTestAgent;
