import React, { useState, useRef, useEffect } from 'react';
import { ProgramWeek, WorkoutDay, UserRole, WorkoutLog, WorkoutBlock } from '../types';
import { 
  Dumbbell, Save, Calendar, CheckCircle, Coffee, Plus, Trash2, Copy, 
  ChevronLeft, ChevronRight, Edit2, X, PlusCircle, 
  XCircle, AlertCircle, Clock, HeartPulse, Plane, ZapOff, Trophy, Flame, Target, Sparkles
} from 'lucide-react';
import { VideoContent } from './VideoContent';

interface WildBloodViewProps {
  programData: ProgramWeek;
  setProgramData: (data: ProgramWeek) => void;
  onUpdateDay: (day: WorkoutDay) => void;
  onWeekChange: (direction: 'prev' | 'next') => void;
  userRole: UserRole;
  logs: WorkoutLog[];
  onAddLog: (log: WorkoutLog) => void;
  onDeleteLog: (logId: string) => void;
  onUpdateLog: (log: WorkoutLog) => void;
  currentUserId: string;
}

const MOTIVOS_FALTA = [
  { id: 'Lesión', icon: HeartPulse, label: 'Lesión/Dolor' },
  { id: 'Tiempo', icon: Clock, label: 'Trabajo/Tiempo' },
  { id: 'Salud', icon: AlertCircle, label: 'Enfermedad' },
  { id: 'Viaje', icon: Plane, label: 'Viaje' },
  { id: 'Descanso', icon: ZapOff, label: 'Fatiga/Descanso' },
];

const AutoResizeTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };
  useEffect(() => { adjustHeight(); }, [props.value]);
  return (
    <textarea
      ref={textareaRef}
      {...props}
      onChange={(e) => { adjustHeight(); if (props.onChange) props.onChange(e); }}
      className={`${props.className} overflow-hidden resize-none box-border`}
      rows={1}
    />
  );
};

