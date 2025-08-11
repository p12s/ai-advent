document.addEventListener('DOMContentLoaded', function() {
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
});

function getSelectedFormat() {
    const activeButton = document.querySelector('.format-button.active');
    return activeButton ? activeButton.getAttribute('data-format') : 'plain';
}

function getFormatPrompt(format) {
    const basePrompt = "You are a helpful assistant. Always respond in Russian, except when you need to show code or technical terms.";
    
    const formatTemplates = {
        json: `${basePrompt} 

IMPORTANT: You must respond ONLY in the following JSON format:
{
  "response": "your actual answer to the user's question",
  "time": "current time when you generate this response",
  "sources": ["list of sources if applicable, otherwise empty array"],
  "confidence": 0.95
}

User question: `,
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
</response>

User question: `,
        plain: `${basePrompt} User question: `
    };
    
    return formatTemplates[format] || formatTemplates.plain;
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

function addMessage(content, isUser = false, isLoading = false) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    const messageClass = isLoading ? 'loading' : (isUser ? 'message user-message' : 'message bot-message');
    
    messageDiv.className = messageClass;
    messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
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
    const formatPrompt = getFormatPrompt(selectedFormat);
    
    updateSendButtonState(true, 'Sending...');
    
    addMessage(question, true);
    document.getElementById('question-input').value = '';
    
    const loadingMessage = addMessage('Getting response...', false, true);
    
    fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama3',
            prompt: `${formatPrompt}${question}`,
            temperature: 0.7,
            max_tokens: 1000,
            stream: false
        })
    })
    .then(response => response.json())
    .then(data => {
        loadingMessage.remove();
        
        if (data.response) {
            const userFriendlyResponse = extractResponseFromFormattedData(data.response, selectedFormat);
            addMessage(userFriendlyResponse, false);
        } else {
            addMessage('Empty response received', false);
        }
        
        updateSendButtonState(false, 'Send');
    })
    .catch(error => {
        loadingMessage.remove();
        addMessage('An error occurred while getting the response.', false);
        updateSendButtonState(false, 'Send');
    });
}
