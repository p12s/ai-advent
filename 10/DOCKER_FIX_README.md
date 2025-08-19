# Исправление ошибки Docker контейнера

## Проблема

При создании HTML-отчетов возникала ошибка:
```
❌ Ошибка создания HTML-отчета: Ошибка запуска контейнера: (HTTP code 304) container already started
```

## Причина

Код пытался запустить уже запущенный Docker контейнер, что приводило к ошибке HTTP 304 (Not Modified). Docker API возвращает этот код, когда контейнер уже находится в запущенном состоянии.

## Решение

### 1. Добавлена проверка статуса контейнера

В файле `10/web-app/github-analysis.js` добавлена проверка статуса контейнера перед попыткой его запуска:

```javascript
// Проверяем статус контейнера перед запуском
const containerInfoResponse = await fetch(`http://localhost:3004/api/mcp/docker/container/inspect/${containerId}`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
});

let containerRunning = false;
if (containerInfoResponse.ok) {
    const containerInfo = await containerInfoResponse.json();
    if (containerInfo.success && containerInfo.container) {
        containerRunning = containerInfo.container.state === 'running';
        console.log(`Container state: ${containerInfo.container.state}`);
    }
}

// Запускаем контейнер только если он не запущен
if (!containerRunning) {
    // ... код запуска контейнера
} else {
    console.log('Container is already running');
}
```

### 2. Добавлен новый эндпоинт для получения информации о контейнере

В файле `docker-mcp/mcp-docker-server.js` добавлен эндпоинт:

```javascript
app.get('/mcp/docker/container/inspect/:containerId', async (req, res) => {
    try {
        const { containerId } = req.params;
        
        if (!containerId) {
            return res.json({ success: false, error: 'Container ID is required' });
        }
        
        const container = docker.getContainer(containerId);
        const containerInfo = await container.inspect();
        
        res.json({ 
            success: true, 
            container: {
                id: containerInfo.Id,
                name: containerInfo.Name,
                state: containerInfo.State.Status,
                created: containerInfo.Created,
                image: containerInfo.Image,
                ports: containerInfo.NetworkSettings.Ports
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
```

### 3. Улучшена функция startContainer

В файле `docker-mcp/mcp-docker-server.js` улучшена функция `startContainer`:

```javascript
async function startContainer(containerId) {
    try {
        const container = docker.getContainer(containerId);
        
        // Сначала проверяем статус контейнера
        const containerInfo = await container.inspect();
        
        // Если контейнер уже запущен, возвращаем информацию о нем
        if (containerInfo.State.Status === 'running') {
            console.log(`Container ${containerId} is already running`);
            return {
                id: containerInfo.Id,
                name: containerInfo.Name,
                state: containerInfo.State.Status
            };
        }
        
        // Запускаем контейнер только если он не запущен
        await container.start();
        const updatedContainerInfo = await container.inspect();
        return {
            id: updatedContainerInfo.Id,
            name: updatedContainerInfo.Name,
            state: updatedContainerInfo.State.Status
        };
    } catch (error) {
        console.error('Error starting container:', error);
        throw error;
    }
}
```

## Результат

Теперь система корректно обрабатывает случаи, когда контейнер уже запущен:

1. ✅ Проверяет статус контейнера перед запуском
2. ✅ Не пытается запустить уже запущенный контейнер
3. ✅ Корректно обрабатывает ошибки Docker API
4. ✅ Логирует состояние контейнера для отладки

## Тестирование

Для тестирования исправления:

1. Запустите сервисы: `./start-docker.sh`
2. Откройте веб-приложение: http://localhost:8080
3. Перейдите на вкладку "GitHub анализ"
4. Нажмите "🔍 Get GitHub Data"
5. Проверьте, что HTML-отчет создается без ошибок

## Файлы изменены

- `10/web-app/github-analysis.js` - добавлена проверка статуса контейнера и кликабельные ссылки
- `docker-mcp/mcp-docker-server.js` - добавлен эндпоинт inspect и улучшена функция startContainer
- `docker-mcp/mcp-http-server.js` - обновлена документация API

## Дополнительные улучшения

### Кликабельные ссылки в сообщениях

Изменена формулировка сообщения с "HTML-отчет развернут:" на "HTML-отчет развернут в Docker:" и добавлена кликабельная ссылка с открытием в новой вкладке:

```javascript
window.addMessage(`🌐 HTML-отчет развернут в Docker: <a href="${htmlReportResult.url}" target="_blank" style="color: #007bff; text-decoration: underline;">${htmlReportResult.url}</a>`, false, false, 'System', 'github');
```

**Особенности:**
- ✅ Ссылка открывается в новой вкладке (`target="_blank"`)
- ✅ Стилизована как кликабельная ссылка (синий цвет, подчеркивание)
- ✅ Улучшена формулировка сообщения
