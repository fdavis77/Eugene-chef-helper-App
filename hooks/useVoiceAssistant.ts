import { useState, useRef, useCallback } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, TemperatureLog, CalendarDay, HaccpLog } from '../types';

interface VoiceAssistantHookProps {
  onAddFoodLog: (logData: Omit<TemperatureLog, 'id' | 'timestamp'>) => void;
  onAddHaccpLog: (logData: Omit<HaccpLog, 'id' | 'date' | 'time' | 'checkedBy' | 'correctiveAction'>) => void;
  onTranscriptUpdate: (message: ChatMessage) => void;
  onAddNote: (note: string, imageUrl?: string) => void;
  getPlannedItems: () => Record<string, CalendarDay>;
  onUpdateCalendar: (date: string, data: CalendarDay) => void;
  onKeyError: () => void;
}

interface VoiceAssistantHook {
  isSessionActive: boolean;
  isConnecting: boolean;
  isBotSpeaking: boolean;
  error: string | null;
  startConversation: () => void;
  stopConversation: () => void;
}

const parseDate = (dateString: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const lower = dateString.toLowerCase();
  if (lower.includes('today')) return today.toISOString().split('T')[0];
  if (lower.includes('tomorrow')) return tomorrow.toISOString().split('T')[0];
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      let diff = i - today.getDay();
      if (diff <= 0) diff += 7;
      const next = new Date(today);
      next.setDate(today.getDate() + diff);
      return next.toISOString().split('T')[0];
    }
  }
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return today.toISOString().split('T')[0];
};

const SYSTEM_PROMPT = `You are Chef Bot, a concise and helpful AI assistant for a professional chef.

When the user asks to record a temperature, respond with a JSON action block like:
{"action":"recordTemperature","type":"Food|Fridge|Freezer","item":"item name","temperature":"value with units"}

When the user asks to save a note, respond with:
{"action":"addNote","noteContent":"the note text"}

When the user asks to add a menu item, respond with:
{"action":"addMenuItemToCalendar","date":"today|tomorrow|day name|YYYY-MM-DD","menuItem":"dish name"}

When the user asks to add a rota entry, respond with:
{"action":"addRotaEntryToCalendar","date":"today|tomorrow|day name|YYYY-MM-DD","rotaEntry":"entry text"}

For any action, ALSO include a short spoken confirmation after the JSON block.
For all other questions, provide a direct, concise spoken answer with no JSON.`;

export const useVoiceAssistant = ({
  onAddFoodLog, onAddHaccpLog, onTranscriptUpdate, onAddNote,
  getPlannedItems, onUpdateCalendar, onKeyError,
}: VoiceAssistantHookProps): VoiceAssistantHook => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const clientRef = useRef<Anthropic | null>(null);
  const activeRef = useRef(false);

  const stopConversation = useCallback(() => {
    activeRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSessionActive(false);
    setIsConnecting(false);
    setIsBotSpeaking(false);
  }, []);

  const handleUserSpeech = useCallback(async (transcript: string) => {
    if (!clientRef.current || !activeRef.current) return;

    onTranscriptUpdate({ role: 'user', content: transcript });

    try {
      const msg = await clientRef.current.messages.create({
        model: 'claude-haiku-5-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: transcript }],
      });

      const block = msg.content[0];
      if (block.type !== 'text') return;
      const responseText = block.text;

      // Parse action if present
      let spokenResponse = responseText;
      const jsonMatch = responseText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        try {
          const action = JSON.parse(jsonMatch[0]);
          spokenResponse = responseText.replace(jsonMatch[0], '').trim();

          if (action.action === 'recordTemperature') {
            if (action.type === 'Food') {
              onAddFoodLog({ type: action.type, item: action.item, temperature: action.temperature });
            } else if (action.type === 'Fridge' || action.type === 'Freezer') {
              onAddHaccpLog({ type: action.type, label: action.item, temperature: action.temperature });
            }
          } else if (action.action === 'addNote') {
            onAddNote(action.noteContent);
          } else if (action.action === 'addMenuItemToCalendar') {
            const dateStr = parseDate(action.date);
            const allItems = getPlannedItems();
            const dayData = allItems[dateStr] || {};
            onUpdateCalendar(dateStr, { ...dayData, menuItem: action.menuItem });
          } else if (action.action === 'addRotaEntryToCalendar') {
            const dateStr = parseDate(action.date);
            const allItems = getPlannedItems();
            const dayData = allItems[dateStr] || {};
            const newRota = [...(dayData.rota || []), action.rotaEntry];
            onUpdateCalendar(dateStr, { ...dayData, rota: newRota });
          }
        } catch {}
      }

      if (spokenResponse) {
        onTranscriptUpdate({ role: 'bot', content: spokenResponse });
        speak(spokenResponse);
      }
    } catch (err: any) {
      console.error('Claude API error:', err);
      if (err?.status === 401 || err?.status === 403) onKeyError();
    }
  }, [onAddFoodLog, onAddHaccpLog, onTranscriptUpdate, onAddNote, getPlannedItems, onUpdateCalendar, onKeyError]);

  const speak = (text: string) => {
    if (!synthRef.current || !activeRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    setIsBotSpeaking(true);
    utterance.onend = () => setIsBotSpeaking(false);
    utterance.onerror = () => setIsBotSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const startConversation = useCallback(async () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    if (!process.env.API_KEY) {
      onKeyError();
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Could not access microphone. Please grant permission and try again.');
      setIsConnecting(false);
      return;
    }

    clientRef.current = new Anthropic({ apiKey: process.env.API_KEY, dangerouslyAllowBrowser: true });
    synthRef.current = window.speechSynthesis;
    activeRef.current = true;

    const recognition: any = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.trim();
      if (transcript) handleUserSpeech(transcript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please grant permission and try again.');
        stopConversation();
      }
    };

    recognition.onend = () => {
      if (activeRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsConnecting(false);
      setIsSessionActive(true);
    } catch (err) {
      setError('Could not start voice recognition.');
      setIsConnecting(false);
      activeRef.current = false;
    }
  }, [handleUserSpeech, stopConversation, onKeyError]);

  return { isSessionActive, isConnecting, isBotSpeaking, error, startConversation, stopConversation };
};
