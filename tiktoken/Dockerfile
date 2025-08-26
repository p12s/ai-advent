FROM golang:1.25-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o main .


FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/main /main
COPY --from=builder /app/.env /.env
EXPOSE 4000
CMD ["/main"]
