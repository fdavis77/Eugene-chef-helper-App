
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Loader } from './common/Loader';
import AnimatedAvatar from './AnimatedAvatar';
import { useTheme } from '../contexts/ThemeContext';
import type { ChatMessage, TemperatureLog, CalendarDay, HaccpLog, OpeningClosingCheck } from '../types';

interface ChefBotProps {
  notesCount: number;
  plannedItemsCount: number;
  onAddFoodLog: (logData: Omit<TemperatureLog, 'id' | 'timestamp'>) => void;
  onAddHaccpLog: (logData: Omit<HaccpLog, 'id' | 'date' | 'time' | 'checkedBy' | 'correctiveAction'>) => void;
  onAddNote: (note: string, imageUrl?: string) => void;
  plannedItems: Record<string, CalendarDay>;
  onUpdateCalendar: (date: string, data: CalendarDay) => void;
  haccpLogs: HaccpLog[];
  openingClosingLogs: OpeningClosingCheck[];
}

type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

const ChefBot: React.FC<ChefBotProps> = ({
  notesCount,
  plannedItemsCount,
  onAddFoodLog,
  onAddHaccpLog,
  onAddNote,
  plannedItems,
  onUpdateCalendar,
  haccpLogs,
  openingClosingLogs
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [isKeyChecked, setIsKeyChecked] = useState(false);
  const [isKeySelected, setIsKeySelected] = useState(false);

  const { activeTheme } = useTheme();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);
  const today = new Date().toISOString().split('T')[0];

  // Dashboard Data Calculations
  const todayPlan = useMemo(() => plannedItems[today] || {}, [plannedItems, today]);
  const todayOpeningCheck = useMemo(() => openingClosingLogs.find(log => log.date === today && log.type === 'Opening'), [openingClosingLogs, today]);
  const todayHaccpCount = useMemo(() => haccpLogs.filter(log => log.date === today).length, [haccpLogs, today]);
  
  const complianceScore = useMemo(() => {
      let score = 0;
      if (todayOpeningCheck) score += 50;
      if (todayHaccpCount > 1) score += 50; // Arbitrary threshold: at least 2 checks
      return score;
  }, [todayOpeningCheck, todayHaccpCount]);


  useEffect(() => {
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
  }, []);

  const handleTranscriptUpdate = (newMessage: ChatMessage) => {
    setMessages(prev => [...prev, newMessage]);
  }

  const { 
    isSessionActive, 
    isConnecting,
    isBotSpeaking, 
    error: liveError, 
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
  
  const getVoiceButtonStatus = () => {
    if (isConnecting) return 'Connecting...';
    if (isSessionActive) return 'Listening... (Tap to Stop)';
    return 'Tap to Talk';
  }

  const renderVoiceButton = () => {
    if (!isKeyChecked) return <div className="h-28"></div>;

    if (!isKeySelected) {
      return (
        <div className="text-center py-8">
            <button onClick={handleSelectKey} className="bg-white text-dark font-semibold py-3 px-6 rounded-lg border border-medium hover:bg-light transition">
                Select API Key for Voice Chat
            </button>
            <p className="text-xs text-muted mt-2">Voice features require a user-selected API key.</p>
        </div>
      );
    }
    
    const color = isSessionActive ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary';
    const ringColor = isSessionActive ? 'ring-red-500/30' : 'ring-primary/30';

    return (
       <div 
            className="relative inline-block cursor-pointer group text-center"
            onClick={handleToggleConversation}
            role="button"
            aria-label="Toggle voice conversation"
        >
            <div className={`relative w-32 h-32 ${color} rounded-full flex items-center justify-center transition-colors ring-4 ${ringColor}`}>
                <Icon name="mic" className="h-12 w-12"/>
            </div>
            <p className={`font-semibold ${activeTheme.classes.textColor} mt-4`}>{getVoiceButtonStatus()}</p>
       </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Header */}
      <div className="flex items-center justify-between">
        <div>
            <h1 className={`text-3xl font-bold ${activeTheme.classes.textHeading}`}>Today's Service</h1>
            <p className={`${activeTheme.classes.textMuted}`}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className={`px-4 py-2 rounded-full border font-bold ${complianceScore === 100 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
             {complianceScore === 100 ? 'Compliance OK' : 'Tasks Pending'}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Menu & Rota Card */}
        <Card>
            <div className="flex items-start justify-between mb-2">
                <h3 className={`font-semibold ${activeTheme.classes.textHeading}`}>Menu & Staff</h3>
                <Icon name="calendar-days" className="h-5 w-5 text-primary"/>
            </div>
            <div className="space-y-3">
                <div>
                    <p className={`text-xs font-bold uppercase ${activeTheme.classes.textMuted}`}>Main Feature</p>
                    <p className={`text-lg ${activeTheme.classes.textColor}`}>{todayPlan.menuItem || 'No specific item planned.'}</p>
                </div>
                <div>
                     <p className={`text-xs font-bold uppercase ${activeTheme.classes.textMuted}`}>Rota</p>
                     <div className="flex flex-wrap gap-2 mt-1">
                        {todayPlan.rota && todayPlan.rota.length > 0 ? (
                            todayPlan.rota.map((person, i) => (
                                <span key={i} className={`text-sm px-2 py-1 rounded-md ${activeTheme.classes.inputBg} ${activeTheme.classes.textColor}`}>{person}</span>
                            ))
                        ) : (
                            <span className={`text-sm italic ${activeTheme.classes.textMuted}`}>No staff assigned.</span>
                        )}
                     </div>
                </div>
            </div>
        </Card>

        {/* Compliance Status Card */}
        <Card>
             <div className="flex items-start justify-between mb-2">
                <h3 className={`font-semibold ${activeTheme.classes.textHeading}`}>Compliance Status</h3>
                <Icon name="shield-check" className={`h-5 w-5 ${complianceScore === 100 ? 'text-green-500' : 'text-orange-500'}`}/>
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className={activeTheme.classes.textColor}>Opening Checks</span>
                    <Icon name={todayOpeningCheck ? 'check' : 'x-circle'} className={`h-5 w-5 ${todayOpeningCheck ? 'text-green-500' : 'text-red-400'}`} />
                </div>
                <div className="flex items-center justify-between">
                    <span className={activeTheme.classes.textColor}>Fridge Logs ({todayHaccpCount})</span>
                    <Icon name={todayHaccpCount > 0 ? 'check' : 'x-circle'} className={`h-5 w-5 ${todayHaccpCount > 0 ? 'text-green-500' : 'text-red-400'}`} />
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200/20">
                    <p className={`text-xs ${activeTheme.classes.textMuted}`}>Total Notes: {notesCount} | Planned Days: {plannedItemsCount}</p>
                </div>
            </div>
        </Card>
      </div>
      
      {/* AI Interaction Section */}
      <Card className="flex flex-col h-[50vh] max-h-[600px]">
        <div className="flex items-center gap-3 border-b pb-3 mb-2 border-gray-200/20">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                 <AnimatedAvatar state={avatarState} />
            </div>
            <div>
                <h3 className={`font-bold ${activeTheme.classes.textColor}`}>Ask Eugene</h3>
                <p className="text-xs text-muted">Voice & Text Assistant</p>
            </div>
        </div>

        {/* Message History */}
        <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
           {messages.length === 0 && (
             <div className="flex flex-col h-full items-center justify-center text-center text-muted">
                <p>Ready to help. Tap the mic to start logging.</p>
             </div>
           )}
           {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && <div className="w-8 h-8 flex-shrink-0 mt-1 rounded-full bg-light flex items-center justify-center"><Icon name="bot" className="h-5 w-5 text-muted"/></div>}
                <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${msg.role === 'user' ? "bg-primary text-white rounded-br-lg" : 'bg-light text-dark rounded-bl-lg'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
            </div>
            ))}
            {isReplying && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-start gap-3 justify-start">
                  <div className="w-8 h-8 flex-shrink-0 mt-1 rounded-full bg-light flex items-center justify-center"><Icon name="bot" className="h-5 w-5 text-muted"/></div>
                  <div className="max-w-xs md:max-w-md px-4 py-3 rounded-2xl bg-light text-dark rounded-bl-lg">
                      <Loader />
                  </div>
              </div>
            )}
            <div ref={chatEndRef} />
        </div>

        {/* Voice & Text Input */}
        <div className="flex-shrink-0 border-t border-medium pt-4">
             {liveError && <p className="text-red-500 text-center text-sm mb-2">{liveError}</p>}
             <div className="flex justify-center mb-4 h-28 items-center">
              {renderVoiceButton()}
            </div>
             <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isSessionActive ? "Voice session active..." : "Type your message..."}
                    disabled={isSessionActive || isReplying}
                    className="flex-grow bg-light border-none rounded-full p-3 pl-5 focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-200"
                />
                <button
                    type="submit"
                    disabled={isSessionActive || isReplying || !inputText.trim()}
                    className="bg-primary text-white p-3 rounded-full hover:bg-primary-dark transition duration-300 disabled:bg-gray-400"
                >
                    {isReplying ? <Loader /> : <Icon name="send" className="h-6 w-6" />}
                </button>
            </form>
        </div>
      </Card>
    </div>
  );
};

export default ChefBot;
