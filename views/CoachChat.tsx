import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, ChevronLeft } from 'lucide-react';
import { createCoachChatSession, getDailyCoachMessage } from '../services/geminiService';
import MicrophoneButton from '../components/MicrophoneButton';
import { useAppState } from '../hooks/useAppState';
import { logEvent } from '../services/analytics';

const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const CoachChat: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const initChat = async () => {
        try {
            chatRef.current = createCoachChatSession(state.profile);
            
            // If flagged to fetch insight, do it now
            if (location.state?.fetchInsight) {
                setIsInitialLoading(true);
                const today = getLocalDate();
                const todayLog = state.logs[today] || { date: today, meals: [] };
                
                const msg = await getDailyCoachMessage(state.profile, todayLog, state.logs);
                setMessages([{ role: 'model', text: msg }]);
                setIsInitialLoading(false);
            } else {
                setMessages([{ role: 'model', text: `Hi ${state.profile.name}, I'm here to support you. How are you feeling about your goals today?` }]);
            }
        } catch (e) {
            console.error("Failed to init chat", e);
            setIsInitialLoading(false);
        }
    };
    initChat();
  }, [state.profile, state.logs, location.state]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isInitialLoading]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current || isProcessing) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsProcessing(true);
    logEvent('send_coach_message');

    try {
      const response = await chatRef.current.sendMessage({ message: userText });
      const responseText = response.text;
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-100px)] relative">
      <div className="flex-none p-4 pb-0 flex items-center gap-2">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
           <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Coach</h1>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-32">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div 
               className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                 ${msg.role === 'user' 
                   ? 'bg-emerald-600 text-white rounded-br-none' 
                   : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                 }`}
             >
               {msg.text}
             </div>
          </div>
        ))}
        {(isProcessing || isInitialLoading) && (
           <div className="flex justify-start">
             <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (Floating) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pt-2 bg-slate-50 dark:bg-slate-900 transition-transform duration-300 pb-safe-0">
          <div className="pb-safe">
            <div className="flex items-end gap-2 bg-white dark:bg-slate-800 p-2 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-700 min-h-[4rem]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask your coach anything..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-slate-800 dark:text-white placeholder:text-slate-400 leading-relaxed self-center"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                rows={1}
              />
              
              <div className="flex items-center gap-1 pb-1 pr-1 h-12 self-end">
                 <div className="scale-90">
                    <MicrophoneButton onTranscript={(text) => setInput(prev => prev + (prev ? ' ' : '') + text)} isProcessing={isProcessing} />
                 </div>
                 <button 
                   onClick={handleSend}
                   disabled={!input.trim() || isProcessing}
                   className="w-11 h-11 bg-emerald-600 disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-full shadow-md hover:bg-emerald-700 transition flex items-center justify-center"
                 >
                   <ArrowUp className="w-5 h-5" />
                 </button>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};