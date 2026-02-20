import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Search, Edit2, Trash2, X, CheckCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Inventory() {
  const query = new URLSearchParams(useLocation().search);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ sku: '', name: '', category: '', alert_minimum: 5 });
  const [isCreatingNewCat, setIsCreatingNewCat] = useState(false);

  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, msg: '', onConfirm: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000);
  };

  const requestConfirm = (msg, action) => {
    setConfirmDialog({ show: true, msg, onConfirm: action });
  };

  const carregar = async () => {
    try {
      const token = localStorage.getItem('token');
      const r1 = await fetch('https://doubloonsystem.onrender.com/api/inventory', {
        headers: { 'x-access-token': token }
      });
      setItems(await r1.json());

      const r2 = await fetch('https://doubloonsystem.onrender.com/api/categories', {
        headers: { 'x-access-token': token }
      });
      setCategories(await r2.json());
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ sku: '', name: '', category: '', alert_minimum: 5 });
    setIsCreatingNewCat(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      sku: item.sku || '',
      name: item.name || '',
      category: item.category || '',
      alert_minimum: item.alert_minimum || 0
    });
    setIsCreatingNewCat(false);
    setIsModalOpen(true);
  };

 const executeExcluir = async (id) => {
    try {
      const response = await fetch(`https://doubloonsystem.onrender.com/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'x-access-token': localStorage.getItem('token') }
      });
      
      if (response.ok) {
        // ⚓ Mensagem atualizada para refletir a exclusão lógica
        showToast("Peça excluída e ocultada do sistema!", "success");
        carregar();
      } else {
        const msg = await response.text();
        showToast(msg || "Erro ao tentar excluir a peça.", "error");
      }
    } catch (error) {
      showToast("Erro de comunicação com o servidor.", "error");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const url = editingId 
      ? `https://doubloonsystem.onrender.com/api/inventory/${editingId}` 
      : 'https://doubloonsystem.onrender.com/api/inventory';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': localStorage.getItem('token') 
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showToast(editingId ? "Item atualizado com sucesso!" : "Novo item cadastrado!");
        setIsModalOpen(false);
        carregar();
      } else {
         showToast("Erro ao salvar os dados. Verifique os campos.", "error");
      }
    } catch (error) {
      showToast("Falha na conexão com o servidor.", "error");
    }
  };

  const filteredItems = items.filter(i => {
    const term = search.toLowerCase();
    const match = (i.name || '').toLowerCase().includes(term) || 
                  (i.sku || '').toLowerCase().includes(term) || 
                  (i.category || '').toLowerCase().includes(term);
                  
    // ⚓ Lógica de Filtro Crítico (Integrado com Dashboard)
    if (query.get('filter') === 'critical') {
      return match && i.alert_minimum > 0 && i.virtual_stock < i.alert_minimum;
    }
    return match;
  });

  return (
    <div className="p-8 bg-[#0f172a] min-h-screen text-gray-200 relative animate-fade-in">
      
      {/* TOASTS E MODAIS DE CONFIRMAÇÃO */}
      {toast.show && (
        <div className={`fixed top-10 right-10 p-4 border-l-4 shadow-2xl z-[200] animate-fade-in flex items-center gap-3 ${toast.type === 'error' ? 'bg-[#1a0a0f] border-red-500 text-red-500' : 'bg-[#0a1f24] border-[#00e5ff] text-[#00e5ff]'}`}>
          {toast.type === 'error' ? <X size={20} /> : <CheckCircle size={20} />}
          <span className="text-[10px] font-black uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}

      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4">
          <div className="bg-[#1e293b] border border-[#00e5ff] p-8 max-w-sm w-full text-center">
            <AlertTriangle size={48} className="text-[#00e5ff] mx-auto mb-6" />
            <h3 className="text-white font-black uppercase tracking-widest mb-2 text-lg">Confirmação</h3>
            <p className="text-gray-400 text-xs mb-8">{confirmDialog.msg}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog({ show: false, msg: '', onConfirm: null })} className="flex-1 bg-gray-800 text-white py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#00e5ff] transition-all">Cancelar</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ show: false, msg: '', onConfirm: null }); }} className="flex-1 bg-red-600 text-white py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-red-600 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end mb-10 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#00e5ff] uppercase tracking-[0.2em]">Inventário Geral</h1>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-2.5 text-[#00e5ff]" size={16} />
            <input type="text" placeholder="BUSCAR POR SKU, NOME OU CATEGORIA..." className="bg-[#0f172a] border border-gray-700 pl-10 pr-4 py-2 text-[10px] font-bold w-80 outline-none focus:border-[#00e5ff] uppercase text-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <button onClick={handleOpenNew} className="bg-[#00e5ff] text-black px-6 py-2.5 font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-lg flex items-center gap-2">
          <Plus size={14} /> Catalogar Nova Peça
        </button>
      </div>

      <div className="bg-[#1e293b] border border-gray-800 rounded-sm overflow-hidden shadow-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#0f172a] text-gray-500 uppercase font-black tracking-widest border-b border-gray-800">
            <tr>
              <th className="p-4">SKU / Identificação</th>
              <th className="p-4">Categoria</th>
              <th className="p-4 text-center">Estoque Físico</th>
              <th className="p-4 text-center">Estoque Virtual</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-[#27354a]/30 transition-colors group">
                <td className="p-4">
                  <div className="font-mono text-[10px] text-[#00e5ff]">{item.sku}</div>
                  <div className="font-bold text-gray-200 uppercase">{item.name}</div>
                </td>
                <td className="p-4 text-gray-400 uppercase text-[10px] font-bold italic">{item.category}</td>
                <td className="p-4 text-center font-mono text-lg">{item.physical_stock}</td>
                <td className="p-4 text-center font-mono text-lg text-[#00e5ff]">{item.virtual_stock}</td>
                <td className="p-4 text-center">
                  {item.alert_minimum > 0 && item.virtual_stock < item.alert_minimum ? (
                    <span className="inline-flex items-center gap-1 text-red-500 text-[9px] font-black uppercase bg-red-500/10 px-2 py-1 border border-red-500/20"><AlertTriangle size={10} /> Crítico</span>
                  ) : (
                    <span className="text-gray-500 text-[9px] font-black uppercase bg-gray-800/30 px-2 py-1 border border-gray-800/50">Normal</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex justify-center gap-4">
                    <button onClick={() => handleEdit(item)} className="text-gray-500 hover:text-[#00e5ff] transition-all" title="Editar"><Edit2 size={16} /></button>
                    <button onClick={() => { requestConfirm(`Excluir permanentemente ${item.name} (${item.sku})?`, () => executeExcluir(item.id)) }} className="text-gray-500 hover:text-red-500 transition-all" title="Excluir"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL CATALOGAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-[#00e5ff] w-full max-w-md p-10 shadow-[0_0_50px_rgba(0,229,255,0.2)] relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
            <h2 className="text-[#00e5ff] font-black uppercase text-sm mb-8 tracking-[0.2em] flex items-center gap-2 border-b border-gray-800 pb-4">
              {editingId ? <Edit2 size={18}/> : <Plus size={18}/>}
              {editingId ? 'Editar Propriedades' : 'Cadastrar Material'}
            </h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase mb-2 block tracking-widest italic">Código SKU (Imutável)</label>
                <input required disabled={!!editingId} className={`w-full bg-[#0f172a] border border-gray-700 p-3 text-white text-xs uppercase focus:border-[#00e5ff] outline-none ${editingId ? 'opacity-30 cursor-not-allowed font-mono' : 'font-mono'}`} value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="CX-500" />
              </div>
              
              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase mb-2 block tracking-widest italic">Nome da Peça</label>
                <input required className="w-full bg-[#0f172a] border border-gray-700 p-3 text-white text-xs uppercase focus:border-[#00e5ff] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="CONECTOR XLT" />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block italic">Categoria</label>
                {!isCreatingNewCat ? (
                  <select required className="w-full bg-[#0f172a] border border-gray-700 p-3 text-white text-xs uppercase outline-none focus:border-[#00e5ff] cursor-pointer" value={formData.category} onChange={e => e.target.value === "NEW" ? setIsCreatingNewCat(true) : setFormData({...formData, category: e.target.value})}>
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="NEW" className="text-[#00e5ff] font-black">+ CRIAR NOVA CATEGORIA</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input required autoFocus placeholder="NOME DA CATEGORIA" className="flex-1 bg-[#0f172a] border border-[#00e5ff] p-3 text-white text-xs uppercase outline-none" onChange={e => setFormData({...formData, category: e.target.value})} />
                    <button type="button" onClick={() => { setIsCreatingNewCat(false); setFormData({...formData, category: ''}) }} className="bg-red-500/10 text-red-500 px-4 hover:bg-red-500 hover:text-white transition-all border border-red-500/30"><X size={16}/></button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase block tracking-widest mb-2 italic">Limite de Alerta (Mínimo)</label>
                <input type="number" min="0" value={formData.alert_minimum} className="w-full bg-[#0f172a] border border-gray-700 p-3 text-[#00e5ff] font-mono text-sm outline-none focus:border-[#00e5ff]" onChange={e => setFormData({...formData, alert_minimum: parseInt(e.target.value) || 0})} />
              </div>

              <button type="submit" className="w-full bg-[#00e5ff] text-black font-black uppercase text-xs tracking-[0.3em] py-5 mt-4 hover:bg-white transition-all shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                {editingId ? 'Gravar Alterações' : 'Confirmar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}