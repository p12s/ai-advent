# Interaction of agents

- Learn to create multi-agent systems with interaction
- Set agent behavior for requirements gathering and execution planning
- Provide structured output format with agent collaboration

Result: Two-agent system where second agent validates and processes first agent's results
Format: Code + Video

## Launch
```
cd ~/ai-advent/04 && npx http-server -p 8080 --cors
open http://localhost:8080
```

## Video
https://disk.yandex.com/i/yV-BvBDzxdD_oQ

## Features

- 🤖 **Multi-Agent System**: Two specialized agents working together
- 💬 **Agent1 - Requirements Collector**: Gathers detailed application requirements
- 📋 **Agent2 - Execution Planner**: Creates development plans based on requirements
- 🔄 **Automatic Interaction**: Seamless handoff between agents
- 📊 **Real-time Status**: Visual indicators for each agent's progress
- 🎨 **Agent-Specific Styling**: Different colors for each agent (Green/Orange)
- 📱 **Responsive Design**: Works on all devices
- ⚡ **Fast Responses**: Non-streaming for immediate feedback
- 🔄 **Multiple Response Formats**: PLAIN, JSON, XML support
- 📋 **Plan Export**: Copy and view full execution plans
- 🎯 **Context Awareness**: Full conversation history between agents

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
cd 04
npx http-server -p 8080 --cors
```

5. Open your browser and go to `http://localhost:8080`

## Usage

1. **Select Response Format**: Choose PLAIN, JSON, or XML using format buttons
2. **Describe Your Idea**: Enter your application concept in the input field
3. **Agent1 Questions**: Answer targeted questions about your application
4. **Automatic Handoff**: Agent2 automatically receives requirements and creates plan
5. **Review Results**: Get comprehensive development plan with architecture and timeline

## How it works

### Agent1 - Requirements Collection
1. **Initial Analysis**: Analyzes user's application description
2. **Targeted Questions**: Asks specific questions about:
   - Application type (web, mobile, desktop)
   - Target audience and user personas
   - Core functionality and features
   - Platform requirements (iOS, Android, Web, Desktop)
   - Technology preferences
   - Project goals and constraints
3. **Smart Context**: Avoids duplicate questions, tracks collected information
4. **Document Generation**: Creates comprehensive requirements document

### Agent2 - Execution Planning
1. **Requirements Analysis**: Reviews Agent1's collected requirements
2. **Plan Creation**: Generates detailed development plan including:
   - Application architecture
   - Technology stack recommendations
   - Development phases and timeline
   - Resource requirements
   - Risk assessment and mitigation
3. **Structured Output**: Delivers organized execution plan

## Output Format

### Agent1 Output
Markdown document with sections:
- **Introduction**: Project overview and purpose
- **Goals**: Main objectives and success criteria
- **Functionality**: Core features and user stories
- **Target Audience**: User personas and demographics
- **Technologies**: Recommended tech stack
- **Constraints**: Limitations and requirements

### Agent2 Output
Comprehensive development plan with:
- **Architecture**: System design and structure
- **Technology Stack**: Detailed technology recommendations
- **Development Phases**: Step-by-step implementation plan
- **Timeline**: Estimated timeframes for each phase
- **Resources**: Required team members and skills
- **Risks**: Potential challenges and solutions

## Response Formats

### PLAIN Format
- Natural conversation flow
- Direct questions and answers
- Context-aware responses

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
ai-advent/04/
├── index.html      # Main HTML page with agent status panel
├── style.css       # CSS styles with agent-specific styling
├── app.js          # JavaScript logic with multi-agent system
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
    temperature: 0.8,    // Creativity (0.0 - 1.0)
    max_tokens: 10000,   // Maximum response length
    stream: false        // Response streaming
}
```

### Agent Behavior Customization

#### Agent1 (RequirementsAgent)
Customize requirements collection in the `getSystemPrompt()` method:

```javascript
const requirementsPrompt = `Ты — Agent1, агент по сбору требований для создания приложения.
ОБЯЗАТЕЛЬНО: ВСЕГДА ОТВЕЧАЙ ТОЛЬКО НА РУССКОМ ЯЗЫКЕ!
Задача — задать вопросы пользователю...
История нашего диалога: ${history}`;
```

#### Agent2 (ExecutionAgent)
Customize execution planning in the `getSystemPrompt()` method:

```javascript
const executionPrompt = `Ты — Agent2, агент-исполнитель задач.
ОБЯЗАТЕЛЬНО: ВСЕГДА ОТВЕЧАЙ ТОЛЬКО НА РУССКОМ ЯЗЫКЕ!
Твоя задача — проанализировать требования...
ТРЕБОВАНИЯ ОТ AGENT1: ${requirementsText}`;
```

### Adding New Formats

To add a new response format:

1. Add format button to `index.html`:
```html
<button class="format-button" data-format="yaml">YAML</button>
```

2. Add format template to both agents' `getSystemPrompt()` methods:
```javascript
yaml: `${basePrompt} IMPORTANT: Respond in YAML format...`
```

3. Add parser to `extractResponseFromFormattedData()` function:
```javascript
yaml: (data) => { /* YAML parsing logic */ }
```

## Technical Details

### Multi-Agent Architecture
- **RequirementsAgent**: Handles requirements collection with smart context tracking
- **ExecutionAgent**: Processes requirements and creates execution plans
- **Automatic Handoff**: Seamless transition between agents
- **Status Tracking**: Real-time progress indicators for both agents

### Agent Interaction Flow
1. User describes application idea
2. Agent1 asks targeted questions and tracks responses
3. Agent1 generates requirements document when complete
4. System automatically triggers Agent2
5. Agent2 analyzes requirements and creates execution plan
6. User receives comprehensive development roadmap

### Response Processing
- User sees only the `response` field content
- Technical fields (`time`, `sources`, `confidence`) are hidden
- Full response available in browser console (Network tab)
- Agent-specific styling (Green for Agent1, Orange for Agent2)

### Format Validation
- JSON responses are validated before display
- XML responses use regex parsing for `response_text` extraction
- Fallback to raw response if parsing fails
- Consistent parsing across both agents

### Plan Export Features
- **Copy to Clipboard**: One-click copying of full execution plan
- **Modal View**: Full-screen view of complete plan
- **Formatted Display**: Proper formatting for easy reading
- **Export Options**: Multiple ways to access plan content

## License

MIT License

## Contributing

Pull requests and issues are welcome!

