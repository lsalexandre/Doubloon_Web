import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, Folder, Wrench, LogOut, Activity, History, Menu, X, ServerCrash } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import WorkOrders from './pages/WorkOrders';
import Movements from './pages/Movements';
import Logs from './pages/Logs';
import Login from './pages/Login';

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
  
  // ⚓ Novos Estados de Carregamento Inteligente
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Verificando credenciais...');
  const [isWaking, setIsWaking] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const token = localStorage.getItem('token');
      
      // 1. Sem token salvo? Vai direto pro Login liso.
      if (!token) {
        setLoading(false);
        return;
      }

      // 2. ⚓ CORREÇÃO DO BUG: Verifica fisicamente se o Token venceu (Bug do dia seguinte)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          // Token Expirou! Limpa tudo silenciosamente e manda pro Login (sem congelar a tela)
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setLoading(false);
          return; 
        }
      } catch (e) {
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }

      // 3. O Token é válido! Vamos garantir que o Render está acordado ANTES de carregar o Painel.
      setLoadingMsg('Conectando ao Motor Principal...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // Dá 4 segundos pro Render responder
        
        await fetch('https://doubloonsystem.onrender.com/api/ping', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        // Se respondeu rápido, tá acordado. Pode entrar!
        setIsAuthenticated(true);
        setLoading(false);
      } catch (err) {
        // Render tá dormindo profundamente.
        setIsWaking(true);
        setLoadingMsg('O servidor hibernou por inatividade. Reativando as turbinas (aprox. 50s)...');
        
        // Fica testando a cada 5 segundos até ele abrir o olho
        const interval = setInterval(async () => {
          try {
            const res = await fetch('https://doubloonsystem.onrender.com/api/ping');
            if (res.ok) {
              clearInterval(interval);
              setIsAuthenticated(true);
              setLoading(false);
            }
          } catch (e) {} // Continua tentando silenciosamente
        }, 5000);

        // Trava de segurança: Desiste depois de 90s se der ruim.
        setTimeout(() => {
          clearInterval(interval);
          if (loading) {
            localStorage.removeItem('token');
            setLoading(false);
          }
        }, 90000);
      }
    };

    checkAccess();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  // ⚓ TELA DE CARREGAMENTO INTELIGENTE (Substitui a tela preta congelada)
  if (loading) {
    return (
      <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
        {isWaking ? (
          <ServerCrash size={56} className="text-yellow-500 animate-pulse mb-6" />
        ) : (
          <Activity size={56} className="text-[#00e5ff] animate-pulse mb-6" />
        )}
        <h2 className={`text-xl font-black uppercase tracking-widest ${isWaking ? 'text-yellow-500' : 'text-[#00e5ff]'}`}>
          {isWaking ? 'Despertando Servidor' : 'Sincronizando'}
        </h2>
        <p className="text-gray-400 text-xs mt-4 uppercase tracking-widest max-w-xs leading-relaxed">{loadingMsg}</p>
      </div>
    );
  }

  // Se não estiver autenticado, mostra APENAS a tela de login
  if (!isAuthenticated) {
    return <Login setAuth={setIsAuthenticated} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-[#0f172a] text-white font-sans overflow-hidden relative">
        
        {/* HEADER MOBILE */}
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

        {/* OVERLAY MOBILE */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/80 z-30 animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* MENU LATERAL */}
        <div className={`fixed md:relative top-0 left-0 h-full w-64 bg-[#0f172a] border-r border-gray-800 flex flex-col justify-between z-40 shadow-2xl transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div>
            <div className="p-8 mb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase text-white leading-none">
                  Doubloon<br/><span className="text-[#00e5ff]">System</span>
                </h1>
                <p className="text-[9px] text-gray-500 font-bold mt-2 uppercase tracking-widest">Vacaria Operations</p>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-500 hover:text-[#00e5ff] transition-colors">
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
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-widest hover:text-red-400 transition-colors">
              <LogOut size={14} /> Encerrar Sessão
            </button>
          </div>
        </div>

        {/* ÁREA CENTRAL DE CONTEÚDO */}
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