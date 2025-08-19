FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3003 3004

COPY start-servers.sh /app/start-servers.sh
RUN chmod +x /app/start-servers.sh

CMD ["/app/start-servers.sh"]
