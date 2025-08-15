const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let bot = null;
let chatId = null;

app.post('/mcp/telegram/init', async (req, res) => {
    try {
        const { token, chat_id } = req.body;
        
        if (!token || !chat_id) {
            return res.json({ success: false, error: 'Token and chat_id are required' });
        }
        
        bot = new Telegraf(token);
        chatId = chat_id;
        
        await bot.telegram.sendMessage(chatId, '🤖 MCP Telegram сервер подключен и готов к работе!');
        
        res.json({ success: true, message: 'Telegram bot initialized successfully' });
    } catch (error) {
        console.error('Error initializing bot:', error);
        res.json({ success: false, error: error.message });
    }
});

app.post('/mcp/telegram/send-dialog-start', async (req, res) => {
    try {
        const { chat_id } = req.body;
        const targetChatId = chat_id || chatId;
        
        if (!bot || !targetChatId) {
            return res.json({ success: false, error: 'Bot not initialized or chat ID not provided' });
        }
        
        const startMessage = `🚀 Начинаем опрос для сбора требований к приложения!`;
        
        await bot.telegram.sendMessage(targetChatId, startMessage);
        res.json({ success: true, message: 'Dialog start message sent successfully' });
    } catch (error) {
        console.error('Error sending dialog start message:', error);
        res.json({ success: false, error: error.message });
    }
});

app.post('/mcp/telegram/send-plan', async (req, res) => {
    try {
        const { plan_content, chat_id } = req.body;
        const targetChatId = chat_id || chatId;
        
        if (!bot || !targetChatId) {
            return res.json({ success: false, error: 'Bot not initialized or chat ID not provided' });
        }
        
        const planMessage = `📋 ИТОГОВЫЙ ПЛАН РАЗРАБОТКИ\n\n${plan_content}\n\n✅ План готов к реализации!`;
        
        const maxLength = 4096;
        if (planMessage.length > maxLength) {
            const parts = splitMessage(planMessage, maxLength);
            for (let i = 0; i < parts.length; i++) {
                await bot.telegram.sendMessage(targetChatId, parts[i]);
                if (i < parts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } else {
            await bot.telegram.sendMessage(targetChatId, planMessage);
        }
        
        res.json({ success: true, message: 'Plan sent successfully' });
    } catch (error) {
        console.error('Error sending plan:', error);
        res.json({ success: false, error: error.message });
    }
});

app.post('/mcp/telegram/send-message', async (req, res) => {
    try {
        const { text, chat_id } = req.body;
        const targetChatId = chat_id || chatId;
        
        if (!bot || !targetChatId) {
            return res.json({ success: false, error: 'Bot not initialized or chat ID not provided' });
        }
        
        await bot.telegram.sendMessage(targetChatId, text);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.json({ success: false, error: error.message });
    }
});

function splitMessage(message, maxLength) {
    const parts = [];
    let currentPart = '';
    const lines = message.split('\n');
    
    for (const line of lines) {
        if ((currentPart + line + '\n').length > maxLength) {
            if (currentPart) {
                parts.push(currentPart.trim());
                currentPart = line + '\n';
            } else {
                const words = line.split(' ');
                for (const word of words) {
                    if ((currentPart + word + ' ').length > maxLength) {
                        parts.push(currentPart.trim());
                        currentPart = word + ' ';
                    } else {
                        currentPart += word + ' ';
                    }
                }
                currentPart += '\n';
            }
        } else {
            currentPart += line + '\n';
        }
    }
    
    if (currentPart.trim()) {
        parts.push(currentPart.trim());
    }
    
    return parts;
}

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        bot_initialized: bot !== null,
        chat_id_set: chatId !== null 
    });
});

app.listen(PORT, () => {
    console.log(`MCP HTTP server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
