import React, { useState, useEffect } from 'react';
import { Plus, Clock, PackageCheck, CheckCircle, Printer, Trash2, Eye, X, Search, Wrench, Folder, Edit2, RotateCcw, AlertTriangle, Archive, Calendar } from 'lucide-react';

export default function WorkOrders({ tipoLabel, dbType }) {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewItems, setViewItems] = useState(null);
  
  // ⚓ Função corrigida para usar o fuso horário LOCAL (GMT-3 de Vacaria)
  const getTodayString = () => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(today - tzOffset)).toISOString().slice(0, -1);
    return localISOTime.split('T')[0];
  };

  // ⚓ Novos Estados para a Aba de Entregues (Iniciando no dia correto)
  const [showArchived, setShowArchived] = useState(false);
  const [archiveDate, setArchiveDate] = useState(getTodayString());

  // Estados para Criação / Edição
  const [editingId, setEditingId] = useState(null); 
  const [formData, setFormData] = useState({ name: '', priority: 1 });
  const [stagedItems, setStagedItems] = useState([]); 
  const [currentItem, setCurrentItem] = useState('');
  const [currentQty, setCurrentQty] = useState(1);
  const [searchItem, setSearchItem] = useState('');

  // ⚓ Sistema de Notificação
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, msg: '', onConfirm: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000);
  };

  const requestConfirm = (msg, action) => {
    setConfirmDialog({ show: true, msg, onConfirm: action });
  };

  const load = async () => {
    try {
      const r1 = await fetch('http://https://doubloonsystem.onrender.com/api/work-orders', {
        headers: { 'x-access-token': localStorage.getItem('token') }
      });
      const d1 = await r1.json();
      
      let filteredOrders = d1.filter(o => o.type === dbType);
      
      if (!showArchived) {
        filteredOrders = filteredOrders.filter(o => o.status !== 'entregue');
      }
      setOrders(filteredOrders);

      // ⚓ Busca filtrada por data na aba de Arquivo
      if (showArchived) {
        const rArchive = await fetch(`http://https://doubloonsystem.onrender.com/api/work-orders?status=entregue&date=${archiveDate}`, {
          headers: { 'x-access-token': localStorage.getItem('token') }
        });
        const archData = await rArchive.json();
        setOrders(archData.filter(o => o.type === dbType));
      }
      
      const r2 = await fetch('http://https://doubloonsystem.onrender.com/api/inventory', {
        headers: { 'x-access-token': localStorage.getItem('token') }
      });
      setInventory(await r2.json());
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

  useEffect(() => { load(); }, [dbType, showArchived, archiveDate]);

  const handlePrint = () => { window.print(); };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ name: '', priority: 1 });
    setStagedItems([]);
    setIsModalOpen(true);
  };

  const handleEdit = async (order) => {
    setEditingId(order.id);
    setFormData({ name: order.name, priority: order.priority });
    
    try {
      const res = await fetch(`http://https://doubloonsystem.onrender.com/api/work-orders/${order.id}/items`, {
        headers: { 'x-access-token': localStorage.getItem('token') }
      });
      if (!res.ok) throw new Error("Erro ao buscar itens");
      
      const itemsData = await res.json();
      setStagedItems(itemsData); 
      setIsModalOpen(true);
    } catch (err) {
      showToast("Erro ao carregar dados para edição.", "error");
    }
  };

  const abrirLista = async (order) => {
    const res = await fetch(`http://https://doubloonsystem.onrender.com/api/work-orders/${order.id}/items`, {
      headers: { 'x-access-token': localStorage.getItem('token') }
    });
    setViewItems({ ...order, list: await res.json() });
  };

  const mudarStatus = async (id, novoStatus) => {
    const isEstorno = novoStatus === 'pendente';
    const msg = isEstorno 
      ? `Devolver o status para PENDENTE e estornar o estoque virtual desta Ordem?` 
      : `Confirmar mudança de status para ${novoStatus.toUpperCase()}?`;

    requestConfirm(msg, async () => {
      try {
        const res = await fetch(`http://https://doubloonsystem.onrender.com/api/work-orders/${id}/status`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-access-token': localStorage.getItem('token')
          },
          body: JSON.stringify({ status: novoStatus })
        });
        if(res.ok){
           showToast(isEstorno ? "Estoque virtual estornado com sucesso!" : `Status atualizado: ${novoStatus.toUpperCase()}`);
           load();
        } else {
           showToast("Erro ao tentar alterar o status.", "error");
        }
      } catch (err) { showToast("Falha na comunicação com o servidor.", "error"); }
    });
  };

  const cancelar = (id) => {
    requestConfirm("Atenção: Deseja apagar esta ordem do sistema? Isso não poderá ser desfeito.", async () => {
      const res = await fetch(`http://https://doubloonsystem.onrender.com/api/work-orders/${id}`, { 
        method: 'DELETE',
        headers: { 'x-access-token': localStorage.getItem('token') }
      });
      if(res.ok) { showToast("Ordem cancelada e removida."); load(); }
      else { showToast("Não foi possível excluir. Verifique o status da ordem.", "error"); }
    });
  };

  const addStagedItem = () => {
    if (!currentItem || currentQty <= 0) return;
    const item = inventory.find(i => i.id === parseInt(currentItem));
    if (item) {
      setStagedItems([...stagedItems, { id: item.id, name: item.name, sku: item.sku, quantity: currentQty }]);
      setCurrentItem('');
      setCurrentQty(1);
    }
  };

  const salvarOrdem = async (e) => {
    e.preventDefault();
    if (stagedItems.length === 0) return showToast("Adicione ao menos um item da lista!", "error");

    const payload = { ...formData, type: dbType, items: stagedItems };
    const url = editingId ? `http://https://doubloonsystem.onrender.com/api/work-orders/${editingId}` : 'http://https://doubloonsystem.onrender.com/api/work-orders';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': localStorage.getItem('token')
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(editingId ? "Ordem editada com sucesso!" : "Nova Ordem de Serviço criada!");
        setIsModalOpen(false);
        setStagedItems([]);
        setFormData({ name: '', priority: 1 });
        setEditingId(null);
        load();
      } else { showToast("Erro ao tentar salvar a ordem.", "error"); }
    } catch(err) { showToast("Erro interno no servidor.", "error"); }
  };

  const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchItem.toLowerCase()) || i.sku.toLowerCase().includes(searchItem.toLowerCase()));

  return (
    <div className="p-8 bg-[#0f172a] min-h-screen text-gray-200 relative">
      
      {/* ⚓ TOAST E MODAL CUSTOMIZADO */}
      {toast.show && (
        <div className={`fixed top-10 right-10 p-4 border-l-4 shadow-2xl z-[200] animate-fade-in flex items-center gap-3 ${toast.type === 'error' ? 'bg-[#1a0a0f] border-red-500 text-red-500' : 'bg-[#0a1f24] border-[#00e5ff] text-[#00e5ff]'}`}>
          {toast.type === 'error' ? <X size={20} /> : <CheckCircle size={20} />}
          <span className="text-[10px] font-black uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}

      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4 animate-fade-in">
          <div className="bg-[#1e293b] border border-[#00e5ff] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(0,229,255,0.1)]">
            <AlertTriangle size={48} className="text-[#00e5ff] mx-auto mb-6" />
            <h3 className="text-white font-black uppercase tracking-widest mb-2 text-lg">Confirmação de Operação</h3>
            <p className="text-gray-400 text-xs mb-8">{confirmDialog.msg}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog({ show: false, msg: '', onConfirm: null })} className="flex-1 bg-gray-800 text-white py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#00e5ff] hover:text-black transition-all">Cancelar</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ show: false, msg: '', onConfirm: null }); }} className="flex-1 bg-[#00e5ff] text-black py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER E CONTROLES DE ABA */}
      <div className="flex justify-between items-end mb-10 border-b border-gray-800 pb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-[#00e5ff] uppercase tracking-widest flex items-center gap-3">
            {dbType === 'kit' ? <Wrench size={28} /> : <Folder size={28} />}
            {showArchived ? `Arquivo de ${tipoLabel}` : tipoLabel}
          </h1>
          <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-widest">Ordens de Serviços</p>
        </div>
        
        <div className="flex gap-4 items-center">
          {/* ⚓ Estética Melhorada do Calendário */}
          {showArchived && (
            <div className="flex items-center gap-2 mr-2 bg-[#1e293b] border border-gray-700 px-3 py-1.5 hover:border-[#00e5ff] transition-all">
              <Calendar size={14} className="text-[#00e5ff]"/>
              <input 
                type="date" 
                value={archiveDate} 
                onChange={(e) => setArchiveDate(e.target.value)} 
                className="bg-transparent text-[10px] text-white font-mono outline-none cursor-pointer" 
              />
            </div>
          )}
          
          <button 
            onClick={() => {setShowArchived(!showArchived); setArchiveDate(getTodayString());}} 
            className={`px-4 py-2.5 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all ${showArchived ? 'bg-white text-black' : 'bg-[#1e293b] text-gray-400 border border-gray-700 hover:border-[#00e5ff] hover:text-[#00e5ff]'}`}
          >
            <Archive size={14}/> {showArchived ? 'Voltar para Ativos' : 'Acessar Entregues'}
          </button>
          
          {!showArchived && (
            <button onClick={handleOpenNew} className="bg-[#00e5ff] text-black px-6 py-2.5 font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-lg">
              + Novo {tipoLabel.slice(0,-1)}
            </button>
          )}
        </div>
      </div>

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
        {orders.map(o => (
          <div key={o.id} className={`bg-[#1e293b] border-t-4 p-6 shadow-xl flex flex-col justify-between min-h-[220px] relative overflow-hidden group ${o.priority === 3 ? 'border-red-500' : o.priority === 2 ? 'border-yellow-500' : 'border-gray-700'}`}>
            
            {showArchived && <div className="absolute top-0 right-0 bg-[#0f172a]/50 w-full h-full z-0 pointer-events-none"></div>}

            <div className="relative z-10">
              <div className="flex justify-between text-[9px] font-black uppercase mb-4">
                <span className="text-gray-500 bg-[#0f172a] px-2 py-1 rounded-sm border border-gray-800">OS-{o.id}</span>
                <span className={`px-2 py-1 rounded-sm flex items-center gap-1 ${
                  o.status === 'pendente' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-500' : 
                  o.status === 'separado' ? 'bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff]' : 'bg-green-500/10 border border-green-500/30 text-green-500'
                }`}>
                  {o.status === 'entregue' && <CheckCircle size={10}/>} {o.status}
                </span>
              </div>
              <h3 className={`text-lg font-black uppercase mb-6 leading-tight ${showArchived ? 'text-gray-400' : 'text-white'}`}>{o.name}</h3>
            </div>

            <div className="space-y-2 relative z-10">
              <div className="flex gap-2">
                <button onClick={() => abrirLista(o)} className="flex-1 bg-[#0f172a] border border-gray-800 p-2 text-[9px] font-black uppercase hover:bg-[#00e5ff] hover:text-black hover:border-[#00e5ff] transition-all flex items-center justify-center gap-2">
                  <Eye size={12}/> Ver Lista
                </button>
                {o.status !== 'entregue' && (
                  <>
                    <button onClick={() => handleEdit(o)} className="bg-gray-800 text-white p-2 hover:bg-[#00e5ff] hover:text-black transition-all" title="Editar Ordem">
                      <Edit2 size={14}/>
                    </button>
                    <button onClick={() => cancelar(o.id)} className="bg-red-500/10 border border-red-500/30 text-red-500 p-2 hover:bg-red-500 hover:text-white transition-all" title="Cancelar e Excluir">
                      <Trash2 size={14}/>
                    </button>
                  </>
                )}
              </div>

              {o.status === 'pendente' && (
                <button onClick={() => mudarStatus(o.id, 'separado')} className="w-full bg-yellow-500 text-black py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-all">
                  <Clock size={14} /> Separar Materiais
                </button>
              )}
              {o.status === 'separado' && (
                <div className="flex gap-2">
                  <button onClick={() => mudarStatus(o.id, 'pendente')} className="bg-gray-800 text-gray-400 p-2.5 hover:bg-yellow-500 hover:text-black transition-all" title="Voltar para Pendente (Estorna Estoque Virtual)">
                    <RotateCcw size={14} />
                  </button>
                  <button onClick={() => mudarStatus(o.id, 'entregue')} className="flex-1 bg-[#00e5ff] text-black py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-all shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                    <PackageCheck size={14} /> Confirmar Entrega
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="col-span-3 text-center py-20 border-2 border-dashed border-gray-800">
             <PackageCheck size={32} className="text-gray-700 mx-auto mb-4" />
             <p className="text-gray-500 uppercase font-black text-xs tracking-widest">
               {showArchived ? "Nenhum arquivo encontrado nesta data." : "Nenhuma Ordem de Serviço encontrada."}
             </p>
             {showArchived && <p className="text-gray-600 font-bold text-[9px] mt-2">Dica: Selecione outra data no calendário acima.</p>}
          </div>
        )}
      </div>

      {/* MODAL CRIAÇÃO/EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#1e293b] border border-[#00e5ff] w-full max-w-2xl p-10 shadow-[0_0_50px_rgba(0,229,255,0.2)] relative">
            <button onClick={() => { setIsModalOpen(false); setStagedItems([]); setEditingId(null); }} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
            <h2 className="text-[#00e5ff] font-black uppercase tracking-widest text-sm flex items-center gap-2 mb-8 border-b border-gray-800 pb-4">
              {editingId ? <Edit2 size={18}/> : <Plus size={18}/>}
              {editingId ? `Editar ${tipoLabel.slice(0, -1)}` : `Montar Novo ${tipoLabel.slice(0, -1)}`}
            </h2>

            <form onSubmit={salvarOrdem} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-2 tracking-widest">Nome / Identificação</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 p-3 text-white text-xs outline-none focus:border-[#00e5ff] uppercase font-bold" placeholder="EX: KIT SOLAR 500W" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-2 tracking-widest">Prioridade</label>
                  <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})} className="w-full bg-[#0f172a] border border-gray-700 p-3 text-white text-xs outline-none focus:border-[#00e5ff] uppercase font-bold cursor-pointer">
                    <option value={1}>1 - Aguardar Confirmação</option>
                    <option value={2}>2 - Separar Material</option>
                    <option value={3}>3 - Urgente</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#0f172a] p-6 border border-gray-800">
                <label className="block text-[10px] text-[#00e5ff] font-black uppercase mb-4 tracking-widest">Localizar Materiais no Estoque</label>
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-4 top-3 text-[#00e5ff]" />
                    <input type="text" placeholder="FILTRAR POR NOME OU SKU..." className="w-full bg-[#1e293b] border border-gray-700 p-2.5 pl-10 text-[10px] outline-none focus:border-[#00e5ff] uppercase" value={searchItem} onChange={(e) => setSearchItem(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <select value={currentItem} onChange={(e) => setCurrentItem(e.target.value)} className="flex-1 bg-[#1e293b] border border-gray-700 p-3 text-white text-xs uppercase outline-none focus:border-[#00e5ff] cursor-pointer font-bold">
                      <option value="">Selecione o material...</option>
                      {filteredInventory.map(i => <option key={i.id} value={i.id}>{i.sku} - {i.name}</option>)}
                    </select>
                    <input type="number" min="1" value={currentQty === 0 ? '' : currentQty} onChange={(e) => setCurrentQty(parseInt(e.target.value) || 0)} className="w-20 bg-[#1e293b] border border-gray-700 p-3 text-white text-xs text-center outline-none focus:border-[#00e5ff]" placeholder="Qtd" />
                    <button type="button" onClick={addStagedItem} className="bg-[#00e5ff] text-black px-5 hover:bg-white transition-all"><Plus size={16}/></button>
                  </div>
                </div>

                <div className="mt-6 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {stagedItems.map((si, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-[#1e293b] p-3 text-[10px] font-bold border-l-2 border-[#00e5ff]">
                      <span className="uppercase text-gray-300"><strong className="text-[#00e5ff] text-xs mr-2">{si.quantity}x</strong> {si.name} <span className="text-gray-600 font-mono ml-2">[{si.sku}]</span></span>
                      <button type="button" onClick={() => setStagedItems(stagedItems.filter((_, i) => i !== idx))} className="text-red-500 hover:text-white transition-colors"><Trash2 size={14}/></button>
                    </div>
                  ))}
                  {stagedItems.length === 0 && <p className="text-[10px] text-gray-600 text-center py-4 italic font-bold">A lista de separação está vazia.</p>}
                </div>
              </div>

              <button type="submit" className="w-full bg-[#00e5ff] text-black font-black uppercase text-xs py-5 hover:bg-white transition-all tracking-[0.3em] shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                {editingId ? 'Gravar Alterações' : 'Confirmar e Gerar OS'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESSÃO / VISUALIZAÇÃO */}
      {viewItems && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white text-black w-full max-w-2xl p-10 shadow-2xl relative">
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8 print:hidden">
              <h2 className="font-black uppercase text-xl flex items-center gap-2"><Printer size={20}/> Lista de Separação</h2>
              <div className="flex gap-4">
                <button onClick={handlePrint} className="bg-black text-white px-6 py-2 text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-[#00e5ff] hover:text-black transition-all shadow-lg"><Printer size={14}/> Imprimir OS</button>
                <button onClick={() => setViewItems(null)} className="text-gray-400 hover:text-red-600 transition-all"><X size={28}/></button>
              </div>
            </div>
            
            <div className="mb-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-500 tracking-widest mb-1">Identificação / Cliente</p>
                  <h1 className="text-3xl font-black uppercase leading-tight">{viewItems.name}</h1>
                </div>
                <div className="text-right border-l-2 border-gray-200 pl-6">
                  <p className="text-[10px] font-bold uppercase text-gray-500 tracking-widest mb-1">Status Atual</p>
                  <p className="font-black uppercase text-sm border-2 border-black px-2 py-1">{viewItems.status}</p>
                </div>
              </div>
              <p className="text-xs mt-6 font-mono border-t pt-2 border-gray-300 flex justify-between font-bold">
                <span>ORDEM: OS-{viewItems.id}</span>
                <span>DATA EMISSÃO: {new Date().toLocaleDateString('pt-BR')}</span>
              </p>
            </div>

            <table className="w-full text-left border-collapse mb-12">
              <thead>
                <tr className="border-b-2 border-black text-[10px] uppercase font-black bg-gray-100">
                  <th className="py-3 px-2">Código SKU</th>
                  <th className="py-3 px-2">Descrição do Material</th>
                  <th className="text-center py-3 px-2">Volume/Qtd</th>
                  <th className="text-center py-3 px-2 print:hidden">Check</th>
                </tr>
              </thead>
              <tbody>
                {viewItems.list.map((li, i) => (
                  <tr key={i} className="border-b border-gray-200 text-sm">
                    <td className="py-4 px-2 font-mono text-xs text-gray-600">{li.sku}</td>
                    <td className="py-4 px-2 font-black uppercase">{li.name}</td>
                    <td className="py-4 px-2 text-center font-black text-lg">{li.quantity}</td>
                    <td className="py-4 px-2 text-center print:hidden">
                       <input type="checkbox" className="w-5 h-5 accent-black cursor-pointer" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-20 border-t-2 border-black pt-4 flex justify-between items-center text-[9px] uppercase font-black tracking-widest">
              <div>Vacaria Operations - Sistema Doubloon</div>
              <div className="border-t-2 border-black px-12 pt-2 mt-[-16px]">Assinatura do Responsável</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}