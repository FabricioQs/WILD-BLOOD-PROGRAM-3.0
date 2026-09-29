import React, { useState } from 'react';
import { UserPlus, LogIn, CheckCircle, Lock, User as UserIcon, Shield, Sparkles, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (username: string, pass: string) => void;
  onRegister: (username: string, pass: string, fullName: string) => void;
  error: string;
  successMessage?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister, error, successMessage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(username, password);
    } else {
      onRegister(username, password, fullName);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blood-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blood-900/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md z-10 flex flex-col items-center animate-fade-in">
        
        {/* LOGO & TITLE SECTION */}
        <div className="text-center mb-8 flex flex-col items-center">
          
          <div className="w-40 h-40 md:w-44 md:h-44 mb-3 relative flex items-center justify-center">
             <img 
               src="https://crmkfsetelysptocfbtd.supabase.co/storage/v1/object/public/imagenes/WildBlood.png" 
               alt="WildBlood Logo" 
               className="w-full h-full object-contain drop-shadow-[0_0_35px_rgba(220,38,38,0.5)]"
             />
          </div>
          
          {/* Main Title */}
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-wider flex items-center justify-center gap-2 drop-shadow-2xl leading-none">
            <span className="text-white">WILD</span>
            <span className="text-blood-500">BLOOD</span>
          </h1>

          {/* Slogan */}
          <div className="mt-3 text-[10px] md:text-xs font-mono font-bold text-slate-400 tracking-[0.2em] uppercase flex items-center gap-2 flex-wrap justify-center opacity-85">
            <span>STRENGTH</span>
            <span className="text-blood-500">•</span>
            <span>ENDURANCE</span>
            <span className="text-blood-500">•</span>
            <span>COMMUNITY</span>
          </div>
        </div>

        {/* Auth Card Container */}
        <div className="w-full bg-dark-900/90 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl">
          
          {/* Toggle Switch */}
          <div className="w-full bg-dark-950 p-1.5 rounded-2xl mb-6 flex relative border border-white/5">
            <button 
              onClick={() => { setIsLogin(true); }}
              className={`flex-1 py-3 text-xs font-display font-black uppercase tracking-widest transition-all rounded-xl ${
                isLogin 
                  ? 'bg-blood-600 text-white shadow-glow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => { setIsLogin(false); }}
              className={`flex-1 py-3 text-xs font-display font-black uppercase tracking-widest transition-all rounded-xl ${
                !isLogin 
                  ? 'bg-blood-600 text-white shadow-glow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 w-full">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-blood-400 font-mono font-bold tracking-wider pl-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-dark-950 border border-white/10 rounded-2xl p-4 pl-11 text-white text-sm focus:border-blood-500 focus:outline-none transition-all placeholder-slate-600 shadow-inner"
                    placeholder="Ej: John Doe"
                  />
                  <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                </div>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-blood-400 font-mono font-bold tracking-wider pl-1">
                Usuario / Username
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-dark-950 border border-white/10 rounded-2xl p-4 pl-11 text-white text-sm focus:border-blood-500 focus:outline-none transition-all placeholder-slate-600 shadow-inner font-mono"
                  placeholder="usuario"
                />
                <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-blood-400 font-mono font-bold tracking-wider pl-1">
                Contraseña
              </label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-dark-950 border border-white/10 rounded-2xl p-4 pl-11 text-white text-sm focus:border-blood-500 focus:outline-none transition-all placeholder-slate-600 shadow-inner font-mono"
                  placeholder="••••••••"
                />
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
              </div>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-500/40 p-3.5 rounded-2xl flex items-center justify-center text-center animate-shake">
                <span className="text-red-400 text-xs font-display font-bold uppercase tracking-wider">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                <CheckCircle size={24} className="text-emerald-400" />
                <span className="text-emerald-300 text-xs font-bold leading-relaxed">{successMessage}</span>
              </div>
            )}

            <button 
              type="submit"
              className="w-full mt-4 bg-gradient-to-r from-blood-700 to-blood-600 hover:from-blood-600 hover:to-blood-500 text-white font-display font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-all transform active:scale-95 shadow-glow-md flex items-center justify-center gap-2"
            >
              {isLogin ? (
                 <>ENTRAR AL BOX <LogIn size={18} /></>
              ) : (
                 <>UNIRSE A LA COMUNIDAD <UserPlus size={18} /></>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center w-full">
          <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">
            &copy; 2025 WILD BLOOD FITNESS. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </div>
  );
};
