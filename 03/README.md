# Requirements Gathering Chatbot

A specialized chatbot that collects requirements for application development through conversation.

- Learn to set conversation context and history tracking
- Set agent behavior for requirements gathering
- Provide structured output format

Result: AI agent collects requirements and generates technical specification
Format: Code + Video

## Launch
```
cd ~/ai-advent/03 && npx http-server -p 8080 --cors
open http://localhost:8080
```

## Video
https://disk.yandex.com/i/klA-7lZUkNFivw

## Features

- 💬 Modern chat interface in messenger style
- 🤖 Integration with Ollama for local AI
- 📝 Requirements gathering through natural conversation
- 📋 Automatic generation of technical specification document
- 🔄 Conversation history tracking for context awareness
- 📱 Responsive design
- ⚡ Fast responses without streaming
- 🎨 Beautiful UI with message bubbles
- 🔄 Multiple response formats (PLAIN, JSON, XML)
- 📊 Structured data extraction
- 🎯 User-friendly response display

## Requirements

- [Ollama](https://ollama.ai/) installed and running
- `llama3` model loaded in Ollama

## Installation

1. Clone the repository:
```bash
git clone https://github.com/p12s/ai-advent
cd ai-advent
```

2. Start Ollama (if not already running):
```bash
ollama serve
```

3. Make sure the llama3 model is loaded:
```bash
ollama pull phi4:14b
```

4. Start the web server:
```bash
cd 03
npx http-server -p 8080 --cors
```

5. Open your browser and go to `http://localhost:8080`

## Usage

1. Select response format using format buttons (PLAIN, JSON, XML)
2. Describe your application idea in the input field
3. Click the "Send" button or press Enter
4. Chatbot will ask targeted questions to gather requirements
5. Continue the conversation until all requirements are collected
6. Receive final technical specification document in Markdown format

## How it works

1. **Initial Description**: User describes their application idea
2. **Targeted Questions**: Chatbot asks questions to understand:
   - Application type and purpose
   - Target audience and user personas
   - Core functionality and features
   - Platform requirements (web, mobile, desktop)
   - Technical specifications and constraints
3. **Context Awareness**: Each response includes full conversation history
4. **Document Generation**: Based on collected information, generates comprehensive requirements document

## Output Format

The chatbot generates a Markdown document with sections:
- **Introduction**: Project overview and purpose
- **Goals**: Main objectives and success criteria
- **Functionality**: Core features and user stories
- **Target Audience**: User personas and demographics
- **Technologies**: Recommended tech stack and platforms

## Response Formats

### PLAIN Format
- Requirements gathering conversation
- Natural language responses
- Context-aware questions and answers

### JSON Format
```json
{
  "response": "your actual answer to the user's question",
  "time": "current time when you generate this response",
  "sources": ["list of sources if applicable, otherwise empty array"],
  "confidence": 0.95
}
```

### XML Format
```xml
<response>
  <response_text>your actual answer to the user's question</response_text>
  <time>current time when you generate this response</time>
  <sources>
    <source>source 1 if applicable</source>
    <source>source 2 if applicable</source>
  </sources>
  <confidence>0.95</confidence>
</response>
```

## Project Structure

```
ai-advent/03/
├── index.html      # Main HTML page with requirements gathering interface
├── style.css       # CSS styles with chat interface styling
├── app.js          # JavaScript logic with conversation history tracking
└── README.md       # Documentation
```

## Configuration

### Changing the Model

In the `app.js` file, change the `model` parameter in the request:

```javascript
model: 'llama3' // Replace with another model
```

### Parameter Settings

You can change generation parameters in `app.js`:

```javascript
{
    model: 'llama3',
    system: systemPrompt,
    prompt: question,
    temperature: 0.7,    // Creativity (0.0 - 1.0)
    max_tokens: 1000,    // Maximum response length
    stream: false        // Response streaming
}
```

### System Prompt Customization

The system prompt can be customized in the `getSystemPrompt()` function:

```javascript
const requirementsPrompt = `Ты — агент, который собирает требования для создания приложения.
ОБЯЗАТЕЛЬНО: ВСЕГДА ОТВЕЧАЙ ТОЛЬКО НА РУССКОМ ЯЗЫКЕ!
Задача — задать вопросы пользователю...
История нашего диалога: ${history}`;
```

### Adding New Formats

To add a new response format:

1. Add format button to `index.html`:
```html
<button class="format-button" data-format="yaml">YAML</button>
```

2. Add format template to `getSystemPrompt()` function:
```javascript
yaml: `${basePrompt} IMPORTANT: Respond in YAML format...`
```

3. Add parser to `extractResponseFromFormattedData()` function:
```javascript
yaml: (data) => { /* YAML parsing logic */ }
```

## Technical Details

### Conversation History Tracking
- All messages are stored in `conversationHistory` array
- Each message includes `role` (user/assistant) and `content`
- History is formatted and included in every system prompt
- Context awareness ensures coherent conversation flow

### Response Processing
- User sees only the `response` field content
- Technical fields (`time`, `sources`, `confidence`) are hidden
- Full response available in browser console (Network tab)

### Format Validation
- JSON responses are validated before display
- XML responses use regex parsing for `response_text` extraction
- Fallback to raw response if parsing fails

### Requirements Document Generation
- Chatbot determines when all requirements are collected
- Automatically generates Markdown document with structured sections
- Document includes all gathered information in organized format

## License

MIT License

## Contributing

Pull requests and issues are welcome!

