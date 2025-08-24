FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN chmod +x start.sh

EXPOSE 3004 3005

CMD ["npm", "start"]
