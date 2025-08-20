FROM node:18-alpine

WORKDIR /app

COPY web-app/ .

RUN if [ ! -f config.json ]; then cp config.example.json config.json; fi

EXPOSE 8080

CMD ["npx", "http-server", "-p", "8080", "--cors"]
