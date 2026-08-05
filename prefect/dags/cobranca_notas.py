import os
import resend
from prefect import flow, task
import psycopg2
from dotenv import load_dotenv

# Carrega as variáveis do .env (útil no desenvolvimento local; no docker o env_file já injeta)
load_dotenv()

resend.api_key = os.environ.get("RESEND_API_KEY")

def get_db_connection():
    db_origem = os.environ.get("DB_ORIGEM")
    return psycopg2.connect(db_origem)

@task
def buscar_notas_para_cobranca():
    query = """
    SELECT id, cliente, valor_da_nota, created_at, uf_cliente 
    FROM notas 
    WHERE nota_ja_paga = 'N' 
      AND (data_envio_cobranca IS NULL OR data_envio_cobranca < NOW() - INTERVAL '10 minutes')
    """
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query)
    notas = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return notas

@task
def formatar_e_enviar_email(notas):
    if not notas:
        print("Nenhuma nota pendente de cobrança.")
        return False
        
    print(f"Encontradas {len(notas)} notas para cobrança. Enviando email...")
    
    email_from = os.environ.get("EMAIL_FROM", "onboarding@resend.dev")
    email_to = os.environ.get("EMAIL_TO")
    
    if not email_to:
        print("Erro: EMAIL_TO não configurado no .env")
        return False

    # Monta a tabela HTML
    linhas_html = ""
    for nota in notas:
        nota_id = nota[0]
        cliente = nota[1].strip()
        valor = nota[2]
        uf = nota[4]
        linhas_html += f"<tr><td>{nota_id}</td><td>{cliente} ({uf})</td><td>R$ {valor}</td></tr>"

    html_content = f"""
    <h2>Aviso de Cobrança - Notas Pendentes</h2>
    <p>As seguintes notas fiscais constam como <b>Não Pagas</b> no sistema:</p>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
        <thead>
            <tr>
                <th>ID da Nota</th>
                <th>Cliente</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody>
            {linhas_html}
        </tbody>
    </table>
    <br>
    <p>Por favor, verifique o status dos pagamentos.</p>
    """

    try:
        params = {
            "from": f"Sistema de Cobrança <{email_from}>",
            "to": [email_to],
            "subject": f"Cobrança: {len(notas)} Notas Pendentes",
            "html": html_content,
        }
        
        # Envia o e-mail
        email_response = resend.Emails.send(params)
        print("Email enviado com sucesso:", email_response)
        return True
    except Exception as e:
        print(f"Erro ao enviar email via Resend: {e}")
        return False

@task
def atualizar_data_cobranca(notas):
    if not notas:
        return
        
    nota_ids = tuple(nota[0] for nota in notas)
    
    query = f"""
    UPDATE notas 
    SET data_envio_cobranca = NOW() 
    WHERE id IN %s
    """
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(query, (nota_ids,))
        conn.commit()
        print(f"Data de cobrança atualizada para {len(nota_ids)} notas.")
    except Exception as e:
        conn.rollback()
        print(f"Erro ao atualizar datas de cobrança: {e}")
    finally:
        cursor.close()
        conn.close()

@flow(name="Cobranca de Pagamento de Notas")
def fluxo_cobranca_pagamento_nota():
    notas = buscar_notas_para_cobranca()
    
    if notas:
        sucesso = formatar_e_enviar_email(notas)
        if sucesso:
            atualizar_data_cobranca(notas)
