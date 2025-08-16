let conversationHistory = [];
let requirementsDocument = null;
let currentAgent = null;
let agent1 = null;
let agent2 = null;

class RequirementsAgent {
    constructor() {
        this.requirements = {
            appType: '',
            targetAudience: '',
            features: [],
            platform: '',
            note: ''
        };
        this.isComplete = false;
    }

    getSystemPrompt(format) {
        const basePrompt = "You are a helpful assistant. ОБЯЗАТЕЛЬНО: ВСЕГДА ОТВЕЧАЙ ТОЛЬКО НА РУССКОМ ЯЗЫКЕ! Даже если пользователь пишет на английском или любом другом языке, ты должен отвечать на русском языке. Always respond in Russian, except when you need to show code or technical terms.";
        
        const history = formatConversationHistory();
        const requirementsPrompt = `Ты — Agent1, агент по сбору требований для создания приложения.

ОБЯЗАТЕЛЬНО: ВСЕГДА ОТВЕЧАЙ ТОЛЬКО НА РУССКОМ ЯЗЫКЕ! Даже если пользователь пишет на английском или любом другом языке, ты должен отвечать на русском языке.

Твоя задача — задать вопросы пользователю, чтобы понять:
1. Тип приложения (веб, мобильное, десктопное)
2. Целевую аудиторию
3. Основные функции
4. Платформу (iOS, Android, Web, Desktop)
5. Дополнительные заметки или особые требования

ВАЖНО: 
- Задавай вопросы сразу, без вводных фраз типа "Следующий вопрос:" или "Ожидаю ответа на русском языке"
- Не используй фразы типа "Конечно!", "Понятно!" или подобные
- Просто сразу задавай вопрос или давай ответ
- Если это первый вопрос - сразу начинай с вопроса о типе приложения
- ВНИМАТЕЛЬНО АНАЛИЗИРУЙ историю диалога перед каждым вопросом
- Если информация по какому-то пункту уже есть - НЕ СПРАШИВАЙ повторно
- Если у тебя есть информация по ВСЕМ пунктам - сразу создавай итоговый документ

На основе информации из диалога сформируй итоговый документ требований в формате markdown с разделами: Введение, Функционал, Целевая аудитория, Платформа, Заметки.

Если у тебя есть всё необходимое — остановись и выведи итоговый markdown с пометкой "ТРЕБОВАНИЯ ГОТОВЫ".
В противном случае задай следующий вопрос.

История нашего диалога: ${history}

ПЕРЕД ОТВЕТОМ ПРОАНАЛИЗИРУЙ:
1. Тип приложения: ${this.requirements.appType || 'НЕ ИЗВЕСТНО'}
2. Целевая аудитория: ${this.requirements.targetAudience || 'НЕ ИЗВЕСТНО'}
3. Основные функции: ${this.requirements.features.length > 0 ? this.requirements.features.join(', ') : 'НЕ ИЗВЕСТНО'}
4. Платформа: ${this.requirements.platform || 'НЕ ИЗВЕСТНО'}
5. Заметки: ${this.requirements.note || 'НЕТ'}

Если все пункты заполнены - создавай итоговый документ. Если нет - задавай вопрос только по недостающим пунктам.`;
        
        const formatTemplates = {
            json: `${basePrompt} 

IMPORTANT: You must respond ONLY in the following JSON format:
{
  "response": "your actual answer to the user's question",
  "time": "current time when you generate this response",
  "sources": ["list of sources if applicable, otherwise empty array"],
  "confidence": 0.95
}`,
            xml: `${basePrompt} 

IMPORTANT: You must respond ONLY in the following XML format:
<response>
  <response_text>your actual answer to the user's question</response_text>
  <time>current time when you generate this response</time>
  <sources>
    <source>source 1 if applicable</source>
    <source>source 2 if applicable</source>
  </sources>
  <confidence>0.95</confidence>
</response>`,
            plain: requirementsPrompt
        };
        
        return formatTemplates[format] || formatTemplates.plain;
    }

    processResponse(response) {
        if (response.includes('ТРЕБОВАНИЯ ГОТОВЫ')) {
            this.isComplete = true;
            requirementsDocument = response;
            return {
                type: 'requirements_complete',
                content: response,
                message: '✅ Agent1 завершил сбор требований! Теперь Agent2 приступит к выполнению задачи.'
            };
        }
        return {
            type: 'continue',
            content: response
        };
    }

    updateRequirements(userResponse) {
        const lastQuestion = this.getLastQuestion();
        
        switch (lastQuestion) {
            case 'appType':
                this.requirements.appType = userResponse;
                break;
            case 'platform':
                this.requirements.platform = userResponse;
                break;
            case 'targetAudience':
                this.requirements.targetAudience = userResponse;
                break;
            case 'features':
                this.requirements.features.push(userResponse);
                break;
            case 'note':
                this.requirements.note = userResponse;
                break;
            default:
                if (!this.requirements.appType) {
                    this.requirements.appType = userResponse;
                } else if (!this.requirements.targetAudience) {
                    this.requirements.targetAudience = userResponse;
                } else if (!this.requirements.platform) {
                    this.requirements.platform = userResponse;
                } else if (this.requirements.features.length === 0) {
                    this.requirements.features.push(userResponse);
                } else {
                    this.requirements.note = userResponse;
                }
        }
    }
    
