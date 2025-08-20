# Тесты для docker-report.js

## Быстрый запуск

### Вариант 1: Браузерные тесты (рекомендуется)
1. Запустите HTTP сервер:
```bash
npx http-server -p 8080 --cors
```

2. Откройте в браузере:
```
http://localhost:8080/test-runner.html
```

3. Нажмите кнопку "🚀 Запустить все тесты"

### Вариант 2: Jest тесты (требует Node.js)
1. Установите зависимости:
```bash
npm install
```

2. Запустите тесты:
```bash
npm test
```

## Структура тестов

### Unit тесты
- **parseGitHubDataFromReport** - парсинг markdown отчетов
- **createHtmlReport** - создание HTML отчетов
- **DockerReportManager** - управление Docker контейнерами

### Интеграционные тесты
- Полный цикл от парсинга данных до создания отчета

## Файлы
- `docker-report.test.js` - Jest тесты
- `test-runner.html` - браузерные тесты
- `package.json` - конфигурация npm
- `jest.setup.js` - настройки Jest
- `test-utils.js` - утилиты для тестирования

## Покрытие тестами
- ✅ Парсинг GitHub данных
- ✅ Создание HTML отчетов
- ✅ Конфигурация Docker контейнеров
- ✅ HTTP запросы к Docker API
- ✅ Обработка ошибок
- ✅ Интеграционные сценарии
