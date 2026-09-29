import React, { useState, useMemo } from 'react';
import { Layers, ListFilter, X, Disc, Dumbbell, Archive, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { AthleteRecord } from '../types';

interface RMCalculatorProps {
  athleteRecords?: AthleteRecord[];
  savedWeight: string;
  onWeightChange: (weight: string) => void;
}

const AVAILABLE_PLATES = [45, 35, 25, 15, 10, 5, 2.5];

export const RMCalculator: React.FC<RMCalculatorProps> = ({ 
  athleteRecords = [], 
  savedWeight, 
  onWeightChange 
}) => {
  const [step, setStep] = useState<5 | 10>(5);
  const [selectedWeight, setSelectedWeight] = useState<number | null>(null);
  const [barType, setBarType] = useState<'MENS' | 'WOMENS'>('MENS');

  const liftingRecords = useMemo(() => {
    return athleteRecords.filter(r => r.category === 'LIFTING' && r.value && !isNaN(parseFloat(r.value)));
  }, [athleteRecords]);

  const handleSelectRecord = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const exerciseName = e.target.value;
    if (!exerciseName) return;

    const record = liftingRecords.find(r => r.exercise === exerciseName);
    if (record) {
      let val = parseFloat(record.value);
      if (record.unit === 'kg') {
        val = val * 2.20462;
      }
      onWeightChange(val.toFixed(0));
    }
  };

  const oneRepMax = parseFloat(savedWeight) || 0;
  const oneRepMaxKg = (oneRepMax / 2.20462).toFixed(1);

  const percentages = [];
  for (let i = 120; i >= step; i -= step) {
    percentages.push(i);
  }

  const calculatePlates = (targetLbs: number, barLbs: number) => {
    if (targetLbs <= barLbs) return [];

    let remainder = (targetLbs - barLbs) / 2;
    const platesNeeded: number[] = [];

    AVAILABLE_PLATES.forEach((plate) => {
      while (remainder >= plate) {
        platesNeeded.push(plate);
        remainder -= plate;
        remainder = Math.round(remainder * 100) / 100;
      }
    });

    return platesNeeded;
  };

  const currentPlates = selectedWeight 
    ? calculatePlates(selectedWeight, barType === 'MENS' ? 45 : 35) 
    : [];

  const getPlateHeight = (lbs: number) => {
    if (lbs === 45) return 'h-28';
    if (lbs === 35) return 'h-24';
    if (lbs === 25) return 'h-20';
    if (lbs === 15) return 'h-16';
    if (lbs === 10) return 'h-13';
    if (lbs === 5) return 'h-10';
    return 'h-8';
  };

  const getPlateColor = (lbs: number) => {
    // Official Olympic Bumper Plate Color Coding
    if (lbs === 45) return 'bg-red-600 border-red-400 text-white shadow-glow-sm';
    if (lbs === 35) return 'bg-blue-600 border-blue-400 text-white';
    if (lbs === 25) return 'bg-yellow-500 border-yellow-300 text-black';
    if (lbs === 15) return 'bg-emerald-600 border-emerald-400 text-white';
    if (lbs === 10) return 'bg-slate-200 border-white text-slate-900';
    if (lbs === 5) return 'bg-dark-700 border-dark-500 text-white';
    return 'bg-slate-400 border-slate-300 text-black';
  };

  const getZoneLabel = (pct: number) => {
    if (pct > 100) return { label: 'SUPRA-MÁXIMO', color: 'text-blood-400 bg-blood-950/60 border-blood-900/50' };
    if (pct >= 90) return { label: 'FUERZA MÁXIMA', color: 'text-red-400 bg-red-950/40 border-red-900/30' };
    if (pct >= 80) return { label: 'FUERZA BASE', color: 'text-amber-400 bg-amber-950/40 border-amber-900/30' };
    if (pct >= 70) return { label: 'HIPERTROFIA / POTENCIA', color: 'text-blue-400 bg-blue-950/40 border-blue-900/30' };
    return { label: 'TÉCNICA / VELOCIDAD', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/30' };
  };

  return (
    <div className="pb-24 px-2 md:px-4 max-w-4xl mx-auto animate-fade-in">
      
      {/* HEADER */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-blood-500"></span>
          <span className="text-[10px] font-mono font-black text-blood-400 uppercase tracking-[0.25em]">
            CALCULADORA DE CARGAS & PORCENTAJES
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-black text-white italic uppercase tracking-tight">
          TABLA <span className="text-blood-500">1RM</span>
        </h1>
        <p className="text-slate-400 mt-2 text-xs md:text-sm font-sans">
          Calcula tus zonas de intensidad y distribución de discos en barra
        </p>
      </div>

      {/* 1RM INPUT CARD */}
      <div className="bg-dark-900/90 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blood-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-md mx-auto">
          
          {/* Quick Load from Profile */}
          {liftingRecords.length > 0 && (
             <div className="mb-6">
                <label className="text-[10px] uppercase text-slate-400 font-mono font-bold mb-2 block tracking-widest flex items-center gap-1.5 justify-center">
                   <Archive size={13} className="text-blood-500"/> Cargar de mis Récords Guardados
                </label>
                <select 
                  onChange={handleSelectRecord}
                  defaultValue=""
                  className="w-full bg-dark-950 border border-white/10 rounded-2xl p-3 text-sm text-slate-200 focus:border-blood-500 focus:outline-none"
                >
                   <option value="" disabled>Seleccionar Levantamiento...</option>
                   {liftingRecords.map(r => (
                      <option key={r.exercise} value={r.exercise}>
                         {r.exercise}: {r.value} {r.unit}
                      </option>
                   ))}
                </select>
             </div>
          )}

          <label className="block text-xs uppercase text-blood-400 font-display font-bold mb-2 text-center tracking-widest">
            Tu Marca Máxima (1 Rep Max)
          </label>
          
          <div className="relative flex items-center justify-center">
            <input
              type="number"
              value={savedWeight}
              onChange={(e) => onWeightChange(e.target.value)}
              placeholder="0"
              className="w-full bg-dark-950 border-b-2 border-white/15 focus:border-blood-500 text-center text-6xl md:text-7xl font-mono font-black text-white p-3 outline-none transition-colors placeholder-dark-700 rounded-t-2xl"
            />
            <span className="absolute right-4 text-xs font-mono font-bold text-slate-500 uppercase">
              LBS
            </span>
          </div>

          {oneRepMax > 0 && (
            <div className="flex justify-center mt-4">
              <div className="px-4 py-1.5 rounded-full bg-dark-950 border border-white/5 text-slate-400 font-mono text-xs flex items-center gap-2 shadow-inner">
                <span>Equivalente:</span>
                <strong className="text-white font-mono text-sm">{oneRepMaxKg} KG</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {oneRepMax > 0 && (
        <>
          {/* Step Toggle Switch */}
          <div className="flex justify-center mb-6">
            <div className="bg-dark-900 p-1.5 rounded-2xl border border-white/10 inline-flex shadow-lg">
               <button 
                 onClick={() => setStep(10)}
                 className={`px-5 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                    step === 10 
                    ? 'bg-blood-600 text-white shadow-glow-sm' 
                    : 'text-slate-400 hover:text-white'
                 }`}
               >
                 <Layers size={15} /> Saltos 10%
               </button>
               <button 
                 onClick={() => setStep(5)}
                 className={`px-5 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                    step === 5 
                    ? 'bg-blood-600 text-white shadow-glow-sm' 
                    : 'text-slate-400 hover:text-white'
                 }`}
               >
                 <ListFilter size={15} /> Saltos 5%
               </button>
            </div>
          </div>

          {/* PERCENTAGES TABLE */}
          <div className="bg-dark-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <table className="w-full">
              <thead>
                <tr className="bg-dark-950/80 border-b border-white/10 text-slate-400 uppercase text-xs font-display font-bold tracking-wider">
                  <th className="py-4 px-6 text-left">Intensidad (%)</th>
                  <th className="py-4 px-6 text-center hidden md:table-cell">Zona de Entrenamiento</th>
                  <th className="py-4 px-6 text-right">Carga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {percentages.map((pct) => {
                  const lbs = Math.round(oneRepMax * (pct / 100));
                  const kgs = (lbs / 2.20462).toFixed(1);
                  const isSupra = pct > 100;
                  const isHeavy = pct >= 85;
                  const zone = getZoneLabel(pct);
                  
                  return (
                    <tr 
                      key={pct} 
                      onClick={() => setSelectedWeight(lbs)}
                      className={`transition-all cursor-pointer group ${
                        isSupra 
                          ? 'bg-blood-950/20 hover:bg-blood-950/40' 
                          : isHeavy 
                            ? 'bg-dark-850/40 hover:bg-blood-950/10' 
                            : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-black text-xl md:text-2xl leading-none ${
                            pct >= 100 ? 'text-blood-400' : isHeavy ? 'text-white' : 'text-slate-300'
                          }`}>
                            {pct}%
                          </span>
                          <span className="text-[10px] text-blood-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono font-bold flex items-center gap-1">
                            Ver Discos <ChevronRight size={12}/>
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6 text-center hidden md:table-cell">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${zone.color}`}>
                          {zone.label}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-xl md:text-2xl font-mono leading-none mb-1 ${
                            pct >= 100 ? 'text-blood-400 font-black' : 'text-white font-bold'
                          }`}>
                            {lbs} <span className="text-xs uppercase text-slate-500 font-sans">lbs</span>
                          </span>
                          <span className="text-xs font-mono text-slate-500 leading-none">
                            {kgs} kg
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* --- PLATE LOADER MODAL --- */}
      {selectedWeight !== null && (
        <div className="fixed inset-0 z-50 bg-dark-950/95 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
           <div className="bg-dark-900 w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="bg-dark-950 p-6 border-b border-white/5 flex justify-between items-center">
                 <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-blood-400 tracking-widest block">
                      DISTRIBUCIÓN DE DISCOS
                    </span>
                    <h3 className="text-2xl font-display font-black text-white uppercase italic">
                      Cargar Barra
                    </h3>
                 </div>
                 <div className="text-right">
                   <div className="text-2xl font-mono font-black text-blood-400 leading-none">{selectedWeight} lbs</div>
                   <div className="text-xs font-mono text-slate-500 mt-1">{(selectedWeight / 2.20462).toFixed(1)} kg</div>
                 </div>
                 <button 
                   onClick={() => setSelectedWeight(null)}
                   className="w-10 h-10 rounded-xl bg-dark-800 hover:bg-dark-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors ml-4"
                 >
                    <X size={20} />
                 </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                 
                 {/* Bar Toggle */}
                 <div className="flex bg-dark-950 rounded-2xl p-1.5 mb-8 border border-white/5">
                    <button 
                       onClick={() => setBarType('MENS')}
                       className={`flex-1 py-3 rounded-xl text-xs font-display font-bold uppercase flex flex-col items-center gap-0.5 transition-all ${
                          barType === 'MENS' ? 'bg-blood-600 text-white shadow-glow-sm' : 'text-slate-400 hover:text-white'
                       }`}
                    >
                       <span className="tracking-widest">Barra Olímpica Hombres</span>
                       <span className="text-[10px] font-mono opacity-80">20 kg / 45 lbs</span>
                    </button>
                    <button 
                       onClick={() => setBarType('WOMENS')}
                       className={`flex-1 py-3 rounded-xl text-xs font-display font-bold uppercase flex flex-col items-center gap-0.5 transition-all ${
                          barType === 'WOMENS' ? 'bg-blood-600 text-white shadow-glow-sm' : 'text-slate-400 hover:text-white'
                       }`}
                    >
                       <span className="tracking-widest">Barra Olímpica Mujeres</span>
                       <span className="text-[10px] font-mono opacity-80">15 kg / 35 lbs</span>
                    </button>
                 </div>

                 {/* Calculations */}
                 {selectedWeight < (barType === 'MENS' ? 45 : 35) ? (
                    <div className="text-center py-12 bg-dark-950 rounded-2xl border border-dashed border-white/10">
                       <Dumbbell size={36} className="mx-auto text-slate-600 mb-2"/>
                       <p className="text-slate-400 font-display font-bold uppercase text-sm">El peso objetivo es menor al peso de la barra sola.</p>
                    </div>
                 ) : (
                    <>
                       {/* Visual Barbell Sleeve Representation */}
                       <div className="flex items-center justify-center mb-8 h-36 relative bg-dark-950 rounded-2xl border border-white/5 p-4 overflow-hidden">
                          {/* The Barbell Shaft */}
                          <div className="absolute w-full h-3 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 rounded-full z-0 shadow-inner"></div>
                          {/* The Sleeve Collar */}
                          <div className="absolute w-3 h-8 bg-slate-300 left-[8%] z-10 border-l border-slate-500 rounded-sm"></div>
                          
                          {/* The Plates stacked on sleeve */}
                          <div className="flex items-center flex-row-reverse gap-1.5 z-20 absolute left-[calc(8%+14px)]">
                             {currentPlates.map((p, i) => (
                                <div 
                                   key={i} 
                                   className={`w-4 md:w-5 ${getPlateHeight(p)} ${getPlateColor(p)} border-r border-white/30 rounded-sm shadow-xl flex items-center justify-center font-mono font-bold text-[8px] select-none`}
                                   title={`${p} lbs`}
                                >
                                </div>
                             ))}
                          </div>
                          
                          <div className="absolute right-4 bottom-2 text-[10px] text-slate-500 font-mono uppercase">
                             *Carga por cada lado
                          </div>
                       </div>

                       {/* List of Plates needed */}
                       <div className="space-y-3">
                          <h4 className="text-xs font-display font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-3">
                             Discos requeridos por lado
                          </h4>
                          {currentPlates.length === 0 ? (
                             <div className="text-center text-slate-500 text-sm py-4">Barra vacía (0 discos adicionales)</div>
                          ) : (
                             <div className="grid grid-cols-2 gap-3">
                                {Array.from(new Set(currentPlates)).sort((a,b) => b-a).map((plateWeight) => {
                                   const count = currentPlates.filter(p => p === plateWeight).length;
                                   return (
                                      <div key={plateWeight} className="bg-dark-950 p-3.5 rounded-2xl flex items-center justify-between border border-white/5">
                                         <div className="flex items-center gap-2.5">
                                            <Disc size={18} className="text-blood-500" />
                                            <div>
                                              <span className="text-white font-mono font-black text-lg">{plateWeight}</span>
                                              <span className="text-[10px] text-slate-500 uppercase font-sans ml-1">lbs</span>
                                            </div>
                                         </div>
                                         <div className="bg-dark-800 px-3 py-1 rounded-xl text-xs font-mono font-bold text-blood-400 border border-white/5">
                                            x{count}
                                         </div>
                                      </div>
                                   );
                                })}
                             </div>
                          )}
                       </div>
                    </>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
