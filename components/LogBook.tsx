import React, { useState, useMemo } from 'react';
import { User, WorkoutLog, WorkoutDay, UserRole } from '../types';
import { 
  Search, Trophy, FileText, User as UserIcon, Filter, Download, X, 
  Clock, CalendarDays, CheckCircle, Trash2, Calendar, XCircle, AlertCircle, Sparkles, BarChart3
} from 'lucide-react';
import { VideoContent } from './VideoContent';

interface LogBookProps {
  logs: WorkoutLog[];
  users: User[];
  days: WorkoutDay[];
  currentUser: User;
  onDeleteLog?: (logId: string) => void;
}

export const LogBook: React.FC<LogBookProps> = ({ logs, users, days, currentUser, onDeleteLog }) => {
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Coach States
  const [coachFilterDate, setCoachFilterDate] = useState<string>(getTodayStr());
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('ALL');
  
  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'WEEK' | 'MONTH'>('WEEK');
  const [exportRefDate, setExportRefDate] = useState<string>(getTodayStr());

  // Athlete States
  const [filterDate, setFilterDate] = useState<string>(getTodayStr());

  const getDayDetails = (dayId: string) => days.find(d => d.id === dayId);
  const getUserDetails = (userId: string) => users.find(u => u.id === userId);

  // --- EXPORT LOGIC ---
  const handleExport = () => {
    let startDate = new Date(exportRefDate);
    let endDate = new Date(exportRefDate);
    let filenamePrefix = 'export';

    if (exportType === 'WEEK') {
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0,0,0,0);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23,59,59,999);
        filenamePrefix = `wild_blood_week_${startDate.toISOString().split('T')[0]}`;
    } else {
        startDate.setDate(1);
        startDate.setHours(0,0,0,0);
        
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        endDate.setHours(23,59,59,999);
        filenamePrefix = `wild_blood_month_${startDate.getMonth()+1}_${startDate.getFullYear()}`;
    }

    const dataToExport = logs.filter(log => {
        const logDate = new Date(log.date);
        const inRange = logDate >= startDate && logDate <= endDate;
        const matchAthlete = selectedAthleteId === 'ALL' || log.userId === selectedAthleteId;
        return inRange && matchAthlete;
    }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (dataToExport.length === 0) {
        alert("No hay datos para exportar en este rango seleccionado.");
        return;
    }

    const headers = ['Fecha', 'Atleta', 'Día', 'Sección', 'Entrenamiento', 'Resultado', 'Notas'];
    const rows = dataToExport.map(log => {
        const athlete = getUserDetails(log.userId);
        const day = getDayDetails(log.dayId);
        
        const cleanNotes = log.notes ? log.notes.replace(/"/g, '""') : '';
        const cleanResult = log.result ? log.result.replace(/"/g, '""') : '';
        const cleanSection = log.sectionTitle ? log.sectionTitle.replace(/"/g, '""') : '';

        return [
            new Date(log.date).toLocaleDateString(),
            `"${athlete?.fullName || athlete?.username || 'Desconocido'}"`,
            `"${day?.dayName || 'Extra'}"`,
            `"${cleanSection}"`,
            `"${day?.title || ''}"`,
            `"${cleanResult}"`,
            `"${cleanNotes}"`
        ];
    });

    const csvContent = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filenamePrefix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  // --- COACH VIEW LOGIC ---
  const coachFilteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDateObj = new Date(log.date);
      const logDateStr = `${logDateObj.getFullYear()}-${String(logDateObj.getMonth() + 1).padStart(2, '0')}-${String(logDateObj.getDate()).padStart(2, '0')}`;
      const matchDate = logDateStr === coachFilterDate;
      const matchAthlete = selectedAthleteId === 'ALL' || log.userId === selectedAthleteId;
      return matchDate && matchAthlete;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, coachFilterDate, selectedAthleteId]);

  // --- ATHLETE VIEW LOGIC ---
  const myFilteredLogs = useMemo(() => {
    return logs
      .filter(log => {
         const isUser = log.userId === currentUser.id;
         const logDateObj = new Date(log.date);
         const logDateStr = `${logDateObj.getFullYear()}-${String(logDateObj.getMonth() + 1).padStart(2, '0')}-${String(logDateObj.getDate()).padStart(2, '0')}`;
         return isUser && logDateStr === filterDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, currentUser.id, filterDate]);

  if (currentUser.role === 'COACH') {
    return (
      <div className="pb-24 px-2 md:px-4 max-w-6xl mx-auto animate-fade-in">
        
        {/* HEADER */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-blood-500"></span>
            <span className="text-[10px] font-mono font-black text-blood-400 uppercase tracking-[0.25em]">
              PANEL DE RENDIMIENTO & ATLETAS
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white italic uppercase tracking-tight">
            ANÁLISIS DE <span className="text-blood-500">RESULTADOS</span>
          </h1>
          <p className="text-slate-400 mt-2 text-xs md:text-sm font-sans">
            Monitorea el desempeño, marcas y asistencia de tus atletas
          </p>
        </div>

        {/* FILTERS CONSOLE */}
        <div className="bg-dark-900/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 mb-6 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
             <div className="text-xs uppercase text-slate-400 font-display font-bold flex items-center gap-2 tracking-wider">
                <Filter size={15} className="text-blood-500" /> Consola de Filtros
             </div>
             {(coachFilterDate !== getTodayStr() || selectedAthleteId !== 'ALL') && (
               <button 
                 onClick={() => { setCoachFilterDate(getTodayStr()); setSelectedAthleteId('ALL'); }}
                 className="text-xs font-mono font-bold text-blood-400 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blood-950/40 border border-blood-900/30 transition-all"
               >
                 <X size={13}/> Resetear a Hoy
               </button>
             )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
               <label className="block text-[10px] uppercase text-blood-400 font-mono font-bold mb-2 tracking-wider">
                 Fecha del Entrenamiento
               </label>
               <input 
                 type="date"
                 value={coachFilterDate}
                 onChange={(e) => setCoachFilterDate(e.target.value)}
                 className="w-full bg-dark-950 border border-white/10 rounded-2xl p-3.5 text-white text-sm focus:border-blood-500 focus:outline-none font-mono shadow-inner"
               />
            </div>

            <div>
               <label className="block text-[10px] uppercase text-blood-400 font-mono font-bold mb-2 tracking-wider">
                 Filtrar por Atleta
               </label>
               <select 
                 value={selectedAthleteId}
                 onChange={(e) => setSelectedAthleteId(e.target.value)}
                 className="w-full bg-dark-950 border border-white/10 rounded-2xl p-3.5 text-white text-sm focus:border-blood-500 focus:outline-none shadow-inner"
               >
                 <option value="ALL">👥 Todos los Atletas</option>
                 {users
                   .filter(u => (u.role === 'ATHLETE' || u.role === 'COACH') && u.isApproved)
                   .map(user => (
                     <option key={user.id} value={user.id}>
                       {user.fullName || user.username}
                     </option>
                 ))}
               </select>
            </div>
          </div>
        </div>

        {/* SUMMARY BAR & EXPORT */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
           <div className="text-xs font-mono text-slate-400">
              Registros encontrados: <span className="text-white font-black">{coachFilteredLogs.length}</span>
           </div>
           
           <button 
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white px-5 py-2.5 rounded-2xl text-xs font-display font-black uppercase tracking-widest transition-all shadow-glow-green active:scale-95"
           >
              <Download size={15} /> Exportar Reporte CSV
           </button>
        </div>

        {/* RESULTS TABLE */}
        <div className="bg-dark-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          {coachFilteredLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm flex flex-col items-center">
              <Search size={36} className="mb-3 opacity-30 text-slate-400"/>
              <p className="font-display font-bold uppercase tracking-wider">No se encontraron registros para los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase font-display font-bold bg-dark-950/80 border-b border-white/10 tracking-wider">
                  <tr>
                    <th className="px-6 py-4 min-w-[150px]">Atleta</th>
                    <th className="px-6 py-4 min-w-[130px]">Día / Sección</th>
                    <th className="px-6 py-4">Resultado / Marca</th>
                    <th className="px-6 py-4">Notas</th>
                    <th className="px-6 py-4 text-right font-mono">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {coachFilteredLogs.map((log) => {
                    const athlete = getUserDetails(log.userId);
                    const day = getDayDetails(log.dayId);
                    const isNoTraining = log.result === 'No entrené hoy';
                    return (
                      <tr key={log.id} className={`transition-colors ${isNoTraining ? 'bg-red-950/15 hover:bg-red-950/25' : 'hover:bg-white/5'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center text-xs font-display font-black text-blood-400 border border-white/10 shrink-0 overflow-hidden">
                               {athlete?.avatarUrl ? (
                                 <img src={athlete.avatarUrl} alt={athlete.fullName || athlete.username} className="w-full h-full object-cover" />
                               ) : (
                                 athlete?.fullName?.charAt(0).toUpperCase() || <UserIcon size={14}/>
                               )}
                            </div>
                            <span className="font-display font-bold text-white uppercase text-sm">{athlete?.fullName || athlete?.username || 'Desconocido'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="text-xs font-mono font-bold text-blood-400 uppercase">{day?.dayName || 'WOD'}</span>
                              <span className="text-xs text-slate-400">{log.sectionTitle || day?.title}</span>
                           </div>
                        </td>
                        <td className={`px-6 py-4 font-mono font-black text-base whitespace-nowrap ${isNoTraining ? 'text-red-400' : 'text-white'}`}>
                           {isNoTraining ? (
                             <span className="flex items-center gap-1.5 text-xs text-red-400 font-display font-bold uppercase bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-900/30">
                               <XCircle size={14} /> FALTA
                             </span>
                           ) : (
                             log.result
                           )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs italic max-w-[200px] truncate">{log.notes || '-'}</td>
                        <td className="px-6 py-4 text-right text-slate-500 text-xs whitespace-nowrap font-mono">
                          {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* EXPORT MODAL */}
        {showExportModal && (
           <div className="fixed inset-0 z-50 bg-dark-950/95 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
              <div className="bg-dark-900 w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-blood-400 tracking-widest block">
                        REPORTES & ANÁLISIS
                      </span>
                      <h3 className="text-2xl font-display font-black text-white uppercase italic">
                        Exportar a CSV
                      </h3>
                    </div>
                    <button onClick={() => setShowExportModal(false)} className="p-2 rounded-xl bg-dark-800 text-slate-400 hover:text-white transition-colors">
                      <X size={20}/>
                    </button>
                 </div>

                 <div className="space-y-5">
                    <div>
                       <label className="text-[10px] uppercase text-blood-400 font-mono font-bold mb-2 block tracking-wider">
                         Rango Temporal
                       </label>
                       <div className="grid grid-cols-2 gap-2 bg-dark-950 p-1.5 rounded-2xl border border-white/5">
                          <button 
                            onClick={() => setExportType('WEEK')} 
                            className={`py-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all ${
                              exportType === 'WEEK' ? 'bg-blood-600 text-white shadow-glow-sm' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Semana Completa
                          </button>
                          <button 
                            onClick={() => setExportType('MONTH')} 
                            className={`py-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all ${
                              exportType === 'MONTH' ? 'bg-blood-600 text-white shadow-glow-sm' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Mes Completo
                          </button>
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] uppercase text-slate-400 font-mono font-bold mb-2 block tracking-wider">
                         Fecha de Referencia
                       </label>
                       <input 
                         type="date"
                         value={exportRefDate}
                         onChange={(e) => setExportRefDate(e.target.value)}
                         className="w-full bg-dark-950 border border-white/10 rounded-2xl p-3.5 text-white font-mono text-sm focus:border-blood-500 focus:outline-none"
                       />
                       <p className="text-[10px] text-slate-500 mt-2 italic">
                          {exportType === 'WEEK' ? 'Se exportarán todos los entrenamientos de la semana correspondiente.' : 'Se exportarán todos los entrenamientos del mes completo.'}
                       </p>
                    </div>

                    <div>
                       <label className="text-[10px] uppercase text-slate-400 font-mono font-bold mb-2 block tracking-wider">
                         Filtrar por Atleta
                       </label>
                       <select 
                          value={selectedAthleteId}
                          onChange={(e) => setSelectedAthleteId(e.target.value)}
                          className="w-full bg-dark-950 border border-white/10 rounded-2xl p-3.5 text-white text-sm focus:border-blood-500 focus:outline-none"
                       >
                          <option value="ALL">Todos los Atletas</option>
                          {users
                             .filter(u => u.isApproved)
                             .map(user => (
                                <option key={user.id} value={user.id}>{user.fullName || user.username}</option>
                             ))}
                       </select>
                    </div>

                    <button 
                       onClick={handleExport}
                       className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-display font-black uppercase text-sm tracking-widest py-4 rounded-2xl mt-4 shadow-glow-green flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                       <Download size={18} /> Descargar Archivo CSV
                    </button>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  // --- ATHLETE VIEW ---
  return (
    <div className="pb-24 px-2 md:px-4 max-w-4xl mx-auto animate-fade-in">
      
      {/* HEADER */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-blood-500"></span>
          <span className="text-[10px] font-mono font-black text-blood-400 uppercase tracking-[0.25em]">
            HISTORIAL PERSONAL DE BATALLA
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-black text-white italic uppercase tracking-tight">
          DIARIO <span className="text-blood-500">WOD</span>
        </h1>
        <p className="text-slate-400 mt-2 text-xs md:text-sm font-sans">
          Revisa tus marcas y registros pasados
        </p>
      </div>

      {/* DATE PICKER BANNER */}
      <div className="bg-dark-900/90 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl mb-8 sticky top-20 z-20">
         <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-2.5 text-blood-400">
                <CalendarDays size={20} />
                <span className="text-xs font-display font-bold uppercase tracking-widest">
                  Fecha del Registro
                </span>
             </div>
             <input 
               type="date"
               value={filterDate}
               onChange={(e) => setFilterDate(e.target.value)}
               className="bg-dark-950 text-white font-mono text-sm px-4 py-2.5 rounded-xl border border-white/10 focus:border-blood-500 focus:outline-none shadow-inner"
             />
         </div>
      </div>

      {/* LOGS LIST */}
      <div className="space-y-4">
        {myFilteredLogs.length === 0 ? (
          <div className="text-center py-16 bg-dark-900/60 rounded-3xl border border-white/5 border-dashed p-8">
            <div className="w-16 h-16 bg-dark-950 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
               <FileText size={28} className="text-slate-600" />
            </div>
            <p className="text-white font-display font-bold uppercase tracking-wide text-base mb-1">Sin registros para esta fecha</p>
            <p className="text-slate-500 text-xs">Selecciona otro día en el calendario o registra un nuevo resultado desde el WOD.</p>
          </div>
        ) : (
           <div className="bg-dark-900/90 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
               
               <div className="bg-dark-950/80 p-5 border-b border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                     <div className="p-2 rounded-xl bg-blood-600/20 text-blood-400 border border-blood-500/30">
                        <CheckCircle size={18} />
                     </div>
                     <span className="font-display font-bold uppercase tracking-wide text-white text-sm">
                       Registros Completados
                     </span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-dark-800 text-slate-400 px-3 py-1 rounded-full border border-white/5">
                    {myFilteredLogs.length} {myFilteredLogs.length === 1 ? 'Registro' : 'Registros'}
                  </span>
               </div>

               <div className="divide-y divide-white/5">
                  {myFilteredLogs.map((log) => {
                     const logDay = getDayDetails(log.dayId);
                     const isNoTraining = log.result === 'No entrené hoy';
                     return (
                        <div key={log.id} className={`p-5 md:p-6 transition-colors ${isNoTraining ? 'bg-red-950/15' : 'hover:bg-white/5'}`}>
                           <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                                  isNoTraining 
                                    ? 'text-red-400 bg-red-950/40 border-red-900/30' 
                                    : 'text-blood-400 bg-blood-950/40 border-blood-900/30'
                                }`}>
                                   {logDay?.dayName || 'WOD EXTRA'}
                                </span>
                                <span className="text-xs font-display font-bold uppercase text-slate-400 tracking-wider">
                                   {log.sectionTitle || logDay?.title || 'General'}
                                </span>
                              </div>
                              <button 
                                onClick={() => onDeleteLog && onDeleteLog(log.id)}
                                className="text-slate-500 hover:text-red-400 hover:bg-red-950/20 p-2 rounded-xl transition-colors"
                                title="Eliminar Registro"
                              >
                                <Trash2 size={16} />
                              </button>
                           </div>
                           
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="flex-1 space-y-2">
                                 <div className="flex items-center gap-3">
                                    {isNoTraining ? <AlertCircle size={20} className="text-red-400" /> : <Trophy size={20} className="text-amber-500" />}
                                    <span className={`font-mono font-black text-2xl ${isNoTraining ? 'text-red-400 italic' : 'text-white'}`}>
                                       {isNoTraining ? 'NO ASISTÍ AL BOX' : log.result}
                                    </span>
                                 </div>
                                 {log.notes && (
                                    <div className="p-3 rounded-2xl bg-dark-950 border border-white/5 text-xs text-slate-300 italic leading-relaxed">
                                       <VideoContent content={log.notes} />
                                    </div>
                                 )}
                              </div>
                              <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 shrink-0">
                                 <Clock size={13} />
                                 {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
        )}
      </div>
    </div>
  );
};
