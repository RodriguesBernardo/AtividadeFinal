# Dashboard de Faturamento Analítico - NF-e

Este projeto consiste em uma arquitetura de dados distribuída e moderna para processar e visualizar o faturamento de Notas Fiscais Eletrônicas (NF-e) em tempo real.

A solução utiliza um simulador de emissão de notas em **Go**, um banco transacional **PostgreSQL (OLTP)**, um pipeline de dados orquestrado pelo **Prefect**, um banco analítico de séries temporais **TimescaleDB (OLAP)** e um painel de visualização desenvolvido em **Next.js**.

![alt text](image.png)

## 🏗️ Arquitetura do Sistema

- **`nfe_simulador_go`**: Aplicação em Go que simula a emissão contínua de Notas Fiscais e as insere no banco transacional.
- **`nfe_postgres_oltp`**: Banco de dados relacional que armazena os dados brutos operacionais na porta `5435`.
- **`nfe_prefect_server` & `pipeline`**: Orquestrador que extrai os dados do OLTP, aplica as regras de negócio (ETL) e carrega no OLAP.
- **`nfe_timescale_olap`**: Banco analítico otimizado para tempo (TimescaleDB) na porta `6543`, utilizando Views Dinâmicas para agregações instantâneas.
- **`nfe_nextjs_dashboard`**: Painel web que consome a API do TimescaleDB e atualiza os gráficos a cada 10 segundos.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos

Certifique-se de ter instalado em sua máquina:

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### Passo 1: Subir a Infraestrutura

Na raiz do projeto (onde está o arquivo `docker-compose.yml`), execute o comando para construir e iniciar todos os contêineres:

```bash
docker-compose up -d --build
```

### Passo 2: Acessar as Aplicações

Após todos os contêineres inicializarem com sucesso, você poderá acessar:

Dashboard (Next.js): http://localhost:3000

Orquestrador Prefect: http://localhost:4200

## 🗄️ Estrutura do Banco Analítico (TimescaleDB)

O banco analítico é inicializado automaticamente através do script timescale_init.sql. Ele cria uma Hypertable para otimização de partições temporais e disponibiliza duas views em tempo real:

faturamento_diario: Consolida a soma do faturamento agrupado por dia.

faturamento_por_hora: Consolida a soma do faturamento agrupado por hora.

Para conectar via ferramentas externas (como o DBeaver), utilize as seguintes credenciais:

```bash
Host: localhost

Porta: 6543

Database: analytics_db

Usuário: analytics_user

Senha: analytics_password (Ajustar via variáveis de ambiente em produção)
```

## 🛠️ Tecnologias Utilizadas

Next.js 14 (React, TailwindCSS, PG Pool)

Go (Golang)

PostgreSQL & TimescaleDB

Prefect io

Docker
