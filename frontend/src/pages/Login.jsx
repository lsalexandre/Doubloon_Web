import React, { useState } from 'react';
import { Lock, User, ShieldCheck } from 'lucide-react';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('https://doubloonsystem.onrender.com/api/login', {
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
      setError('Erro ao conectar com o servidor.');
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
      </div>
    </div>
  );
}