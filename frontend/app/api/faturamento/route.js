export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filtro = searchParams.get("filtro") || "dia";

  try {
    let condicaoTempo = "";

    if (filtro === "hora") {
      condicaoTempo =
        ">= (SELECT COALESCE(MAX(created_at), NOW()) FROM nfe_fatos) - INTERVAL '1 hour'";
    } else if (filtro === "mes") {
      condicaoTempo =
        ">= DATE_TRUNC('month', (SELECT COALESCE(MAX(created_at), NOW()) FROM nfe_fatos))";
    } else {
      condicaoTempo =
        ">= DATE_TRUNC('day', (SELECT COALESCE(MAX(created_at), NOW()) FROM nfe_fatos))";
    }

    // Query robusta usando CTEs para buscar ambos os faturamentos em uma única viagem ao banco
    const query = `
      WITH faturamento_principal AS (
        SELECT COALESCE(SUM(valor_da_nota), 0) AS total 
        FROM nfe_fatos 
        WHERE status_sefaz = 'A' 
          AND (uf_cliente IS NULL OR uf_cliente != 'EX')
          AND created_at ${condicaoTempo}
      ),
      faturamento_exterior AS (
        SELECT COALESCE(SUM(f.valor_da_nota * (
            SELECT valor_em_reais 
            FROM cotacoes_diarias 
            WHERE moeda = 'USD' 
              AND data_cotacao <= DATE(f.created_at) 
            ORDER BY data_cotacao DESC 
            LIMIT 1
        )), 0) AS total_exterior
        FROM nfe_fatos f
        WHERE f.status_sefaz = 'A' 
          AND f.uf_cliente = 'EX' 
          AND f.created_at ${condicaoTempo}
      )
      SELECT 
        p.total AS total_acumulado, 
        e.total_exterior  AS total_exterior
      FROM faturamento_principal p, faturamento_exterior e;
    `;

    const resultado = await pool.query(query);
    console.log("Resultado da consulta faturamento:", resultado.rows[0]);

    return NextResponse.json({
      total_acumulado: parseFloat(resultado.rows[0].total_acumulado),
      total_exterior: parseFloat(resultado.rows[0].total_exterior),
    });
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: "Falha ao consultar banco" },
      { status: 500 },
    );
  }
}
