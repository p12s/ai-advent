let currentActiveAgent = 'Agent1';
let telegramConfig = {
    botToken: '',
    chatId: ''
};

function addMessage(content, isUser = false, isLoading = false, agentType = null, tabName = 'requirements') {
    const containerId = tabName === 'github' ? 'github-messages' : 'chat-messages';
    const messagesContainer = document.getElementById(containerId);
    if (!messagesContainer) {
        console.error(`Messages container not found: ${containerId}`);
        return null;
    }
    
    const messageDiv = document.createElement('div');
    
    let messageClass = isLoading ? 'loading' : (isUser ? 'message user-message' : 'message bot-message');
    
    if (agentType === 'System') {
        messageClass = 'message system-message';
    }
    
    messageDiv.className = messageClass;
    
    let agentLabel = '';
    if (agentType && !isUser && agentType !== 'System') {
        agentLabel = `<div class="agent-label">${agentType}</div>`;
    }
    
    messageDiv.innerHTML = `
        ${agentLabel}
        <div class="message-content">${content}</div>
    `;
    
    if (agentType && agentType !== 'System') {
        messageDiv.setAttribute('data-agent', agentType);
    }
    
    messagesContainer.appendChild(messageDiv);
    
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
    
    return messageDiv;
}

function showFullPlanModal(content, title = 'Полный план выполнения проекта') {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <pre class="plan-content">${content}</pre>
            </div>
            <div class="modal-footer">
                <button class="copy-plan-button" onclick="navigator.clipboard.writeText('${content.replace(/'/g, "\\'")}').then(() => this.textContent = '✅ Скопировано!')">
                    📋 Копировать
                </button>
                <button class="modal-close-button" onclick="this.closest('.modal-overlay').remove()">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function loadConfig() {
    try {
        const response = await fetch('./config.json');
        const config = await response.json();
        telegramConfig.botToken = config.telegram.botToken;
        telegramConfig.chatId = config.telegram.chatId;
        
        if (window.githubConfig) {
            window.githubConfig.url = config.github.url;
            window.githubConfig.token = config.github.token;
        }
        
        if (window.autoUpdateConfig && config.autoUpdate) {
            window.autoUpdateConfig.enabled = config.autoUpdate.enabled;
            window.autoUpdateConfig.intervalMinutes = config.autoUpdate.intervalMinutes;
            window.autoUpdateConfig.startMinute = config.autoUpdate.startMinute;
        }
        

    } catch (error) {
        console.error('Failed to load configuration:', error);

    }
}

async function initMCPTelegram() {
    try {
        const response = await fetch('http://localhost:3000/mcp/telegram/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: telegramConfig.botToken,
                chat_id: telegramConfig.chatId
            })
        });
        
        const result = await response.json();
        if (result.success) {
    
        } else {
            console.error('Failed to initialize Telegram MCP:', result.error);
        }
    } catch (error) {
        console.error('Error initializing Telegram MCP:', error);
    }
}

async function sendDialogStartToTelegram() {
    try {
        const response = await fetch('http://localhost:3000/mcp/telegram/send-dialog-start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: telegramConfig.chatId
            })
        });
        
        const result = await response.json();
        if (result.success) {
    
        } else {
            console.error('Failed to send dialog start message:', result.error);
        }
    } catch (error) {
        console.error('Error sending dialog start message:', error);
    }
}

async function sendPlanToTelegram(planContent) {
    try {
        const response = await fetch('http://localhost:3000/mcp/telegram/send-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan_content: planContent,
                chat_id: telegramConfig.chatId
            })
        });
        
        const result = await response.json();
        if (result.success) {
    
        } else {
            console.error('Failed to send plan to Telegram:', result.error);
        }
    } catch (error) {
        console.error('Error sending plan to Telegram:', error);
    }
}

async function sendGitHubReportToTelegram(reportContent) {
    try {
        const response = await fetch('http://localhost:3000/mcp/telegram/send-github-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                report_content: reportContent,
                chat_id: telegramConfig.chatId
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('GitHub report sent to Telegram successfully');
        } else {
            console.error('Failed to send GitHub report to Telegram:', result.error);
        }
    } catch (error) {
        console.error('Error sending GitHub report to Telegram:', error);
    }
}

function switchTab(tabName) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    
    tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-tab') === tabName) {
            button.classList.add('active');
        }
    });
    
    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabName + '-tab') {
            content.classList.add('active');
        }
    });
    
    if (tabName === 'requirements') {
        currentActiveAgent = 'Agent1';
        pageTitle.textContent = 'Сбор требований';
    } else if (tabName === 'github') {
        currentActiveAgent = 'Agent3';
        pageTitle.textContent = 'GitHub анализ';
    } else if (tabName === 'testing') {
        currentActiveAgent = 'Agent4';
        pageTitle.textContent = 'Тестирование кода';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    loadConfig().then(() => {
        initMCPTelegram();
        if (window.initMCPGithub) {
            window.initMCPGithub();
        }
        if (window.initRequirementsModule) {
            window.initRequirementsModule();
        }
        if (window.initGitHubModule) {
            window.initGitHubModule();
        }
        if (window.initTestAgentModule) {
            window.initTestAgentModule();
        }
        if (window.initTestAgent) {
            window.initTestAgent();
        }
    });
});

window.sendDialogStartToTelegram = sendDialogStartToTelegram;
window.sendPlanToTelegram = sendPlanToTelegram;
window.sendGitHubReportToTelegram = sendGitHubReportToTelegram;
window.addMessage = addMessage;
window.showFullPlanModal = showFullPlanModal;
