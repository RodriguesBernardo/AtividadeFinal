"use client";

import { useState, useEffect, useCallback } from "react";

function formatarData(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// MODIFICADO: Agora recebe a UF para decidir a moeda
function formatarValor(valor, uf) {
  const isExterior = uf === "EX";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: isExterior ? "USD" : "BRL",
  }).format(valor ?? 0);
}

function hojeISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATUS_BADGE = {
  A: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-800" },
  R: { label: "Reprovado", cls: "bg-red-100     text-red-800" },
};

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO", "EX"
];

const ITEMS_PER_PAGE = 20;

export default function Historico() {
  const hoje = hojeISO();

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [idNFE, setIdNFE] = useState("");
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");
  const [estado, setEstado] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");

  // ── Estado ─────────────────────────────────────────────────────────────────
  const [dados, setDados] = useState([]);
  const [paginacao, setPaginacao] = useState({ total: 0, totalPages: 0, page: 1 });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [pagina, setPagina] = useState(1);

  // ── Busca ──────────────────────────────────────────────────────────────────
  const buscar = useCallback(
    async (paginaAtual = 1) => {
      setLoading(true);
      setErro(null);

      const params = new URLSearchParams();
      if (dataInicio) params.set("dataInicio", dataInicio);
      if (dataFim) params.set("dataFim", dataFim);
      if (idNFE.trim()) params.set("idNFE", idNFE.trim());
      if (categoria.trim()) params.set("categoria", categoria.trim());
      if (status) params.set("status", status);
      if (estado) params.set("estado", estado);
      if (valorMin.trim()) params.set("valorMin", valorMin.trim());
      if (valorMax.trim()) params.set("valorMax", valorMax.trim());
      params.set("page", String(paginaAtual));
      params.set("limit", String(ITEMS_PER_PAGE));

      try {
        const res = await fetch(`/api/historico?${params.toString()}`);
        if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(json.detalhe || json.error);
        setDados(json.dados || []);
        setPaginacao(json.paginacao || { total: 0, totalPages: 0, page: 1 });
        setPagina(paginaAtual);
      } catch (e) {
        setErro(e.message);
        setDados([]);
      } finally {
        setLoading(false);
      }
    },
    [dataInicio, dataFim, idNFE, categoria, status, estado, valorMin, valorMax]
  );

  useEffect(() => {
    buscar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    buscar(1);
  };

  const handleLimpar = () => {
    setDataInicio(hoje);
    setDataFim(hoje);
    setIdNFE("");
    setCategoria("");
    setStatus("");
    setEstado("");
    setValorMin("");
    setValorMax("");
  };

  const irParaPagina = (p) => {
    if (p < 1 || p > paginacao.totalPages) return;
    buscar(p);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Histórico de Transações</h1>
        <p className="text-slate-500 mt-1">
          Pesquise faturamentos por período, ID da NFe, categoria, status ou valor.
        </p>
      </div>

      {/* ── Painel de Filtros ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        {/* Linha 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1">Data Inicial</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1">Data Final</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1">ID da NFe</label>
            <input
              type="text"
              placeholder="Ex: 10543"
              value={idNFE}
              onChange={(e) => setIdNFE(e.target.value)}
              className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1">Categoria do Item</label>
            <input
              type="text"
              placeholder="Ex: Dell, Samsung…"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {/* Linha 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
            >
              <option value="">Todos</option>
              <option value="A">Aprovado</option>
              <option value="R">Reprovado</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1">Estado / UF</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
            >
              <option value="">Todos</option>
              {ESTADOS_BR.map((uf) => (
                <option key={uf} value={uf}>
                  {uf === "EX" ? "EX - Exterior" : uf}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1">Valor Mínimo (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={valorMin}
              onChange={(e) => setValorMin(e.target.value)}
              className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1">Valor Máximo (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="999.999,99"
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value)}
              className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {/* Linha 3: Botões */}
        <div className="flex justify-end items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleLimpar}
            className="px-5 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Limpar Filtros
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 text-white font-semibold px-5 py-2 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Buscando…
              </>
            ) : (
              "🔍 Pesquisar"
            )}
          </button>
        </div>
      </form>

      {/* ── Tabela de Resultados ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Barra de status */}
        <div className="px-6 py-3 border-b bg-slate-50 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-600">
            {loading
              ? "Carregando…"
              : `${paginacao.total.toLocaleString("pt-BR")} resultado(s) encontrado(s)`}
          </span>
          {paginacao.totalPages > 1 && (
            <span className="text-xs text-slate-400">
              Página {paginacao.page} de {paginacao.totalPages}
            </span>
          )}
        </div>

        {/* Erro */}
        {erro && (
          <div className="px-6 py-4 bg-red-50 text-red-700 text-sm border-b">
            ⚠️ Erro ao buscar dados: {erro}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID NFe</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data / Hora</th>

                {/* MODIFICADO: Nova coluna de Estado no cabeçalho */}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Qtd. Itens</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && dados.length === 0 ? (
                <tr>
                  {/* MODIFICADO: colSpan alterado de 5 para 6 */}
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="animate-spin h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Carregando dados…
                    </div>
                  </td>
                </tr>
              ) : !loading && dados.length === 0 ? (
                <tr>
                  {/* MODIFICADO: colSpan alterado de 5 para 6 */}
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📭</span>
                      <span className="text-sm">Nenhum resultado para os filtros selecionados.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                dados.map((row) => {
                  const badge = STATUS_BADGE[row.status] || {
                    label: row.status || "—",
                    cls: "bg-slate-100 text-slate-600",
                  };
                  return (
                    <tr key={`${row.id_nfe}-${row.data}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                        #{row.id_nfe}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatarData(row.data)}
                      </td>

                      {/* MODIFICADO: Nova célula exibindo a UF */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {row.estado || "—"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {row.qtd_itens}
                      </td>

                      {/* MODIFICADO: Passando a UF para definir BRL ou USD */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                        {formatarValor(row.valor, row.estado)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Paginação ─────────────────────────────────────────────────────── */}
        {paginacao.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex justify-between items-center text-sm text-slate-500 flex-wrap gap-2">
            <span>
              Exibindo{" "}
              <strong>
                {(paginacao.page - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(paginacao.page * ITEMS_PER_PAGE, paginacao.total)}
              </strong>{" "}
              de <strong>{paginacao.total.toLocaleString("pt-BR")}</strong> resultados
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => irParaPagina(1)}
                disabled={paginacao.page === 1 || loading}
                className="px-2 py-1 border rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Primeira página"
              >«</button>

              <button
                onClick={() => irParaPagina(paginacao.page - 1)}
                disabled={paginacao.page <= 1 || loading}
                className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >Anterior</button>

              {Array.from({ length: paginacao.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === paginacao.totalPages || Math.abs(p - paginacao.page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "…" ? (
                    <span key={`el-${idx}`} className="px-2 py-1 text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => irParaPagina(p)}
                      disabled={loading}
                      className={`px-3 py-1 border rounded transition-colors ${p === paginacao.page
                        ? "bg-slate-900 text-white border-slate-900"
                        : "hover:bg-slate-50"
                        } disabled:opacity-40`}
                    >{p}</button>
                  )
                )}

              <button
                onClick={() => irParaPagina(paginacao.page + 1)}
                disabled={paginacao.page >= paginacao.totalPages || loading}
                className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >Próxima</button>

              <button
                onClick={() => irParaPagina(paginacao.totalPages)}
                disabled={paginacao.page === paginacao.totalPages || loading}
                className="px-2 py-1 border rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Última página"
              >»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}