document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.getElementById('send-button');
    const questionInput = document.getElementById('question-input');
    
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
});

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

function sendMessage() {
    const question = document.getElementById('question-input').value;
    
    if (!question.trim()) {
        return;
    }
    
    const sendButton = document.getElementById('send-button');
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
    
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
            prompt: `You are a helpful assistant. Always respond in English, except when you need to show code or technical terms. User question: ${question}`,
            temperature: 0.7,
            max_tokens: 1000,
            stream: false
        })
    })
    .then(response => response.json())
    .then(data => {
        loadingMessage.remove();
        
        if (data.response) {
            addMessage(data.response, false);
        } else {
            addMessage('Empty response received', false);
        }
        
        sendButton.disabled = false;
        sendButton.textContent = 'Send';
    })
    .catch(error => {
        loadingMessage.remove();
        addMessage('An error occurred while getting the response.', false);
        sendButton.disabled = false;
        sendButton.textContent = 'Send';
    });
}
