# ==========================================
# ESTÁGIO 1: Build
# ==========================================
FROM golang:1.23.5-alpine AS builder

# Instala certificados e dados de fuso horário

WORKDIR /app

# Copia APENAS os arquivos de dependência primeiro (Melhora muito o cache)
COPY go.mod go.sum ./
RUN go mod download

# Copia o resto do código
COPY . .

# Compilação otimizada
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o nfe_simulator main.go

# ==========================================
# ESTÁGIO 2: Final
# ==========================================
FROM scratch

# Copia os certificados SSL e timezones
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
# COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copia o binário para a raiz da imagem vazia
COPY --from=builder /app/nfe_simulator /nfe_simulator

# Executa o binário diretamente
ENTRYPOINT ["/nfe_simulator"]