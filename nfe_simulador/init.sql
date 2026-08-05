-- Criação da tabela de Notas Fiscais
CREATE TABLE IF NOT EXISTS notas (
    id BIGSERIAL PRIMARY KEY,
    serie_nf CHAR(1) NOT NULL,
    soma_faturamento BOOLEAN NOT NULL,
    cliente CHAR(18) NOT NULL,
    uf_cliente CHAR(2) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    status_sefaz CHAR(1) NOT NULL,
    nota_ja_paga CHAR(1) NOT NULL,
    valor_da_nota DECIMAL(12, 2) NOT NULL,
    data_envio_cobranca TIMESTAMP
);

-- Criação da tabela de Itens
CREATE TABLE IF NOT EXISTS itens (
    id_unico BIGSERIAL PRIMARY KEY,
    id_fk_nota BIGINT NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
    posicao INT NOT NULL,
    cod_item CHAR(8) NOT NULL,
    descricao VARCHAR(100) NOT NULL,
    valor_item_total DECIMAL(10, 2) NOT NULL,
    quantidade INT NOT NULL
);

-- Nova tabela de Watermark para o Prefect
CREATE TABLE IF NOT EXISTS controle_extracao (
    id INT PRIMARY KEY,
    ultimo_id_processado BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insere o estado inicial (começando do ID 0)
INSERT INTO controle_extracao (id, ultimo_id_processado) VALUES (1, 0) ON CONFLICT DO NOTHING;

-- Índices para otimização
CREATE INDEX idx_itens_id_fk_nota ON itens(id_fk_nota);
CREATE INDEX idx_notas_created_at ON notas(created_at);