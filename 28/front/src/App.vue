<template>
  <div class="app">
    <div class="container">
      <!-- Left panel - Chat input -->
      <div class="chat-panel">
        <div class="chat-header">
          <h2>Чат</h2>
        </div>
        <div class="chat-messages">
          <div v-for="message in messages" :key="message.id" class="message" :class="message.type">
            <div class="message-content" v-if="message.isImage" v-html="message.text"></div>
            <div class="message-content" v-else>{{ message.text }}</div>
            <div class="message-time">{{ message.time }}</div>
          </div>
        </div>
        <div class="chat-input">
          <div class="input-container">
            <textarea 
              v-model="currentMessage" 
              @keydown.enter.prevent="sendMessage"
              placeholder="Введите сообщение или нажмите на микрофон для голосового ввода..."
              rows="3"
            ></textarea>
            <button 
              @click="toggleVoiceInput" 
              :class="['voice-btn', { 'recording': isRecording, 'error': voiceError }]"
              :title="voiceError ? 'Голосовой ввод недоступен' : (isRecording ? 'Остановить запись' : 'Начать голосовой ввод')"
              :disabled="voiceError"
            >
              <span v-if="!isRecording" style="font-size: 18px;">🎤</span>
              <span v-else style="font-size: 18px;">⏹️</span>
            </button>
            <button 
              @click="toggleSpeech" 
              :class="['speech-btn', { 'enabled': speechEnabled }]"
              :title="speechEnabled ? 'Отключить озвучивание ответов' : 'Включить озвучивание ответов'"
            >
              <span v-if="speechEnabled" style="font-size: 18px;">🔊</span>
              <span v-else style="font-size: 18px;">🔇</span>
            </button>
          </div>
          <div class="button-group">
            <button @click="sendMessage" :disabled="!currentMessage.trim()">
              Отправить
            </button>
            <button @click="generateSite" class="generate-btn">
              Сгенерировать
            </button>
          </div>
          <div class="button-group">
            <button @click="improvePrompt" class="improve-btn">
              Улучшить промпт
            </button>
            <button @click="generateImage" class="image-btn">
              Генерация картинки
            </button>
          </div>
          <div class="button-group">
            <button @click="analyzeProject" class="analyze-btn">
              Анализировать проект
            </button>
          </div>
        </div>
      </div>

      <!-- Right panel - Website preview -->
      <div class="preview-panel">
        <div class="preview-header">
          <h2>Предварительный просмотр</h2>
          <div class="url-bar">
            <input v-model="previewUrl" placeholder="https://example.com" readonly />
            <button @click="publishSite" class="publish-btn" :disabled="!previewUrl">
              Опубликовать
            </button>
          </div>
        </div>
        <div class="preview-content">
          <div v-if="isLoading" class="loader-container">
            <div class="loader"></div>
            <p class="loader-text">Обрабатываю запрос...</p>
          </div>
          <iframe 
            v-else-if="previewUrl && !generatedImage" 
            :src="previewUrl" 
            frameborder="0"
            class="preview-iframe"
          ></iframe>
          <div v-else-if="generatedImage" class="image-preview">
            <img :src="generatedImage" alt="Generated image" class="preview-image" />
            <div class="image-info">
              <p>Сгенерированное изображение</p>
            </div>
          </div>
          <div v-else class="preview-placeholder">
            <p>Здесь будет отображаться сгенерированный сайт или изображение</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Analysis Result Dialog -->
    <div v-if="showAnalysisDialog" class="dialog-overlay" @click="closeAnalysisDialog">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3>Результат анализа проекта</h3>
          <button @click="closeAnalysisDialog" class="close-btn">×</button>
        </div>
        <div class="dialog-body">
          <div v-if="analysisLoading" class="analysis-loader">
            <div class="loader"></div>
            <p>Анализирую проект...</p>
          </div>
          <div v-else-if="analysisResult" class="analysis-result">
            <pre>{{ analysisResult }}</pre>
          </div>
          <div v-else-if="analysisError" class="analysis-error">
            <p>Ошибка: {{ analysisError }}</p>
          </div>
        </div>
        <div class="dialog-footer">
          <button @click="closeAnalysisDialog" class="dialog-btn">Закрыть</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'

