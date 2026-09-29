import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode, TimerConfig, TimerState, WorkoutDay, WorkoutLog, TimerGlobalState } from '../types';
import { Play, Pause, RotateCcw, X, Save, Plus, Minus, Flame, Zap, Shield, Sparkles } from 'lucide-react';
import { playGoSound, playCountDown, playRestSound, unlockAudioContext } from '../utils/audio';

const DEFAULT_CONFIG: Record<TimerMode, TimerConfig> = {
  AMRAP: { mode: 'AMRAP', timeCapMinutes: 10, intervalMinutes: 0, workSeconds: 0, restSeconds: 0, rounds: 0 },
  EMOM: { mode: 'EMOM', timeCapMinutes: 10, intervalMinutes: 1, workSeconds: 0, restSeconds: 0, rounds: 10 },
  FORTIME: { mode: 'FORTIME', timeCapMinutes: 15, intervalMinutes: 0, workSeconds: 0, restSeconds: 0, rounds: 0 },
  TABATA: { mode: 'TABATA', timeCapMinutes: 0, intervalMinutes: 0, workSeconds: 20, restSeconds: 10, rounds: 8 },
};

interface SmartTimerProps {
  programDays?: WorkoutDay[];
  onSaveLog?: (log: WorkoutLog) => void;
  currentUserId?: string;
  globalState?: TimerGlobalState;
  onStateChange?: (state: TimerGlobalState) => void;
}

