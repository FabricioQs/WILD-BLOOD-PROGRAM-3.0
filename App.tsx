import React, { useState, useEffect } from 'react';
import { WildBloodView } from './components/WildBloodView';
import { SmartTimer } from './components/SmartTimer';
import { RMCalculator } from './components/RMCalculator';
import { AuthScreen } from './components/AuthScreen';
import { UserManagement } from './components/UserManagement';
import { LogBook } from './components/LogBook';
import { AthleteProfile } from './components/AthleteProfile';
import { 
  Dumbbell, Timer, User as UserIcon, Calculator, LogOut, Users, 
  ClipboardList, RefreshCw, Eye, Edit3, X, ChevronRight, Bell, Menu, Sun, Moon, Type, ShieldCheck, Flame, Zap
} from 'lucide-react';
import { ProgramWeek, User, WorkoutLog, WorkoutDay, WorkoutBlock, UserRole, AthleteRecord, TimerGlobalState, AppNotification, AppTab } from './types';
import { supabase } from './lib/supabaseClient';

// --- UTILS ---
const parseContentToBlocks = (contentStr: string): WorkoutBlock[] => {
  try {
    const parsed = JSON.parse(contentStr);
    if (Array.isArray(parsed)) return parsed;
    throw new Error("Not an array");
  } catch (e) {
    return [{ id: Date.now().toString(), title: 'Bloque Principal', content: contentStr || '' }];
  }
};

const getMonday = (d: Date) => {
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date(d).setDate(diff));
};

const formatDate = (date: Date) => {
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');
   return `${year}-${month}-${day}`;
};

const getWeekDays = (startDate: Date): { id: string, date: string, dayName: string }[] => {
   const days = [];
   const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
   for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push({ id: formatDate(d), date: formatDate(d), dayName: dayNames[i] });
   }
   return days;
};

