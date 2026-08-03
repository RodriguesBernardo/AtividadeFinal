export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dias = parseInt(searchParams.get("dias") || "30", 10);

  try {
    const query = `
      SELECT data_faturamento, mercado, total_faturado, qtd_notas
      FROM faturamento_diario_mercado
      WHERE data_faturamento >= (
        SELECT COALESCE(MAX(data_faturamento), CURRENT_DATE) FROM faturamento_diario_mercado
      ) - $1::int
      ORDER BY data_faturamento ASC;
    `;
    const resultado = await pool.query(query, [dias]);

    const porDia = new Map();
    for (const row of resultado.rows) {
      const chave = row.data_faturamento.toISOString().slice(0, 10);
      if (!porDia.has(chave)) {
        porDia.set(chave, { data: chave, interno: 0, exterior: 0, qtdInterno: 0, qtdExterior: 0 });
      }
      const entrada = porDia.get(chave);
      const total = parseFloat(row.total_faturado);
      const qtd = parseInt(row.qtd_notas, 10);
      if (row.mercado === "Exterior") {
        entrada.exterior = total;
        entrada.qtdExterior = qtd;
      } else {
        entrada.interno = total;
        entrada.qtdInterno = qtd;
      }
    }

    const dados = Array.from(porDia.values()).sort((a, b) => a.data.localeCompare(b.data));
    const totalInterno = dados.reduce((acc, d) => acc + d.interno, 0);
    const totalExterior = dados.reduce((acc, d) => acc + d.exterior, 0);

    return NextResponse.json({ dados, totalInterno, totalExterior });
  } catch (error) {
    console.error("Erro na API faturamento-mercado:", error);
    return NextResponse.json(
      { error: "Falha ao consultar banco" },
      { status: 500 }
    );
  }
}
