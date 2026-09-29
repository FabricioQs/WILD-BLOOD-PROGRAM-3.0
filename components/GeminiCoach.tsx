import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { createCoachChat, sendMessageToCoach } from '../services/geminiService';
import { ChatMessage } from '../types';
import { VideoContent } from './VideoContent';

export const GeminiCoach: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: '¡Hola! Soy tu entrenador Wild Blood. ¿Listo para romper tus límites hoy? Pregúntame sobre el WOD, técnica o cómo configurar el cronómetro.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = createCoachChat();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const response = await sendMessageToCoach(chatRef.current, userMsg);

    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-black text-blood-500 uppercase italic">Entrenador IA</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-2 scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-transparent">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-dark-700' : 'bg-blood-900'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-dark-700 text-white rounded-tr-none' 
                  : 'bg-dark-800 border border-dark-700 text-gray-300 rounded-tl-none'
              }`}>
                <VideoContent content={msg.text} />
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="flex gap-3 max-w-[85%]">
               <div className="w-8 h-8 rounded-full bg-blood-900 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Sparkles size={16} />
               </div>
               <div className="bg-dark-800 border border-dark-700 p-3 rounded-2xl rounded-tl-none">
                 <div className="flex gap-1">
                   <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                   <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                   <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                 </div>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pregunta sobre tu entrenamiento..."
          className="w-full bg-dark-800 border border-dark-700 text-white rounded-full py-3 pl-4 pr-12 focus:outline-none focus:border-blood-500 transition-colors"
          disabled={loading}
        />
        <button 
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blood-600 rounded-full text-white hover:bg-blood-500 disabled:opacity-50 disabled:hover:bg-blood-600 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};