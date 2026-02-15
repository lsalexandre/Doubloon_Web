import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip
} from 'recharts';
import { 
  Package, Folder, Wrench, Activity, History, ArrowRight, PackageCheck, RotateCcw
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    kits: { total: 0, pending: false }, 
    projetos: { total: 0, pending: false }, 
    criticalCount: 0 
  });
  
  const [inventory, setInventory] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  
  // ⚓ Novo Estado para a Timeline
  const [timeline, setTimeline] = useState([]);

  const token = localStorage.getItem('token');
  const headers = { 'x-access-token': token };

  const loadBaseData = async () => {
    try {
      const rStats = await fetch('https://doubloonsystem.onrender.com/api/dashboard-stats', { headers });
      setStats(await rStats.json());

      const rInv = await fetch('https://doubloonsystem.onrender.com/api/inventory', { headers });
      const invData = await rInv.json();
      setInventory(invData);

      const rLogs = await fetch('https://doubloonsystem.onrender.com/api/logs?limit=5', { headers });
      setRecentLogs(await rLogs.json());
    } catch (err) { console.error("Erro base:", err); }
  };

  // ⚓ Nova Função de Busca para a Timeline
  const loadTimeline = async () => {
    try {
      const res = await fetch('https://doubloonsystem.onrender.com/api/analytics/timeline', { headers });
      setTimeline(await res.json());
    } catch (err) { console.error("Erro timeline:", err); }
  };

  useEffect(() => { 
    loadBaseData(); 
    loadTimeline(); 
  }, []);

  const healthyCount = inventory.filter(i => i.virtual_stock >= i.alert_minimum).length;
  const criticalCount = inventory.filter(i => i.alert_minimum > 0 && i.virtual_stock < i.alert_minimum).length;
  
  const pieData = [
    { name: 'Saudável', value: healthyCount || 1, color: '#00e5ff' },
    { name: 'Crítico', value: criticalCount || 0, color: '#ef4444' }
  ];

  return (
    <div className="p-8 bg-[#0f172a] min-h-screen text-gray-200 animate-fade-in">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-[#00e5ff] uppercase tracking-[0.2em]">Painel de Controle</h1>
        <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest italic">Mural de Informações </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div onClick={() => navigate('/kits')} className={`cursor-pointer bg-[#1e293b] border-l-4 p-6 shadow-xl hover:translate-y-[-4px] transition-all ${stats.kits.pending ? 'border-yellow-500' : 'border-green-500'}`}>
          <h3 className="text-[9px] text-gray-500 font-black uppercase mb-2 italic">Kits Ativos</h3>
          <p className="text-2xl font-black text-white">{stats.kits.total}</p>
        </div>
        <div onClick={() => navigate('/projetos')} className={`cursor-pointer bg-[#1e293b] border-l-4 p-6 shadow-xl hover:translate-y-[-4px] transition-all ${stats.projetos.pending ? 'border-yellow-500' : 'border-green-500'}`}>
          <h3 className="text-[9px] text-gray-500 font-black uppercase mb-2 italic">Projetos</h3>
          <p className="text-2xl font-black text-white">{stats.projetos.total}</p>
        </div>
        <div onClick={() => navigate('/inventory?filter=critical')} className="cursor-pointer bg-[#1e293b] border-l-4 border-red-500 p-6 shadow-xl hover:translate-y-[-4px] transition-all">
          <h3 className="text-[9px] text-gray-500 font-black uppercase mb-2 italic">Críticos</h3>
          <p className="text-2xl font-black text-red-500">{stats.criticalCount}</p>
        </div>
        
        {/* STATUS DO SERVIDOR */}
        <div className="bg-[#1e293b] border-l-4 border-[#00e5ff] p-6 shadow-xl">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[9px] text-gray-500 font-black uppercase italic">Servidor</h3>
            <Activity size={14} className="text-[#00e5ff] animate-pulse" />
          </div>
          <p className="text-2xl font-black text-white uppercase">Online</p>
          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">DB: PostgreSQL</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        
        {/* GRÁFICO DA PIZZA */}
        <div className="bg-[#1e293b] border border-gray-800 p-6 shadow-2xl h-[380px] flex flex-col">
          <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-6 flex items-center gap-2 italic">
            <Activity size={14} className="text-[#00e5ff]" /> Saúde do Inventário (Hoje)
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px' }} 
                  itemStyle={{ color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ⚓ TIMELINE DE OPERAÇÕES ESTILIZADA (Substitui o Gráfico de Barras) */}
        <div className="bg-[#1e293b] border border-gray-800 p-6 shadow-2xl h-[380px] flex flex-col overflow-hidden">
          <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2 italic mb-6">
            <Activity size={14} className="text-[#00e5ff]" /> Fluxo de Operações Recentes
          </h3>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative">
            {/* A Linha Vertical */}
            <div className="absolute left-[17px] top-2 bottom-2 w-[2px] bg-gray-800"></div>

            <div className="space-y-6 relative">
              {timeline.map((log) => {
                // ⚓ Lógica Inteligente para escolher o Ícone e a Cor com base no texto
                const isOp = log.category === 'OPERACAO';
                const isMov = log.category === 'MOVIMENTACAO';
                const isInv = log.category === 'INVENTARIO';
                const desc = log.description.toUpperCase();
                
                // Refinamento de Ícones
                let IconComponent = History;
                let colorClass = 'border-gray-600 text-gray-400';
                
                if (isOp) {
                  colorClass = 'border-[#00e5ff] text-[#00e5ff]';
                  IconComponent = Wrench;
                  if (desc.includes('PEDIDO')) IconComponent = Folder;
                  if (desc.includes('ESTORNO')) { IconComponent = RotateCcw; colorClass = 'border-yellow-500 text-yellow-500'; }
                  if (desc.includes('ENTREGA')) { IconComponent = PackageCheck; colorClass = 'border-green-500 text-green-500'; }
                } else if (isMov) {
                  colorClass = 'border-green-500 text-green-500';
                  IconComponent = ArrowRight;
                  if (desc.includes('SAÍDA')) { colorClass = 'border-yellow-500 text-yellow-500'; }
                } else if (isInv) {
                  colorClass = 'border-purple-500 text-purple-500';
                  IconComponent = Package;
                }

                return (
                  <div key={log.id} className="flex gap-6 items-start group">
                    {/* O Nódulo (Círculo com Ícone) */}
                    <div className={`z-10 bg-[#0f172a] w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${colorClass}`}>
                      <IconComponent size={16} />
                    </div>

                    {/* Conteúdo do Evento */}
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isOp && !desc.includes('ESTORNO') && !desc.includes('ENTREGA') ? 'text-[#00e5ff]' : 
                          isMov || desc.includes('ENTREGA') ? 'text-green-500' : 
                          desc.includes('ESTORNO') || desc.includes('SAÍDA') ? 'text-yellow-500' : 'text-gray-400'
                        }`}>
                          {log.category}
                        </span>
                        <span className="text-[9px] font-mono text-gray-600">
                          {new Date(log.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-gray-200 uppercase leading-snug">
                        {log.description}
                      </p>
                    </div>
                  </div>
                );
              })}

              {timeline.length === 0 && (
                <p className="text-center py-20 text-[10px] text-gray-600 font-black uppercase italic">
                  Nenhuma operação registrada hoje.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] border border-gray-800 shadow-2xl rounded-sm">
        <div onClick={() => navigate('/logs')} className="p-4 border-b border-gray-800 flex justify-between items-center cursor-pointer group hover:bg-[#27354a]/50">
          <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2 italic">
            <History size={14} className="text-[#00e5ff]" /> Últimos Eventos de Auditoria
          </h3>
          <span className="text-[9px] font-black uppercase text-[#00e5ff] flex items-center gap-1">
            Ver Central de Logs <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform"/>
          </span>
        </div>
        <div className="divide-y divide-gray-800/50">
          {recentLogs.map((log) => (
            <div key={log.id} className="p-4 flex justify-between items-center hover:bg-[#27354a]/30 transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-mono text-gray-600">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</span>
                <span className="text-[10px] font-bold uppercase text-gray-300">{log.description}</span>
              </div>
              <span className={`text-[8px] px-2 py-0.5 font-black uppercase rounded-sm border ${log.category === 'SEGURANCA' ? 'border-red-900/50 text-red-500' : 'border-gray-800 text-gray-500'}`}>{log.category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}