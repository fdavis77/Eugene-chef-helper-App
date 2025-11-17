import React, { useState, useEffect, useRef } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Loader } from './common/Loader';
import { GoogleGenAI, Chat } from '@google/genai';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import type { ChatMessage } from '../types';


interface WellnessProps {
    journalMessages: ChatMessage[];
    setJournalMessages: (messages: ChatMessage[]) => void;
}

const sounds = [
    { name: 'Gentle Rain', url: 'https://cdn.pixabay.com/audio/2022/10/18/audio_24732b846e.mp3' },
    { name: 'Forest Ambience', url: 'https://cdn.pixabay.com/audio/2022/08/03/audio_5029e71168.mp3' },
    { name: 'Crackling Fireplace', url: 'https://cdn.pixabay.com/audio/2023/10/05/audio_2b2c145a55.mp3' },
] as const;

const quotes = [
    "Cooking is like love. It should be entered into with abandon or not at all.",
    "The secret of success in life is to eat what you like and let the food fight it out inside.",
    "No one is born a great cook, one learns by doing.",
    "Cooking is at once child's play and adult joy. And cooking done with care is an act of love.",
    "A recipe has no soul. You, as the cook, must bring soul to the recipe."
];

const Wellness: React.FC<WellnessProps> = ({ journalMessages, setJournalMessages }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeSound, setActiveSound] = useState<(typeof sounds)[number] | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [breathingState, setBreathingState] = useState('Breathe In');
    const [quote, setQuote] = useState('');

    // Chat state
    const [inputText, setInputText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Speech Recognition hook
    const {
        transcript,
        isListening,
        startListening,
        stopListening,
        hasSupport: hasSpeechSupport,
    } = useSpeechRecognition();

    useEffect(() => {
        setInputText(transcript);
    }, [transcript]);


    useEffect(() => {
        // Set initial quote
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);

        // Initialize chat
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are a mindful companion. Your purpose is to be a supportive, non-judgmental listener, providing a safe space for the user to express their thoughts and feelings. Do not give unsolicited advice. Instead, ask gentle, open-ended questions to encourage reflection (e.g., 'How did that feel?', 'What was on your mind then?', 'Is there more you'd like to share about that?'). Keep your responses calm, brief, and empathetic. You are a journal that listens.",
            },
            history: journalMessages.map(m => ({
                role: m.role === 'bot' ? 'model' : 'user',
                parts: [{ text: m.content }],
            })),
        });

    // We only want this to run once on mount, so we disable the exhaustive-deps rule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [journalMessages]);

    
    useEffect(() => {
        const breathingCycle = ['Breathe In', 'Hold', 'Breathe Out', 'Hold'];
        let currentStateIndex = 0;
    
        const interval = setInterval(() => {
          currentStateIndex = (currentStateIndex + 1) % breathingCycle.length;
          setBreathingState(breathingCycle[currentStateIndex]);
        }, 4000); // 4 seconds per phase
    
        return () => clearInterval(interval);
    }, []);

    // **FIXED AUDIO LOGIC**
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (activeSound && isPlaying) {
            if (audio.src !== activeSound.url) {
                audio.src = activeSound.url;
            }
            audio.play().catch(e => console.error("Error playing audio:", e));
        } else {
            audio.pause();
        }
    }, [isPlaying, activeSound]);

    const handleSoundToggle = (sound: (typeof sounds)[number]) => {
        if (activeSound?.name === sound.name) {
            setIsPlaying(prev => !prev);
        } else {
            setActiveSound(sound);
            setIsPlaying(true);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !chatRef.current || isReplying) return;

        // Stop listening if it's active when sending a message
        if (isListening) {
            stopListening();
        }
    
        const userMessage: ChatMessage = { role: 'user', content: inputText.trim() };
        const newMessages = [...journalMessages, userMessage];
        setJournalMessages(newMessages);
        setInputText('');
    
        setIsReplying(true);
    
        try {
          const response = await chatRef.current.sendMessage({ message: userMessage.content });
          const botMessage: ChatMessage = { role: 'bot', content: response.text };
          setJournalMessages([...newMessages, botMessage]);
        } catch (err) {
          console.error(err);
          const errorMessage: ChatMessage = { role: 'bot', content: "Sorry, I'm having trouble connecting right now." };
          setJournalMessages([...newMessages, errorMessage]);
        } finally {
          setIsReplying(false);
        }
    };

    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };
    

    return (
        <div className="space-y-6">
            <audio ref={audioRef} loop />
            <Card>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary p-2 rounded-lg">
                        <Icon name="brain" className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-dark">Chef's Wellness Hub</h2>
                        <p className="text-muted">A space to pause, breathe, and find balance.</p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-lg font-semibold text-dark mb-4 flex items-center">
                            <Icon name="sound-on" className="h-5 w-5 mr-2" />
                            Calming Sounds
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-2">
                            {sounds.map(sound => (
                                <button
                                    key={sound.name}
                                    onClick={() => handleSoundToggle(sound)}
                                    className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                                        activeSound?.name === sound.name && isPlaying ? 'bg-black text-white border-black' : 'bg-light hover:bg-medium border-medium'
                                    }`}
                                >
                                    <Icon name={activeSound?.name === sound.name && isPlaying ? 'pause' : 'play'} className="h-5 w-5" />
                                    <span>{sound.name}</span>
                                </button>
                            ))}
                        </div>
                    </Card>
                    <Card>
                         <h3 className="text-lg font-semibold text-dark mb-4 flex items-center">
                            <Icon name="quote" className="h-5 w-5 mr-2" />
                            Daily Inspiration
                        </h3>
                        <blockquote className="text-center italic text-muted">
                           "{quote}"
                        </blockquote>
                    </Card>
                </div>

                <div className="space-y-6">
                     <Card className="flex flex-col items-center justify-center aspect-square">
                        <h3 className="text-lg font-semibold text-dark mb-4">Guided Breathing</h3>
                        <div className="relative w-40 h-40 flex items-center justify-center">
                            <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse-slow"></div>
                            <div className={`absolute inset-2 bg-primary/20 rounded-full transition-transform duration-[4000ms] ease-in-out ${breathingState === 'Breathe In' || breathingState === 'Breathe Out' ? 'scale-100' : 'scale-50'}`}></div>
                            <span className="relative text-2xl font-bold text-primary transition-opacity duration-1000">
                                {breathingState}
                            </span>
                        </div>
                        <p className="text-muted mt-4 text-sm">Follow the prompt. 4 seconds per phase.</p>
                    </Card>
                </div>
            </div>
            
            <Card className="flex flex-col h-[60vh] max-h-[500px]">
                <h3 className="text-lg font-semibold text-dark mb-4 flex-shrink-0">Mindful Moment Journal</h3>
                <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
                    {journalMessages.length === 0 && (
                        <div className="flex flex-col h-full items-center justify-center text-center text-muted">
                            <Icon name="brain" className="h-12 w-12 mb-2"/>
                            <p>A private space to offload your thoughts.</p>
                            <p className="text-sm">Your mindful companion is listening.</p>
                        </div>
                    )}
                    {journalMessages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'bot' && <div className="w-8 h-8 flex-shrink-0 mt-1 rounded-full bg-light flex items-center justify-center"><Icon name="bot" className="h-5 w-5 text-muted"/></div>}
                        <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${msg.role === 'user' ? "bg-black text-white rounded-br-lg" : 'bg-light text-dark rounded-bl-lg'}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                    ))}
                    {isReplying && (
                        <div className="flex items-start gap-3 justify-start">
                            <div className="w-8 h-8 flex-shrink-0 mt-1 rounded-full bg-light flex items-center justify-center"><Icon name="bot" className="h-5 w-5 text-muted"/></div>
                            <div className="max-w-xs md:max-w-md px-4 py-3 rounded-2xl bg-light text-dark rounded-bl-lg">
                                <Loader />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="flex-shrink-0 border-t border-medium pt-4">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        {hasSpeechSupport && (
                             <button
                                type="button"
                                onClick={handleMicClick}
                                className={`p-3 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-muted hover:text-dark'}`}
                                aria-label={isListening ? 'Stop listening' : 'Start listening'}
                            >
                                <Icon name="mic" className="h-6 w-6" />
                            </button>
                        )}
                        <input 
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Share what's on your mind..."
                            disabled={isReplying}
                            className="flex-grow bg-light border-none rounded-full p-3 pl-5 focus:ring-2 focus:ring-black focus:outline-none disabled:bg-gray-200"
                        />
                        <button
                            type="submit"
                            disabled={isReplying || !inputText.trim()}
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

export default Wellness;