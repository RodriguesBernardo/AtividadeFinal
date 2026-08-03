import os
import psycopg2
from prefect import flow, task, get_run_logger

DB_DESTINO = os.getenv("DB_DESTINO", "dbname='analytics_db' user='analytics_user' password='analytics_password' host='db_analitico' port='5432'")

@task(retries=3, retry_delay_seconds=5)
def consolidar_faturamento_mercado():
    logger = get_run_logger()
    conn = psycopg2.connect(DB_DESTINO)
    cur = conn.cursor()
    
    try:
        # Garante que a tabela existe
        cur.execute("""
            CREATE TABLE IF NOT EXISTS faturamento_diario_mercado (
                data_faturamento DATE NOT NULL,
                mercado VARCHAR(20) NOT NULL,
                total_faturado DECIMAL(15, 2) NOT NULL,
                qtd_notas INT NOT NULL,
                PRIMARY KEY (data_faturamento, mercado)
            );
        """)
        
        # Reconsolida todo o histórico dividindo entre Mercado Interno e Exterior.
        # (Recalcular tudo a cada execução é idempotente via ON CONFLICT e mantém a
        # tabela sempre completa para o comparativo dia a dia, em vez de depender de
        # dias reais passarem para acumular histórico.)
        query = """
            INSERT INTO faturamento_diario_mercado (data_faturamento, mercado, total_faturado, qtd_notas)
            SELECT
                DATE(created_at) as data_faturamento,
                CASE
                    WHEN uf_cliente = 'EX' THEN 'Exterior'
                    ELSE 'Mercado Interno'
                END as mercado,
                SUM(valor_da_nota) as total_faturado,
                COUNT(id) as qtd_notas
            FROM nfe_fatos
            WHERE status_sefaz = 'A'
            GROUP BY 1, 2
            ON CONFLICT (data_faturamento, mercado) DO UPDATE
            SET total_faturado = EXCLUDED.total_faturado,
                qtd_notas = EXCLUDED.qtd_notas;
        """
        cur.execute(query)
        conn.commit()
        
        logger.info("Consolidação diária de faturamento por mercado concluída com sucesso!")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao consolidar faturamento: {e}")
        raise
    finally:
        cur.close()
        conn.close()

@flow(name="Pipeline_Faturamento_Diario_Mercado")
def fluxo_faturamento_diario_mercado():
    consolidar_faturamento_mercado()
