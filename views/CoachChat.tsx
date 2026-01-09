import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, ChevronLeft } from 'lucide-react';
import { createCoachChatSession } from '../services/geminiService';
import MicrophoneButton from '../components/MicrophoneButton';
import { useAppState } from '../hooks/useAppState';
import { logEvent } from '../services/analytics';

export const CoachChat: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const initialContext = location.state?.initialContext;

  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    try {
      chatRef.current = createCoachChatSession(state.profile);
      
      // If we have an initial context (the daily insight), add it as the model's first message
      if (initialContext) {
        setMessages([{ role: 'model', text: initialContext }]);
      } else {
        setMessages([{ role: 'model', text: `Hi ${state.profile.name}, I'm here to support you. How are you feeling about your goals today?` }]);
      }
    } catch (e) {
      console.error("Failed to init chat", e);
    }
  }, [initialContext, state.profile]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    // Updated to use 100dvh
    <div className="flex flex-col h-[calc(100dvh-50px)] sm:h-[calc(100%-10px)]">
      <div className="flex-none p-4 pb-0 flex items-center gap-2">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
           <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Coach</h1>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div 
               className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed
                 ${msg.role === 'user' 
                   ? 'bg-emerald-600 text-white rounded-br-none' 
                   : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'
                 }`}
             >
               {msg.text}
             </div>
          </div>
        ))}
        {isProcessing && (
           <div className="flex justify-start">
             <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-none bg-slate-50 dark:bg-slate-900 p-4 pt-2 pb-safe">
        <div className="flex items-end gap-2 relative">
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center p-1 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
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
              className="w-full bg-transparent border-none focus:ring-0 resize-none p-3 h-12 max-h-32 text-slate-800 dark:text-white placeholder:text-slate-400"
              rows={1}
            />
            <div className="p-1">
               <MicrophoneButton onTranscript={(text) => setInput(prev => prev + (prev ? ' ' : '') + text)} isProcessing={isProcessing} />
            </div>
          </div>
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="p-3 bg-emerald-600 disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-full shadow-md hover:bg-emerald-700 transition"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};