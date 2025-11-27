
import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, ChatSessionMessage } from '../../types';
import Spinner from '../ui/Spinner';

interface ChatWindowProps {
    session: ChatSession | null;
    messages: ChatSessionMessage[];
    onSendMessage: (text: string) => void;
    onTakeOver: () => void; // Stop AI
    loading?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ session, messages, onSendMessage, onTakeOver, loading }) => {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        onSendMessage(inputText);
        setInputText('');
    };

    if (!session) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">chat</span>
                <p>Selecciona una conversación para empezar</p>
            </div>
        );
    }

    if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;

    return (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 h-full overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                        {session.visitorName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">{session.visitorName}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1">
                            {session.source === 'web' && <span className="material-symbols-outlined text-[10px]">language</span>}
                            {session.source} • {session.status}
                        </p>
                    </div>
                </div>
                
                {session.isAiActive ? (
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-full">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                            </span>
                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">IA Respondiendo</span>
                        </div>
                        <button 
                            onClick={onTakeOver}
                            className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-bold py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                        >
                            Tomar Control
                        </button>
                    </div>
                ) : (
                    <div className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">person</span> Control Manual
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => {
                    // Handle System Messages (Process Events)
                    if (msg.sender === 'system') {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs px-3 py-1 rounded-full flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                                    <span className="material-symbols-outlined text-xs">info</span>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    }

                    const isAi = msg.sender === 'ai';
                    // Correct logic: Visitor (Left), Us (Agent/AI - Right)
                    const alignRight = msg.sender === 'agent' || msg.sender === 'ai';
                    
                    return (
                        <div key={msg.id} className={`flex w-full ${alignRight ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] flex flex-col ${alignRight ? 'items-end' : 'items-start'}`}>
                                <div 
                                    className={`p-3 rounded-xl shadow-sm text-sm leading-relaxed relative group
                                        ${alignRight 
                                            ? (isAi ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100 border border-purple-200 dark:border-purple-800' : 'bg-indigo-600 text-white') 
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}
                                    `}
                                >
                                    {msg.text}
                                    {isAi && (
                                        <span className="absolute -top-2 -right-2 bg-purple-200 dark:bg-purple-800 text-[8px] px-1.5 py-0.5 rounded-full text-purple-800 dark:text-purple-200 font-bold border border-purple-300 dark:border-purple-700 flex items-center gap-0.5">
                                            <span className="material-symbols-outlined !text-[8px]">smart_toy</span> AI
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1 px-1">
                                    {msg.sender === 'agent' ? 'Tú' : (msg.sender === 'ai' ? 'Asistente Virtual' : session.visitorName)} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                {session.isAiActive && (
                    <div className="mb-2 text-xs text-center text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 py-2 rounded-lg border border-purple-100 dark:border-purple-800/30 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">smart_toy</span>
                        La IA está activa. Si envías un mensaje, tomarás el control manual automáticamente.
                    </div>
                )}
                <form onSubmit={handleSend} className="relative flex items-end gap-2">
                     <button type="button" className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title="Adjuntar archivo">
                        <span className="material-symbols-outlined">attach_file</span>
                    </button>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                        <input 
                            type="text" 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Escribe un mensaje..." 
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400"
                        />
                         <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1" title="Emojis">
                            <span className="material-symbols-outlined text-lg">sentiment_satisfied</span>
                        </button>
                    </div>
                    <button 
                        type="submit"
                        disabled={!inputText.trim()}
                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