export const WildBloodView: React.FC<WildBloodViewProps> = ({ 
  programData, onUpdateDay, onWeekChange, userRole, logs, 
  onAddLog, onDeleteLog, onUpdateLog, currentUserId 
}) => {
  const getTodayId = () => {
     const d = new Date();
     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [selectedDayId, setSelectedDayId] = useState<string>(getTodayId());
  const [logInputs, setLogInputs] = useState<Record<string, {result: string, notes: string}>>({});
  const [visibleForms, setVisibleForms] = useState<Record<string, boolean>>({});
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [showNoTrainForm, setShowNoTrainForm] = useState(false);
  const [noTrainReason, setNoTrainReason] = useState('');
  const [noTrainNotes, setNoTrainNotes] = useState('');

  useEffect(() => {
     const exists = programData.days.find(d => d.id === selectedDayId);
     if (!exists && programData.days.length > 0) setSelectedDayId(programData.days[0].id);
  }, [programData]);

  const activeDay = programData.days.find(d => d.id === selectedDayId) || programData.days[0] || { 
    id: 'temp', date: '', dayName: '', title: '', focus: '', content: '', blocks: [], isRestDay: false 
  };
  const activeBlocks = activeDay.blocks || [];

  const handleDayChange = (field: keyof WorkoutDay, value: any) => {
    if (userRole !== 'COACH') return;
    onUpdateDay({ ...activeDay, [field]: value });
  };

  const handleUpdateBlock = (blockId: string, field: keyof WorkoutBlock, value: string) => {
    if (userRole !== 'COACH') return;
    const newBlocks = activeBlocks.map(b => b.id === blockId ? { ...b, [field]: value } : b);
    handleDayChange('blocks', newBlocks);
  };

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);

  const handleAddBlock = () => handleDayChange('blocks', [...activeBlocks, { id: generateId(), title: 'Nueva Sección', content: '' }]);
  
  const handleDuplicateBlock = (e: React.MouseEvent, blockId: string) => {
    e.stopPropagation();
    const blockToCopy = activeBlocks.find(b => b.id === blockId);
    if (!blockToCopy) return;
    const newBlocks = [...activeBlocks];
    newBlocks.splice(activeBlocks.findIndex(b => b.id === blockId) + 1, 0, { ...blockToCopy, id: generateId(), title: `${blockToCopy.title} (Copia)` });
    handleDayChange('blocks', newBlocks);
  };
  
  const handleDeleteBlock = (e: React.MouseEvent, blockId: string) => { 
    e.stopPropagation(); 
    handleDayChange('blocks', activeBlocks.filter(b => b.id !== blockId)); 
  };

  const handleEditLog = (log: WorkoutLog, blockId: string) => {
    setEditingLogId(log.id);
    setLogInputs(prev => ({ 
      ...prev, 
      [blockId]: { result: log.result, notes: log.notes || '' } 
    }));
    setVisibleForms(prev => ({ ...prev, [blockId]: true }));
  };

  const handleCancelEdit = (blockId: string) => {
    setEditingLogId(null);
    setLogInputs(p => ({...p, [blockId]: {result: '', notes: ''}}));
    setVisibleForms(p => ({...p, [blockId]: false}));
  };

  const handleSaveLogForBlock = (dayId: string, blockTitle: string, blockId: string) => {
    const input = logInputs[blockId] || {result: '', notes: ''};
    if (!input.result.trim()) return;
    
    if (editingLogId) {
      onUpdateLog({ 
        id: editingLogId, 
        userId: currentUserId, 
        dayId, 
        sectionTitle: blockTitle, 
        result: input.result, 
        notes: input.notes, 
        date: new Date().toISOString() 
      });
    } else {
      onAddLog({ 
        id: Date.now().toString(), 
        userId: currentUserId, 
        dayId, 
        sectionTitle: blockTitle, 
        result: input.result, 
        notes: input.notes, 
        date: new Date().toISOString() 
      });
    }
    
    setLogInputs(prev => ({ ...prev, [blockId]: {result: '', notes: ''} }));
    setVisibleForms(prev => ({ ...prev, [blockId]: false }));
    setEditingLogId(null);
  };

  const handleConfirmNoTraining = () => {
    if (!noTrainReason) return;
    onAddLog({ 
      id: Date.now().toString(), 
      userId: currentUserId, 
      dayId: activeDay.id, 
      sectionTitle: 'Asistencia', 
      result: 'No entrené hoy', 
      notes: `Motivo: ${noTrainReason}. ${noTrainNotes}`, 
      date: new Date().toISOString() 
    });
    setShowNoTrainForm(false); 
    setNoTrainReason(''); 
    setNoTrainNotes('');
  };

  const formatTabDate = (dateStr: string) => new Date(dateStr + 'T00:00:00').getDate();
  const weeklyTrainingDays = programData.days.filter(d => !d.isRestDay).length;
  const completedDaysCount = programData.days.filter(day => logs.some(l => l.dayId === day.id && l.userId === currentUserId && l.result !== 'No entrené hoy')).length;
  const adherencePct = weeklyTrainingDays > 0 ? Math.round((completedDaysCount / weeklyTrainingDays) * 100) : 0;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      
      {/* TOP HERO & WEEK SELECTOR */}
      <div className="mb-8">
        
        {/* WEEK BANNER */}
        <div className="flex flex-col items-center mb-8">
           <div className="flex items-center justify-between w-full max-w-xl gap-4 bg-dark-900/80 backdrop-blur-xl p-4 md:p-5 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-1/2 w-40 h-40 bg-blood-600/10 rounded-full blur-3xl pointer-events-none"></div>

              <button 
                onClick={() => onWeekChange('prev')} 
                className="bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white p-3 rounded-2xl border border-white/5 transition-all active:scale-90 shadow-md"
                title="Semana Anterior"
              >
                <ChevronLeft size={22} strokeWidth={2.5}/>
              </button>
              
              <div className="text-center flex-1">
                 <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blood-500 animate-pulse"></span>
                    <span className="text-[10px] font-mono font-black text-blood-400 uppercase tracking-[0.25em]">
                       PROGRAMACIÓN OFICIAL
                    </span>
                 </div>
                 <h1 className="text-3xl md:text-4xl font-display font-black text-white italic uppercase tracking-wider leading-none">
                   WILD <span className="text-blood-500">BLOOD</span>
                 </h1>
                 <p className="text-xs text-slate-400 font-mono mt-1.5 font-semibold">
                   Semana del {programData.startDate}
                 </p>
              </div>

              <button 
                onClick={() => onWeekChange('next')} 
                className="bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white p-3 rounded-2xl border border-white/5 transition-all active:scale-90 shadow-md"
                title="Semana Siguiente"
              >
                <ChevronRight size={22} strokeWidth={2.5}/>
              </button>
           </div>
           
           {/* WEEKLY ADHERENCE TRACKER */}
           <div className="w-full max-w-xl mt-5 px-2">
              <div className="flex justify-between items-end mb-2 px-1">
                 <div className="flex items-center gap-2">
                    <Flame size={15} className="text-blood-500 animate-pulse" />
                    <span className="text-[11px] font-display font-bold text-slate-300 uppercase tracking-widest">
                       Adherencia Semanal
                    </span>
                 </div>
                 <span className="text-xs font-mono font-black text-blood-400">
                    {adherencePct}% <span className="text-[10px] text-slate-500 font-sans">({completedDaysCount}/{weeklyTrainingDays} Días)</span>
                 </span>
              </div>
              <div className="h-2.5 w-full bg-dark-900 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                 <div 
                   className="h-full bg-gradient-to-r from-blood-700 via-blood-600 to-blood-500 rounded-full transition-all duration-700 ease-out shadow-glow-sm"
                   style={{ width: `${adherencePct}%` }}
                 />
              </div>
           </div>
        </div>

        {/* DAYS OF THE WEEK CAROUSEL */}
        <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar">
          {programData.days.map((day) => {
            const isSelected = selectedDayId === day.id;
            const dayLogs = logs.filter(l => l.dayId === day.id && l.userId === currentUserId);
            const didNotTrain = dayLogs.some(l => l.result === 'No entrené hoy');
            const hasRegularLogs = dayLogs.some(l => l.result !== 'No entrené hoy');
            
            return (
              <button 
                key={day.id} 
                onClick={() => setSelectedDayId(day.id)} 
                className={`flex flex-col items-center justify-center min-w-[6.2rem] md:min-w-[8.5rem] py-5 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
                  isSelected 
                    ? 'bg-gradient-to-b from-blood-600 to-blood-700 border-blood-500 text-white shadow-glow-md scale-[1.03] z-10' 
                    : 'bg-dark-900/90 border-white/5 text-slate-400 hover:border-white/20 hover:text-white active:scale-95'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/40 animate-pulse"></div>
                )}
                <span className={`text-[10px] font-display font-black uppercase tracking-widest mb-1.5 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {day.dayName}
                </span>
                <span className={`text-3xl font-display font-black leading-none ${isSelected ? 'text-white drop-shadow-md' : 'text-slate-200'}`}>
                  {formatTabDate(day.date)}
                </span>
                <div className="mt-3 flex items-center justify-center">
                  {didNotTrain ? (
                    <span className="p-1 rounded-full bg-red-950/60 border border-red-500/50 text-red-400">
                      <XCircle size={15} />
                    </span>
                  ) : hasRegularLogs ? (
                    <span className={`p-1 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-400'}`}>
                      <CheckCircle size={15} />
                    </span>
                  ) : day.isRestDay ? (
                    <span className="opacity-50 text-slate-500">
                      <Coffee size={15} />
                    </span>
                  ) : (
                    <div className={`w-2 h-2 rounded-full border ${isSelected ? 'border-white bg-white/40' : 'border-slate-600'}`}></div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ACTIVE DAY WORKOUT CARD */}
        <div className={`lg:col-span-8 rounded-3xl border overflow-hidden transition-all shadow-2xl relative ${
          activeDay.isRestDay 
            ? 'bg-dark-900/50 border-white/5' 
            : 'bg-dark-900/90 border-white/10'
        }`}>
          
          {/* DAY HEADER */}
          <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-r from-dark-850 via-dark-900 to-dark-850 relative">
             <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-blood-600/20 text-blood-400 border border-blood-500/30">
                  <Calendar size={16} />
                </div>
                <span className="text-xs font-mono font-black text-blood-400 uppercase tracking-widest">
                  {activeDay.dayName} // {formatTabDate(activeDay.date)} DE {programData.startDate}
                </span>
             </div>

             {userRole === 'COACH' ? (
                <div className="space-y-4">
                   <input 
                     className="w-full bg-dark-950 border border-white/10 rounded-2xl px-5 py-4 text-white font-display font-black text-3xl italic uppercase focus:border-blood-500 focus:outline-none transition-all placeholder-slate-600" 
                     value={activeDay.title} 
                     onChange={(e) => handleDayChange('title', e.target.value)} 
                     placeholder="TÍTULO DEL WOD (Ej: MURPH, HERO WOD, POTENCIA...)" 
                   />
                   <div className="flex items-center gap-3">
                     <Dumbbell size={18} className="text-blood-500 shrink-0"/>
                     <input 
                       className="flex-1 bg-dark-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-200 focus:border-blood-500 focus:outline-none" 
                       value={activeDay.focus} 
                       onChange={(e) => handleDayChange('focus', e.target.value)} 
                       placeholder="Enfoque de entrenamiento (Ej: Halterofilia + Gimnásticos)..."
                     />
                   </div>
                   <label className="flex items-center gap-3 text-xs font-display font-bold uppercase text-slate-400 cursor-pointer select-none">
                     <input 
                       type="checkbox" 
                       checked={activeDay.isRestDay} 
                       onChange={(e) => handleDayChange('isRestDay', e.target.checked)} 
                       className="w-4 h-4 rounded accent-blood-600"
                     /> 
                     <span>MARCAR COMO DÍA DE DESCANSO / ACTIVE RECOVERY</span>
                   </label>
                </div>
             ) : (
                <>
                   <h2 className={`text-3xl md:text-5xl font-display font-black uppercase italic leading-tight ${
                     activeDay.isRestDay ? 'text-slate-500' : 'text-white tracking-tight'
                   }`}>
                     {activeDay.title}
                   </h2>
                   {!activeDay.isRestDay && activeDay.focus && (
                     <div className="flex items-center gap-2 text-xs md:text-sm font-display font-black text-blood-400 uppercase tracking-widest mt-3.5">
                       <Target size={16} /> 
                       <span>{activeDay.focus}</span>
                     </div>
                   )}
                </>
             )}
          </div>

          {/* WORKOUT BLOCKS */}
          <div className="p-6 md:p-8 space-y-6">
             {activeBlocks.length === 0 && !activeDay.isRestDay && (
               <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                 <Dumbbell size={32} className="mx-auto text-slate-600 mb-3" />
                 <p className="text-slate-400 font-display font-bold text-sm uppercase tracking-wider">No hay bloques programados todavía.</p>
               </div>
             )}

             {activeBlocks.map((block, idx) => {
               const isFormVisible = visibleForms[block.id];
               const blockLogs = logs.filter(l => l.dayId === activeDay.id && l.userId === currentUserId && l.sectionTitle === block.title);
               
               return (
                <div 
                  key={block.id} 
                  className={`rounded-2xl border transition-all relative overflow-hidden ${
                    userRole === 'COACH' 
                      ? 'bg-dark-950 border-white/10 p-5' 
                      : 'bg-dark-850/60 border-white/5 p-6 md:p-7 shadow-lg hover:border-white/10'
                  }`}
                >
                   {/* COACH MODE BLOCK EDIT */}
                   {userRole === 'COACH' && (
                      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                         <div className="flex items-center gap-2 w-full">
                           <span className="text-[10px] font-mono font-bold text-blood-500 uppercase px-2 py-0.5 rounded bg-blood-950/40 border border-blood-900/30">
                             PARTE {String.fromCharCode(65 + idx)}
                           </span>
                           <input 
                             value={block.title} 
                             onChange={(e) => handleUpdateBlock(block.id, 'title', e.target.value)} 
                             className="bg-transparent text-sm font-display font-black uppercase tracking-widest text-blood-400 focus:outline-none w-full border-b border-transparent focus:border-blood-500" 
                             placeholder="NOMBRE DE SECCIÓN (Ej: WARM UP, STRENGTH, METCON)" 
                           />
                         </div>
                         <div className="flex gap-1">
                           <button 
                             onClick={(e) => handleDuplicateBlock(e, block.id)} 
                             className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                             title="Duplicar Sección"
                           >
                             <Copy size={16}/>
                           </button>
                           <button 
                             onClick={(e) => handleDeleteBlock(e, block.id)} 
                             className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all"
                             title="Eliminar Sección"
                           >
                             <Trash2 size={16}/>
                           </button>
                         </div>
                      </div>
                   )}

                   {userRole === 'COACH' ? (
                     <AutoResizeTextarea 
                       value={block.content} 
                       onChange={(e) => handleUpdateBlock(block.id, 'content', e.target.value)} 
                       placeholder="Detalles del entrenamiento, series, repeticiones, enlaces de YouTube..." 
                       className="w-full bg-transparent text-slate-200 font-mono text-sm leading-relaxed focus:outline-none p-2 border border-white/5 rounded-xl focus:border-blood-500" 
                     />
                   ) : (
                      <>
                        {block.title && (
                          <div className="flex items-center gap-2.5 mb-4">
                            <span className="w-1.5 h-5 bg-blood-600 rounded-full"></span>
                            <h3 className="text-sm md:text-base font-display font-black text-blood-400 uppercase tracking-widest">
                              {block.title}
                            </h3>
                          </div>
                        )}

                        <VideoContent 
                          content={block.content} 
                          className="text-sm md:text-base text-slate-200 leading-relaxed font-sans" 
                        />
                        
                        {/* ATHLETE LOGGING SECTION */}
                        {!activeDay.isRestDay && (
                           <div className="mt-8 border-t border-white/5 pt-6">
                              {blockLogs.length > 0 && (
                                <div className="mb-4 space-y-3">
                                   {blockLogs.map(log => (
                                      <div 
                                        key={log.id} 
                                        className={`p-4 rounded-xl bg-dark-900/80 border flex justify-between items-center group/log shadow-md ${
                                          log.result === 'No entrené hoy' 
                                            ? 'border-red-900/30 bg-red-950/20' 
                                            : 'border-white/10 hover:border-blood-500/40'
                                        }`}
                                      >
                                         <div className="flex flex-col">
                                            <div className="flex items-center gap-2.5">
                                               {log.result === 'No entrené hoy' ? (
                                                 <XCircle size={16} className="text-red-400"/>
                                               ) : (
                                                 <Trophy size={16} className="text-amber-500"/>
                                               )}
                                               <span className={`font-mono font-bold text-lg md:text-xl ${
                                                 log.result === 'No entrené hoy' ? 'text-red-400 italic' : 'text-white'
                                               }`}>
                                                  {log.result === 'No entrené hoy' ? 'FALTA REGISTRADA' : log.result}
                                               </span>
                                            </div>
                                            {log.notes && (
                                              <span className="text-xs text-slate-400 italic mt-1.5 leading-snug">
                                                "{log.notes}"
                                              </span>
                                            )}
                                         </div>
                                         <div className="flex items-center gap-1">
                                            <button 
                                              onClick={() => handleEditLog(log, block.id)} 
                                              className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                              title="Editar"
                                            >
                                               <Edit2 size={16} />
                                            </button>
                                            <button 
                                              onClick={() => onDeleteLog(log.id)} 
                                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
                                              title="Eliminar"
                                            >
                                               <Trash2 size={16} />
                                            </button>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                              )}

                              {!isFormVisible ? (
                                <button 
                                  onClick={() => setVisibleForms(p => ({...p, [block.id]: true}))} 
                                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-white/10 text-slate-400 hover:text-white hover:border-blood-500/50 hover:bg-blood-950/10 transition-all font-display font-bold uppercase text-xs tracking-widest active:scale-98"
                                >
                                  <PlusCircle size={17}/> 
                                  <span>Registrar Marca / Score</span>
                                </button>
                              ) : (
                                <div className="bg-dark-900 p-5 md:p-6 rounded-2xl border border-white/10 animate-fade-in-up shadow-2xl">
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-mono font-bold uppercase text-blood-400 tracking-wider block">
                                          {editingLogId ? 'Editar Resultado' : 'Tu Resultado (Tiempo / Peso / Rondas)'}
                                        </label>
                                        <input 
                                          type="text" 
                                          placeholder="Ej: 225 lbs, 14:32 Rx, 8 Rondas + 12 reps..." 
                                          className="w-full bg-dark-950 border border-white/10 rounded-xl p-3.5 text-white font-mono text-sm focus:border-blood-500 focus:outline-none shadow-inner" 
                                          value={logInputs[block.id]?.result || ''} 
                                          onChange={(e) => setLogInputs(p => ({...p, [block.id]: {...(p[block.id] || {result:'', notes:''}), result: e.target.value}}))} 
                                          autoFocus 
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider block">
                                          Notas / Sensaciones (Opcional)
                                        </label>
                                        <input 
                                          type="text" 
                                          placeholder="Sensaciones, peso usado, modificaciones..." 
                                          className="w-full bg-dark-950 border border-white/10 rounded-xl p-3.5 text-white text-sm focus:border-blood-500 focus:outline-none shadow-inner" 
                                          value={logInputs[block.id]?.notes || ''} 
                                          onChange={(e) => setLogInputs(p => ({...p, [block.id]: {...(p[block.id] || {result:'', notes:''}), notes: e.target.value}}))} 
                                        />
                                      </div>
                                   </div>
                                   <div className="flex gap-2">
                                      <button 
                                        onClick={() => handleCancelEdit(block.id)} 
                                        className="flex-1 py-3 text-xs font-display font-bold uppercase text-slate-400 hover:text-white transition-all rounded-xl hover:bg-white/5"
                                      >
                                        Cancelar
                                      </button>
                                      <button 
                                        onClick={() => handleSaveLogForBlock(activeDay.id, block.title, block.id)} 
                                        className="flex-[2] py-3.5 bg-gradient-to-r from-blood-700 to-blood-600 hover:from-blood-600 hover:to-blood-500 text-white text-xs font-display font-black uppercase tracking-widest rounded-xl transition-all shadow-glow-sm active:scale-95"
                                      >
                                        {editingLogId ? 'Actualizar Registro' : 'Guardar Resultado'}
                                      </button>
                                   </div>
                                </div>
                              )}
                           </div>
                        )}
                      </>
                   )}
                </div>
               );
             })}

             {userRole === 'COACH' && (
               <button 
                 onClick={handleAddBlock} 
                 className="w-full py-5 rounded-2xl border-2 border-dashed border-white/15 text-slate-400 hover:text-blood-400 hover:border-blood-500/50 hover:bg-blood-950/10 transition-all font-display font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2"
               >
                 <Plus size={18}/> 
                 <span>Añadir Nueva Sección</span>
               </button>
             )}
          </div>
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="lg:col-span-4 space-y-6">
           
           {/* NO TRAIN OPTION (Athletes) */}
           {userRole === 'ATHLETE' && !activeDay.isRestDay && (
              <div className="bg-dark-900/90 rounded-3xl border border-white/10 p-6 shadow-xl relative overflow-hidden">
                 <h4 className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-widest mb-4">
                   Registro de Asistencia
                 </h4>
                 {!showNoTrainForm ? (
                   <button 
                     onClick={() => setShowNoTrainForm(true)} 
                     className="w-full flex items-center justify-center gap-3 py-3.5 bg-dark-950 border border-red-900/30 text-red-400 rounded-2xl font-display font-bold uppercase text-xs tracking-widest hover:bg-red-950/20 hover:border-red-500/50 transition-all active:scale-95 shadow-md"
                   >
                     <XCircle size={17}/> 
                     <span>No pude entrenar hoy</span>
                   </button>
                 ) : (
                    <div className="space-y-4 animate-fade-in">
                       <p className="text-xs font-display font-bold text-red-400 uppercase tracking-wider">
                         ¿Por qué no entrenamos hoy?
                       </p>
                       <div className="grid grid-cols-2 gap-2">
                          {MOTIVOS_FALTA.map(m => (
                             <button 
                               key={m.id} 
                               onClick={() => setNoTrainReason(m.id)} 
                               className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-display font-bold uppercase transition-all ${
                                 noTrainReason === m.id 
                                   ? 'bg-red-600 border-red-500 text-white shadow-glow-sm' 
                                   : 'bg-dark-950 border-white/5 text-slate-400 hover:border-white/20'
                               }`}
                             >
                               <m.icon size={14}/> 
                               <span>{m.label}</span>
                             </button>
                          ))}
                       </div>
                       <input 
                         type="text" 
                         placeholder="Notas adicionales (opcional)..." 
                         className="w-full bg-dark-950 border border-white/10 rounded-xl p-3 text-white text-xs focus:border-red-500 focus:outline-none" 
                         value={noTrainNotes} 
                         onChange={(e) => setNoTrainNotes(e.target.value)}
                       />
                       <div className="flex gap-2">
                         <button 
                           onClick={() => setShowNoTrainForm(false)} 
                           className="flex-1 py-2.5 text-xs font-display font-bold uppercase text-slate-400 hover:text-white"
                         >
                           Volver
                         </button>
                         <button 
                           onClick={handleConfirmNoTraining} 
                           disabled={!noTrainReason} 
                           className="flex-[2] py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-display font-black uppercase rounded-xl disabled:opacity-40 transition-all active:scale-95 shadow-md shadow-red-950/40"
                         >
                           Registrar Falta
                         </button>
                       </div>
                    </div>
                 )}
              </div>
           )}

           {/* TODAY'S SCOREBOARD WIDGET */}
           <div className="bg-dark-900/90 rounded-3xl border border-white/10 p-6 shadow-xl sticky top-24">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                 <div className="flex items-center gap-2">
                   <Trophy size={16} className="text-amber-500"/>
                   <h4 className="text-xs font-display font-bold text-slate-200 uppercase tracking-widest">
                     Resultados de Hoy
                   </h4>
                 </div>
                 <span className="text-[10px] font-mono font-bold text-slate-500">
                   {logs.filter(l => l.dayId === activeDay.id && l.userId === currentUserId).length} Logs
                 </span>
              </div>

              <div className="space-y-3">
                 {logs.filter(l => l.dayId === activeDay.id && l.userId === currentUserId).length === 0 ? (
                   <div className="text-center py-10 text-slate-500 text-xs italic">
                     Aún no has registrado resultados hoy.
                   </div>
                 ) : (
                   logs.filter(l => l.dayId === activeDay.id && l.userId === currentUserId).map(log => (
                    <div 
                      key={log.id} 
                      className={`p-4 rounded-2xl border group relative transition-all shadow-sm ${
                        log.result === 'No entrené hoy' 
                          ? 'bg-red-950/20 border-red-900/30' 
                          : 'bg-dark-950 border-white/5 hover:border-white/15'
                      }`}
                    >
                       <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-mono font-bold text-blood-400 uppercase tracking-wider truncate max-w-[75%]">
                            {log.sectionTitle || 'General'}
                          </span>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                               onClick={() => onDeleteLog(log.id)} 
                               className="text-slate-500 hover:text-red-400 transition-colors p-1"
                               title="Eliminar"
                             >
                               <Trash2 size={13}/>
                             </button>
                          </div>
                       </div>
                       <div className={`font-mono text-xl font-black leading-tight ${
                         log.result === 'No entrené hoy' ? 'text-red-400 italic' : 'text-white'
                       }`}>
                         {log.result === 'No entrené hoy' ? 'FALTA' : log.result}
                       </div>
                       {log.notes && (
                         <p className="text-xs text-slate-400 font-sans italic mt-2 leading-relaxed">
                           "{log.notes}"
                         </p>
                       )}
                    </div>
                  ))
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
