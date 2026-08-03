"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Dashboard() {
  const [filtro, setFiltro] = useState("dia");
  const [faturamento, setFaturamento] = useState(0);
  const [faturamentoExterior, setFaturamentoExterior] = useState(0); // Estado para o Exterior
  const [comparativoMeses, setComparativoMeses] = useState([]);
  const [currencyNacional, setCurrencyNacional] = useState("BRL");
  const [currencyExterior, setCurrencyExterior] = useState("USD");

  // Taxas de câmbio para demonstração (base em BRL)
  const exchangeRates = {
    BRL: 1,
    USD: 5.0, // 1 USD = 5 BRL
    EUR: 5.5, // 1 EUR = 5.5 BRL
  };

  const [vendasCategoria, setVendasCategoria] = useState([]);

  useEffect(() => {
    const fetchFaturamento = async () => {
      try {
        const response = await fetch(`/api/faturamento?filtro=${filtro}`);
        if (response.ok) {
          const data = await response.json();
          setFaturamento(data.total_acumulado || 0);
          setFaturamentoExterior(data.total_exterior || 0); // Define o valor convertido em reais do exterior
        }
      } catch (error) {
        console.error("Erro ao consultar o banco analítico:", error);
      }
    };

    const fetchVendasCategoria = async () => {
      try {
        const response = await fetch(`/api/vendas-categoria?filtro=${filtro}`);
        if (response.ok) {
          const data = await response.json();
          setVendasCategoria(data.dados || []);
        }
      } catch (error) {
        console.error("Erro ao consultar categorias:", error);
      }
    };

    fetchFaturamento();
    fetchVendasCategoria();

    const interval = setInterval(() => {
      fetchFaturamento();
      fetchVendasCategoria();
    }, 10000);

    return () => clearInterval(interval);
  }, [filtro]);

  useEffect(() => {
    const fetchComparativoMeses = async () => {
      try {
        const response = await fetch(`/api/comparativo-meses`);
        if (response.ok) {
          const data = await response.json();
          setComparativoMeses(data.dados || []);
        }
      } catch (error) {
        console.error("Erro ao consultar comparativo de meses:", error);
      }
    };

    fetchComparativoMeses();
    const interval = setInterval(fetchComparativoMeses, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value, currencyCode = "BRL") => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currencyCode }).format(value);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Header com Filtro na Direita */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Visão Geral</h1>
          <p className="text-slate-500">
            Acompanhamento de faturamento em tempo real
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white p-2 rounded-lg shadow-sm border">
          <label htmlFor="filtro" className="text-sm font-medium text-slate-600">
            Período:
          </label>
          <select
            id="filtro"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="border-none bg-transparent text-slate-800 font-semibold focus:ring-0 outline-none"
          >
            <option value="hora">Hora Atual</option>
            <option value="dia">Dia Atual</option>
            <option value="mes">Mês Atual</option>
          </select>
        </div>
      </div>

      {/* Bloco de KPIs - Faturamento Principal e Faturamento Exterior */}
      <div className="bg-white rounded-xl shadow-sm border p-8 flex flex-col justify-center items-center relative">
        
        {/* Combobox Nacional */}
        <div className="absolute top-4 right-4">
          <select
            value={currencyNacional}
            onChange={(e) => setCurrencyNacional(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 text-slate-600 rounded-md py-1 px-2 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        <h2 className="text-lg text-slate-500 uppercase tracking-wider font-semibold mb-2">
          Faturamento Total Nacional ({filtro})
        </h2>
        <span className="text-6xl font-black text-emerald-600">
          {formatCurrency(faturamento / exchangeRates[currencyNacional], currencyNacional)}
        </span>

        {/* Bloco de Faturamento Exterior (Fica abaixo do principal) */}
        <div className="mt-5 flex items-center bg-slate-50 px-5 py-3 rounded-lg border border-slate-200 relative min-w-[350px] justify-between">
          <div className="flex items-center">
            <span className="text-sm text-slate-500 uppercase tracking-wider font-bold mr-3">
              Faturamento Exterior:
            </span>
            <span className="text-2xl font-black text-blue-600 mr-4">
              {formatCurrency(faturamentoExterior / exchangeRates[currencyExterior], currencyExterior)}
            </span>
          </div>

          {/* Combobox Exterior */}
          <select
            value={currencyExterior}
            onChange={(e) => setCurrencyExterior(e.target.value)}
            className="text-sm bg-white border border-slate-200 text-slate-600 rounded-md py-1 px-2 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ml-4"
          >
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        <span className="text-sm text-slate-400 mt-6 flex items-center">
          <span className="animate-pulse h-2 w-2 bg-emerald-500 rounded-full mr-2"></span>
          Atualizado agora
        </span>
      </div>

      {/* Área de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col min-h-[350px]">
          <h3 className="font-semibold text-slate-700 mb-4">
            Comparativo com Meses (Ano Atual)
          </h3>
          <div className="flex-1 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativoMeses} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col min-h-[350px]">
          <h3 className="font-semibold text-slate-700 mb-4">
            Vendas por Categoria ({filtro})
          </h3>
          <div className="flex-1 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={vendasCategoria}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="categoria"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                  width={110}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Total']}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} label={{ position: 'right', formatter: (v) => formatCurrency(v), fill: '#475569', fontSize: 11 }}>
                  {vendasCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}