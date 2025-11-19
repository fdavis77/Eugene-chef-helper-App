import { useState, useEffect, useRef, useCallback } from 'react';

// Fix: Manually defining types for the Web Speech API to fix TypeScript errors,
// as they are not universally available in all environments.
interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: (() => void) | null;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}


interface SpeechRecognitionHook {
  transcript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  hasSupport: boolean;
}

const SpeechRecognition = typeof window !== 'undefined' 
  // Fix: The 'declare global' above makes 'as any' unnecessary.
  ? (window.SpeechRecognition || window.webkitSpeechRecognition) 
  : null;

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.continuous = true; // Keep listening until explicitly stopped

    // **FIXED**: Replaced the fragile .split() logic with a robust reconstruction of the transcript.
    // This new onresult handler is safer and prevents the "cannot read properties of undefined" error.
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let fullTranscript = '';
      // Reconstruct the full transcript from the results list on every event.
      // The SpeechRecognition API handles replacing interim results within this list automatically.
      for (let i = 0; i < event.results.length; i++) {
        // Safety check for transcript existence
        const transcriptPart = event.results[i]?.[0]?.transcript;
        if (transcriptPart) {
          fullTranscript += transcriptPart;
        }
      }
      setTranscript(fullTranscript);
    };


    recognition.onend = () => {
      // If it ends but we are still supposed to be listening (e.g., browser timeout), restart.
      if (recognitionRef.current && isListening) {
        recognitionRef.current.start();
      } else {
        setIsListening(false);
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Cleanup function to stop recognition when the component unmounts.
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Prevent restart on unmount
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    hasSupport: !!SpeechRecognition,
  };
};