// Versao 2.0 - Link Render Corrigido + Sistema de Despertar
import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldCheck, ServerCrash } from 'lucide-react';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // ⚓ Novos estados para a Barra de Despertar do Render
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [progress, setProgress] = useState(0);

  const API_URL = 'https://doubloonsystem.onrender.com/api';

  // 1. Limpa o "Login Zumbi" e checa o servidor ao abrir a tela
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos
      
      const res = await fetch(`${API_URL}/ping`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error("Servidor não respondeu");
    } catch (err) {
      // Deu timeout ou erro, inicia a barra de loading
      startWakeUpSequence();
    }
  };

  const startWakeUpSequence = () => {
    setIsWakingUp(true);
    setProgress(0);
    
    // A barra enche em 60 segundos
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + (100 / 60);
      });
    }, 1000);

    // Pinga o Render a cada 10 segundos
    const pingInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/ping`);
        if (res.ok) {
          clearInterval(progressInterval);
          clearInterval(pingInterval);
          setIsWakingUp(false);
          setProgress(0);
        }
      } catch (e) { }
    }, 10000);

    // Trava de segurança: para em 65s
    setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(pingInterval);
      if (isWakingUp) {
        setError("O servidor demorou muito. Tente atualizar a página.");
        setIsWakingUp(false);
      }
    }, 65000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.auth) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', data.username);
        setAuth(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      // Se tentar logar e der erro de servidor inativo
      startWakeUpSequence();
    }
  };

  return (
    <div className="min-screen h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1e293b] border border-[#00e5ff]/30 p-10 shadow-[0_0_50px_rgba(0,229,255,0.1)]">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-[#00e5ff]/10 rounded-full mb-4">
            <ShieldCheck size={40} className="text-[#00e5ff]" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-[0.3em]">Doubloon</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Vacaria Operations • Restricted Access</p>
        </div>

        {isWakingUp ? (
          <div className="space-y-6 text-center">
            <div className="flex justify-center mb-4">
              <ServerCrash size={40} className="text-yellow-500 animate-pulse" />
            </div>
            <h2 className="text-yellow-500 text-sm font-black uppercase tracking-widest">Despertando Motor</h2>
            <p className="text-xs text-gray-400 mt-2">O servidor entrou em hibernação. Reativando as turbinas (aprox. 60 segundos).</p>
            
            <div className="w-full bg-gray-800 rounded-full h-2 mt-6 overflow-hidden">
              <div 
                className="bg-[#00e5ff] h-2 transition-all duration-1000 ease-linear" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <User size={16} className="absolute left-3 top-3.5 text-gray-500" />
              <input 
                required
                type="text" 
                placeholder="USUÁRIO" 
                className="w-full bg-[#0f172a] border border-gray-700 p-3 pl-10 text-white text-xs outline-none focus:border-[#00e5ff] uppercase"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3.5 text-gray-500" />
              <input 
                required
                type="password" 
                placeholder="SENHA" 
                className="w-full bg-[#0f172a] border border-gray-700 p-3 pl-10 text-white text-xs outline-none focus:border-[#00e5ff]"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>}

            <button type="submit" className="w-full bg-[#00e5ff] text-black font-black py-4 uppercase text-xs tracking-widest hover:bg-white transition-all shadow-lg">
              Acessar Sistema
            </button>
          </form>
        )}
      </div>
    </div>
  );
}