const SESSION_KEY = 'wb_session_v1';
const TIMER_STATE_KEY = 'wb_timer_state_v1';
const THEME_KEY = 'wb_theme_mode';
const FONT_SIZE_KEY = 'wb_font_size';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [viewMode, setViewMode] = useState<UserRole>('ATHLETE');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [currentTab, setCurrentTab] = useState<AppTab>('program');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [programData, setProgramData] = useState<ProgramWeek>({ weekNumber: 1, startDate: formatDate(getMonday(new Date())), days: [] });
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [athleteRecords, setAthleteRecords] = useState<AthleteRecord[]>([]);
  const [rmWeight, setRmWeight] = useState<string>('');
  const [timerState, setTimerState] = useState<TimerGlobalState>({
     isActive: false, startTime: 0, pausedAt: null, totalPausedTime: 0, mode: 'AMRAP',
     config: { mode: 'AMRAP', timeCapMinutes: 10, intervalMinutes: 1, workSeconds: 20, restSeconds: 10, rounds: 8 }
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Initial Theme & Font Setup
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as 'dark' | 'light' | null;
    const savedFontSize = localStorage.getItem(FONT_SIZE_KEY) as any;
    
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }

    if (savedFontSize) setFontSize(savedFontSize);
  }, []);

  // Sync font size to document root
  useEffect(() => {
    const html = document.documentElement;
    switch (fontSize) {
      case 'sm': html.style.fontSize = '14px'; break;
      case 'lg': html.style.fontSize = '18px'; break;
      case 'xl': html.style.fontSize = '20px'; break;
      default: html.style.fontSize = '16px'; break;
    }
  }, [fontSize]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  const cycleFontSize = () => {
    const sizes: ('sm' | 'base' | 'lg' | 'xl')[] = ['sm', 'base', 'lg', 'xl'];
    const currentIndex = sizes.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    const nextSize = sizes[nextIndex];
    setFontSize(nextSize);
    localStorage.setItem(FONT_SIZE_KEY, nextSize);
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'COACH' ? 'ATHLETE' : 'COACH');
  };

  useEffect(() => {
     const storedTimer = localStorage.getItem(TIMER_STATE_KEY);
     if (storedTimer) {
        try {
           const parsed = JSON.parse(storedTimer);
           if (parsed && typeof parsed.startTime === 'number') setTimerState(parsed);
        } catch (e) { console.error(e); }
     }
  }, []);

  useEffect(() => { localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(timerState)); }, [timerState]);

  const handleUpdateAvatar = (newAvatarUrl: string | null) => {
    if (!currentUser) return;
    setCurrentUser(prev => prev ? { ...prev, avatarUrl: newAvatarUrl } : null);
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, avatarUrl: newAvatarUrl } : u));
  };

  const refreshData = async () => {
    if (!currentUser) return;
    try {
      const { data: usersData } = await supabase.from('app_users').select('*');
      if (usersData) setAllUsers(usersData.map((u: any) => ({ 
        id: u.id, 
        username: u.username, 
        role: u.role, 
        fullName: u.full_name, 
        isApproved: u.is_approved,
        avatarUrl: u.avatar_url || null
      })));

      const weekDays = getWeekDays(currentWeekStart);
      const startStr = weekDays[0].date;
      const endStr = weekDays[6].date;
      const { data: workoutsData } = await supabase.from('daily_workouts').select('*').gte('date', startStr).lte('date', endStr);
      
      const mergedDays: WorkoutDay[] = weekDays.map(wd => {
         const found = workoutsData?.find((w: any) => w.date === wd.date);
         return found ? {
            id: wd.date, date: wd.date, dayName: wd.dayName, title: found.title || 'Sin Título',
            focus: found.focus || '', content: found.content || '', blocks: parseContentToBlocks(found.content || ''), isRestDay: found.is_rest_day
         } : { id: wd.date, date: wd.date, dayName: wd.dayName, title: 'Descanso / Programar', focus: '', content: '', blocks: [], isRestDay: false };
      });
      setProgramData({ weekNumber: 1, startDate: startStr, days: mergedDays });

      const { data: logsData } = await supabase.from('workout_logs').select('*').order('date', { ascending: true });
      if (logsData) setWorkoutLogs(logsData.map((l: any) => ({ id: l.id, userId: l.user_id, dayId: l.day_id, sectionTitle: l.section_title, result: l.result, notes: l.notes, date: l.date })));

      const { data: recordsData } = await supabase.from('athlete_records').select('*');
      if (recordsData) setAthleteRecords(recordsData.map((r: any) => ({ id: r.id, userId: r.user_id, category: r.category, exercise: r.exercise, value: r.value, unit: r.unit })));
      
      const { data: notifData } = await supabase.from('app_notifications').select('*').or(`receiver_id.eq.${currentUser.id},receiver_id.is.null`).order('created_at', { ascending: false });
      if (notifData) setNotifications(notifData.map((n: any) => ({ id: n.id, senderId: n.sender_id, receiverId: n.receiver_id, message: n.message, isRead: n.is_read, createdAt: n.created_at })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const restoreSession = async () => {
      setIsSessionChecking(true);
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        try {
          const { userId, expiry } = JSON.parse(storedSession);
          if (Date.now() > expiry) { localStorage.removeItem(SESSION_KEY); setIsSessionChecking(false); return; }
          const { data, error } = await supabase.from('app_users').select('*').eq('id', userId).single();
          if (data && !error && data.is_approved) {
             setCurrentUser({ 
               id: data.id, 
               username: data.username, 
               role: data.role, 
               fullName: data.full_name, 
               isApproved: data.is_approved,
               avatarUrl: data.avatar_url || null
             });
             setViewMode(data.role);
          } else localStorage.removeItem(SESSION_KEY);
        } catch (e) { localStorage.removeItem(SESSION_KEY); }
      }
      setIsSessionChecking(false);
    };
    restoreSession();
  }, []);

  useEffect(() => { if (currentUser) refreshData(); }, [currentUser, currentWeekStart]);

  const handleUpdateProgramDay = async (updatedDay: WorkoutDay) => {
     const oldDays = [...programData.days];
     setProgramData(prev => ({ ...prev, days: prev.days.map(d => d.id === updatedDay.id ? updatedDay : d) }));
     
     try {
       const { error } = await supabase
         .from('daily_workouts')
         .upsert({ 
           date: updatedDay.date, 
           title: updatedDay.title, 
           focus: updatedDay.focus, 
           content: JSON.stringify(updatedDay.blocks), 
           is_rest_day: updatedDay.isRestDay 
         });
       if (error) throw error;
     } catch (error: any) {
       console.error('Error updating program:', error);
       setProgramData(prev => ({ ...prev, days: oldDays }));
       alert(`Error al guardar la programación: ${error.message}`);
     }
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const handleAddLog = async (newLog: WorkoutLog) => {
    // Optimistic update with a temporary ID
    const tempId = newLog.id;
    setWorkoutLogs(prev => [...prev, newLog]);
    
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .insert({ 
          user_id: newLog.userId, 
          day_id: newLog.dayId, 
          section_title: newLog.sectionTitle || '', 
          result: newLog.result, 
          notes: newLog.notes, 
          date: newLog.date 
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        // Update the local log with the real ID from DB
        setWorkoutLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: data.id } : l));
      }
    } catch (error: any) {
      console.error('Error adding log:', error);
      setWorkoutLogs(prev => prev.filter(l => l.id !== tempId));
      alert(`Error al guardar el resultado: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleUpdateLog = async (updatedLog: WorkoutLog) => {
    const oldLogs = [...workoutLogs];
    setWorkoutLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
    
    try {
      const { error } = await supabase
        .from('workout_logs')
        .update({ 
          result: updatedLog.result, 
          notes: updatedLog.notes,
          section_title: updatedLog.sectionTitle
        })
        .eq('id', updatedLog.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating log:', error);
      setWorkoutLogs(oldLogs);
      alert(`Error al actualizar el resultado: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    const oldLogs = [...workoutLogs];
    setWorkoutLogs(prev => prev.filter(l => l.id !== logId));
    
    try {
      const { error } = await supabase
        .from('workout_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting log:', error);
      setWorkoutLogs(oldLogs);
      alert(`Error al eliminar el resultado: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleSaveAthleteRecord = async (category: any, exercise: string, value: string, unit: string) => {
     if (!currentUser) return;
     const oldRecords = [...athleteRecords];
     const newRecord: AthleteRecord = { id: Date.now().toString(), userId: currentUser.id, category, exercise, value, unit };
     
     setAthleteRecords(prev => [ ...prev.filter(r => !(r.userId === currentUser.id && r.exercise === exercise)), newRecord ]);
     
     try {
       const { error } = await supabase
         .from('athlete_records')
         .upsert({ 
           user_id: currentUser.id, 
           category, 
           exercise, 
           value, 
           unit 
         }, { onConflict: 'user_id, exercise' });
       if (error) throw error;
     } catch (error: any) {
       console.error('Error saving record:', error);
       setAthleteRecords(oldRecords);
       alert(`Error al guardar el récord: ${error.message}`);
     }
  };

  const handleLogin = async (username: string, pass: string) => {
    setAuthError('');
    const { data, error } = await supabase.from('app_users').select('*').ilike('username', username).eq('password', pass).single();
    if (error || !data) setAuthError('Usuario o contraseña incorrectos.');
    else {
      if (!data.is_approved) { setAuthError('Acceso denegado. No ha pagado la programación.'); return; }
      setCurrentUser({ 
        id: data.id, 
        username: data.username, 
        role: data.role, 
        fullName: data.full_name, 
        isApproved: data.is_approved,
        avatarUrl: data.avatar_url || null
      });
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: data.id, expiry: Date.now() + (7 * 24 * 60 * 60 * 1000) }));
      setViewMode(data.role);
      setCurrentTab('program');
    }
  };

  const handleRegister = async (username: string, pass: string, fullName: string) => {
    setAuthError('');
    const { data: existing } = await supabase.from('app_users').select('id').ilike('username', username).single();
    if (existing) { setAuthError('El usuario ya existe.'); return; }
    const { error } = await supabase.from('app_users').insert({ username, password: pass, full_name: fullName, role: 'ATHLETE', is_approved: false });
    if (error) setAuthError('Error al crear cuenta.');
    else setAuthSuccessMsg('¡Cuenta creada! Espera aprobación.');
  };

  const handleLogout = () => { localStorage.removeItem(SESSION_KEY); setCurrentUser(null); setCurrentTab('program'); };

  const renderContent = () => {
    switch (currentTab) {
      case 'program': return <WildBloodView programData={programData} setProgramData={() => {}} onUpdateDay={handleUpdateProgramDay} onWeekChange={handleWeekChange} userRole={viewMode} logs={workoutLogs} onAddLog={handleAddLog} onDeleteLog={handleDeleteLog} onUpdateLog={handleUpdateLog} currentUserId={currentUser!.id} />;
      case 'timer': return <SmartTimer programDays={programData.days} onSaveLog={handleAddLog} currentUserId={currentUser!.id} globalState={timerState} onStateChange={setTimerState} />;
      case 'calc': return <RMCalculator athleteRecords={athleteRecords.filter(r => r.userId === currentUser!.id)} savedWeight={rmWeight} onWeightChange={setRmWeight} />;
      case 'logs': return <LogBook logs={workoutLogs} users={allUsers} days={programData.days} currentUser={{...currentUser!, role: viewMode}} onDeleteLog={handleDeleteLog}/>; 
      case 'profile': return (
        <AthleteProfile 
          userId={currentUser!.id} 
          user={currentUser!}
          records={athleteRecords.filter(r => r.userId === currentUser!.id)} 
          onSaveRecord={handleSaveAthleteRecord} 
          onUpdateAvatar={handleUpdateAvatar}
          onLogout={handleLogout}
        />
      );
      case 'users': return currentUser!.role === 'COACH' && viewMode === 'COACH' ? <UserManagement users={allUsers} currentUser={currentUser!} onUpdateRole={async (id, role) => { setAllUsers(prev => prev.map(u => u.id === id ? {...u, role} : u)); await supabase.from('app_users').update({role}).eq('id', id); }} onToggleStatus={async (id, status) => { setAllUsers(prev => prev.map(u => u.id === id ? {...u, isApproved: status} : u)); await supabase.from('app_users').update({is_approved: status}).eq('id', id); }} onDeleteUser={async (id) => { setAllUsers(prev => prev.filter(u => u.id !== id)); await supabase.from('workout_logs').delete().eq('user_id', id); await supabase.from('app_users').delete().eq('id', id); }} /> : null;
      default: return null;
    }
  };

  if (isSessionChecking) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blood-900/20 via-dark-950 to-dark-950 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-blood-600/20 border-t-blood-500 rounded-full animate-spin"></div>
            <img 
              src="https://crmkfsetelysptocfbtd.supabase.co/storage/v1/object/public/imagenes/WildBlood.png" 
              className="w-10 h-10 object-contain animate-pulse" 
              alt="Logo" 
            />
          </div>
          <div className="text-center mt-2">
            <h3 className="font-display font-black text-xl italic uppercase tracking-widest text-white">WILD BLOOD</h3>
            <p className="text-[10px] font-mono text-blood-500 uppercase tracking-[0.25em] mt-1">Cargando Sistema...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} error={authError} successMessage={authSuccessMsg} />;

  const navigationItems = [
    { id: 'program', icon: Dumbbell, label: 'WOD' },
    { id: 'logs', icon: ClipboardList, label: 'Diario' },
    { id: 'calc', icon: Calculator, label: 'RM' },
    { id: 'timer', icon: Timer, label: 'Timer' },
    { id: 'profile', icon: UserIcon, label: 'Perfil' },
    ...(currentUser.role === 'COACH' && viewMode === 'COACH' ? [{ id: 'users', icon: Users, label: 'Equipo' } as const] : []),
  ];

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-blood-600 selection:text-white transition-colors duration-300">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 bg-dark-900/90 backdrop-blur-xl border-r border-white/5 flex-col h-screen sticky top-0 transition-all z-40">
        
        {/* Brand Header */}
        <div className="p-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3.5 mb-2">
            <div className="relative group">
              <div className="absolute inset-0 bg-blood-600 rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition-opacity"></div>
              <img 
                src="https://crmkfsetelysptocfbtd.supabase.co/storage/v1/object/public/imagenes/WildBlood.png" 
                className="relative w-12 h-12 object-contain drop-shadow-xl" 
                alt="Logo" 
              />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl italic tracking-wider text-white uppercase leading-none flex items-center gap-1.5">
                <span>WILD</span>
                <span className="text-blood-500">BLOOD</span>
              </h1>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-[0.2em] font-bold block mt-1">
                CrossFit System
              </span>
            </div>
          </div>

          {/* User Compact Card */}
          <div className="mt-4 p-3 rounded-xl bg-dark-850/80 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {currentUser.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.fullName} 
                  className="w-8 h-8 rounded-lg object-cover border border-blood-500/40 shrink-0" 
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blood-600/30 border border-blood-500/40 text-blood-400 flex items-center justify-center font-display font-black text-sm shrink-0">
                  {currentUser.fullName?.charAt(0) || <UserIcon size={14} />}
                </div>
              )}
              <div className="truncate">
                <div className="text-xs font-bold text-slate-200 truncate">{currentUser.fullName}</div>
                <div className="text-[10px] text-blood-400 font-mono font-bold tracking-wider">@{currentUser.username}</div>
              </div>
            </div>
            <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-blood-600/20 text-blood-400 border border-blood-500/30">
              {viewMode}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
           <div className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-[0.25em] px-3 mb-2">
              Navegación
           </div>
           <nav className="space-y-1.5">
              {navigationItems.map(item => {
                 const isActive = currentTab === item.id;
                 return (
                   <button 
                     key={item.id} 
                     onClick={() => setCurrentTab(item.id as AppTab)}
                     className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-display font-bold uppercase text-sm tracking-widest transition-all group relative overflow-hidden ${
                       isActive 
                         ? 'bg-gradient-to-r from-blood-700 via-blood-600 to-blood-700 text-white shadow-glow-sm border border-blood-500/50' 
                         : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                     }`}
                   >
                      <div className="flex items-center gap-3.5 relative z-10">
                        <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-blood-400 transition-colors'} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && (
                        <div className="w-1.5 h-4 rounded-full bg-white relative z-10 animate-pulse" />
                      )}
                   </button>
                 );
              })}
           </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 space-y-2 bg-dark-900/50">
           {currentUser.role === 'COACH' && (
              <button 
                onClick={toggleViewMode} 
                className={`w-full px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-display font-bold text-xs uppercase tracking-wider transition-all ${
                  viewMode === 'COACH' 
                    ? 'bg-blood-600/20 border-blood-500/50 text-blood-400 hover:bg-blood-600 hover:text-white' 
                    : 'bg-dark-800 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                 {viewMode === 'COACH' ? <ShieldCheck size={16}/> : <Eye size={16}/>}
                 <span>{viewMode === 'COACH' ? 'Modo Coach Activo' : 'Ver como Atleta'}</span>
              </button>
           )}
           <button 
             onClick={handleLogout} 
             className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-all font-display font-bold uppercase text-xs tracking-wider border border-transparent hover:border-red-900/30"
           >
              <LogOut size={16}/>
              <span>Cerrar Sesión</span>
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* TOP BAR */}
        <header className="flex justify-between items-center px-4 md:px-8 py-3.5 bg-dark-900/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
          
          {/* Mobile Logo */}
          <div className="flex items-center gap-2.5 md:hidden">
             <img 
               src="https://crmkfsetelysptocfbtd.supabase.co/storage/v1/object/public/imagenes/WildBlood.png" 
               className="w-8 h-8 object-contain drop-shadow-md" 
               alt="Logo" 
             />
             <span className="font-display font-black text-xl italic uppercase tracking-wider text-white leading-none">
               WILD<span className="text-blood-500">BLOOD</span>
             </span>
          </div>

          {/* Desktop Breadcrumb/Status Tag */}
          <div className="hidden md:flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-dark-850 border border-white/5 text-xs text-slate-400 font-mono">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="font-bold text-slate-300 uppercase">{currentTab}</span>
             </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2 ml-auto">
             
             {/* VIEW MODE TOGGLE (Only for COACH role) */}
             {currentUser.role === 'COACH' && (
                <button 
                  onClick={toggleViewMode} 
                  className={`p-2 rounded-xl flex items-center gap-2 px-3 transition-all border font-display font-bold text-xs uppercase tracking-wider ${
                    viewMode === 'COACH' 
                      ? 'bg-blood-600/30 border-blood-500/60 text-blood-400 shadow-glow-sm' 
                      : 'bg-dark-850 border-white/5 text-slate-400 hover:text-white'
                  }`}
                  title={viewMode === 'COACH' ? "Cambiar a Vista Atleta" : "Cambiar a Modo Coach"}
                >
                   {viewMode === 'COACH' ? <Edit3 size={15} /> : <Eye size={15} />}
                   <span className="hidden sm:inline">{viewMode}</span>
                </button>
             )}

             {/* FONT SIZE TOGGLE */}
             <button 
               onClick={cycleFontSize} 
               className="p-2 text-slate-400 hover:text-white bg-dark-850 hover:bg-dark-800 rounded-xl flex items-center gap-1 border border-white/5 transition-colors"
               title="Tamaño de texto"
             >
                <Type size={16} />
                <span className="text-[10px] font-mono font-black uppercase pr-1 text-slate-400">{fontSize.toUpperCase()}</span>
             </button>

             {/* THEME TOGGLE BUTTON */}
             <button 
               onClick={toggleTheme} 
               className="p-2 text-slate-400 hover:text-blood-400 bg-dark-850 hover:bg-dark-800 rounded-xl border border-white/5 transition-colors"
               title={theme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
             >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
             </button>

             {/* NOTIFICATIONS DROPDOWN */}
             <div className="relative">
                <button 
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)} 
                  className="p-2 text-slate-400 hover:text-white relative bg-dark-850 hover:bg-dark-800 rounded-xl border border-white/5 transition-colors"
                  title="Notificaciones"
                >
                   <Bell size={17} />
                   {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blood-500 rounded-full border-2 border-dark-950 shadow-glow-sm animate-ping" />
                   )}
                   {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blood-500 rounded-full border-2 border-dark-950" />
                   )}
                </button>
                {showNotifDropdown && (
                   <div className="absolute right-0 top-full mt-3 w-80 md:w-96 bg-dark-850 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in backdrop-blur-2xl">
                      <div className="p-4 bg-dark-900 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Bell size={14} className="text-blood-500" />
                          <span className="text-xs font-display font-bold uppercase tracking-wider text-slate-200">Notificaciones</span>
                        </div>
                        <button onClick={() => refreshData()} className="text-slate-400 hover:text-white transition-colors" title="Actualizar">
                          <RefreshCw size={13}/>
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-white/5">
                         {notifications.length === 0 ? (
                           <div className="p-8 text-center text-slate-500 text-xs italic">Nada nuevo por aquí...</div>
                         ) : (
                           notifications.map(notif => (
                             <div 
                               key={notif.id} 
                               onClick={() => !notif.isRead && supabase.from('app_notifications').update({is_read: true}).eq('id', notif.id).then(() => setNotifications(prev => prev.map(n => n.id === notif.id ? {...n, isRead: true} : n)))} 
                               className={`p-4 cursor-pointer transition-colors ${!notif.isRead ? 'bg-blood-950/20 hover:bg-blood-950/30' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}
                             >
                                <p className={`text-sm leading-relaxed ${!notif.isRead ? 'text-slate-100 font-semibold' : 'text-slate-400'}`}>
                                  {notif.message}
                                </p>
                                <span className="text-[10px] text-slate-500 mt-2 block font-mono">
                                  {new Date(notif.createdAt).toLocaleDateString()}
                                </span>
                             </div>
                           ))
                         )}
                      </div>
                   </div>
                )}
             </div>
          </div>
        </header>

        {/* MAIN BODY SCROLLABLE */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
           <div className="max-w-7xl mx-auto p-4 md:p-8 pb-28 md:pb-8 animate-fade-in">
              {renderContent()}
           </div>
        </main>
      </div>

      {/* BOTTOM NAV (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-dark-950/95 backdrop-blur-2xl border-t border-white/10 z-50 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
         <div className="flex justify-around items-center h-16 px-2">
            {navigationItems.map(item => {
               const isActive = currentTab === item.id;
               return (
                 <button 
                   key={item.id} 
                   onClick={() => setCurrentTab(item.id as AppTab)}
                   className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
                     isActive 
                       ? 'text-blood-400 font-bold scale-105' 
                       : 'text-slate-500 hover:text-slate-300'
                   }`}
                 >
                    {isActive && (
                      <span className="absolute top-0 w-8 h-1 bg-blood-500 rounded-b-full shadow-glow-sm"></span>
                    )}
                    <item.icon size={21} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-blood-500' : ''} />
                    <span className="text-[9px] font-display font-bold uppercase tracking-wider mt-1">{item.label}</span>
                 </button>
               );
            })}
         </div>
      </nav>
    </div>
  );
};

export default App;
