# ==========================================
# ESTÁGIO 1: Build
# ==========================================
FROM golang:1.23.5-alpine AS builder

WORKDIR /app

# Copia o código e resolve/baixa as dependências (gera o go.sum)
COPY . .
RUN go mod tidy && go mod download

# Compilação otimizada
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o erp_integrador main.go

# ==========================================
# ESTÁGIO 2: Final
# ==========================================
FROM scratch

# Copia os certificados SSL (necessário para chamar a API HTTPS da FakeStore)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copia o binário para a raiz da imagem vazia
COPY --from=builder /app/erp_integrador /erp_integrador

ENTRYPOINT ["/erp_integrador"]
