import os
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from prefect import flow, task, get_run_logger

DB_ORIGEM = os.getenv("DB_ORIGEM", "dbname='nfe_db' user='postgres' password='postgres_password' host='db_transacional' port='5432'")
DB_DESTINO = os.getenv("DB_DESTINO", "dbname='analytics_db' user='analytics_user' password='analytics_password' host='db_analitico' port='6543'")

@task(retries=3, retry_delay_seconds=5)
def etl_nfe_timescale():
    logger = get_run_logger()
    
    conn_origem = psycopg2.connect(DB_ORIGEM)
    conn_destino = psycopg2.connect(DB_DESTINO)

    cur_origem = conn_origem.cursor(cursor_factory=RealDictCursor)
    cur_destino = conn_destino.cursor()

    total_processado_agora = 0

    try:
        # Loop de Catch-up: Drena todo o histórico pendente de uma vez, em blocos de 5.000 notas
        # para não estourar a memória RAM, mas rodando de forma instantânea na mesma execução.
        while True:
            cur_origem.execute("BEGIN;")

            # 1. Lê a watermark bloqueando a linha
            cur_origem.execute("SELECT ultimo_id_processado FROM controle_extracao WHERE id = 1 FOR UPDATE;")
            resultado_watermark = cur_origem.fetchone()
            
            # Tratamento de segurança caso a tabela de controle ainda não tenha sido iniciada
            if not resultado_watermark:
                cur_origem.execute("ROLLBACK;")
                logger.warning("Tabela de watermark não inicializada. Aguardando próximo ciclo.")
                break
                
            ultimo_id = resultado_watermark['ultimo_id_processado']

            # 2. Extrai um grande bloco (5.000 notas por vez)
            # ADICIONADO: n.uf_cliente no SELECT e no GROUP BY
            query_extract = """
                SELECT 
                    n.id, n.created_at, n.valor_da_nota, n.status_sefaz, n.uf_cliente,
                    COUNT(i.id_unico) as qtd_itens,
                    json_agg(
                        json_build_object(
                            'id_unico', i.id_unico, 
                            'descricao', i.descricao, 
                            'valor_item_total', i.valor_item_total
                        )
                    ) FILTER (WHERE i.id_unico IS NOT NULL) as itens_json
                FROM notas n
                LEFT JOIN itens i ON n.id = i.id_fk_nota
                WHERE n.id > %s
                GROUP BY n.id, n.created_at, n.valor_da_nota, n.status_sefaz, n.uf_cliente
                ORDER BY n.id ASC
                LIMIT 20000;
            """
            cur_origem.execute(query_extract, (ultimo_id,))
            linhas = cur_origem.fetchall()

            # Se não há mais nada no banco de origem, encerra o loop de catch-up
            if not linhas:
                cur_origem.execute("ROLLBACK;")
                break

            # 3. Formata e insere no TimescaleDB
            dados_insercao_notas = []
            dados_insercao_itens = []
            
            for row in linhas:
                # ADICIONADO: row['uf_cliente'] na tupla de inserção
                dados_insercao_notas.append(
                    (row['id'], row['created_at'], row['valor_da_nota'], row['status_sefaz'], row['qtd_itens'], row['uf_cliente'])
                )
                
                # Trata os itens da nota
                itens = row['itens_json'] or []
                for item in itens:
                    # Extrair marca/categoria. Ex: "Monitor Dell 27 polegadas" -> "Dell"
                    descricao = item['descricao'] or ""
                    partes = descricao.split(" ")
                    categoria = partes[1] if len(partes) > 1 else "Outros"
                    
                    dados_insercao_itens.append(
                        (item['id_unico'], row['id'], row['created_at'], categoria, item['valor_item_total'], row['status_sefaz'])
                    )

            # ADICIONADO: coluna uf_cliente no INSERT
            query_insert_notas = """
                INSERT INTO nfe_fatos (id, created_at, valor_da_nota, status_sefaz, qtd_itens, uf_cliente)
                VALUES %s
                ON CONFLICT (id, created_at) DO NOTHING;
            """
            execute_values(cur_destino, query_insert_notas, dados_insercao_notas)
            
            if dados_insercao_itens:
                query_insert_itens = """
                    INSERT INTO itens_fatos (id_unico, id_fk_nota, created_at, categoria, valor_item_total, status_sefaz)
                    VALUES %s
                    ON CONFLICT (id_unico, created_at) DO NOTHING;
                """
                execute_values(cur_destino, query_insert_itens, dados_insercao_itens)
                
            conn_destino.commit() 

            # 4. Atualiza a watermark e comita o bloco
            novo_ultimo_id = linhas[-1]['id']
            cur_origem.execute("""
                UPDATE controle_extracao 
                SET ultimo_id_processado = %s, updated_at = CURRENT_TIMESTAMP 
                WHERE id = 1;
            """, (novo_ultimo_id,))
            conn_origem.commit()

            total_processado_agora += len(linhas)
            logger.info(f"Bloco histórico processado: {len(linhas)} notas. Watermark: {novo_ultimo_id}")

            # Se pegou menos de 5.000, significa que chegou no fim da fila e não precisa rodar o loop de novo
            if len(linhas) < 5000:
                break

        if total_processado_agora > 0:
            logger.info(f"Sincronização concluída! Total transportado neste ciclo: {total_processado_agora} notas.")
        else:
            logger.info("Nenhuma nota nova para processar (Tempo Real).")

    except Exception as e:
        conn_origem.rollback()
        conn_destino.rollback()
        logger.error(f"Erro no ETL: {e}")
        raise
    finally:
        cur_origem.close()
        cur_destino.close()
        conn_origem.close()
        conn_destino.close()


@flow(name="Pipeline_Ingestao_Timescale")
def etl_flow():
    etl_nfe_timescale()

if __name__ == "__main__":
    # Roda a cada 10 segundos. 
    # Na 1ª vez, o "while True" limpa o histórico de 65 dias instantaneamente.
    # Nas próximas vezes, processará 1 ou 2 notas novas e sairá no primeiro `break`.
    etl_flow.serve(name="deploy-timescale", interval=10)