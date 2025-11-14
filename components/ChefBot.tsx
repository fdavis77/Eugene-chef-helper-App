import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { Card } from './common/Card';
import { Loader } from './common/Loader';
import { Icon } from './common/Icon';
import type { ChatMessage, TemperatureLog, CalendarDay } from '../types';

interface ChefBotProps {
  logs: TemperatureLog[];
  onAddLog: (logData: Omit<TemperatureLog, 'id' | 'timestamp'>) => void;
  onAddNote: (note: string) => void;
  plannedItems: Record<string, CalendarDay>;
  onUpdateCalendar: (date: string, data: CalendarDay) => void;
}

const ChefBot: React.FC<ChefBotProps> = ({ logs, onAddLog, onAddNote, plannedItems, onUpdateCalendar }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // fix: The `systemInstruction` parameter must be nested within a `config` object.
    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: 'You are Chef Bot, a concise and helpful AI assistant for a professional chef. Provide direct and helpful answers.',
      },
    });
  }, []);

  const handleTranscriptUpdate = (newMessage: ChatMessage) => {
    setMessages(prev => [...prev, newMessage]);
  }

  const { 
    isSessionActive, 
    isConnecting, 
    error, 
    startConversation, 
    stopConversation 
  } = useGeminiLive({ 
    onTemperatureLog: onAddLog,
    onTranscriptUpdate: handleTranscriptUpdate,
    onAddNote: onAddNote,
    getPlannedItems: () => plannedItems,
    onUpdateCalendar: onUpdateCalendar,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggleConversation = () => {
    if (isSessionActive) {
      stopConversation();
    } else {
      startConversation();
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
      const errorMessage: ChatMessage = { role: 'bot', content: "Sorry, I encountered an error. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsReplying(false);
    }
  };


  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-400 flex items-center">
                <Icon name="bot" className="h-6 w-6 mr-2" />
                Chef Bot Assistant
              </h2>
              <button
                  onClick={handleToggleConversation}
                  disabled={isConnecting || isReplying}
                  className={`p-3 rounded-lg transition-all duration-300 w-48 text-white font-semibold flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed ${
                    isConnecting 
                      ? 'bg-yellow-500'
                      : isSessionActive 
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
              >
                {isConnecting ? (
                    <> <Loader /> <span className="ml-2">Connecting...</span> </>
                ) : isSessionActive ? (
                    <> <Icon name="mic" className="h-6 w-6 mr-2" /> <span>Stop Session</span> </>
                ) : (
                    <> <Icon name="mic" className="h-6 w-6 mr-2" /> <span>Start Talking</span> </>
                )}
              </button>
            </div>

            <div className="h-[45vh] bg-gray-800 rounded-md p-4 overflow-y-auto flex flex-col space-y-4">
              {messages.length === 0 && (
                  <div className="flex-grow flex items-center justify-center text-gray-500">
                      <p>Press "Start Talking" or type a message to begin.</p>
                  </div>
              )}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'bot' && <Icon name="bot" className="h-6 w-6 text-blue-400 flex-shrink-0 mb-1" />}
                  <div
                    className={`max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? "bg-blue-500 text-white rounded-br-none"
                        : 'bg-gray-700 text-gray-300 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && <Icon name="user" className="h-6 w-6 text-blue-400 flex-shrink-0 mb-1" />}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isSessionActive ? "Voice session active..." : "Type your message..."}
                disabled={isSessionActive || isReplying}
                className="flex-grow bg-gray-800 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:bg-gray-700 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isSessionActive || isReplying || !inputText.trim()}
                className="bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isReplying ? <Loader /> : <Icon name="send" className="h-6 w-6" />}
              </button>
            </form>

            {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
          </Card>
        </div>

        <div>
          <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-400 flex items-center">
                    <Icon name="thermometer" className="h-5 w-5 mr-2" />
                    Temperature Logs
                </h3>
            </div>
            <div className="h-[calc(50vh + 8.5rem)] overflow-y-auto space-y-3 pr-2">
              {logs.length > 0 ? (
                  [...logs].reverse().slice(0, 10).map(log => (
                      <div key={log.id} className="bg-gray-800 p-3 rounded-md">
                          <div className="flex justify-between items-center font-semibold">
                              <span>{log.item} ({log.type})</span>
                              <span className="text-lg text-cyan-400">{log.temperature}</span>
                          </div>
                          <p className="text-xs text-gray-500 text-right">{new Date(log.timestamp).toLocaleTimeString()}</p>
                      </div>
                  ))
              ) : (
                  <div className="text-center py-10 text-gray-500">
                      <p>Temperature logs recorded via voice will appear here.</p>
                  </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ChefBot;