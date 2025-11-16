import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { Loader } from './common/Loader';
import { Icon } from './common/Icon';
import AnimatedAvatar from './AnimatedAvatar';
import type { ChatMessage, TemperatureLog, CalendarDay, HaccpLog } from '../types';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFoodLog: (logData: Omit<TemperatureLog, 'id' | 'timestamp'>) => void;
  onAddHaccpLog: (logData: Omit<HaccpLog, 'id' | 'date' | 'time' | 'checkedBy' | 'correctiveAction'>) => void;
  onAddNote: (note: string, imageUrl?: string) => void;
  plannedItems: Record<string, CalendarDay>;
  onUpdateCalendar: (date: string, data: CalendarDay) => void;
}

type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, onAddFoodLog, onAddHaccpLog, onAddNote, plannedItems, onUpdateCalendar }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [isKeyChecked, setIsKeyChecked] = useState(false);
  const [isKeySelected, setIsKeySelected] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: 'You are Eugene AI Chef, a concise and helpful AI assistant for a professional chef. Provide direct and helpful answers.',
      },
    });

    const checkKey = async () => {
        if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
            setIsKeySelected(true);
        }
        setIsKeyChecked(true);
    };
    checkKey();
  }, [isOpen]);

  const handleTranscriptUpdate = (newMessage: ChatMessage) => {
    setMessages(prev => [...prev, newMessage]);
  }

  const { 
    isSessionActive, 
    isConnecting,
    isBotSpeaking, 
    error, 
    startConversation, 
    stopConversation 
  } = useGeminiLive({ 
    onAddFoodLog,
    onAddHaccpLog,
    onTranscriptUpdate: handleTranscriptUpdate,
    onAddNote,
    getPlannedItems: () => plannedItems,
    onUpdateCalendar,
    onKeyError: () => setIsKeySelected(false),
  });
  
  useEffect(() => {
    if (isConnecting || isReplying) setAvatarState('thinking');
    else if (isBotSpeaking) setAvatarState('speaking');
    else if (isSessionActive) setAvatarState('listening');
    else setAvatarState('idle');
  }, [isConnecting, isReplying, isSessionActive, isBotSpeaking]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggleConversation = () => {
    if (isSessionActive) stopConversation();
    else startConversation();
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setIsKeySelected(true);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chatRef.current || isSessionActive) return;

    const userMessage: ChatMessage = { role: 'user', content: inputText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsReplying(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMessage.content });
      const botMessage: ChatMessage = { role: 'bot', content: response.text };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage: ChatMessage = { role: 'bot', content: "Sorry, I encountered an error." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsReplying(false);
    }
  };

  const renderVoiceButton = () => {
    if (!isKeyChecked) return null;
    if (!isKeySelected) {
      return (
        <button onClick={handleSelectKey} className="text-primary text-sm font-semibold">
          Select API Key for Voice
        </button>
      );
    }
    const color = isSessionActive ? 'bg-red-500' : 'bg-primary';

    return (
       <button onClick={handleToggleConversation} disabled={isConnecting} className={`${color} text-white rounded-full p-4 shadow-lg`}>
          <Icon name="mic" className="h-8 w-8"/>
       </button>
    )
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-40 flex flex-col p-4 animate-fade-in-up">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold text-dark">Chat</h2>
            <button onClick={onClose} className="text-muted hover:text-dark">
                <Icon name="x-circle" className="h-8 w-8" />
            </button>
        </div>
        <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
           {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && <div className="w-12 h-12 flex-shrink-0"><AnimatedAvatar state={avatarState} /></div>}
                <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${msg.role === 'user' ? "bg-black text-white rounded-br-lg" : 'bg-light text-dark rounded-bl-lg'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
            </div>
            ))}
            {isReplying && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-end gap-2 justify-start">
                  <div className="w-12 h-12 flex-shrink-0"><AnimatedAvatar state="thinking" /></div>
                  <div className="max-w-xs md:max-w-md px-4 py-3 rounded-2xl bg-light text-dark rounded-bl-lg">
                      <Loader />
                  </div>
              </div>
            )}
            <div ref={chatEndRef} />
        </div>

        <div className="flex-shrink-0">
             <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isSessionActive ? "Voice session active..." : "Type your message..."}
                    disabled={isSessionActive || isReplying}
                    className="flex-grow bg-light border-none rounded-full p-3 pl-5 focus:ring-2 focus:ring-black focus:outline-none disabled:bg-gray-200"
                />
                <button
                    type="submit"
                    disabled={isSessionActive || isReplying || !inputText.trim()}
                    className="bg-black text-white p-3 rounded-full hover:bg-gray-800 transition duration-300 disabled:bg-gray-400"
                >
                    {isReplying ? <Loader /> : <Icon name="send" className="h-6 w-6" />}
                </button>
            </form>
            <div className="flex justify-center mt-2 h-16 items-center">
              {renderVoiceButton()}
            </div>
        </div>
    </div>
  );
};

export default ChatModal;