-- Ativa a extensão do TimescaleDB no PostgreSQL analítico
CREATE EXTENSION IF NOT EXISTS timescaledb;

DROP MATERIALIZED VIEW IF EXISTS faturamento_por_hora CASCADE;
DROP MATERIALIZED VIEW IF EXISTS faturamento_diario CASCADE;

-- Tabela de Fatos: Apenas os dados essenciais para o dashboard
CREATE TABLE IF NOT EXISTS nfe_fatos (
    id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    valor_da_nota DECIMAL(12, 2) NOT NULL,
    status_sefaz CHAR(1) NOT NULL,
    qtd_itens INT NOT NULL,
    uf_cliente VARCHAR(2),
    PRIMARY KEY (id, created_at) 
);

-- Transforma a tabela padrão em uma Hypertable particionada no tempo
SELECT create_hypertable('nfe_fatos', 'created_at', if_not_exists => TRUE);

-- Tabela de Fatos dos Itens: Para gráfico de categorias
CREATE TABLE IF NOT EXISTS itens_fatos (
    id_unico BIGINT NOT NULL,
    id_fk_nota BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    valor_item_total DECIMAL(10, 2) NOT NULL,
    status_sefaz CHAR(1) NOT NULL,
    PRIMARY KEY (id_unico, created_at)
);

-- Transforma em Hypertable particionada no tempo
SELECT create_hypertable('itens_fatos', 'created_at', if_not_exists => TRUE);

-- TABELAS DE ENRIQUECIMENTO (CÂMBIO DIÁRIO)
CREATE TABLE IF NOT EXISTS cotacoes_diarias (
    data_cotacao DATE NOT NULL,
    moeda CHAR(3) NOT NULL,
    valor_em_reais DECIMAL(10, 4) NOT NULL,
    PRIMARY KEY (data_cotacao, moeda)
);

-- Tabela para faturamento diário segregado por mercado (Exterior vs Interno)
CREATE TABLE IF NOT EXISTS faturamento_diario_mercado (
    data_faturamento DATE NOT NULL,
    mercado VARCHAR(20) NOT NULL,
    total_faturado DECIMAL(15, 2) NOT NULL,
    qtd_notas INT NOT NULL,
    PRIMARY KEY (data_faturamento, mercado)
);

-- ============================================================================
-- FATURAMENTO DIÁRIO CONSOLIDADO
-- ============================================================================

CREATE TABLE IF NOT EXISTS faturamento_diario_consolidado (
    data_faturamento DATE NOT NULL,
    valor_interno DECIMAL(15, 2) NOT NULL DEFAULT 0,
    valor_exterior DECIMAL(15, 2) NOT NULL DEFAULT 0,
    PRIMARY KEY (data_faturamento)
);