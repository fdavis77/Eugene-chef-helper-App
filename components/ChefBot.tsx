import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
// fix: Import useQuery and useMutation from '@apollo/client/react' to resolve module export issue.
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Loader } from './common/Loader';
import type { ChatMessage, CalendarDay, HaccpLog } from '../types';

interface ChefBotProps {
  plannedItemsCount: number;
  plannedItems: Record<string, CalendarDay>;
  onUpdateCalendar: (date: string, data: CalendarDay) => void;
}

const LIST_NOTES_QUERY = gql`
  query ListNotes {
    listNotes {
      id
    }
  }
`;

const CREATE_NOTE_MUTATION = gql`
  mutation CreateNote($content: String!, $imageUrl: String) {
    createNote(content: $content, imageUrl: $imageUrl) {
      id
      content
      createdAt
      imageUrl
    }
  }
`;

const CREATE_HACCP_LOG_MUTATION = gql`
  mutation CreateHaccpLog(
    $type: String!
    $label: String!
    $date: Date!
    $time: Time!
    $temperature: String!
  ) {
    createHaccpLog(
      type: $type
      label: $label
      date: $date
      time: $time
      temperature: $temperature
    ) {
      id
    }
  }
`;

// fix: Add interface for the GraphQL query result to provide strong typing.
interface ListNotesData {
  listNotes: { id: string }[];
}

type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

const ChefBot: React.FC<ChefBotProps> = ({
  plannedItemsCount,
  plannedItems,
  onUpdateCalendar
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [isKeyChecked, setIsKeyChecked] = useState(false);
  const [isKeySelected, setIsKeySelected] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);
  
  // Data fetching and mutations
  // fix: Provide the ListNotesData type to useQuery for type safety.
  const { data: notesData } = useQuery<ListNotesData>(LIST_NOTES_QUERY);
  const notesCount = notesData?.listNotes?.length ?? 0;

  const [createNote] = useMutation(CREATE_NOTE_MUTATION, {
    refetchQueries: [{ query: LIST_NOTES_QUERY }],
  });
  const [createHaccpLog] = useMutation(CREATE_HACCP_LOG_MUTATION);

  // Effect to check for an existing API key on mount.
  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
            setIsKeySelected(true);
        }
        setIsKeyChecked(true);
    };
    checkKey();
  }, []);

  useEffect(() => {
    if (isKeySelected) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: 'You are Eugene AI Chef, a concise and helpful AI assistant for a professional chef. Provide direct and helpful answers.',
        },
      });
    }
  }, [isKeySelected]);

  const handleTranscriptUpdate = (newMessage: ChatMessage) => {
    setMessages(prev => [...prev, newMessage]);
  }
  
  const handleAddNote = async (note: string, imageUrl?: string) => {
    await createNote({ variables: { content: note, imageUrl } });
  };
  
  const handleAddHaccpLog = async (logData: Omit<HaccpLog, 'id' | 'date' | 'time' | 'checkedBy' | 'correctiveAction'>) => {
    const now = new Date();
    await createHaccpLog({
        variables: {
            ...logData,
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0].substring(0, 5),
        }
    });
  };


  const { 
    isSessionActive, 
    isConnecting,
    isBotSpeaking, 
    error: liveError, 
    startConversation, 
    stopConversation 
  } = useGeminiLive({ 
    onAddHaccpLog: handleAddHaccpLog,
    onTranscriptUpdate: handleTranscriptUpdate,
    onAddNote: handleAddNote,
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
      
      const fullConversation = `(Text)\n\n**Me:** ${userMessage.content}\n\n**Eugene:** ${response.text}`;
      await handleAddNote(fullConversation);

    } catch (err) {
      console.error(err);
      let errorMessageContent = "Sorry, I encountered an error.";
      if (err instanceof Error && err.message.includes('API key not valid')) {
        errorMessageContent = "My apologies, but the text chat requires a valid API key. Please select one using the voice chat button below.";
      }
      const errorMessage: ChatMessage = { role: 'bot', content: errorMessageContent };
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
                Select API Key to Chat
            </button>
            <p className="text-xs text-muted mt-2">All chat features require a user-selected API key.</p>
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
            <p className="font-semibold text-dark mt-4">{getVoiceButtonStatus()}</p>
       </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark">Hello, Chef</h1>
        <p className="text-muted">How can Eugene assist you today?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex items-center gap-4">
          <Icon name="notebook" className="h-8 w-8 text-primary"/>
          <div>
            <p className="text-2xl font-bold text-dark">{notesCount}</p>
            <p className="text-sm text-muted">Notes Saved</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <Icon name="calendar-days" className="h-8 w-8 text-primary"/>
          <div>
            <p className="text-2xl font-bold text-dark">{plannedItemsCount}</p>
            <p className="text-sm text-muted">Planned Days</p>
          </div>
        </Card>
      </div>
      
      {/* Integrated Chat UI */}
      <Card className="flex flex-col h-[60vh] max-h-[700px]">
        {/* Message History */}
        <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
           {messages.length === 0 && (
             <div className="flex flex-col h-full items-center justify-center text-center text-muted">
                <Icon name="bot" className="h-12 w-12 mb-2"/>
                <p>Your conversation with Eugene will appear here.</p>
                <p className="text-sm">Start by typing or tapping the voice button.</p>
             </div>
           )}
           {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && <div className="w-8 h-8 flex-shrink-0 mt-1 rounded-full bg-light flex items-center justify-center"><Icon name="bot" className="h-5 w-5 text-muted"/></div>}
                <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${msg.role === 'user' ? "bg-black text-white rounded-br-lg" : 'bg-light text-dark rounded-bl-lg'}`}>
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
                    disabled={isSessionActive || isReplying || !isKeySelected}
                    className="flex-grow bg-light border-none rounded-full p-3 pl-5 focus:ring-2 focus:ring-black focus:outline-none disabled:bg-gray-200"
                />
                <button
                    type="submit"
                    disabled={isSessionActive || isReplying || !inputText.trim() || !isKeySelected}
                    className="bg-black text-white p-3 rounded-full hover:bg-gray-800 transition duration-300 disabled:bg-gray-400"
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