"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function formatarDataCurta(isoDate) {
  const [, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

const OPCOES_PERIODO = [
  { label: "Últimos 7 dias", value: 7 },
  { label: "Últimos 14 dias", value: 14 },
  { label: "Últimos 30 dias", value: 30 },
  { label: "Últimos 60 dias", value: 60 },
];

export default function FaturamentoPorMercado() {
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState([]);
  const [totais, setTotais] = useState({ totalInterno: 0, totalExterior: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscar = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/faturamento-mercado?dias=${dias}`);
        if (res.ok) {
          const json = await res.json();
          setDados(
            (json.dados || []).map((d) => ({ ...d, dataLabel: formatarDataCurta(d.data) }))
          );
          setTotais({ totalInterno: json.totalInterno || 0, totalExterior: json.totalExterior || 0 });
        }
      } catch (error) {
        console.error("Erro ao consultar faturamento por mercado:", error);
      } finally {
        setLoading(false);
      }
    };

    buscar();
    const interval = setInterval(buscar, 30000);
    return () => clearInterval(interval);
  }, [dias]);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Faturamento por Mercado</h1>
          <p className="text-slate-500">
            Comparativo diário entre Mercado Interno e Exterior (pipeline{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
              Pipeline_Faturamento_Diario_Mercado
            </code>
            )
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white p-2 rounded-lg shadow-sm border">
          <label htmlFor="dias" className="text-sm font-medium text-slate-600">
            Período:
          </label>
          <select
            id="dias"
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="border-none bg-transparent text-slate-800 font-semibold focus:ring-0 outline-none"
          >
            {OPCOES_PERIODO.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-2">
            Total Mercado Interno
          </h2>
          <span className="text-4xl font-black text-emerald-600">
            {formatCurrency(totais.totalInterno)}
          </span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-2">
            Total Exterior
          </h2>
          <span className="text-4xl font-black text-blue-600">
            {formatCurrency(totais.totalExterior)}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col flex-1 min-h-[420px]">
        <h3 className="font-semibold text-slate-700 mb-4">
          Faturamento Dia a Dia — Interno vs. Exterior
        </h3>
        <div className="flex-1 w-full h-full">
          {loading && dados.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Carregando…
            </div>
          ) : dados.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Nenhum dado consolidado ainda para o período selecionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dataLabel" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b" }}
                  tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Dia ${label}`}
                  cursor={{ fill: "#f1f5f9" }}
                />
                <Legend />
                <Bar dataKey="interno" name="Mercado Interno" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="exterior" name="Exterior" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
