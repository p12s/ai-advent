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
          <textarea 
            v-model="currentMessage" 
            @keydown.enter.prevent="sendMessage"
            placeholder="Введите сообщение..."
            rows="3"
          ></textarea>
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
  </div>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
  name: 'App',
  setup() {
    const currentMessage = ref('')
    const previewUrl = ref('')
    const generatedImage = ref('')
    const isLoading = ref(false)
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
        messages.push({
          id: Date.now() + 2,
          text: `${data.message || JSON.stringify(data)}`,
          type: 'bot',
          time: new Date().toLocaleTimeString()
        })

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

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Add success message
        messages.push({
          id: Date.now() + 2,
          text: 'Сайт успешно сгенерирован!',
          type: 'bot',
          time: new Date().toLocaleTimeString()
        })

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

        // Add error message
        messages.push({
          id: Date.now() + 3,
          text: `Ошибка генерации сайта: ${error.message}`,
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
        messages.push({
          id: Date.now() + 2,
          text: `Сайт успешно опубликован! URL: ${data.url || data.published_url || 'URL не предоставлен'}`,
          type: 'bot',
          time: new Date().toLocaleTimeString()
        })

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
          messages.push({
            id: Date.now() + 2,
            text: `Улучшенный промпт: ${improvedPrompt}`,
            type: 'bot',
            time: new Date().toLocaleTimeString()
          })

          // Update input field with improved prompt
          currentMessage.value = improvedPrompt
        } else {
          messages.push({
            id: Date.now() + 2,
            text: 'Получен ответ от сервера, но улучшенный промпт не найден',
            type: 'system',
            time: new Date().toLocaleTimeString()
          })
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
          messages.push({
            id: Date.now() + 2,
            text: `Изображение сгенерировано! Параметры: ${JSON.stringify(data.parameters)}`,
            type: 'bot',
            time: new Date().toLocaleTimeString()
          })

          // Display image in preview panel
          generatedImage.value = `data:image/png;base64,${data.image}`
        } else {
          messages.push({
            id: Date.now() + 2,
            text: 'Изображение сгенерировано, но не получено',
            type: 'system',
            time: new Date().toLocaleTimeString()
          })
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

          return {
        currentMessage,
        previewUrl,
        generatedImage,
        isLoading,
        messages,
        sendMessage,
        generateSite,
        publishSite,
        improvePrompt,
        generateImage
      }
  }
}
</script>
