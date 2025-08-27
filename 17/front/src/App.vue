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
            <div class="message-content">{{ message.text }}</div>
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
          <iframe 
            v-if="previewUrl" 
            :src="previewUrl" 
            frameborder="0"
            class="preview-iframe"
          ></iframe>
          <div v-else class="preview-placeholder">
            <p>Здесь будет отображаться сгенерированный сайт</p>
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

      // Add processing message
      const processingId = Date.now() + 1
      messages.push({
        id: processingId,
        text: 'Отправляю запрос на сервер...',
        type: 'system',
        time: new Date().toLocaleTimeString()
      })

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

        // Remove processing message
        const processingIndex = messages.findIndex(msg => msg.id === processingId)
        if (processingIndex !== -1) {
          messages.splice(processingIndex, 1)
        }

        // Add bot response
        messages.push({
          id: Date.now() + 2,
          text: `${data.message || JSON.stringify(data)}`,
          type: 'bot',
          time: new Date().toLocaleTimeString()
        })

      } catch (error) {
        console.error('Error sending message:', error)
        
        // Remove processing message
        const processingIndex = messages.findIndex(msg => msg.id === processingId)
        if (processingIndex !== -1) {
          messages.splice(processingIndex, 1)
        }

        // Add error message
        messages.push({
          id: Date.now() + 3,
          text: `Ошибка соединения с сервером: ${error.message}`,
          type: 'system',
          time: new Date().toLocaleTimeString()
        })
      }
    }

    const generateSite = async () => {
      // Add processing message
      const processingId = Date.now() + 1
      messages.push({
        id: processingId,
        text: 'Генерирую сайт...',
        type: 'system',
        time: new Date().toLocaleTimeString()
      })

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

        // Remove processing message
        const processingIndex = messages.findIndex(msg => msg.id === processingId)
        if (processingIndex !== -1) {
          messages.splice(processingIndex, 1)
        }

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

      } catch (error) {
        console.error('Error generating site:', error)
        
        // Remove processing message
        const processingIndex = messages.findIndex(msg => msg.id === processingId)
        if (processingIndex !== -1) {
          messages.splice(processingIndex, 1)
        }

        // Add error message
        messages.push({
          id: Date.now() + 3,
          text: `Ошибка генерации сайта: ${error.message}`,
          type: 'system',
          time: new Date().toLocaleTimeString()
        })
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

          return {
        currentMessage,
        previewUrl,
        messages,
        sendMessage,
        generateSite,
        publishSite
      }
  }
}
</script>
