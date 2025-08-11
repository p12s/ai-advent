# Chatbot

- Connect any LLM to your project
- Create chat-like communication within your LLM

Result: You write a message - it responds
Format: Code + Video

## Launch
```
cd ~/ai-advent/01 && npx http-server -p 8080 --cors
open http://localhost:8080
```

## Video
https://disk.yandex.com/i/6d-m9BD9EA76XQ

## Features

- 💬 Modern chat interface in messenger style
- 🤖 Integration with Ollama for local AI
- 📱 Responsive design
- ⚡ Fast responses without streaming
- 🎨 Beautiful UI with message bubbles

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
ollama pull llama3:latest
```

4. Start the web server:
```bash
npx http-server -p 8080 --cors
```

5. Open your browser and go to `http://localhost:8080`

## Usage

1. Enter your question in the input field
2. Click the "Send" button or press Enter
3. Wait for the AI response

## Project Structure

```
ai-advent/01/
├── index.html      # Main HTML page
├── styles.css      # CSS styles
├── app.js          # JavaScript logic
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
    prompt: '...',
    temperature: 0.7,    // Creativity (0.0 - 1.0)
    max_tokens: 1000,    // Maximum response length
    stream: false        // Response streaming
}
```

## License

MIT License

## Contributing

Pull requests and issues are welcome!
