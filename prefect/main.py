from prefect import serve
from prefect.schedules import Cron

# Importa os seus fluxos da pasta dags
from dags.ingestao import etl_flow
from dags.cotacoes_diarias import fluxo_cotacoes_moedas
from dags.faturamento_diario_mercado import fluxo_faturamento_diario_mercado
from dags.cobranca_notas import fluxo_cobranca_pagamento_nota

if __name__ == "__main__":
    # =========================================================================
    # CARGA INICIAL PROTEGIDA
    # =========================================================================
    try:
        print("🚀 Executando a primeira carga de cotações imediatamente...")
        fluxo_cotacoes_moedas() 
        print("🚀 Executando a primeira consolidação de faturamento por mercado...")
        fluxo_faturamento_diario_mercado()
    except Exception as e:
        print(f"⚠️ Aviso: A carga inicial falhou, mas os agendamentos continuarão. Erro: {e}")

    # =========================================================================
    # AGENDAMENTOS
    # =========================================================================
    ingestao_deploy = etl_flow.to_deployment(
        name="deploy-timescale", 
        interval=10
    )
    
    cotacoes_deploy = fluxo_cotacoes_moedas.to_deployment(
        name="agendamento-cambio-diario", 
        schedule=Cron(
            "0 6 * * *", 
            timezone="America/Sao_Paulo"
        )
    )

    faturamento_mercado_deploy = fluxo_faturamento_diario_mercado.to_deployment(
        name="agendamento-faturamento-diario-mercado",
        schedule=Cron(
            "30 0 * * *",
            timezone="America/Sao_Paulo"
        )
    )

    cobranca_pagamento_nota_deploy = fluxo_cobranca_pagamento_nota.to_deployment(
        name="agendamento-cobranca-pagamento-nota",
        interval=120
    )

    print("⏰ Iniciando o servidor centralizado de DAGs do Prefect...")
    
    # Executa todas as DAGs no mesmo pool de memória
    serve(ingestao_deploy, cotacoes_deploy, faturamento_mercado_deploy, cobranca_pagamento_nota_deploy)