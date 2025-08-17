FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN if [ ! -f config.json ]; then cp config.example.json config.json; fi

EXPOSE 3001 3002

CMD ["sh", "-c", "npm run start & npm run http-server & wait"]
