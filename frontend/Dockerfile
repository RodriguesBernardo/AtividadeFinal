# Stage 1: Dependências e Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência primeiro (aproveita o cache do Docker)
COPY package.json package-lock.json* ./
RUN npm install

RUN npm install pg

# Copia o restante do código e compila a aplicação
COPY . .
RUN npm run build

# Stage 2: Runtime (Produção)
FROM node:20-alpine AS runner

WORKDIR /app

# Define ambiente de produção
ENV NODE_ENV=production

# Copia apenas o estritamente necessário do builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

EXPOSE 3000

# Inicia o servidor Next.js
CMD ["npm", "start"]