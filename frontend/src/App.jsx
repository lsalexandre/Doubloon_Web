import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
// ⚓ Adicionados os ícones Menu e X para o celular
import { LayoutDashboard, Package, Folder, Wrench, LogOut, Activity, History, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import WorkOrders from './pages/WorkOrders';
import Movements from './pages/Movements';
import Logs from './pages/Logs';
import Login from './pages/Login';

// ⚓ Adicionada a função onClick para fechar o menu ao clicar no link no celular
function SidebarLink({ to, icon, label, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/' && location.pathname === '');
  
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-3 font-black uppercase tracking-widest text-[10px] transition-all border-l-2 ${isActive ? 'text-[#00e5ff] border-[#00e5ff] bg-[#1e293b]' : 'text-gray-500 border-transparent hover:text-white hover:bg-[#1e293b]/50'}`}
    >
      {icon} {label}
    </Link>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  // ⚓ Novo Estado para o Menu de Celular
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0f172a] flex items-center justify-center text-[#00e5ff] font-black uppercase tracking-widest">
        Sincronizando Sistemas...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login setAuth={setIsAuthenticated} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-[#0f172a] text-white font-sans overflow-hidden relative">
        
        {/* ⚓ HEADER MOBILE (Só aparece em telas de celular) */}
        <div className="md:hidden flex items-center justify-between bg-[#1e293b] p-4 border-b border-[#00e5ff]/30 absolute top-0 w-full z-20 shadow-lg">
          <h1 className="text-xl font-black tracking-tighter uppercase text-white leading-none">
            Doubloon<span className="text-[#00e5ff]">Sys</span>
          </h1>
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="text-[#00e5ff] p-2 bg-[#0f172a] border border-gray-800 rounded hover:bg-white hover:text-black transition-all"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* ⚓ OVERLAY MOBILE (Fundo escuro quando o menu está aberto) */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/80 z-30 animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* MENU LATERAL (Responsivo) */}
        <div className={`fixed md:relative top-0 left-0 h-full w-64 bg-[#0f172a] border-r border-gray-800 flex flex-col justify-between z-40 shadow-2xl transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div>
            {/* Cabeçalho do Menu Lateral */}
            <div className="p-8 mb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase text-white leading-none">
                  Doubloon<br/><span className="text-[#00e5ff]">System</span>
                </h1>
                <p className="text-[9px] text-gray-500 font-bold mt-2 uppercase tracking-widest">Vacaria Operations</p>
              </div>
              {/* Botão de Fechar apenas no mobile */}
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="md:hidden text-gray-500 hover:text-[#00e5ff] transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <nav className="flex flex-col gap-1">
              <SidebarLink to="/" icon={<LayoutDashboard size={16} />} label="Painel" onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarLink to="/inventory" icon={<Package size={16} />} label="Inventário" onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarLink to="/movimentacoes" icon={<Activity size={16} />} label="Movimentações" onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarLink to="/kits" icon={<Wrench size={16} />} label="Kits" onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarLink to="/projetos" icon={<Folder size={16} />} label="Projetos" onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarLink to="/logs" icon={<History size={16} />} label="Relatórios & Logs" onClick={() => setIsMobileMenuOpen(false)} /> 
            </nav>
          </div>
          
          <div className="p-8 border-t border-gray-800/50">
            <div className="mb-4 flex flex-col">
              <span className="text-[8px] text-gray-500 uppercase font-black">Operador Atual:</span>
              <span className="text-[10px] text-[#00e5ff] uppercase font-black">{localStorage.getItem('user')}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-widest hover:text-red-400 transition-colors"
            >
              <LogOut size={14} /> Encerrar Sessão
            </button>
          </div>
        </div>

        {/* ÁREA CENTRAL DE CONTEÚDO (Com padding no topo para o mobile não cortar a tela) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative pt-[72px] md:pt-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/kits" element={<WorkOrders tipoLabel="Kits" dbType="kit" />} />
            <Route path="/projetos" element={<WorkOrders tipoLabel="Projetos" dbType="pedido" />} />
            <Route path="/movimentacoes" element={<Movements />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

      </div>
    </Router>
  );
}