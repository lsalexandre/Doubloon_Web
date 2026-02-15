import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, Search, Plus, Trash2, FileText, X, AlertTriangle, CheckCircle, CalendarClock } from 'lucide-react';

export default function Movements() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [operation, setOperation] = useState('entrada');
  
  // Modais
  const [isNFModalOpen, setIsNFModalOpen] = useState(false);
  const [isRetroModalOpen, setIsRetroModalOpen] = useState(false);
  
  // NF State
  const [nfReason, setNfReason] = useState('');
  const [nfItems, setNfItems] = useState([]);
  const [nfSearch, setNfSearch] = useState('');

  // Retroativo State
  const [retroData, setRetroData] = useState({ itemId: '', quantity: 0, operation: 'saida', reason: '', date: '' });
  const [retroSearch, setRetroSearch] = useState('');

  // ⚓ Sistema Customizado de Alertas e Confirmações
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, msg: '', onConfirm: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000);
  };

  const requestConfirm = (msg, action) => {
    setConfirmDialog({ show: true, msg, onConfirm: action });
  };

  const load = () => {
    fetch('https://doubloonsystem.onrender.com/api/inventory', {
      headers: { 'x-access-token': localStorage.getItem('token') }
    })
      .then(res => res.json())
      .then(setItems)
      .catch(err => console.error("Erro ao carregar inventário:", err));
  };

  useEffect(() => { load(); }, []);

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));
  const filteredNfItems = items.filter(i => i.name.toLowerCase().includes(nfSearch.toLowerCase()) || i.sku.toLowerCase().includes(nfSearch.toLowerCase()));
  const filteredRetroItems = items.filter(i => i.name.toLowerCase().includes(retroSearch.toLowerCase()) || i.sku.toLowerCase().includes(retroSearch.toLowerCase()));

  // ⚓ Disparo Seguro de Movimentação (Imune a HTML feio)
  const executeMove = async (payload, successMsg) => {
    try {
      const res = await fetch('https://doubloonsystem.onrender.com/api/inventory/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': localStorage.getItem('token') },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        showToast(successMsg, 'success');
        load();
        return true;
      } else {
        const isHtml = res.headers.get('content-type')?.includes('text/html');
        if (isHtml) {
           showToast("Erro do Servidor. Ação abortada.", 'error');
        } else {
           const msg = await res.text();
           showToast(msg || "Erro ao processar movimentação.", 'error');
        }
        return false;
      }
    } catch (err) {
      showToast("Erro de conexão com o banco de dados.", 'error');
      return false;
    }
  };

  // 1. Movimentação Avulsa (Moderna e com Toast)
  const handleSimpleMove = (e) => {
    e.preventDefault();
    if (!selectedItem || quantity <= 0 || !reason) return showToast("Preencha todos os campos!", "error");

    requestConfirm(`Confirma a ${operation.toUpperCase()} de ${quantity} unidades?`, async () => {
      const success = await executeMove({ itemId: selectedItem, quantity, operation, reason }, `Operação de ${operation.toUpperCase()} registrada com sucesso!`);
      if (success) { setSelectedItem(''); setQuantity(0); setReason(''); }
    });
  };

  // 2. Lançamento Retroativo (Novo Recurso)
  const handleRetroMove = (e) => {
    e.preventDefault();
    if (!retroData.itemId || retroData.quantity <= 0 || !retroData.reason || !retroData.date) return showToast("Preencha todos os campos e a data!", "error");

    requestConfirm(`Lançar ${retroData.operation.toUpperCase()} retroativa para a data ${new Date(retroData.date).toLocaleDateString('pt-BR')}?`, async () => {
      const success = await executeMove({ ...retroData, isRetroactive: true }, "Lançamento retroativo ajustado no estoque!");
      if (success) { 
        setRetroData({ itemId: '', quantity: 0, operation: 'saida', reason: '', date: '' });
        setIsRetroModalOpen(false);
      }
    });
  };

  // 3. Nota Fiscal (Moderna e com Toast)
  const addNfItem = () => {
    if (!selectedItem || quantity <= 0) return;
    const item = items.find(i => i.id === parseInt(selectedItem));
    if (item) {
      setNfItems([...nfItems, { id: item.id, name: item.name, quantity }]);
      setSelectedItem(''); setQuantity(0); setNfSearch('');
    }
  };

  const saveNF = () => {
    if (!nfReason || nfItems.length === 0) return showToast("Preencha o motivo e adicione itens!", "error");

    requestConfirm(`Processar Nota Fiscal com ${nfItems.length} itens?`, async () => {
      const res = await fetch('https://doubloonsystem.onrender.com/api/inventory/bulk-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': localStorage.getItem('token') },
        body: JSON.stringify({ reason: nfReason, items: nfItems })
      });

      if (res.ok) {
        showToast("Nota Fiscal registrada e estoque atualizado!");
        setIsNFModalOpen(false); setNfReason(''); setNfItems([]); load();
      } else {
        showToast("Erro ao processar a Nota Fiscal.", "error");
      }
    });
  };

  return (
    <div className="p-8 bg-[#0f172a] min-h-screen text-gray-200 relative">
      
      {/* ⚓ TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed top-10 right-10 p-4 border-l-4 shadow-2xl z-[200] animate-fade-in flex items-center gap-3 ${toast.type === 'error' ? 'bg-[#1a0a0f] border-red-500 text-red-500' : 'bg-[#0a1f24] border-[#00e5ff] text-[#00e5ff]'}`}>
          {toast.type === 'error' ? <X size={20} /> : <CheckCircle size={20} />}
          <span className="text-[10px] font-black uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}

      {/* ⚓ MODAL DE CONFIRMAÇÃO */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4 animate-fade-in">
          <div className="bg-[#1e293b] border border-[#00e5ff] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(0,229,255,0.1)]">
            <AlertTriangle size={48} className="text-[#00e5ff] mx-auto mb-6" />
            <h3 className="text-white font-black uppercase tracking-widest mb-2 text-lg">Confirmação</h3>
            <p className="text-gray-400 text-xs mb-8">{confirmDialog.msg}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog({ show: false, msg: '', onConfirm: null })} className="flex-1 bg-gray-800 text-white py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#00e5ff] hover:text-black transition-all">Cancelar</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ show: false, msg: '', onConfirm: null }); }} className="flex-1 bg-[#00e5ff] text-black py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black text-[#00e5ff] uppercase tracking-widest">Movimentações</h1>
          <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Controle de Fluxo de Carga</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsRetroModalOpen(true)} className="bg-gray-800 text-white px-6 py-2 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-[#00e5ff] hover:text-black transition-all">
            <CalendarClock size={14}/> Lançamento Passado
          </button>
          <button onClick={() => setIsNFModalOpen(true)} className="bg-[#00e5ff] text-black px-6 py-2 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-white transition-all shadow-lg">
            <FileText size={14}/> Dar Entrada na Nota
          </button>
        </div>
      </div>

      {/* ⚓ FORMULÁRIO CENTRALIZADO (O segredo está no mx-auto) */}
      <div className="max-w-3xl mx-auto bg-[#1e293b] p-10 border border-gray-800 shadow-2xl mt-10">
        <h2 className="text-[#00e5ff] font-black uppercase text-sm mb-8 border-b border-gray-800 pb-4 flex items-center gap-2">
          <ArrowUpCircle size={18}/> Movimentação Avulsa Diária
        </h2>
        <form onSubmit={handleSimpleMove} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block tracking-widest">Operação</label>
              <select value={operation} onChange={e => setOperation(e.target.value)} className="w-full bg-[#0f172a] p-4 text-xs border border-gray-700 uppercase outline-none focus:border-[#00e5ff] font-bold">
                <option value="entrada">Entrada no Estoque (+)</option>
                <option value="saida">Saída do Estoque (-)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block tracking-widest">Quantidade</label>
              <input type="number" required min="1" value={quantity === 0 ? '' : quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} className="w-full bg-[#0f172a] p-4 text-xs border border-gray-700 outline-none focus:border-[#00e5ff] font-bold" />
            </div>
          </div>
          
          <div className="bg-[#0f172a] p-6 border border-gray-800">
            <label className="text-[10px] font-black text-[#00e5ff] uppercase mb-4 block tracking-widest">Localizar e Selecionar Peça</label>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-4 top-4 text-gray-500" />
                <input type="text" placeholder="FILTRAR POR NOME OU SKU..." className="w-full bg-[#1e293b] border border-gray-700 p-3 pl-10 text-[10px] outline-none focus:border-[#00e5ff] uppercase" value={search} onChange={(e) => setSearch(e.target.value)}/>
              </div>
              <select required value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="w-full bg-[#1e293b] p-4 text-xs border border-gray-700 uppercase outline-none focus:border-[#00e5ff] font-bold">
                <option value="">SELECIONE NA LISTA...</option>
                {filteredItems.map(i => <option key={i.id} value={i.id}>{i.sku} - {i.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block tracking-widest">Motivo / Observação</label>
            <input required placeholder="EX: AJUSTE DE INVENTÁRIO, PEÇA DANIFICADA..." value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-[#0f172a] p-4 text-xs border border-gray-700 uppercase outline-none focus:border-[#00e5ff] font-bold" />
          </div>

          <button type="submit" className="w-full bg-[#00e5ff] text-black font-black py-5 uppercase text-xs tracking-[0.3em] hover:bg-white transition-all shadow-[0_0_20px_rgba(0,229,255,0.2)]">
            Executar Movimentação
          </button>
        </form>
      </div>

      {/* ⚓ NOVO MODAL: LANÇAMENTO RETROATIVO */}
      {isRetroModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#1e293b] border border-[#00e5ff] w-full max-w-xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-[#00e5ff] font-black uppercase text-sm tracking-widest flex items-center gap-2">
                <CalendarClock size={18}/> Ajuste de Data Passada
              </h2>
              <button onClick={() => setIsRetroModalOpen(false)} className="text-gray-500 hover:text-white"><X/></button>
            </div>
            <form onSubmit={handleRetroMove} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">Data Exata da Operação</label>
                  <input type="date" required value={retroData.date} onChange={e => setRetroData({...retroData, date: e.target.value})} className="w-full bg-[#0f172a] p-3 text-xs border border-gray-700 text-white outline-none focus:border-[#00e5ff]" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">Operação</label>
                  <select value={retroData.operation} onChange={e => setRetroData({...retroData, operation: e.target.value})} className="w-full bg-[#0f172a] p-3 text-xs border border-gray-700 uppercase outline-none focus:border-[#00e5ff]">
                    <option value="saida">Saída (-)</option>
                    <option value="entrada">Entrada (+)</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#0f172a] p-4 border border-gray-800">
                <input type="text" placeholder="FILTRAR PEÇA..." value={retroSearch} onChange={(e) => setRetroSearch(e.target.value)} className="w-full bg-[#1e293b] border border-gray-700 p-2 text-[10px] mb-2 outline-none uppercase" />
                <select required value={retroData.itemId} onChange={e => setRetroData({...retroData, itemId: e.target.value})} className="w-full bg-[#1e293b] p-3 text-xs border border-gray-700 uppercase outline-none">
                  <option value="">SELECIONE A PEÇA...</option>
                  {filteredRetroItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">Qtd</label>
                  <input type="number" required min="1" value={retroData.quantity === 0 ? '' : retroData.quantity} onChange={e => setRetroData({...retroData, quantity: parseInt(e.target.value) || 0})} className="w-full bg-[#0f172a] p-3 text-xs border border-gray-700 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">Justificativa do Atraso</label>
                  <input required placeholder="EX: ESQUECIMENTO, SISTEMA OFFLINE..." value={retroData.reason} onChange={e => setRetroData({...retroData, reason: e.target.value})} className="w-full bg-[#0f172a] p-3 text-xs border border-gray-700 uppercase outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full bg-gray-800 text-white font-black py-4 mt-4 uppercase text-[10px] tracking-widest hover:bg-[#00e5ff] hover:text-black transition-all">Registrar no Histórico</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ENTRADA NA NOTA */}
      {isNFModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#1e293b] border border-[#00e5ff] w-full max-w-xl p-8 shadow-[0_0_50px_rgba(0,229,255,0.2)]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-[#00e5ff] font-black uppercase text-sm tracking-widest flex items-center gap-2"><FileText size={18}/> Entrada por Nota Fiscal</h2>
              <button onClick={() => setIsNFModalOpen(false)} className="text-gray-500 hover:text-white"><X/></button>
            </div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Número da NF / Fornecedor</label>
            <input placeholder="EX: NF-8890 - FORNECEDOR SCANIA" value={nfReason} onChange={e => setNfReason(e.target.value)} className="w-full bg-[#0f172a] p-3 text-xs border border-gray-700 uppercase mb-6 outline-none focus:border-[#00e5ff]" />
            <div className="bg-[#0f172a] p-4 border border-gray-800 rounded-sm">
              <label className="text-[10px] font-bold text-[#00e5ff] uppercase mb-3 block">Adicionar Peças à Nota</label>
              <div className="flex flex-col gap-3 mb-4">
                <input type="text" placeholder="FILTRAR ITEM..." className="w-full bg-[#1e293b] border border-gray-700 p-2 text-[10px] outline-none uppercase" value={nfSearch} onChange={(e) => setNfSearch(e.target.value)}/>
                <div className="flex gap-2">
                  <select className="flex-1 bg-[#1e293b] p-2 text-[10px] uppercase outline-none border border-gray-700" onChange={e => setSelectedItem(e.target.value)} value={selectedItem}>
                    <option value="">Escolha o item...</option>
                    {filteredNfItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  <input type="number" min="1" className="w-20 bg-[#1e293b] p-2 text-xs border border-gray-700 text-center outline-none" placeholder="Qtd" value={quantity === 0 ? '' : quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} />
                  <button onClick={addNfItem} className="bg-[#00e5ff] text-black px-4 hover:bg-white transition-colors"><Plus size={16}/></button>
                </div>
              </div>
              <div className="space-y-2 mb-6 max-h-40 overflow-y-auto custom-scrollbar">
                {nfItems.map((ni, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#1e293b] p-2 text-[10px] uppercase border-l-2 border-[#00e5ff]">
                    <span><strong className="text-[#00e5ff]">{ni.quantity}x</strong> {ni.name}</span>
                    <button onClick={() => setNfItems(nfItems.filter((_,i) => i !== idx))} className="text-red-500 hover:text-white"><Trash2 size={12}/></button>
                  </div>
                ))}
                {nfItems.length === 0 && <p className="text-[10px] text-gray-600 text-center py-4 italic">Nenhum item adicionado à nota ainda.</p>}
              </div>
            </div>
            <button onClick={saveNF} className="w-full bg-[#00e5ff] text-black font-black py-4 mt-6 uppercase text-[10px] tracking-widest hover:bg-white transition-all">Gravar Nota e Atualizar Estoque</button>
          </div>
        </div>
      )}
    </div>
  );
}