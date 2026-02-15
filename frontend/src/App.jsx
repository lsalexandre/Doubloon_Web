import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, Folder, Wrench, LogOut, Activity, History } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import WorkOrders from './pages/WorkOrders';
import Movements from './pages/Movements';
import Logs from './pages/Logs';
import Login from './pages/Login'; // Certifique-se de criar este arquivo na pasta pages

// Componente para criar os botões do menu lateral
function SidebarLink({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/' && location.pathname === '');
  
  return (
    <Link to={to} className={`flex items-center gap-3 px-6 py-3 font-black uppercase tracking-widest text-[10px] transition-all border-l-2 ${isActive ? 'text-[#00e5ff] border-[#00e5ff] bg-[#1e293b]' : 'text-gray-500 border-transparent hover:text-white hover:bg-[#1e293b]/50'}`}>
      {icon} {label}
    </Link>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verifica se o usuário já tem um token salvo ao carregar o sistema
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

  // Se não estiver autenticado, mostra APENAS a tela de login
  if (!isAuthenticated) {
    return <Login setAuth={setIsAuthenticated} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-[#0f172a] text-white font-sans overflow-hidden">
        
        {/* MENU LATERAL */}
        <div className="w-64 bg-[#0f172a] border-r border-gray-800 flex flex-col justify-between z-10 shadow-2xl">
          <div>
            <div className="p-8 mb-4">
              <h1 className="text-2xl font-black tracking-tighter uppercase text-white leading-none">
                Doubloon<br/><span className="text-[#00e5ff]">System</span>
              </h1>
              <p className="text-[9px] text-gray-500 font-bold mt-2 uppercase tracking-widest">Vacaria Operations</p>
            </div>
            
            <nav className="flex flex-col gap-1">
              <SidebarLink to="/" icon={<LayoutDashboard size={16} />} label="Painel" />
              <SidebarLink to="/inventory" icon={<Package size={16} />} label="Inventário" />
              <SidebarLink to="/movimentacoes" icon={<Activity size={16} />} label="Movimentações" />
              <SidebarLink to="/kits" icon={<Wrench size={16} />} label="Kits" />
              <SidebarLink to="/projetos" icon={<Folder size={16} />} label="Projetos" />
              <SidebarLink to="/logs" icon={<History size={16} />} label="Relatórios & Logs" /> 
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

        {/* ÁREA CENTRAL DE CONTEÚDO */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/kits" element={<WorkOrders tipoLabel="Kits" dbType="kit" />} />
            <Route path="/projetos" element={<WorkOrders tipoLabel="Projetos" dbType="pedido" />} />
            <Route path="/movimentacoes" element={<Movements />} />
            <Route path="/logs" element={<Logs />} />
            {/* Redireciona qualquer rota desconhecida para o Dashboard */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

      </div>
    </Router>
  );
}