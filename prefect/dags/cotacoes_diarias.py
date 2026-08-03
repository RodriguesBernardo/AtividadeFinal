import requests
import psycopg2
from datetime import date
from prefect import flow, task

@task(retries=5, retry_delay_seconds=15)
def buscar_cotacoes_api():
    """Consulta a API pública e gratuita de câmbio (AwesomeAPI)"""
    url = "https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL"
    
    print(f"📡 Buscando cotações em: {url}")
    response = requests.get(url)
    response.raise_for_status() # Falha a tarefa se a API estiver fora do ar
    dados = response.json()
    
    # Extrai o valor de compra (bid)
    return [
        ('USD', float(dados['USDBRL']['bid'])),
        ('EUR', float(dados['EURBRL']['bid']))
    ]

@task
def salvar_cotacoes_banco(cotacoes):
    """Salva as cotações no banco analítico usando regra de UPSERT"""
    conn = psycopg2.connect("postgres://analytics_user:analytics_password@nfe_timescale_olap:5432/analytics_db")
    conn.set_session(autocommit=True)
    
    hoje = date.today()
    
    with conn.cursor() as cursor:
        for moeda, valor in cotacoes:
            # ON CONFLICT garante que não teremos duas linhas para a mesma moeda no mesmo dia
            cursor.execute("""
                INSERT INTO cotacoes_diarias (data_cotacao, moeda, valor_em_reais)
                VALUES (%s, %s, %s)
                ON CONFLICT (data_cotacao, moeda) 
                DO UPDATE SET valor_em_reais = EXCLUDED.valor_em_reais;
            """, (hoje, moeda, valor))
            
    print(f"✅ Cotações do dia {hoje} aterrissadas no banco: {cotacoes}")
    conn.close()

@flow(name="Carga_Cotacao_Dolar_Euro")
def fluxo_cotacoes_moedas():
    """Pipeline que orquestra a extração e carga do câmbio"""
    dados_cotacao = buscar_cotacoes_api()
    salvar_cotacoes_banco(dados_cotacao)
