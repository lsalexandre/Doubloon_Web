import React, { useState, useEffect } from 'react';
import { History, Shield, Search, X, Download, Filter, User } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // ⚓ Função corrigida para usar o fuso horário LOCAL (GMT-3 de Vacaria)
  const getTodayString = () => {
    const today = new Date();
    // Subtrai o offset do fuso horário para garantir que o ISO seja gerado no dia local
    const tzOffset = today.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(today - tzOffset)).toISOString().slice(0, -1);
    return localISOTime.split('T')[0];
  };

  const [filters, setFilters] = useState({
    startDate: getTodayString(),
    endDate: getTodayString(),
    category: 'TODAS',
    searchTerm: ''
  });

  const carregarLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.category !== 'TODAS') params.append('category', filters.category);
      if (filters.searchTerm) params.append('search', filters.searchTerm);

      const response = await fetch(`https://doubloonsystem.onrender.com/api/logs?${params.toString()}`, {
        headers: { 'x-access-token': localStorage.getItem('token') }
      });
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.error("Erro ao carregar logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, []);

  const limparFiltros = () => {
    setFilters({ startDate: getTodayString(), endDate: getTodayString(), category: 'TODAS', searchTerm: '' });
    setTimeout(() => carregarLogs(), 50); 
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(0, 229, 255);
    doc.text('DOUBLOON SYSTEM - RELATORIO DE AUDITORIA', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Unidade: Vacaria Operations`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 33);
    doc.text(`Operador: ${localStorage.getItem('user') || 'Acesso Restrito'}`, 14, 38);
    
    const periodoStr = filters.startDate === filters.endDate 
      ? `Data: ${filters.startDate.split('-').reverse().join('/')}`
      : `Período: ${filters.startDate.split('-').reverse().join('/')} a ${filters.endDate.split('-').reverse().join('/')}`;
    doc.text(`Filtro Aplicado: ${periodoStr}`, 14, 43);

    // Adicionamos a coluna "Operador" na tabela do PDF para auditoria completa
    const tableColumn = ["Data/Hora", "Evento / Descricao", "Operador", "Categoria"];
    const tableRows = logs.map(log => [
      new Date(log.created_at).toLocaleString('pt-BR'),
      log.description.toUpperCase(),
      (log.username || 'SISTEMA').toUpperCase(),
      log.category
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 25 }, 3: { cellWidth: 25 } }
    });

    doc.save(`relatorio_auditoria_doubloon_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="p-8 bg-[#0f172a] min-h-screen text-gray-200">
      
      {/* CABEÇALHO */}
      <div className="mb-10 flex justify-between items-end border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#00e5ff] uppercase tracking-[0.2em]">Relatórios & Logs</h1>
          <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-widest">Auditoria de Operações</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={exportarPDF}
            disabled={logs.length === 0}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#00e5ff] transition-all disabled:opacity-30"
          >
            <Download size={14} /> Exportar PDF
          </button>
          <div className="h-8 w-[1px] bg-gray-800"></div>
          <div className="text-right">
            <p className="text-[8px] text-gray-500 uppercase font-black">Registros Encontrados</p>
            <p className="text-sm font-black text-[#00e5ff]">{logs.length}</p>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS AVANÇADA */}
      <div className="bg-[#1e293b] p-6 mb-8 border border-gray-800 rounded-sm shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          
          {/* BUSCA LIVRE */}
          <div className="md:col-span-2">
            <label className="block text-[9px] text-gray-500 font-black uppercase mb-2 italic">Pesquisa por Motivo, Cliente ou Peça</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-[#00e5ff]" />
              <input 
                type="text" 
                placeholder="EX: NF-8890, CONECTOR XLT, AJUSTE..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && carregarLogs()}
                className="w-full bg-[#0f172a] border border-[#00e5ff] pl-10 p-2.5 text-xs text-white outline-none focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] uppercase placeholder:text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-gray-500 font-black uppercase mb-2 italic">Categoria do Sistema</label>
            <select 
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="w-full bg-[#0f172a] border border-gray-700 p-2.5 text-xs text-white outline-none focus:border-[#00e5ff] uppercase font-bold cursor-pointer"
            >
              <option value="TODAS">Categorias: Todas</option>
              <option value="INVENTARIO">Gestão de Inventário</option>
              <option value="MOVIMENTACAO">Fluxo de Carga (In/Out)</option>
              <option value="OPERACAO">Ordem de Serviço (Kits/Projetos)</option>
              <option value="SEGURANCA">Controle de Acesso</option>
              <option value="SISTEMA">Alertas do Sistema</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={carregarLogs} className="flex-1 bg-[#00e5ff] text-black py-2.5 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg">
              <Filter size={14} /> Aplicar
            </button>
            <button onClick={limparFiltros} className="bg-gray-800 text-gray-400 p-2.5 hover:bg-red-500 hover:text-white transition-all" title="Restaurar para Hoje">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* CALENDÁRIO (Linha inferior) */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-gray-800/50">
           <div className="flex items-center gap-3">
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Período:</span>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="bg-[#0f172a] border border-gray-700 p-1.5 text-[10px] text-[#00e5ff] font-mono outline-none focus:border-[#00e5ff] cursor-pointer"
            />
            <span className="text-gray-600 text-[10px]">Até</span>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="bg-[#0f172a] border border-gray-700 p-1.5 text-[10px] text-[#00e5ff] font-mono outline-none focus:border-[#00e5ff] cursor-pointer"
            />
           </div>
        </div>
      </div>

      {/* LISTAGEM DE LOGS */}
      <div className="space-y-2 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm h-32">
            <p className="text-[#00e5ff] font-black animate-pulse uppercase text-xs tracking-widest flex items-center gap-2">
              <Search size={14} className="animate-spin"/> Vasculhando Arquivos...
            </p>
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="bg-[#1e293b] border-l-2 border-[#00e5ff] p-4 flex justify-between items-center group hover:bg-[#27354a] transition-all">
            <div className="flex items-center gap-6 flex-1">
              <div className="flex flex-col border-r border-gray-700 pr-6 min-w-[100px]">
                <span className="text-[9px] font-mono text-gray-500 uppercase">
                  {new Date(log.created_at).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-[9px] font-mono text-[#00e5ff]">
                  {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase text-gray-300 tracking-wide">
                {log.description}
              </span>
            </div>
            
            {/* ⚓ Adicionada a seção do Operador e Categoria juntas */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-gray-500 bg-[#0f172a] px-2 py-1 border border-gray-800 rounded-sm">
                <User size={10} className="text-[#00e5ff]"/> 
                {log.username || 'SISTEMA'}
              </div>
              
              <span className={`text-[8px] px-2 py-1 font-bold uppercase tracking-widest rounded-sm ${
                log.category === 'SEGURANCA' ? 'bg-red-500/10 border border-red-500/30 text-red-500' : 
                log.category === 'MOVIMENTACAO' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-500' :
                'bg-[#0f172a] border border-gray-700 text-gray-400'
              }`}>
                {log.category}
              </span>
            </div>
          </div>
        ))}

        {logs.length === 0 && !loading && (
          <div className="text-center py-20 border-2 border-dashed border-gray-800 flex flex-col items-center justify-center">
             <History size={32} className="text-gray-700 mb-4" />
             <p className="text-gray-500 uppercase font-black text-xs tracking-widest">Nenhuma operação detectada com estes parâmetros.</p>
             <p className="text-gray-600 text-[9px] font-bold mt-2">Dica: Verifique as datas ou tente usar termos mais simples na busca.</p>
          </div>
        )}
      </div>
    </div>
  );
}