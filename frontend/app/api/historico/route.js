export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const dataInicio = searchParams.get("dataInicio") || null;
  const dataFim = searchParams.get("dataFim") || null;
  const idNFE = searchParams.get("idNFE") || null; // busca no campo `id` (BIGINT)
  const categoria = searchParams.get("categoria") || null; // campo disponível em itens_fatos
  const status = searchParams.get("status") || null; // A, R, C ou D
  const valorMin = searchParams.get("valorMin") || null;
  const valorMax = searchParams.get("valorMax") || null;
  const estado = searchParams.get("estado") || null;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // ── Filtro de data início ────────────────────────────────────────────────
    if (dataInicio) {
      conditions.push(`n.created_at >= $${paramIndex}::date`);
      params.push(dataInicio);
      paramIndex++;
    }

    // ── Filtro de data fim (inclusivo até o fim do dia) ─────────────────────
    if (dataFim) {
      conditions.push(
        `n.created_at < ($${paramIndex}::date + INTERVAL '1 day')`,
      );
      params.push(dataFim);
      paramIndex++;
    }

    if (estado) {
      conditions.push(`n.uf_cliente = $${paramIndex}`);
      params.push(estado);
      paramIndex++;
    }

    // ── Filtro por ID da NFe (campo `id` BIGINT) ────────────────────────────
    if (idNFE && !isNaN(Number(idNFE))) {
      conditions.push(`n.id = $${paramIndex}`);
      params.push(parseInt(idNFE, 10));
      paramIndex++;
    } else if (idNFE) {
      // Se não for número puro, tenta converter via cast de texto
      conditions.push(`CAST(n.id AS TEXT) LIKE $${paramIndex}`);
      params.push(`%${idNFE}%`);
      paramIndex++;
    }

    // ── Filtro por valor mínimo ─────────────────────────────────────────────
    if (valorMin) {
      conditions.push(`n.valor_da_nota >= $${paramIndex}`);
      params.push(parseFloat(valorMin));
      paramIndex++;
    }

    // ── Filtro por valor máximo ─────────────────────────────────────────────
    if (valorMax) {
      conditions.push(`n.valor_da_nota <= $${paramIndex}`);
      params.push(parseFloat(valorMax));
      paramIndex++;
    }

    // ── Filtro por status_sefaz ───────────────────────────────────────────────────
    const statusValidos = ["A", "R"];
    if (status && statusValidos.includes(status)) {
      conditions.push(`n.status_sefaz = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // ── Filtro por categoria/item (JOIN em itens_fatos) ─────────────────────
    let joinItens = "";
    if (categoria) {
      joinItens = `
        INNER JOIN itens_fatos i
          ON i.id_fk_nota = n.id
         AND i.categoria ILIKE $${paramIndex}
      `;
      params.push(`%${categoria}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // ── Query principal com paginação ───────────────────────────────────────
    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT DISTINCT
        n.id              AS id_nfe,
        n.created_at,
        n.uf_cliente as estado,
        n.status_sefaz,
        n.valor_da_nota,
        n.qtd_itens
      FROM nfe_fatos n
      ${joinItens}
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    // ── Query de contagem total ─────────────────────────────────────────────
    const countQuery = `
      SELECT COUNT(DISTINCT n.id) AS total
      FROM nfe_fatos n
      ${joinItens}
      ${whereClause};
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, params),
    ]);

    const total = parseInt(countResult.rows[0]?.total || "0", 10);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      dados: dataResult.rows.map((r) => ({
        id_nfe: r.id_nfe,
        data: r.created_at,
        estado: r.estado,
        status: r.status_sefaz,
        valor: parseFloat(r.valor_da_nota || 0),
        qtd_itens: r.qtd_itens,
      })),
      paginacao: { total, totalPages, page, limit },
    });
  } catch (error) {
    console.error("Erro na API histórico:", error);
    return NextResponse.json(
      { error: "Falha ao consultar banco", detalhe: error.message },
      { status: 500 },
    );
  }
}
