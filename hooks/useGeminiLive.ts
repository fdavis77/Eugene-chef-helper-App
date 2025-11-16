import { useState, useRef, useCallback } from 'react';
// fix: Removed import for LiveSession as it is not an exported member.
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audio';
import type { ChatMessage, TemperatureLog, CalendarDay, HaccpLog } from '../types';

interface GeminiLiveHookProps {
  onAddFoodLog: (logData: Omit<TemperatureLog, 'id' | 'timestamp'>) => void;
  onAddHaccpLog: (logData: Omit<HaccpLog, 'id' | 'date' | 'time' | 'checkedBy' | 'correctiveAction'>) => void;
  onTranscriptUpdate: (message: ChatMessage) => void;
  onAddNote: (note: string, imageUrl?: string) => void;
  getPlannedItems: () => Record<string, CalendarDay>;
  onUpdateCalendar: (date: string, data: CalendarDay) => void;
  onKeyError: () => void;
}

interface GeminiLiveHook {
  isSessionActive: boolean;
  isConnecting: boolean;
  isBotSpeaking: boolean;
  error: string | null;
  startConversation: () => void;
  stopConversation: () => void;
}

const recordTemperatureFunctionDeclaration: FunctionDeclaration = {
  name: 'recordTemperature',
  description: 'Records a temperature reading for a food item, fridge, or freezer.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: 'The category: "Food", "Fridge", or "Freezer".',
      },
      item: {
        type: Type.STRING,
        description: 'The name of the food item or appliance (e.g., "Main Walk-in", "Chicken Breast").',
      },
      temperature: {
        type: Type.STRING,
        description: 'The temperature reading, including units (e.g., "75°C", "-18°F", "2 degrees").',
      },
    },
    required: ['type', 'item', 'temperature'],
  },
};

const addNoteFunctionDeclaration: FunctionDeclaration = {
  name: 'addNote',
  description: 'Saves a creative note or idea from the chef for later review.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      noteContent: {
        type: Type.STRING,
        description: 'The content of the note to be saved.',
      },
    },
    required: ['noteContent'],
  },
};

const addMenuItemToCalendarFunctionDeclaration: FunctionDeclaration = {
    name: 'addMenuItemToCalendar',
    description: 'Adds a menu item to the planner for a specific date.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            date: {
                type: Type.STRING,
                description: 'The date for the menu item, e.g., "today", "tomorrow", "this Friday", or "2024-08-15".',
            },
            menuItem: {
                type: Type.STRING,
                description: 'The name of the menu item to add.',
            },
        },
        required: ['date', 'menuItem'],
    },
};

const addRotaEntryToCalendarFunctionDeclaration: FunctionDeclaration = {
    name: 'addRotaEntryToCalendar',
    description: 'Adds a staff member or a shift to the rota for a specific date.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            date: {
                type: Type.STRING,
                description: 'The date for the rota entry, e.g., "today", "tomorrow", "this Friday", or "2024-08-15".',
            },
            rotaEntry: {
                type: Type.STRING,
                description: 'The rota entry to add, e.g., "Sarah - AM Prep", "John (09:00-17:00)".',
            },
        },
        required: ['date', 'rotaEntry'],
    },
};

const parseDate = (dateString: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const lowerCaseDate = dateString.toLowerCase();

    if (lowerCaseDate.includes('today')) {
        return today.toISOString().split('T')[0];
    }
    if (lowerCaseDate.includes('tomorrow')) {
        return tomorrow.toISOString().split('T')[0];
    }
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
        if (lowerCaseDate.includes(days[i])) {
            const targetDay = i;
            const currentDay = today.getDay();
            let dayDiff = targetDay - currentDay;
            if (lowerCaseDate.includes('this') && dayDiff < 0) {
                 // Already passed this week, do nothing special
            } else if (dayDiff <= 0) {
                 dayDiff += 7; // If it's today or past, assume next week's day
            }
            const nextDate = new Date(today);
            nextDate.setDate(today.getDate() + dayDiff);
            return nextDate.toISOString().split('T')[0];
        }
    }
   
    // Fallback for YYYY-MM-DD or other parsable formats
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    return today.toISOString().split('T')[0];
};

