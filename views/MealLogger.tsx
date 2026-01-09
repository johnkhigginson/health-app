import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowUp, Check, Edit2, X, Clock, Calendar } from 'lucide-react';
import { Meal } from '../types';
import { createMealChatSession } from '../services/geminiService';
import MicrophoneButton from '../components/MicrophoneButton';
import { EditMealModal } from '../components/EditMealModal';

interface MealLoggerProps {
  onLogMeal: (meal: Meal) => void;
}

export const MealLogger: React.FC<MealLoggerProps> = ({ onLogMeal }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Hi! What did you have to eat? You can tell me what you had and when you had it.' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Staging state
  const [draftMeal, setDraftMeal] = useState<Meal | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    try {
      chatRef.current = createMealChatSession();
    } catch (e) {
      console.error("Failed to init chat", e);
    }
  }, []);

  useEffect(() => {
    if (!draftMeal) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, draftMeal]);

  const parseTime = (timeStr: string | null): string => {
    const now = new Date();
    if (!timeStr) return now.toISOString();

    // timeStr is expected to be HH:MM in 24h
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const mealTime = new Date(now);
      mealTime.setHours(hours, minutes, 0, 0);
      return mealTime.toISOString();
    }
    return now.toISOString();
  };

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current || isProcessing) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsProcessing(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userText });
      const responseText = response.text;
      
      try {
        const parsed = JSON.parse(responseText);
        
        if (parsed.conversationalResponse) {
           setMessages(prev => [...prev, { role: 'model', text: parsed.conversationalResponse }]);
        }

        if (parsed.mealData) {
           const timestamp = parseTime(parsed.mealData.time);

           const aiMeal: Meal = {
             id: Date.now().toString(),
             timestamp: timestamp,
             name: parsed.mealData.name,
             description: "Logged via chat",
             calories: parsed.mealData.calories,
             protein: parsed.mealData.protein,
             carbs: parsed.mealData.carbs,
             fat: parsed.mealData.fat,
             aiAnalysis: parsed.mealData.short_tip
           };
          setDraftMeal(aiMeal);
        }

      } catch (jsonError) {
        console.error("Failed to parse JSON response", jsonError);
        setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble calculating that right now, but I heard you." }]);
      }

    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I lost connection. Please try again." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickSave = () => {
    if (draftMeal) {
      onLogMeal(draftMeal);
      setRedirect(true);
    }
  };

  const handleReviewSave = (updatedMeal: Meal) => {
    onLogMeal(updatedMeal);
    setRedirect(true);
  };

  if (redirect) return <Navigate to="/" />;

  return (
    <div className="flex flex-col h-[calc(100dvh-100px)] relative">
      <div className="flex-none p-4 pb-0">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Food Logger</h1>
      </div>
      
      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar ${draftMeal ? 'pb-72' : ''}`}>
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
        {isProcessing && (
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

      {/* Input or Draft Panel */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pt-2 bg-slate-50 dark:bg-slate-900 transition-transform duration-300 pb-safe-0">
        
        {/* Draft Panel */}
        {draftMeal ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-slate-700 p-5 animate-fade-in-up">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-1">{draftMeal.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(draftMeal.timestamp).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}</span>
                    <span>•</span>
                    <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">{draftMeal.calories} kcal</span>
                  </div>
                </div>
                <button 
                  onClick={() => setDraftMeal(null)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                 <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold">Protein</div>
                    <div className="font-semibold text-slate-800 dark:text-white">{draftMeal.protein}g</div>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold">Carbs</div>
                    <div className="font-semibold text-slate-800 dark:text-white">{draftMeal.carbs}g</div>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold">Fat</div>
                    <div className="font-semibold text-slate-800 dark:text-white">{draftMeal.fat}g</div>
                 </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsReviewOpen(true)}
                  className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center justify-center gap-2 transition"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button 
                  onClick={handleQuickSave}
                  className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                >
                  <Check className="w-4 h-4" /> Log Meal
                </button>
              </div>
          </div>
        ) : (
          /* UNIFIED INPUT UI */
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
                placeholder="Log your food..."
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
        )}
      </div>

      <EditMealModal 
        isOpen={isReviewOpen} 
        onClose={() => setIsReviewOpen(false)}
        initialMeal={draftMeal}
        onSave={handleReviewSave}
      />
    </div>
  );
};