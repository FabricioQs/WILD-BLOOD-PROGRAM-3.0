import React, { useState } from 'react';
import { User } from '../types';
import { 
  Shield, ShieldAlert, User as UserIcon, Crown, CheckCircle, UserPlus, 
  Ban, Unlock, Trash2, Bell, Send, X, Megaphone, Users, Sparkles 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onUpdateRole: (userId: string, newRole: 'ATHLETE' | 'COACH') => void;
  onToggleStatus: (userId: string, newStatus: boolean) => void;
  onDeleteUser: (userId: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ 
  users, 
  currentUser, 
  onUpdateRole, 
  onToggleStatus, 
  onDeleteUser 
}) => {
  const pendingOrBannedUsers = users.filter(u => !u.isApproved);
  const activeUsers = users.filter(u => u.isApproved);

  // Notification State
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgTarget, setMsgTarget] = useState<{id: string | null, name: string}>({id: null, name: 'Todos los Atletas'});
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    onDeleteUser(userId);
  };

  const openMsgModal = (userId: string | null, userName: string) => {
    setMsgTarget({ id: userId, name: userName });
    setMessageText('');
    setShowMsgModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setSending(true);

    try {
      const { error } = await supabase.from('app_notifications').insert({
        sender_id: currentUser.id,
        receiver_id: msgTarget.id, // null = global
        message: messageText,
        is_read: false
      });

      if (error) throw error;
      
      alert(`Mensaje enviado a ${msgTarget.name} correctamente.`);
      setShowMsgModal(false);
    } catch (e) {
      console.error(e);
      alert('Error al enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pb-24 px-2 md:px-4 max-w-5xl mx-auto animate-fade-in">
      
      {/* HEADER */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-blood-500"></span>
          <span className="text-[10px] font-mono font-black text-blood-400 uppercase tracking-[0.25em]">
            CONTROL CENTRAL DE ATLETAS & COACHES
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-black text-white italic uppercase tracking-tight">
          GESTIÓN DE <span className="text-blood-500">EQUIPO</span>
        </h1>
        <p className="text-slate-400 mt-2 text-xs md:text-sm font-sans">
          Autorización de accesos, roles de coaching y comunicados oficiales
        </p>
      </div>

      {/* GLOBAL BROADCAST BANNER */}
      <div className="mb-8">
         <button 
           onClick={() => openMsgModal(null, 'TODOS LOS ATLETAS')}
           className="w-full bg-dark-900/90 hover:bg-dark-850 border border-white/10 hover:border-blood-500/50 text-white p-5 rounded-3xl flex items-center justify-between transition-all group shadow-2xl relative overflow-hidden"
         >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-tr from-blood-700 to-blood-500 p-3.5 rounded-2xl text-white group-hover:scale-110 transition-transform shadow-glow-sm">
                 <Megaphone size={22} />
              </div>
              <div className="text-left">
                 <div className="font-display font-black text-base uppercase tracking-wider text-white">
                   Enviar Anuncio Global al Box
                 </div>
                 <div className="text-xs text-slate-400 font-sans">
                   Enviar notificación push a todos los atletas y coaches activos
                 </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-950 border border-white/5 text-xs font-display font-bold uppercase text-slate-300 group-hover:text-white">
               Redactar <Send size={13}/>
            </div>
         </button>
      </div>

      {/* INACTIVE / PENDING SECTION */}
      {pendingOrBannedUsers.length > 0 && (
        <div className="mb-8 bg-dark-900/90 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 shadow-2xl">
           <div className="flex items-center gap-2.5 mb-4 text-amber-400 font-display font-bold uppercase text-xs tracking-widest border-b border-white/5 pb-3">
              <UserPlus size={16} /> Solicitudes Pendientes / Acceso Restringido ({pendingOrBannedUsers.length})
           </div>
           
           <div className="space-y-3">
              {pendingOrBannedUsers.map(user => (
                 <div key={user.id} className="bg-dark-950/80 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-white/10 transition-all">
                    <div>
                       <div className="font-display font-bold text-base text-white">{user.fullName || user.username}</div>
                       <div className="text-xs font-mono text-slate-400">@{user.username}</div>
                       <div className="text-[10px] font-mono text-amber-400 font-bold uppercase mt-1">Pendiente de Aprobación</div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                       <button 
                          type="button"
                          onClick={(e) => handleDeleteClick(e, user.id)}
                          className="bg-dark-800 hover:bg-red-600 text-slate-400 hover:text-white p-3 rounded-xl transition-colors border border-white/5"
                          title="Eliminar usuario definitivamente"
                       >
                          <Trash2 size={16} />
                       </button>
                       <button 
                          type="button"
                          onClick={() => onToggleStatus(user.id, true)}
                          className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-display font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-glow-green"
                       >
                          Aprobar Acceso <CheckCircle size={15} />
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* ACTIVE USERS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
           <div className="flex items-center gap-2 text-slate-200 font-display font-bold uppercase text-xs tracking-widest">
              <Users size={16} className="text-blood-500" /> Miembros Activos en Wild Blood ({activeUsers.length})
           </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {activeUsers.map((user) => {
            const isMe = user.id === currentUser.id;
            const isCoach = user.role === 'COACH';

            return (
              <div 
                key={user.id} 
                className={`flex flex-col gap-4 p-5 rounded-3xl border transition-all shadow-lg ${
                  isCoach 
                    ? 'bg-dark-900/90 border-blood-500/30' 
                    : 'bg-dark-900/60 border-white/5 hover:border-white/10'
                }`}
              >
                {/* User Info Row */}
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3.5">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border overflow-hidden ${
                       isCoach 
                         ? 'bg-gradient-to-tr from-blood-700 to-blood-500 text-white border-blood-400/40 shadow-glow-sm' 
                         : 'bg-dark-950 text-slate-400 border-white/5'
                     }`}>
                       {user.avatarUrl ? (
                         <img src={user.avatarUrl} alt={user.fullName || user.username} className="w-full h-full object-cover" />
                       ) : (
                         isCoach ? <Crown size={20} /> : <UserIcon size={20} />
                       )}
                     </div>
                     <div>
                       <div className="font-display font-bold text-base text-white flex items-center gap-2">
                         {user.fullName || user.username}
                         {isMe && <span className="text-[9px] font-mono font-bold bg-dark-800 border border-white/10 px-2 py-0.5 rounded-full text-blood-400">TÚ</span>}
                         {isCoach && <span className="text-[9px] font-mono font-black bg-blood-950/60 border border-blood-900/40 px-2 py-0.5 rounded-full text-blood-400">COACH</span>}
                       </div>
                       <div className="text-xs font-mono text-slate-500">
                         @{user.username}
                       </div>
                     </div>
                   </div>
                   
                   {/* Direct Message Button */}
                   {!isMe && (
                     <button 
                        onClick={() => openMsgModal(user.id, user.fullName || user.username)}
                        className="w-10 h-10 rounded-2xl bg-dark-950 hover:bg-blood-600 hover:text-white border border-white/5 flex items-center justify-center text-slate-400 transition-colors shadow-md"
                        title="Enviar mensaje directo"
                     >
                        <Send size={15} />
                     </button>
                   )}
                </div>

                {/* Actions Row */}
                {!isMe && (
                   <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                      {/* Role Toggle */}
                      <button
                        type="button"
                        onClick={() => onUpdateRole(user.id, isCoach ? 'ATHLETE' : 'COACH')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-display font-bold uppercase tracking-wider transition-colors border ${
                          isCoach 
                            ? 'bg-dark-950 text-slate-400 hover:bg-dark-800 border-white/5' 
                            : 'bg-blood-950/30 text-blood-400 hover:bg-blood-900/40 border-blood-900/40'
                        }`}
                      >
                        {isCoach ? (
                          <>Degradar a Atleta <ShieldAlert size={13} /></>
                        ) : (
                          <>Ascender a Coach <Shield size={13} /></>
                        )}
                      </button>

                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => onToggleStatus(user.id, false)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-display font-bold uppercase tracking-wider transition-colors bg-dark-950 text-amber-400 hover:bg-amber-950/40 border border-amber-900/30"
                      >
                         Deshabilitar <Ban size={13} />
                      </button>

                      {/* Delete User */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(e, user.id)}
                        className="flex items-center justify-center px-4 py-2.5 rounded-xl transition-colors bg-dark-950 text-red-400 hover:bg-red-950/40 border border-red-900/30"
                        title="Eliminar usuario definitivamente"
                      >
                         <Trash2 size={14} />
                      </button>
                   </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* SEND MESSAGE MODAL */}
      {showMsgModal && (
         <div className="fixed inset-0 z-[70] bg-dark-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-dark-900 w-full max-w-md rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl relative">
               <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2.5 text-blood-400">
                     <Send size={20} />
                     <h3 className="text-xl font-display font-black text-white uppercase italic">
                       Enviar Notificación
                     </h3>
                  </div>
                  <button onClick={() => setShowMsgModal(false)} className="p-2 rounded-xl bg-dark-800 text-slate-400 hover:text-white transition-colors">
                    <X size={18}/>
                  </button>
               </div>
               
               <div className="mb-4 bg-dark-950 p-3 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-1">Destinatario:</span>
                  <div className="text-white font-display font-bold text-base">{msgTarget.name}</div>
               </div>

               <textarea 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribe el mensaje o anuncio oficial aquí..."
                  className="w-full h-36 bg-dark-950 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-blood-500 focus:outline-none mb-5 resize-none shadow-inner"
               />

               <button 
                  onClick={handleSendMessage}
                  disabled={sending || !messageText.trim()}
                  className="w-full bg-gradient-to-r from-blood-700 to-blood-600 hover:from-blood-600 hover:to-blood-500 disabled:opacity-40 text-white py-4 rounded-2xl font-display font-black uppercase text-xs tracking-widest shadow-glow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
               >
                  {sending ? 'Enviando Comunicado...' : 'Enviar Notificación Inmediata'}
               </button>
            </div>
         </div>
      )}
    </div>
  );
};
