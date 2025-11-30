import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isActive: boolean;
  onActiveChange: (active: boolean) => void;
}

export function VoiceInput({ onTranscript, isActive, onActiveChange }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US'; // Can switch to 'ta-IN' for Tamil

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPiece;
            } else {
              interimTranscript += transcriptPiece;
            }
          }

          setTranscript(finalTranscript || interimTranscript);

          // Auto-submit on final transcript
          if (finalTranscript) {
            setTimeout(() => {
              onTranscript(finalTranscript);
              stopListening();
            }, 500);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('[Voice Input] Recognition error:', event.error);
          stopListening();
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          onActiveChange(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (isActive && !isListening) {
      startListening();
    } else if (!isActive && isListening) {
      stopListening();
    }
  }, [isActive]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
        onActiveChange(true);
      } catch (error) {
        console.error('[Voice Input] Start error:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        onActiveChange(false);
      } catch (error) {
        console.error('[Voice Input] Stop error:', error);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!recognitionRef.current) {
    // Browser doesn't support voice input
    return null;
  }

  return (
    <>
      <button
        onClick={toggleListening}
        className={`w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          isListening 
            ? 'bg-red-600 animate-pulse' 
            : 'bg-[#0A5C2E]'
        }`}
      >
        {isListening ? (
          <MicOff className="w-[20px] h-[20px] text-white" />
        ) : (
          <Mic className="w-[20px] h-[20px] text-white" />
        )}
      </button>

      {/* Voice Input Modal */}
      {isListening && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl">
            {/* Waveform Animation */}
            <div className="flex items-end justify-center gap-1.5 h-24">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-gradient-to-t from-[#0d5e38] to-[#25D366] rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.8s',
                  }}
                />
              ))}
            </div>

            {/* Listening Text */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="w-5 h-5 text-[#0d5e38] animate-spin" />
                <p className="text-lg text-gray-900">Listening...</p>
              </div>
              
              {/* Transcript */}
              {transcript && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">You said:</p>
                  <p className="text-gray-900">{transcript}</p>
                </div>
              )}
            </div>

            {/* Cancel Button */}
            <button
              onClick={stopListening}
              className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function useVoiceInput() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  return { isSupported };
}