export default {
  name: 'App',
  setup() {
    const currentMessage = ref('')
    const previewUrl = ref('')
    const generatedImage = ref('')
    const isLoading = ref(false)
    const isRecording = ref(false)
    const voiceError = ref(false)
    const recognition = ref(null)
    const speechEnabled = ref(true)
    const speechSynthesis = ref(null)
    const showAnalysisDialog = ref(false)
    const analysisLoading = ref(false)
    const analysisResult = ref('')
    const analysisError = ref('')
    const messages = reactive([
      {
        id: 1,
        text: 'Добро пожаловать! Опишите какой сайт вы хотите создать.',
        type: 'system',
        time: new Date().toLocaleTimeString()
      }
    ])

    const sendMessage = async () => {
      if (!currentMessage.value.trim()) return

      const userMessage = currentMessage.value
      
      // Add user message
      messages.push({
        id: Date.now(),
        text: userMessage,
        type: 'user',
        time: new Date().toLocaleTimeString()
      })

      // Clear input
      currentMessage.value = ''

      // Show loader
      isLoading.value = true

      try {
        // Send POST request to backend
        const response = await fetch('http://localhost:8080/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            user_id: 'frontend-user'
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Add bot response
        const botMessage = `${data.message || JSON.stringify(data)}`
        messages.push({
          id: Date.now() + 2,
          text: botMessage,
          type: 'bot',
          time: new Date().toLocaleTimeString()
        })
        
        // Speak the bot response
        speakText(botMessage, 'bot')

      } catch (error) {
        console.error('Error sending message:', error)

        // Add error message
        messages.push({
          id: Date.now() + 3,
          text: `Ошибка соединения с сервером: ${error.message}`,
          type: 'system',
          time: new Date().toLocaleTimeString()
        })
      } finally {
        // Hide loader
        isLoading.value = false
      }
    }

    const generateSite = async () => {
      // Show loader
      isLoading.value = true

      try {
        // Send POST request to /build endpoint
        const response = await fetch('http://localhost:8080/build', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Тип сайта: персональная страница  Целевая аудитория: друзья и семья. Красочный яркий сайт с блоками обозначенными цветами. не используй картинки, дизайн обознач цветами',
            user_id: 'frontend-user'
          })
        })

        // Handle 429 Too Many Requests specifically
        if (response.status === 429) {
          const rateLimitMessage = 'По вашему тарифному плану достигнут лимит. Попробуйте завтра'
          messages.push({
            id: Date.now() + 2,
            text: rateLimitMessage,
            type: 'system',
            time: new Date().toLocaleTimeString()
          })
          
          // Speak the rate limit message
          speakText(rateLimitMessage, 'system')
          return
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Add success message
        const successMessage = 'Сайт успешно сгенерирован!'
        messages.push({
          id: Date.now() + 2,
          text: successMessage,
          type: 'bot',
          time: new Date().toLocaleTimeString()
        })
        
        // Speak the success message
        speakText(successMessage, 'bot')

        // Update preview URL with the generated file
        if (data.file) {
          previewUrl.value = `http://localhost:8080/result/${data.file}`
        } else if (data.filename) {
          previewUrl.value = `http://localhost:8080/result/${data.filename}`
        } else if (data.url) {
          previewUrl.value = data.url
        }
        
        // Clear generated image when showing website
        generatedImage.value = ''

      } catch (error) {
        console.error('Error generating site:', error)

        // Check if it's a 429 error and show user-friendly message
        let errorMessage = `Ошибка генерации сайта: ${error.message}`
        if (error.message.includes('429')) {
          errorMessage = 'Вы израсходовали дневной лимит, попробуйте завтра'
        }

        // Add error message
        messages.push({
          id: Date.now() + 3,
          text: errorMessage,
          type: 'system',
          time: new Date().toLocaleTimeString()
        })
      } finally {
        // Hide loader
        isLoading.value = false
      }
    }

    const publishSite = async () => {
      if (!previewUrl.value) return

      // Extract filename from URL
      const urlParts = previewUrl.value.split('/')
      const filename = urlParts[urlParts.length - 1]

      // Add processing message
      const processingId = Date.now() + 1
      messages.push({
        id: processingId,
        text: 'Отправляю запрос на публикацию...',
        type: 'system',
        time: new Date().toLocaleTimeString()
      })

      try {
        // Send POST request to /publish endpoint
        const response = await fetch('http://localhost:8080/publish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: filename,
            user_id: 'frontend-user'
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Remove processing message
        const processingIndex = messages.findIndex(msg => msg.id === processingId)
        if (processingIndex !== -1) {
          messages.splice(processingIndex, 1)
        }

        // Add success message
        const publishMessage = `Сайт успешно опубликован! URL: ${data.url || data.published_url || 'URL не предоставлен'}`
        messages.push({
          id: Date.now() + 2,
          text: publishMessage,
          type: 'bot',
          time: new Date().toLocaleTimeString()
        })
        
        // Speak the publish success message
        speakText(publishMessage, 'bot')

      } catch (error) {
        console.error('Error publishing site:', error)
        
        // Remove processing message
        const processingIndex = messages.findIndex(msg => msg.id === processingId)
        if (processingIndex !== -1) {
          messages.splice(processingIndex, 1)
        }

        // Add error message
        messages.push({
          id: Date.now() + 3,
          text: `Ошибка публикации сайта: ${error.message}`,
          type: 'system',
          time: new Date().toLocaleTimeString()
        })
      }
    }

    const improvePrompt = async () => {
      if (!currentMessage.value.trim()) {
        messages.push({
          id: Date.now(),
          text: 'Введите промпт для улучшения',
          type: 'system',
          time: new Date().toLocaleTimeString()
        })
        return
      }

      const userPrompt = currentMessage.value
      
      // Add user message
      messages.push({
        id: Date.now(),
        text: `Улучшаю промпт: ${userPrompt}`,
        type: 'user',
        time: new Date().toLocaleTimeString()
      })

      // Show loader
      isLoading.value = true

      try {
        // Send POST request to /improve-prompt endpoint
        const response = await fetch('http://localhost:8080/improve-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: userPrompt
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Add improved prompt to chat and update input
        const improvedPrompt = data.prompt
        if (improvedPrompt) {
          const improveMessage = `Улучшенный промпт: ${improvedPrompt}`
          messages.push({
            id: Date.now() + 2,
            text: improveMessage,
            type: 'bot',
            time: new Date().toLocaleTimeString()
          })
          
          // Speak the improved prompt
          speakText(improveMessage, 'bot')

          // Update input field with improved prompt
          currentMessage.value = improvedPrompt
        } else {
          const errorMessage = 'Получен ответ от сервера, но улучшенный промпт не найден'
          messages.push({
            id: Date.now() + 2,
            text: errorMessage,
            type: 'system',
            time: new Date().toLocaleTimeString()
          })
          
          // Speak the error message
          speakText(errorMessage, 'system')
        }

      } catch (error) {
        console.error('Error improving prompt:', error)

        // Add error message
        messages.push({
          id: Date.now() + 3,
          text: `Ошибка улучшения промпта: ${error.message}`,
          type: 'system',
          time: new Date().toLocaleTimeString()
        })
      } finally {
        // Hide loader
        isLoading.value = false
      }
    }

    const generateImage = async () => {
      if (!currentMessage.value.trim()) {
        messages.push({
          id: Date.now(),
          text: 'Введите промпт для генерации изображения',
          type: 'system',
          time: new Date().toLocaleTimeString()
        })
        return
      }

      const userPrompt = currentMessage.value
      
      // Add user message
      messages.push({
        id: Date.now(),
        text: `Генерирую изображение: ${userPrompt}`,
        type: 'user',
        time: new Date().toLocaleTimeString()
      })

      // Show loader
      isLoading.value = true

      try {
        // Send POST request to /generate-image endpoint
        const response = await fetch('http://localhost:8080/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: userPrompt
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Add success message
        if (data.image) {
          const imageMessage = `Изображение сгенерировано! Параметры: ${JSON.stringify(data.parameters)}`
          messages.push({
            id: Date.now() + 2,
            text: imageMessage,
            type: 'bot',
            time: new Date().toLocaleTimeString()
          })
          
          // Speak the image generation success
          speakText(imageMessage, 'bot')

          // Display image in preview panel
          generatedImage.value = `data:image/png;base64,${data.image}`
        } else {
          const errorMessage = 'Изображение сгенерировано, но не получено'
          messages.push({
            id: Date.now() + 2,
            text: errorMessage,
            type: 'system',
            time: new Date().toLocaleTimeString()
          })
          
          // Speak the error message
          speakText(errorMessage, 'system')
        }

      } catch (error) {
        console.error('Error generating image:', error)

        // Add error message
        messages.push({
          id: Date.now() + 3,
          text: `Ошибка генерации изображения: ${error.message}`,
          type: 'system',
          time: new Date().toLocaleTimeString()
        })
      } finally {
        // Hide loader
        isLoading.value = false
      }
    }

    const analyzeProject = async () => {
      // Show dialog and start loading
      showAnalysisDialog.value = true
      analysisLoading.value = true
      analysisResult.value = ''
      analysisError.value = ''

      try {
        // Send GET request to /analyze-project endpoint
        const response = await fetch('http://localhost:8080/analyze-project', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Display only the output field from the analysis result
        if (data.success && data.output) {
          analysisResult.value = data.output
        } else if (data.error) {
          analysisError.value = data.error
        } else {
          analysisError.value = 'Неожиданный формат ответа от сервера'
        }

      } catch (error) {
        console.error('Error analyzing project:', error)
        analysisError.value = error.message
      } finally {
        analysisLoading.value = false
      }
    }

    const closeAnalysisDialog = () => {
      showAnalysisDialog.value = false
      analysisResult.value = ''
      analysisError.value = ''
    }

    const loadLatestSite = async () => {
      try {
        // Send GET request to /latest endpoint
        const response = await fetch('http://localhost:8080/latest', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // If there's a latest file, load it in preview
        if (data.file && data.file_path) {
          // Extract filename from file_path for URL construction
          const pathParts = data.file_path.split('/')
          const filename = pathParts[pathParts.length - 1]
          
          previewUrl.value = `http://localhost:8080/result/${filename}`
          
          // Add system message about loaded site
          messages.push({
            id: Date.now(),
            text: `Загружен последний сгенерированный сайт: ${data.file}`,
            type: 'system',
            time: new Date().toLocaleTimeString()
          })
        }

      } catch (error) {
        console.error('Error loading latest site:', error)
        // Don't show error to user on page load, just log it
      }
    }

    const initSpeechRecognition = () => {
      // Check if browser supports Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      
      if (!SpeechRecognition) {
        voiceError.value = true
        console.warn('Speech Recognition API not supported in this browser')
        return
      }

      recognition.value = new SpeechRecognition()
      recognition.value.continuous = true
      recognition.value.interimResults = true
      recognition.value.lang = 'ru-RU' // Russian language

      recognition.value.onstart = () => {
        isRecording.value = true
        console.log('Voice recognition started')
      }

      recognition.value.onresult = (event) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript
          }
        }
        
        if (transcript) {
          // Append to current message or replace if empty
          if (currentMessage.value.trim()) {
            currentMessage.value += ' ' + transcript.trim()
          } else {
            currentMessage.value = transcript.trim()
          }
        }
      }

      recognition.value.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        isRecording.value = false
        
        if (event.error === 'not-allowed') {
          messages.push({
            id: Date.now(),
            text: 'Доступ к микрофону запрещен. Разрешите доступ к микрофону в настройках браузера.',
            type: 'system',
            time: new Date().toLocaleTimeString()
          })
        } else if (event.error === 'no-speech') {
          messages.push({
            id: Date.now(),
            text: 'Речь не обнаружена. Попробуйте еще раз.',
            type: 'system',
            time: new Date().toLocaleTimeString()
          })
        }
      }

      recognition.value.onend = () => {
        isRecording.value = false
        console.log('Voice recognition ended')
      }
    }

    const initSpeechSynthesis = () => {
      if ('speechSynthesis' in window) {
        speechSynthesis.value = window.speechSynthesis
        console.log('Speech synthesis initialized')
      } else {
        console.warn('Speech synthesis not supported in this browser')
      }
    }

    const speakText = (text, messageType = 'bot') => {
      if (!speechEnabled.value || !speechSynthesis.value || !text) return
      
      // Stop any current speech
      speechSynthesis.value.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ru-RU'
      utterance.rate = 0.9
      utterance.pitch = 1
      
      // Different voice settings for different message types
      if (messageType === 'system') {
        utterance.rate = 0.8
        utterance.pitch = 0.9
      }
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error)
      }
      
      speechSynthesis.value.speak(utterance)
    }

    const toggleSpeech = () => {
      speechEnabled.value = !speechEnabled.value
      if (!speechEnabled.value) {
        // Stop any current speech when disabled
        speechSynthesis.value?.cancel()
      }
    }

    const toggleVoiceInput = () => {
      if (voiceError.value) return

      if (isRecording.value) {
        // Stop recording
        recognition.value?.stop()
      } else {
        // Start recording
        if (recognition.value) {
          recognition.value.start()
        }
      }
    }

    // Load latest site on component mount
    onMounted(() => {
      loadLatestSite()
      initSpeechRecognition()
      initSpeechSynthesis()
    })

    return {
      currentMessage,
      previewUrl,
      generatedImage,
      isLoading,
      isRecording,
      voiceError,
      speechEnabled,
      showAnalysisDialog,
      analysisLoading,
      analysisResult,
      analysisError,
      messages,
      sendMessage,
      generateSite,
      publishSite,
      improvePrompt,
      generateImage,
      analyzeProject,
      closeAnalysisDialog,
      loadLatestSite,
      toggleVoiceInput,
      toggleSpeech
    }
  }
}
</script>
