const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { Telegraf } = require('telegraf');

class TelegramMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'telegram-mcp-server',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );
        
        this.bot = null;
        this.chatId = null;
        
        this.setupTools();
    }
    
    setupTools() {
        this.server.setRequestHandler('tools/call', async (request) => {
            const { name, arguments: args } = request.params;
            
            switch (name) {
                case 'send_message':
                    return await this.sendMessage(args.text, args.chat_id);
                case 'send_plan':
                    return await this.sendPlan(args.plan_content, args.chat_id);
                case 'init_bot':
                    return await this.initBot(args.token, args.chat_id);
                case 'send_dialog_start':
                    return await this.sendDialogStart(args.chat_id);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }
    
    async initBot(token, chatId) {
        try {
            this.bot = new Telegraf(token);
            this.chatId = chatId;
            return { success: true, message: 'Telegram bot initialized' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async sendMessage(text, chatId = null) {
        try {
            const targetChatId = chatId || this.chatId;
            if (!this.bot || !targetChatId) {
                throw new Error('Bot not initialized or chat ID not provided');
            }
            
            await this.bot.telegram.sendMessage(targetChatId, text);
            return { success: true, message: 'Message sent successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async sendDialogStart(chatId = null) {
        try {
            const targetChatId = chatId || this.chatId;
            if (!this.bot || !targetChatId) {
                throw new Error('Bot not initialized or chat ID not provided');
            }
            
            const startMessage = `🚀 Начинаем опрос для сбора требований к приложения!`;
            
            await this.bot.telegram.sendMessage(targetChatId, startMessage);
            return { success: true, message: 'Dialog start message sent successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async sendPlan(planContent, chatId = null) {
        try {
            const targetChatId = chatId || this.chatId;
            if (!this.bot || !targetChatId) {
                throw new Error('Bot not initialized or chat ID not provided');
            }
            
            const planMessage = `📋 ИТОГОВЫЙ ПЛАН РАЗРАБОТКИ\n\n${planContent}\n\n✅ План готов к реализации!`;
            
            const maxLength = 4096;
            if (planMessage.length > maxLength) {
                const parts = this.splitMessage(planMessage, maxLength);
                for (let i = 0; i < parts.length; i++) {
                    await this.bot.telegram.sendMessage(targetChatId, parts[i]);
                    if (i < parts.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } else {
                await this.bot.telegram.sendMessage(targetChatId, planMessage);
            }
            
            return { success: true, message: 'Plan sent successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    splitMessage(message, maxLength) {
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
    
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('MCP Telegram server running...');
    }
}

const server = new TelegramMCPServer();
server.run().catch(console.error);