export const SmartTimer: React.FC<SmartTimerProps> = ({ 
  programDays = [], 
  onSaveLog, 
  currentUserId, 
  globalState, 
  onStateChange 
}) => {
  // Local UI state (derived from global state + animation frame)
  const [displayTime, setDisplayTime] = useState(0);
  const [displayRound, setDisplayRound] = useState(1);
  const [isWork, setIsWork] = useState(true);
  const [prepTimeLeft, setPrepTimeLeft] = useState(0);
  
  // Visual Flash State
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [resultText, setResultText] = useState('');

  const rafRef = useRef<number | null>(null);

  // Helper to safely update global state
  const updateGlobal = (updates: Partial<TimerGlobalState>) => {
     if (globalState && onStateChange) {
        onStateChange({ ...globalState, ...updates });
     }
  };

  // --- AUDIO & VISUAL CUES ---
  const lastSecondRef = useRef<number>(-1);
  
  const handleTickCues = (secondsRemaining: number, isWorkInterval: boolean) => {
     const roundedSec = Math.ceil(secondsRemaining);
     
     if (roundedSec !== lastSecondRef.current) {
        lastSecondRef.current = roundedSec;
        
        // 3-2-1 Countdown
        if (roundedSec <= 3 && roundedSec > 0) {
           playCountDown();
           setFlashColor('bg-amber-500/20'); // Flash Yellow
           setTimeout(() => setFlashColor(null), 300);
        }
        // Zero / Switch
        else if (roundedSec <= 0) {
           if (globalState?.mode === 'TABATA') {
              if (isWorkInterval) playRestSound(); // Work -> Rest
              else playGoSound(); // Rest -> Work
           } else {
              playGoSound(); // Standard finish/round
           }
        }
     }
  };

  // --- MAIN LOOP (RequestAnimationFrame) ---
  const tick = useCallback(() => {
    if (!globalState) return;
    
    // If paused or idle, just render static
    if (!globalState.isActive) {
       return;
    }

    const now = Date.now();
    // Total time elapsed since start, minus total paused duration
    const effectiveElapsed = (now - globalState.startTime) - globalState.totalPausedTime;
    const elapsedSeconds = effectiveElapsed / 1000;

    // 1. PREP TIME (First 10 seconds)
    if (elapsedSeconds < 10) {
       const remainingPrep = 10 - elapsedSeconds;
       setPrepTimeLeft(Math.ceil(remainingPrep));
       
       // Prep Cues
       const roundedPrep = Math.ceil(remainingPrep);
       if (roundedPrep <= 3 && roundedPrep !== lastSecondRef.current) {
          lastSecondRef.current = roundedPrep;
          if (roundedPrep > 0) {
              playCountDown();
              setFlashColor('bg-amber-500/30');
              setTimeout(() => setFlashColor(null), 300);
          }
       }
       if (roundedPrep <= 0 && lastSecondRef.current !== 0) {
          lastSecondRef.current = 0;
          playGoSound();
          setFlashColor('bg-emerald-500/30');
          setTimeout(() => setFlashColor(null), 500);
       }

       setDisplayTime(Math.ceil(remainingPrep));
       rafRef.current = requestAnimationFrame(tick);
       return;
    }

    // Workout Time (subtract the 10s prep)
    const workoutElapsed = elapsedSeconds - 10;
    setPrepTimeLeft(0);

    // 2. MODES LOGIC
    const { mode, config } = globalState;

    if (mode === 'AMRAP') {
       const totalSeconds = config.timeCapMinutes * 60;
       const remaining = totalSeconds - workoutElapsed;
       
       if (remaining <= 0) {
          finishTimer();
          return;
       }
       handleTickCues(remaining, true);
       setDisplayTime(Math.ceil(remaining));
    }
    else if (mode === 'FORTIME') {
       const capSeconds = config.timeCapMinutes * 60;
       if (capSeconds > 0 && workoutElapsed >= capSeconds) {
          finishTimer();
          return;
       }
       setDisplayTime(Math.floor(workoutElapsed));
    }
    else if (mode === 'EMOM') {
       const intervalSec = config.intervalMinutes * 60;
       const roundIndex = Math.floor(workoutElapsed / intervalSec);
       const currentRoundNum = roundIndex + 1;
       
       if (currentRoundNum > config.rounds) {
          finishTimer();
          return;
       }

       const timeInRound = workoutElapsed % intervalSec;
       const remainingInRound = intervalSec - timeInRound;

       handleTickCues(remainingInRound, true);
       setDisplayRound(currentRoundNum);
       setDisplayTime(Math.ceil(remainingInRound));
    }
    else if (mode === 'TABATA') {
       const cycleSec = config.workSeconds + config.restSeconds;
       const roundIndex = Math.floor(workoutElapsed / cycleSec);
       const currentRoundNum = roundIndex + 1;

       if (currentRoundNum > config.rounds) {
          finishTimer();
          return;
       }

       const timeInCycle = workoutElapsed % cycleSec;
       const isWorkPhase = timeInCycle < config.workSeconds;
       
       const remainingPhase = isWorkPhase 
          ? config.workSeconds - timeInCycle
          : cycleSec - timeInCycle;

       handleTickCues(remainingPhase, isWorkPhase);
       setIsWork(isWorkPhase);
       setDisplayRound(currentRoundNum);
       setDisplayTime(Math.ceil(remainingPhase));
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [globalState]);

  // Start/Stop Loop
  useEffect(() => {
    if (globalState?.isActive) {
       rafRef.current = requestAnimationFrame(tick);
    } else {
       if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
       if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [globalState?.isActive, tick]);

  // Handle Static Displays when Paused/Idle
  useEffect(() => {
     if (!globalState || globalState.isActive) return;

     if (globalState.startTime === 0) {
        // IDLE STATE defaults
        const { mode, config } = globalState;
        if (mode === 'AMRAP') setDisplayTime(config.timeCapMinutes * 60);
        if (mode === 'FORTIME') setDisplayTime(0);
        if (mode === 'EMOM') setDisplayTime(config.intervalMinutes * 60);
        if (mode === 'TABATA') setDisplayTime(config.workSeconds);
        setPrepTimeLeft(10);
     }
  }, [globalState?.startTime, globalState?.mode, globalState?.config]);

  // --- CONTROLS ---
  const startTimer = () => {
     if (!globalState) return;
     unlockAudioContext();

     if (globalState.startTime === 0) {
        updateGlobal({
           isActive: true,
           startTime: Date.now(),
           pausedAt: null,
           totalPausedTime: 0
        });
     } else if (globalState.pausedAt) {
        const pauseDuration = Date.now() - globalState.pausedAt;
        updateGlobal({
           isActive: true,
           pausedAt: null,
           totalPausedTime: globalState.totalPausedTime + pauseDuration
        });
     }
  };

  const pauseTimer = () => {
     updateGlobal({
        isActive: false,
        pausedAt: Date.now()
     });
  };

  const resetTimer = () => {
     updateGlobal({
        isActive: false,
        startTime: 0,
        pausedAt: null,
        totalPausedTime: 0
     });
     setPrepTimeLeft(10);
     setDisplayRound(1);
     setIsWork(true);
     setShowSaveModal(false);
     lastSecondRef.current = -1;
  };

  const finishTimer = () => {
     updateGlobal({ isActive: false });
     playRestSound();
     setFlashColor('bg-red-600/30');
     setTimeout(() => setFlashColor(null), 1000);
     handleOpenSaveModal();
  };

  const updateConfig = (key: keyof TimerConfig, val: number) => {
     if (!globalState) return;
     updateGlobal({
        config: { ...globalState.config, [key]: val }
     });
  };
  
  const setMode = (m: TimerMode) => {
     if (!globalState) return;
     updateGlobal({
        mode: m,
        config: DEFAULT_CONFIG[m],
        startTime: 0
     });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOpenSaveModal = () => {
    if (!globalState) return;
    const { mode, config } = globalState;
    let defaultResult = '';
    
    if (mode === 'FORTIME') defaultResult = formatTime(displayTime);
    if (mode === 'AMRAP') defaultResult = `Complete (${config.timeCapMinutes} min)`;
    if (mode === 'EMOM') defaultResult = `EMOM ${config.intervalMinutes}m x ${config.rounds} Rnds`;
    if (mode === 'TABATA') defaultResult = `Tabata Complete`;
    
    setResultText(defaultResult);
    
    const todayName = new Date().toLocaleString('es-ES', { weekday: 'long' }).toLowerCase();
    const matchingDay = programDays.find(d => d.dayName.toLowerCase() === todayName);
    setSelectedDayId(matchingDay ? matchingDay.id : programDays[0]?.id || '');
    setShowSaveModal(true);
  };

  const handleConfirmSave = () => {
    if (onSaveLog && currentUserId && selectedDayId) {
       onSaveLog({
          id: Date.now().toString(),
          userId: currentUserId,
          dayId: selectedDayId,
          sectionTitle: 'Smart Timer',
          result: resultText,
          notes: `Log from SmartTimer (${globalState?.mode})`,
          date: new Date().toISOString()
       });
       setShowSaveModal(false);
       resetTimer();
    }
  };

  if (!globalState) return null;
  const { mode, config } = globalState;
  const isRunning = globalState.isActive;
  const hasStarted = globalState.startTime > 0;

  const renderConfig = () => {
    if (hasStarted) return null;

    return (
      <div className="bg-dark-900/90 backdrop-blur-xl p-6 md:p-8 rounded-3xl mb-6 border border-white/10 w-full max-w-lg shadow-2xl relative z-20 mx-auto">
        <div className="text-center mb-6">
          <span className="text-[10px] font-mono font-black text-blood-400 uppercase tracking-[0.25em] block mb-1">
            CONFIGURACIÓN DEL PROTOCOLO
          </span>
          <h3 className="text-xl font-display font-black text-white uppercase italic tracking-wider">
            Selecciona Modo de Trabajo
          </h3>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8 bg-dark-950 p-1.5 rounded-2xl border border-white/5">
          {(['AMRAP', 'EMOM', 'FORTIME', 'TABATA'] as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-3.5 rounded-xl font-display font-black text-xs md:text-sm uppercase tracking-widest transition-all ${
                mode === m 
                  ? 'bg-gradient-to-r from-blood-700 to-blood-600 text-white shadow-glow-sm scale-[1.02] border border-blood-500/50' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Dynamic Parameter Adjustment */}
        <div className="space-y-5 bg-dark-950/80 p-5 rounded-2xl border border-white/5">
          {(mode === 'AMRAP' || mode === 'FORTIME') && (
            <div className="flex justify-between items-center">
              <div>
                <span className="text-white font-display font-bold uppercase text-sm block">Time Cap</span>
                <span className="text-[10px] text-slate-500 font-mono">Límite en minutos</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-blood-600 hover:text-white rounded-xl border border-white/5 transition-colors font-mono font-bold" 
                  onClick={() => updateConfig('timeCapMinutes', Math.max(1, config.timeCapMinutes - 1))}
                >
                  <Minus size={16} />
                </button>
                <span className="text-2xl font-mono font-black w-14 text-center text-white">{config.timeCapMinutes}m</span>
                <button 
                  className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-blood-600 hover:text-white rounded-xl border border-white/5 transition-colors font-mono font-bold" 
                  onClick={() => updateConfig('timeCapMinutes', config.timeCapMinutes + 1)}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
          
          {mode === 'EMOM' && (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-white font-display font-bold uppercase text-sm block">Intervalo</span>
                  <span className="text-[10px] text-slate-500 font-mono">Cada X minutos</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-blood-600 hover:text-white rounded-xl border border-white/5 transition-colors" onClick={() => updateConfig('intervalMinutes', Math.max(1, config.intervalMinutes - 1))}>
                    <Minus size={16} />
                  </button>
                  <span className="text-2xl font-mono font-black w-14 text-center text-white">{config.intervalMinutes}m</span>
                  <button className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-blood-600 hover:text-white rounded-xl border border-white/5 transition-colors" onClick={() => updateConfig('intervalMinutes', config.intervalMinutes + 1)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div>
                  <span className="text-white font-display font-bold uppercase text-sm block">Total Rondas</span>
                  <span className="text-[10px] text-slate-500 font-mono">Número de ciclos</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-blood-600 hover:text-white rounded-xl border border-white/5 transition-colors" onClick={() => updateConfig('rounds', Math.max(1, config.rounds - 1))}>
                    <Minus size={16} />
                  </button>
                  <span className="text-2xl font-mono font-black w-14 text-center text-white">{config.rounds}</span>
                  <button className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-blood-600 hover:text-white rounded-xl border border-white/5 transition-colors" onClick={() => updateConfig('rounds', config.rounds + 1)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === 'TABATA' && (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-emerald-400 font-display font-bold uppercase text-sm block">Trabajo (Work)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Segundos activos</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-emerald-600 hover:text-white rounded-xl border border-white/5 transition-colors" onClick={() => updateConfig('workSeconds', Math.max(5, config.workSeconds - 5))}>
                    <Minus size={16} />
                  </button>
                  <span className="text-2xl font-mono font-black w-14 text-center text-emerald-400">{config.workSeconds}s</span>
                  <button className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-emerald-600 hover:text-white rounded-xl border border-white/5 transition-colors" onClick={() => updateConfig('workSeconds', config.workSeconds + 5)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div>
                  <span className="text-blood-400 font-display font-bold uppercase text-sm block">Descanso (Rest)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Segundos de pausa</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-blood-600 hover:text-white rounded-xl border border-white/5 transition-colors" onClick={() => updateConfig('restSeconds', Math.max(5, config.restSeconds - 5))}>
                    <Minus size={16} />
                  </button>
                  <span className="text-2xl font-mono font-black w-14 text-center text-blood-400">{config.restSeconds}s</span>
                  <button className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-blood-600 hover:text-white rounded-xl border border-white/5 transition-colors" onClick={() => updateConfig('restSeconds', config.restSeconds + 5)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div>
                  <span className="text-white font-display font-bold uppercase text-sm block">Rondas</span>
                  <span className="text-[10px] text-slate-500 font-mono">Ciclos de trabajo/descanso</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-blood-600 hover:text-white rounded-xl border border-white/5 transition-colors" onClick={() => updateConfig('rounds', Math.max(1, config.rounds - 1))}>
                    <Minus size={16} />
                  </button>
                  <span className="text-2xl font-mono font-black w-14 text-center text-white">{config.rounds}</span>
                  <button className="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-blood-600 hover:text-white rounded-xl border border-white/5 transition-colors" onClick={() => updateConfig('rounds', config.rounds + 1)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const getBackgroundColor = () => {
     if (flashColor) return flashColor;
     if (!hasStarted) return 'bg-transparent';
     if (prepTimeLeft > 0) return 'bg-amber-950/20';
     if (mode === 'TABATA') return isWork ? 'bg-emerald-950/20' : 'bg-blood-950/20';
     return 'bg-transparent';
  };

  const getStatusText = () => {
    if (!hasStarted) return mode;
    if (prepTimeLeft > 0) return "PREPÁRATE // 10s COUNTDOWN";
    if (mode === 'TABATA') return isWork ? "WORK // INTENSIDAD MÁXIMA" : "REST // RECUPERA AIRE";
    return mode;
  };

  return (
    <div className={`flex flex-col items-center justify-between min-h-[82vh] w-full transition-colors duration-500 ${getBackgroundColor()} relative overflow-hidden rounded-3xl p-4 md:p-8`}>
      
      {/* Save Modal */}
      {showSaveModal && (
         <div className="fixed inset-0 z-[60] bg-dark-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-dark-900 rounded-3xl w-full max-w-md border border-white/10 p-6 md:p-8 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-blood-400 tracking-widest block">
                      GUARDAR SCORE
                    </span>
                    <h3 className="text-2xl font-display font-black text-white uppercase italic">
                      Registrar en Diario WOD
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowSaveModal(false)} 
                    className="p-2 rounded-xl bg-dark-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
               </div>
               
               <div className="space-y-5">
                  <div>
                     <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-2 tracking-wider">
                       Seleccionar Día del Programa
                     </label>
                     <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {programDays.map(day => (
                           <button 
                              key={day.id}
                              onClick={() => setSelectedDayId(day.id)}
                              className={`p-3 rounded-xl text-xs font-display font-bold uppercase border transition-all ${
                                 selectedDayId === day.id 
                                 ? 'bg-blood-600 border-blood-500 text-white shadow-glow-sm' 
                                 : 'bg-dark-950 border-white/5 text-slate-400 hover:border-white/20'
                              }`}
                           >
                              {day.dayName}
                           </button>
                        ))}
                     </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-2 tracking-wider">
                       Resultado / Tiempo Final
                     </label>
                     <input 
                        type="text" 
                        value={resultText}
                        onChange={(e) => setResultText(e.target.value)}
                        className="w-full bg-dark-950 border border-white/10 rounded-xl p-4 text-white font-mono text-lg focus:border-blood-500 focus:outline-none shadow-inner"
                     />
                  </div>
                  <button 
                     onClick={handleConfirmSave}
                     className="w-full bg-gradient-to-r from-blood-700 to-blood-600 hover:from-blood-600 hover:to-blood-500 text-white py-4 rounded-xl font-display font-black uppercase text-sm tracking-widest mt-2 shadow-glow-md active:scale-95 transition-all"
                  >
                     Confirmar y Guardar
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* HEADER / STATUS */}
      <div className="flex flex-col items-center justify-center w-full mt-2 flex-1">
          {!hasStarted ? (
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blood-500 animate-ping"></span>
                <span className="text-[10px] font-mono font-black text-blood-400 uppercase tracking-[0.3em]">
                  COMPETITION GYM CLOCK
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-black text-white tracking-tight uppercase italic drop-shadow-2xl">
                SMART <span className="text-blood-500">TIMER</span>
              </h1>
            </div>
          ) : (
             <div className={`uppercase font-display font-black text-2xl md:text-3xl tracking-[0.2em] animate-fade-in mb-4 px-4 py-1.5 rounded-full border ${
               mode === 'TABATA' 
                 ? isWork 
                   ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40 shadow-glow-green' 
                   : 'text-blood-400 bg-blood-950/40 border-blood-500/40 shadow-glow-sm'
                 : prepTimeLeft > 0 
                   ? 'text-amber-400 bg-amber-950/40 border-amber-500/40 shadow-glow-amber' 
                   : 'text-blood-400 bg-dark-900 border-white/10'
             }`}>
                {getStatusText()}
             </div>
          )}

          {/* DIGITAL TIMER DISPLAY */}
          {hasStarted && (
             <div className="flex flex-col items-center justify-center w-full my-auto">
                <div className={`font-mono font-black text-[clamp(6rem,30vw,14rem)] leading-none tabular-nums tracking-tighter select-none transition-colors duration-300 drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]
                   ${mode === 'TABATA' ? (isWork ? 'text-emerald-400' : 'text-blood-400') : 'text-white'}
                   ${prepTimeLeft > 0 ? 'text-amber-400 animate-pulse' : ''}
                `}>
                  {prepTimeLeft > 0 ? prepTimeLeft : formatTime(displayTime)}
                </div>
                
                {/* Rounds Counter */}
                {(mode === 'EMOM' || mode === 'TABATA') && prepTimeLeft === 0 && (
                  <div className="mt-6 px-6 py-2 rounded-2xl bg-dark-900/80 border border-white/10 text-2xl md:text-3xl font-display font-black uppercase text-slate-300 tracking-wider">
                    RONDA <span className="text-blood-400 font-mono">{displayRound}</span> <span className="text-slate-600">/</span> {config.rounds}
                  </div>
                )}
             </div>
          )}
          
          {/* CONFIG (Only visible when idle) */}
          {renderConfig()}
      </div>

      {/* FOOTER CONTROLS */}
      <div className="flex flex-col items-center gap-6 w-full pb-4 relative z-20">
         
         {/* Manual Save Btn */}
         {hasStarted && (!isRunning || prepTimeLeft === 0) && (
            <button 
               onClick={handleOpenSaveModal}
               className="flex items-center gap-2.5 bg-dark-900/90 border border-white/15 px-8 py-3.5 rounded-2xl text-white hover:bg-blood-600 hover:border-blood-500 transition-all shadow-xl backdrop-blur-sm active:scale-95 font-display font-bold uppercase text-xs tracking-widest"
            >
               <Save size={18} /> 
               <span>Guardar Resultado del WOD</span>
            </button>
         )}

         {/* Main Play / Pause / Reset Action Controls */}
         <div className="flex items-center gap-6 md:gap-8">
            {!hasStarted ? (
              <button 
                onClick={startTimer}
                className="flex items-center justify-center w-28 h-28 bg-gradient-to-tr from-blood-700 via-blood-600 to-blood-500 hover:from-blood-600 hover:to-blood-400 text-white rounded-3xl shadow-glow-lg transition-all transform hover:scale-105 active:scale-95 border border-white/20 group"
                title="Iniciar Timer (10s Prep)"
              >
                <Play size={44} fill="currentColor" className="ml-1.5 group-hover:scale-110 transition-transform" />
              </button>
            ) : (
              <>
                <button 
                  onClick={isRunning ? pauseTimer : startTimer}
                  className={`flex items-center justify-center w-24 h-24 rounded-3xl transition-all shadow-2xl transform active:scale-95 border ${
                     isRunning 
                     ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-glow-amber border-amber-400/40' 
                     : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-glow-green border-emerald-400/40'
                  }`}
                  title={isRunning ? "Pausar" : "Reanudar"}
                >
                  {isRunning ? <Pause size={38} fill="currentColor" /> : <Play size={38} fill="currentColor" className="ml-1"/>}
                </button>
                
                <button 
                  onClick={resetTimer}
                  className="flex items-center justify-center w-20 h-20 bg-dark-900 border border-white/10 text-slate-400 hover:text-white hover:bg-dark-800 rounded-3xl transition-all active:scale-95 shadow-lg"
                  title="Reiniciar Timer"
                >
                  <RotateCcw size={28} />
                </button>
              </>
            )}
         </div>
      </div>
    </div>
  );
};
