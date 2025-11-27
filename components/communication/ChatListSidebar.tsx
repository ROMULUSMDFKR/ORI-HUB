
import React, { useMemo } from 'react';
import { ChatSession } from '../../types';

interface ChatListSidebarProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    filter: 'all' | 'mine' | 'unread';
    setFilter: (f: 'all' | 'mine' | 'unread') => void;
}

const ChatListSidebar: React.FC<ChatListSidebarProps> = ({ sessions, activeSessionId, onSelectSession, filter, setFilter }) => {
    
    const getSourceIcon = (source: string) => {
        switch (source) {
            case 'whatsapp': return <span className="material-symbols-outlined text-green-500 text-sm">chat</span>; // Placeholder for WA
            case 'instagram': return <span className="material-symbols-outlined text-pink-500 text-sm">camera_alt</span>;
            case 'facebook': return <span className="material-symbols-outlined text-blue-600 text-sm">facebook</span>;
            default: return <span className="material-symbols-outlined text-indigo-500 text-sm">language</span>; // Web
        }
    };

    return (
        <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-full">
            {/* Header & Search */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">Bandeja de Entrada</h2>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input 
                        type="text" 
                        placeholder="Buscar conversación..." 
                        className="w-full bg-slate-100 dark:bg-slate-700 text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                    <button 
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setFilter('mine')}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${filter === 'mine' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                        Mis Chats
                    </button>
                    <button 
                        onClick={() => setFilter('unread')}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${filter === 'unread' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                        No leídos
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                        <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                        <p className="text-sm">No hay conversaciones activas.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                        {sessions.map(session => (
                            <li 
                                key={session.id}
                                onClick={() => onSelectSession(session.id)}
                                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${activeSessionId === session.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-300"></div> {/* Online status placeholder */}
                                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                                            {session.visitorName}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                        {new Date(session.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                    </span>
                                </div>
                                
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2">
                                    {session.lastMessage}
                                </p>
                                
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center" title={`Fuente: ${session.source}`}>
                                            {getSourceIcon(session.source)}
                                        </div>
                                        {session.isAiActive && (
                                            <span className="text-[10px] bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-[10px]">smart_toy</span> AI
                                            </span>
                                        )}
                                    </div>
                                    {session.unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {session.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ChatListSidebar;