export const useGeminiLive = ({ onAddFoodLog, onAddHaccpLog, onTranscriptUpdate, onAddNote, getPlannedItems, onUpdateCalendar, onKeyError }: GeminiLiveHookProps): GeminiLiveHook => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // fix: Replaced non-exported 'LiveSession' with 'any' for the session promise ref.
  const sessionRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  let nextStartTime = 0;
  
  const stopConversation = useCallback(() => {
    if (sessionRef.current) {
        sessionRef.current.then(session => session.close());
        sessionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }

    setIsSessionActive(false);
    setIsConnecting(false);
    setIsBotSpeaking(false);
  }, []);


  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let currentInputTranscription = '';
      let currentOutputTranscription = '';
      
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.connect(outputAudioContextRef.current.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsSessionActive(true);
            
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;

            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Function Calling
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                 const sendResponse = (result: string) => {
                    sessionPromise.then((session) => {
                        session.sendToolResponse({
                          // fix: The `functionResponses` property must be an array.
                          functionResponses: [{
                            id : fc.id,
                            name: fc.name,
                            response: { result },
                          }]
                        })
                    });
                };

                if (fc.name === 'recordTemperature') {
                   const { type, item, temperature } = fc.args as { type: string, item: string, temperature: string };
                   if (type === 'Food') {
                        onAddFoodLog({ type, item, temperature });
                   } else if (type === 'Fridge' || type === 'Freezer') {
                        onAddHaccpLog({ type, label: item, temperature });
                   }
                   sendResponse("OK, logged.");

                } else if (fc.name === 'addNote') {
                    onAddNote(fc.args.noteContent as string);
                    sendResponse("OK, note saved.");
                } else if (fc.name === 'addMenuItemToCalendar') {
                    const { date, menuItem } = fc.args;
                    const dateStr = parseDate(date as string);
                    const allItems = getPlannedItems();
                    const dayData = allItems[dateStr] || {};
                    onUpdateCalendar(dateStr, { ...dayData, menuItem: menuItem as string });
                    sendResponse(`OK, I've scheduled "${menuItem}" for ${dateStr}.`);
                } else if (fc.name === 'addRotaEntryToCalendar') {
                    const { date, rotaEntry } = fc.args;
                    const dateStr = parseDate(date as string);
                    const allItems = getPlannedItems();
                    const dayData = allItems[dateStr] || {};
                    const newRota = [...(dayData.rota || []), rotaEntry as string];
                    onUpdateCalendar(dateStr, { ...dayData, rota: newRota });
                    sendResponse(`OK, I've added "${rotaEntry}" to the rota for ${dateStr}.`);
                }
              }
            }

            // Handle Audio
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                setIsBotSpeaking(true);
                nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                source.start(nextStartTime);
                nextStartTime += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }

             // Handle Transcription
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.inputTranscription) {
              currentInputTranscription += message.serverContent.inputTranscription.text;
            }
             if (message.serverContent?.turnComplete) {
                const userInput = currentInputTranscription.trim();
                const botOutput = currentOutputTranscription.trim();

                if (userInput) {
                  onTranscriptUpdate({ role: 'user', content: userInput });
                }
                if (botOutput) {
                  onTranscriptUpdate({ role: 'bot', content: botOutput });
                }
                currentInputTranscription = '';
                currentOutputTranscription = '';
                setIsBotSpeaking(false);
            }

            if (message.serverContent?.interrupted) {
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                nextStartTime = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e);
            // "Network error" is often a symptom of an auth/key issue with Live API.
            // Check for common phrases that indicate this and trigger the key selection reset.
            if (e.message.includes('Network error') || e.message.includes('Requested entity was not found')) {
                setError('A key selection is required for voice conversations. Please select your API key and try again.');
                onKeyError();
            } else {
                setError('An error occurred during the conversation.');
            }
            stopConversation();
          },
          onclose: () => {
            stopConversation();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [recordTemperatureFunctionDeclaration, addNoteFunctionDeclaration, addMenuItemToCalendarFunctionDeclaration, addRotaEntryToCalendarFunctionDeclaration] }],
          systemInstruction: 'You are Chef Bot, a concise and helpful AI assistant for a professional chef. When asked to record a temperature, use the recordTemperature tool. When logging for a fridge or freezer, ensure the type is "Fridge" or "Freezer" and the item is the specific name of the appliance, e.g., "Main Walk-in". When asked to save a note or idea, use the addNote tool. You can also manage the menu and rota planner. Use addMenuItemToCalendar to schedule a dish for a specific day. Use addRotaEntryToCalendar to add a staff member to the rota for a day. For other questions, provide a direct and helpful spoken answer.',
        },
      });
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError('Could not access microphone. Please grant permission and try again.');
      setIsConnecting(false);
    }
  }, [onAddFoodLog, onAddHaccpLog, onTranscriptUpdate, onAddNote, getPlannedItems, onUpdateCalendar, stopConversation, onKeyError]);

  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
  }

  return { isSessionActive, isConnecting, isBotSpeaking, error, startConversation, stopConversation };
};