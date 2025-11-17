import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { ChatMessage, User, Group, Task, ActivityLog } from '../types';
import Spinner from '../components/ui/Spinner';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';
import Drawer from '../components/ui/Drawer';
import Checkbox from '../components/ui/Checkbox';
import ChatSidebar from '../components/layout/ChatSidebar';
// FIX: Add missing import for `MOCK_USERS`.
import { MOCK_USERS } from '../data/mockData';


const ChatWindow: React.FC<{
    chatId: string;
    chatType: 'user' | 'group';
    onSendMessage: (text: string) => void;
}> = ({ chatId, chatType }) => {
    const chatEndRef = useRef<null | HTMLDivElement>(null);
    const [newMessage, setNewMessage] = useState('');
    const { data: usersData } = useCollection<User>('users');
    const { data: groupsData } = useCollection<Group>('groups');
    const { data: messagesData, loading } = useCollection<ChatMessage>('messages');
    
    const currentUser = useMemo(() => usersData?.find(u => u.id === 'user-1'), [usersData]);

    const conversation = useMemo(() => {
        if (!messagesData || !currentUser) return [];
        if (chatType === 'user') {
            return messagesData.filter(msg =>
                (msg.senderId === currentUser.id && msg.receiverId === chatId) ||
                (msg.senderId === chatId && msg.receiverId === currentUser.id)
            );
        }
        return messagesData.filter(msg => msg.receiverId === chatId);
    }, [messagesData, chatId, chatType, currentUser]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        // onSendMessage(newMessage); // This should be handled in parent
        setNewMessage('');
    };

    const usersMap = useMemo(() => new Map(usersData?.map(u => [u.id, u])), [usersData]);

    const chatTarget = useMemo(() => {
        if (chatType === 'user') return usersMap.get(chatId);
        return groupsData?.find(g => g.id === chatId);
    }, [chatId, chatType, usersMap, groupsData]);

    if (loading || !currentUser || !chatTarget) {
        return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;
    }
    
    return (
        <div className="flex-1 flex flex-col">
            <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                {chatType === 'user' ? (
                     <img src={(chatTarget as User).avatarUrl} alt={chatTarget.name} className="w-10 h-10 rounded-full" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-500">groups</span>
                    </div>
                )}
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{chatTarget.name}</h2>
            </header>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-100 dark:bg-slate-900/50">
                {conversation.map(msg => {
                    const sender = usersMap.get(msg.senderId);
                    const isMe = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {chatType === 'group' && !isMe && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 ml-10">{sender?.name}</p>
                            )}
                             <div className={`flex items-end gap-2 max-w-lg ${isMe ? 'flex-row-reverse' : ''}`}>
                                {sender && <img src={sender.avatarUrl} alt={sender.name} className="w-6 h-6 rounded-full mb-1" />}
                                <div className={`p-3 rounded-lg ${isMe ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            <footer className="p-4 border-t border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSendMessage}>
                    <div className="relative">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={`Mensaje a ${chatTarget.name}...`}
                            className="w-full pr-12"
                        />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 text-white hover:opacity-90 disabled:opacity-50" disabled={!newMessage.trim()}>
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </form>
            </footer>
        </div>
    );
};

const InternalChatPage: React.FC = () => {
    const { type, id } = useParams();

    return (
        <div className="flex h-full">
            <ChatSidebar />
            {id ? (
                <ChatWindow 
                    chatId={id} 
                    chatType={type as 'user' | 'group'} 
                    onSendMessage={(text) => console.log('Send:', text)} // Placeholder
                />
            ) : (
                <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900/50">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-6xl text-slate-400">forum</span>
                        <p className="mt-2 text-lg text-slate-500">Selecciona una conversación para empezar</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InternalChatPage;
