import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Faturamento em Tempo Real",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="flex h-screen bg-gray-50 text-gray-900 font-sans">
        {/* Sidebar Esquerda */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
          <div className="p-6 text-2xl font-bold border-b border-slate-700">
            NFe Analytics
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link
              href="/"
              className="block p-3 rounded hover:bg-slate-800 transition-colors"
            >
              📊 Tempo Real
            </Link>
            <Link
              href="/historico"
              className="block p-3 rounded hover:bg-slate-800 transition-colors"
            >
              🔍 Histórico e Busca
            </Link>
            <Link
              href="/faturamento-mercado"
              className="block p-3 rounded hover:bg-slate-800 transition-colors"
            >
              🌍 Faturamento por Mercado
            </Link>
          </nav>
          <div className="p-4 text-xs text-slate-500 border-t border-slate-700">
            Status: Conectado ao TimescaleDB
          </div>
        </aside>

        {/* Área de Conteúdo Principal */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </body>
    </html>
  );
}
