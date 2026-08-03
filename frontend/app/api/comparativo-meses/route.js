export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request) {
  try {
    const query = `
      SELECT 
        EXTRACT(MONTH FROM created_at) AS mes,
        SUM(valor_da_nota) AS total
      FROM nfe_fatos
      WHERE status_sefaz = 'A'
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM (SELECT COALESCE(MAX(created_at), NOW()) FROM nfe_fatos))
      GROUP BY EXTRACT(MONTH FROM created_at)
      ORDER BY mes ASC;
    `;
    const resultado = await pool.query(query);
    
    // Convert month number to month name
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    return NextResponse.json({
      dados: resultado.rows.map(r => ({
        mes: meses[r.mes - 1] || r.mes,
        total: parseFloat(r.total)
      }))
    });
  } catch (error) {
    console.error("Erro na API comparativo-meses:", error);
    return NextResponse.json(
      { error: "Falha ao consultar banco" },
      { status: 500 }
    );
  }
}