    getLastQuestion() {
        if (!this.requirements.appType) return 'appType';
        if (!this.requirements.targetAudience) return 'targetAudience';
        if (!this.requirements.platform) return 'platform';
        if (this.requirements.features.length === 0) return 'features';
        if (!this.requirements.note) return 'note';
        return null;
    }
}

class ExecutionAgent {
    constructor() {
        this.currentTask = null;
        this.executionPlan = [];
    }

    getSystemPrompt(format) {
        const basePrompt = "You are a helpful assistant. ОБЯЗАТЕЛЬНО: ВСЕГДА ОТВЕЧАЙ ТОЛЬКО НА РУССКОМ ЯЗЫКЕ! Даже если пользователь пишет на английском или любом другом языке, ты должен отвечать на русском языке. Always respond in Russian, except when you need to show code or technical terms.";
        
        const requirementsText = requirementsDocument || 'Требования не собраны';
        const executionPrompt = `Ты — Agent2, агент-исполнитель задач.

ОБЯЗАТЕЛЬНО: ВСЕГДА ОТВЕЧАЙ ТОЛЬКО НА РУССКОМ ЯЗЫКЕ! Даже если пользователь пишет на английском или любом другом языке, ты должен отвечать на русском языке.

Твоя задача — проанализировать требования, собранные Agent1, и создать план выполнения проекта.

ВАЖНО: 
- Отвечай сразу по существу, без вводных фраз типа "Ожидаю ответа на русском языке" или "Конечно!"
- Не используй фразы типа "Понятно!", "Отлично!" или подобные
- Просто сразу давай ответ или задавай вопрос
- Если у тебя есть все необходимые данные - сразу создавай план

ТРЕБОВАНИЯ ОТ AGENT1:
${requirementsText}

Создай детальный план разработки, включающий:
1. Архитектуру приложения
2. Технологический стек
3. Этапы разработки
4. Временные рамки
5. Необходимые ресурсы
6. Потенциальные риски и их решения

Если план готов, выведи его в формате markdown с пометкой "ПЛАН ГОТОВ".
Если нужны дополнительные уточнения, задай вопросы.

История диалога: ${formatConversationHistory()}`;
        
        const formatTemplates = {
            json: `${basePrompt} 

IMPORTANT: You must respond ONLY in the following JSON format:
{
  "response": "your actual answer to the user's question",
  "time": "current time when you generate this response",
  "sources": ["list of sources if applicable, otherwise empty array"],
  "confidence": 0.95
}`,
            xml: `${basePrompt} 

IMPORTANT: You must respond ONLY in the following XML format:
<response>
  <response_text>your actual answer to the user's question</response_text>
  <time>current time when you generate this response</time>
  <sources>
    <source>source 1 if applicable</source>
    <source>source 2 if applicable</source>
  </sources>
  <confidence>0.95</confidence>
</response>`,
            plain: executionPrompt
        };
        
        return formatTemplates[format] || formatTemplates.plain;
    }

    processResponse(response) {
        if (response.includes('ПЛАН ГОТОВ')) {
            return {
                type: 'execution_complete',
                content: response,
                message: '✅ Agent2 завершил создание плана выполнения! Проект готов к реализации.'
            };
        }
        return {
            type: 'continue',
            content: response
        };
    }
}

function formatConversationHistory() {
    if (conversationHistory.length === 0) {
        return "Диалог только начинается.";
    }
    
    return conversationHistory.map((entry, index) => {
        return `${index + 1}. ${entry.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${entry.content}`;
    }).join('\n');
}

function extractResponseFromFormattedData(response, format) {
    const parsers = {
        json: (data) => {
            try {
                const jsonData = JSON.parse(data);
                return jsonData.response || data;
            } catch (error) {
                console.log('JSON parsing failed:', error);
                return data;
            }
        },
        xml: (data) => {
            try {
                const responseMatch = data.match(/<response_text>(.*?)<\/response_text>/s);
                return responseMatch ? responseMatch[1].trim() : data;
            } catch (error) {
                console.log('XML parsing failed:', error);
                return data;
            }
        },
        plain: (data) => data
    };
    
    return parsers[format] ? parsers[format](response) : response;
}

function getSelectedFormat() {
    const activeButton = document.querySelector('.format-button.active');
    return activeButton ? activeButton.getAttribute('data-format') : 'plain';
}

function updateSendButtonState(disabled, text) {
    const sendButton = document.getElementById('send-button');
    sendButton.disabled = disabled;
    sendButton.textContent = text;
}

