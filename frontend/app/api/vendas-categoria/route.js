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
    let timeCondition = "";
    if (filtro === "hora") {
      timeCondition = `created_at >= (SELECT COALESCE(MAX(created_at), NOW()) FROM itens_fatos) - INTERVAL '1 hour'`;
    } else if (filtro === "dia") {
      timeCondition = `created_at >= DATE_TRUNC('day', (SELECT COALESCE(MAX(created_at), NOW()) FROM itens_fatos))`;
    } else { // "mes"
      timeCondition = `created_at >= DATE_TRUNC('month', (SELECT COALESCE(MAX(created_at), NOW()) FROM itens_fatos))`;
    }

    const query = `
      SELECT 
        categoria,
        SUM(valor_item_total) AS total
      FROM itens_fatos
      WHERE status_sefaz = 'A'
        AND ${timeCondition}
      GROUP BY categoria
      ORDER BY total DESC;
    `;
    const resultado = await pool.query(query);
    return NextResponse.json({
      dados: resultado.rows.map(r => ({
        categoria: r.categoria,
        total: parseFloat(r.total)
      }))
    });
  } catch (error) {
    console.error("Erro na API vendas-categoria:", error);
    return NextResponse.json(
      { error: "Falha ao consultar banco analítico" },
      { status: 500 }
    );
  }
}
