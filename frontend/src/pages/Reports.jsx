import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  User, 
  FileSpreadsheet, 
  Filter, 
  History, 
  BarChart3, 
  Download,
  Info
} from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('logs'); // logs ou analytics

  return (
    <div className="p-8 bg-[#0f172a] min-h-screen text-gray-200 animate-fade-in">
      
      {/* CABEÇALHO */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black text-[#00e5ff] uppercase tracking-[0.2em]">
            Central de Auditoria
          </h1>
          <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">
            Rastreabilidade Total • Doubloon System
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${activeTab === 'logs' ? 'bg-[#1e293b] border-[#00e5ff] text-[#00e5ff]' : 'border-gray-800 text-gray-600'}`}
          >
            <History className="inline mr-2" size={14} /> Histórico de Logs
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${activeTab === 'analytics' ? 'bg-[#1e293b] border-[#00e5ff] text-[#00e5ff]' : 'border-gray-800 text-gray-600'}`}
          >
            <BarChart3 className="inline mr-2" size={14} /> Mais Relatórios
          </button>
        </div>
      </div>

      {activeTab === 'logs' ? (
        <>
          {/* PAINEL DE FILTROS AVANÇADOS */}
          <div className="bg-[#1e293b] border border-gray-800 p-6 rounded-sm mb-8 shadow-2xl">
            <div className="flex items-center gap-2 text-[10px] font-black text-[#00e5ff] uppercase mb-6 tracking-widest">
              <Filter size={14} /> Filtros de Busca
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-[9px] text-gray-500 font-black uppercase mb-2">Período (Início/Fim)</label>
                <div className="flex gap-2">
                  <input type="date" className="w-full bg-[#0f172a] border border-gray-800 p-2 text-xs text-white focus:border-[#00e5ff]" />
                  <input type="date" className="w-full bg-[#0f172a] border border-gray-800 p-2 text-xs text-white focus:border-[#00e5ff]" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-gray-500 font-black uppercase mb-2">Operador</label>
                <div className="relative">
                  <User className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                  <input type="text" placeholder="Ex: Lucas" className="w-full bg-[#0f172a] border border-gray-800 p-2 pl-8 text-xs text-white focus:border-[#00e5ff]" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-gray-500 font-black uppercase mb-2">Motivo / OS / NF</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                  <input type="text" placeholder="Filtrar referência..." className="w-full bg-[#0f172a] border border-gray-800 p-2 pl-8 text-xs text-white focus:border-[#00e5ff]" />
                </div>
              </div>

              <div className="flex items-end">
                <button className="w-full bg-[#00e5ff] text-black h-[38px] font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all">
                  Gerar Relatório
                </button>
              </div>
            </div>
          </div>

          {/* TABELA DE RESULTADOS */}
          <div className="bg-[#1e293b] border border-gray-800 rounded-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-[#0f172a]/50">
              <span className="text-[10px] text-gray-500 font-black uppercase">Registros Encontrados: 42</span>
              <button className="flex items-center gap-2 text-[10px] font-black text-green-500 border border-green-500/30 px-3 py-1 hover:bg-green-500 hover:text-black transition-all">
                <FileSpreadsheet size={14} /> Exportar Excel
              </button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-[#0f172a] text-gray-600 uppercase font-black tracking-widest border-b border-gray-800">
                <tr>
                  <th className="p-4">Data/Hora</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Ação Realizada</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Motivo/Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                <tr className="hover:bg-[#27354a]/30 transition-colors">
                  <td className="p-4 text-gray-500">14/02/2026 - 12:45</td>
                  <td className="p-4 font-bold text-[#00e5ff]">LUCAS</td>
                  <td className="p-4 text-gray-300">Entrada Lote: 50 un. - Painel Solar 550W</td>
                  <td className="p-4"><span className="bg-green-900/30 text-green-500 px-2 py-0.5 rounded-sm font-black uppercase text-[9px]">Entrada</span></td>
                  <td className="p-4 font-mono text-gray-400 uppercase">NF-55902</td>
                </tr>
                <tr className="hover:bg-[#27354a]/30 transition-colors">
                  <td className="p-4 text-gray-500">14/02/2026 - 10:15</td>
                  <td className="p-4 font-bold text-[#00e5ff]">OPERADOR_01</td>
                  <td className="p-4 text-gray-300">Status Alterado: Projeto Fazenda Sol (SEPARADO)</td>
                  <td className="p-4"><span className="bg-yellow-900/30 text-yellow-500 px-2 py-0.5 rounded-sm font-black uppercase text-[9px]">Status</span></td>
                  <td className="p-4 font-mono text-gray-400 uppercase">OS-778</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* --- MODO: MAIS RELATÓRIOS (ANALYTICS) --- */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up">
          <div className="bg-[#1e293b] border border-gray-800 p-8 rounded-sm group hover:border-[#00e5ff] transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-6">
              <History size={32} className="text-[#00e5ff]" />
              <Download size={18} className="text-gray-700 group-hover:text-white" />
            </div>
            <h3 className="text-xl font-black text-white uppercase mb-2">Histórico por Cliente</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Gere um dossiê completo de todas as entregas e projetos realizados para um cliente específico de Vacaria ou região.
            </p>
            <div className="bg-[#0f172a] p-4 border border-gray-800 flex items-center gap-3">
              <Info size={16} className="text-[#00e5ff]" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Útil para conferência de garantias e assistência técnica.</span>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-gray-800 p-8 rounded-sm group hover:border-[#00e5ff] transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-6">
              <BarChart3 size={32} className="text-[#00e5ff]" />
              <Download size={18} className="text-gray-700 group-hover:text-white" />
            </div>
            <h3 className="text-xl font-black text-white uppercase mb-2">Volume de Saída (Ranking)</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Descubra quais itens do seu inventário possuem o maior giro. Ideal para planejar as próximas compras.
            </p>
            <div className="bg-[#0f172a] p-4 border border-gray-800 flex items-center gap-3">
              <Info size={16} className="text-[#00e5ff]" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Gere a lista dos "Top 10" materiais mais usados nos kits.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}