function sendMessage() {
    const question = document.getElementById('question-input').value.trim();
    
    if (!question) {
        return;
    }
    
    const selectedFormat = getSelectedFormat();
    
    updateSendButtonState(true, 'Sending...');
    
    conversationHistory.push({
        role: 'user',
        content: question
    });
    
    window.addMessage(question, true, false, null, 'requirements');
    document.getElementById('question-input').value = '';
    
    if (conversationHistory.length === 1) {
        window.sendDialogStartToTelegram();
    }
    
    if (currentAgent === agent1) {
        agent1.updateRequirements(question);
    }
    
    const agentType = currentAgent === agent1 ? 'Agent1' : 'Agent2';
    const loadingMessage = window.addMessage('...', false, true, agentType, 'requirements');
    
    const systemPrompt = currentAgent.getSystemPrompt(selectedFormat);
    
    fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama3',
            system: systemPrompt,
            prompt: question,
            temperature: 0.8,
            max_tokens: 10000,
            stream: false
        })
    })
    .then(response => response.json())
    .then(data => {
        loadingMessage.remove();
        
        if (data.response) {
            const userFriendlyResponse = extractResponseFromFormattedData(data.response, selectedFormat);
            
            const processedResponse = currentAgent.processResponse(userFriendlyResponse);
            
            conversationHistory.push({
                role: 'assistant',
                content: processedResponse.content
            });
            
            window.addMessage(processedResponse.content, false, false, agentType, 'requirements');
            
            if (processedResponse.type === 'requirements_complete') {
                currentAgent = agent2;
                window.addMessage(processedResponse.message, false, false, 'System', 'requirements');
                
                setTimeout(() => {
                    const agent2Prompt = "Проанализируй требования и создай план выполнения проекта.";
                    conversationHistory.push({
                        role: 'user',
                        content: agent2Prompt
                    });
                    
                    const agent2LoadingMessage = window.addMessage('...', false, true, 'Agent2', 'requirements');
                    
                    const agent2SystemPrompt = agent2.getSystemPrompt(selectedFormat);
                    
                    fetch('http://localhost:11434/api/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'llama3',
                            system: agent2SystemPrompt,
                            prompt: agent2Prompt,
                            temperature: 0.8,
                            max_tokens: 10000,
                            stream: false
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        agent2LoadingMessage.remove();
                        
                        if (data.response) {
                            const agent2Response = extractResponseFromFormattedData(data.response, selectedFormat);
                            const processedAgent2Response = agent2.processResponse(agent2Response);
                            
                            conversationHistory.push({
                                role: 'assistant',
                                content: processedAgent2Response.content
                            });
                            
                            window.addMessage(processedAgent2Response.content, false, false, 'Agent2', 'requirements');
                            
                            if (processedAgent2Response.type === 'execution_complete') {
                                window.addMessage(processedAgent2Response.message, false, false, 'System', 'requirements');
                                
                                window.sendPlanToTelegram(processedAgent2Response.content);
                                
                                const buttonContainer = document.createElement('div');
                                buttonContainer.className = 'copy-container';
                                
                                const copyButton = document.createElement('button');
                                copyButton.textContent = '📋 Копировать полный план';
                                copyButton.className = 'copy-plan-button';
                                copyButton.onclick = () => {
                                    navigator.clipboard.writeText(processedAgent2Response.content).then(() => {
                                        copyButton.textContent = '✅ Скопировано!';
                                        setTimeout(() => {
                                            copyButton.textContent = '📋 Копировать полный план';
                                        }, 2000);
                                    });
                                };
                                
                                const viewFullButton = document.createElement('button');
                                viewFullButton.textContent = '👁️ Показать полный план';
                                viewFullButton.className = 'copy-plan-button';
                                viewFullButton.style.marginLeft = '10px';
                                viewFullButton.onclick = () => {
                                    window.showFullPlanModal(processedAgent2Response.content);
                                };
                                
                                buttonContainer.appendChild(copyButton);
                                buttonContainer.appendChild(viewFullButton);
                                
                                const chatMessages = document.getElementById('chat-messages');
                                chatMessages.appendChild(buttonContainer);
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                            }
                        }
                        
                        updateSendButtonState(false, 'Send');
                    })
                    .catch(error => {
                        agent2LoadingMessage.remove();
                        window.addMessage('Ошибка при получении ответа от Agent2.', false, false, 'System', 'requirements');
                        updateSendButtonState(false, 'Send');
                    });
                }, 1000);
            }
            
            if (processedResponse.type === 'execution_complete') {
                window.addMessage(processedResponse.message, false, false, 'System', 'requirements');
            }
        } else {
            window.addMessage('Empty response received', false, false, agentType, 'requirements');
        }
        
        updateSendButtonState(false, 'Send');
    })
    .catch(error => {
        loadingMessage.remove();
        window.addMessage('An error occurred while getting the response.', false, false, agentType, 'requirements');
        updateSendButtonState(false, 'Send');
    });
}

function initRequirementsModule() {
    agent1 = new RequirementsAgent();
    agent2 = new ExecutionAgent();
    currentAgent = agent1;
    
    const sendButton = document.getElementById('send-button');
    const questionInput = document.getElementById('question-input');
    const formatButtons = document.querySelectorAll('.format-button');
    
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    if (questionInput) {
        questionInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    formatButtons.forEach(button => {
        button.addEventListener('click', function() {
            formatButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

window.initRequirementsModule = initRequirementsModule;
window.sendMessage = sendMessage;
