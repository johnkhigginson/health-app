import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface MicrophoneButtonProps {
  onTranscript: (text: string) => void;
  isProcessing?: boolean;
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ onTranscript, isProcessing }) => {
  const [isListening, setIsListening] = useState(false);
  const [supportError, setSupportError] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
      };
      setRecognition(rec);
    } else {
      setSupportError(true);
    }
  }, [onTranscript]);

  const toggleListen = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  if (supportError) return null;

  return (
    <button
      onClick={toggleListen}
      disabled={isProcessing}
      className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center shadow-lg
        ${isListening 
          ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' 
          : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title="Speak to log meal"
    >
      {isProcessing ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : isListening ? (
        <MicOff className="w-6 h-6" />
      ) : (
        <Mic className="w-6 h-6" />
      )}
    </button>
  );
};

export default MicrophoneButton;
