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
-- AGREGAÇÕES CONTÍNUAS (O MOTOR ANALÍTICO)
-- O próprio banco vai atualizar essas views em background
-- ============================================================================

-- Visão 1: Faturamento Diário
-- CREATE MATERIALIZED VIEW faturamento_diario
-- WITH (timescaledb.continuous) AS
-- SELECT
--     time_bucket('1 day', created_at) AS periodo,
--     SUM(valor_da_nota) AS total_faturado,
--     COUNT(id) AS qtd_notas_emitidas
-- FROM nfe_fatos
-- WHERE status_sefaz = 'A' -- Conta apenas notas aprovadas
-- GROUP BY periodo;

-- -- Visão 2: Faturamento por Hora (Para a visão "Hora Atual" do Next.js)
-- CREATE MATERIALIZED VIEW faturamento_por_hora
-- WITH (timescaledb.continuous) AS
-- SELECT
--     time_bucket('1 hour', created_at) AS periodo,
--     SUM(valor_da_nota) AS total_faturado
-- FROM nfe_fatos
-- WHERE status_sefaz = 'A'
-- GROUP BY periodo;

-- ============================================================================
-- POLÍTICAS DE ATUALIZAÇÃO AUTOMÁTICA (POLICIES)
-- ============================================================================

-- Atualiza a View Diária a cada 30 minutos (recalcula as últimas 2 semanas)
-- SELECT add_continuous_aggregate_policy('faturamento_diario',
--     start_offset => INTERVAL '14 days',
--     end_offset => INTERVAL '0 minutes',
--     schedule_interval => INTERVAL '30 minutes');

-- -- AJUSTE AQUI: Mudamos de '2 hours' para '24 hours' para cobrir múltiplos buckets com folga!
-- -- O banco continua atualizando a cada 10 segundos, super responsivo.
-- SELECT add_continuous_aggregate_policy('faturamento_por_hora',
--     start_offset => INTERVAL '24 hours',
--     end_offset => INTERVAL '0 minutes',
--     schedule_interval => INTERVAL '10 seconds');

    -- Visão 1: Faturamento Diário Dinâmico (Tempo Real)
-- CREATE OR REPLACE VIEW faturamento_diario AS
-- SELECT
--     time_bucket('1 day', created_at) AS periodo,
--     SUM(valor_da_nota) AS total_valor,
--     COUNT(id) AS qtd_notas_emitidas
-- FROM nfe_fatos
-- WHERE status_sefaz = 'A'
-- GROUP BY periodo;

-- -- Visão 2: Faturamento por Hora Dinâmico (Tempo Real)
-- CREATE OR REPLACE VIEW faturamento_por_hora AS
-- SELECT
--     time_bucket('1 hour', created_at) AS periodo,
--     SUM(valor_da_nota) AS total_valor
-- FROM nfe_fatos
-- WHERE status_sefaz = 'A'
-- GROUP BY periodo;

-- ============================================================================
-- FATURAMENTO DIÁRIO CONSOLIDADO
-- ============================================================================

CREATE TABLE IF NOT EXISTS faturamento_diario_consolidado (
    data_faturamento DATE NOT NULL,
    valor_interno DECIMAL(15, 2) NOT NULL DEFAULT 0,
    valor_exterior DECIMAL(15, 2) NOT NULL DEFAULT 0,
    PRIMARY KEY (data_faturamento)
);