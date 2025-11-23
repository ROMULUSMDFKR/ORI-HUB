
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { ChatMessage, User, Group } from '../types';
import Spinner from '../components/ui/Spinner';
import ChatSidebar from '../components/layout/ChatSidebar';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';
import { useChatNotifications } from '../contexts/ChatContext';
import UserAvatar from '../components/ui/UserAvatar';

const ChatWindow: React.FC<{
    chatId: string;
    chatType: 'user' | 'group';
    onSendMessage: (text: string) => void;
    conversation: ChatMessage[];
    loading: boolean;
}> = ({ chatId, chatType, onSendMessage, conversation, loading }) => {
    const chatEndRef = useRef<null | HTMLDivElement>(null);
    const [newMessage, setNewMessage] = useState('');
    const { data: usersData } = useCollection<User>('users');
    const { data: groupsData } = useCollection<Group>('groups');
    const { user: currentUser } = useAuth();
    const { markAsRead } = useChatNotifications();

    // Mark as read when opening the chat
    useEffect(() => {
        if (chatId) {
            markAsRead(chatId);
        }
    }, [chatId, markAsRead]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        onSendMessage(newMessage);
        setNewMessage('');
    };

    const usersMap = useMemo(() => new Map(usersData?.map(u => [u.id, u])), [usersData]);

    const chatTarget = useMemo(() => {
        if (chatType === 'user') return usersMap.get(chatId);
        return groupsData?.find(g => g.id === chatId);
    }, [chatId, chatType, usersMap, groupsData]);

    const targetName = useMemo(() => {
        if (!chatTarget) return '';
        if (chatType === 'user') {
             return (chatTarget as User).nickname || (chatTarget as User).name;
        }
        return (chatTarget as Group).name;
    }, [chatTarget, chatType]);

    const isOnline = true; // Simulado

    if (loading || !currentUser || !chatTarget) {
        return <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900"><Spinner /></div>;
    }
    
    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            {/* Chat Header */}
            <header className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        {chatType === 'user' ? (
                            <UserAvatar user={chatTarget as User} size="md" className="ring-2 ring-indigo-50 dark:ring-slate-700" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-50 dark:ring-slate-700">
                                <span className="material-symbols-outlined">groups</span>
                            </div>
                        )}
                        {chatType === 'user' && isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{targetName}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            {chatType === 'user' ? (
                                isOnline ? <span className="text-green-600 font-medium">En línea</span> : 'Desconectado'
                            ) : (
                                <span>{(chatTarget as Group).members.length} miembros</span>
                            )}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-full transition-colors" title="Buscar en chat">
                         <span className="material-symbols-outlined text-xl">search</span>
                    </button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-full transition-colors" title="Info">
                         <span className="material-symbols-outlined text-xl">info</span>
                    </button>
                </div>
            </header>
            
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                {conversation.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                        <span className="material-symbols-outlined text-6xl mb-2">chat_bubble_outline</span>
                        <p>Comienza la conversación con {targetName}</p>
                    </div>
                )}
                
                {conversation.map((msg, index) => {
                    const sender = usersMap.get(msg.senderId);
                    const isMe = msg.senderId === currentUser.id;
                    const senderName = sender ? (sender.nickname || sender.name.split(' ')[0]) : 'Desc.';
                    const showAvatar = !isMe && (index === 0 || conversation[index - 1].senderId !== msg.senderId);
                    const msgTime = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-slide-in-up`}>
                            <div className={`flex items-end gap-2 max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}`}>
                                {/* Avatar for others */}
                                {!isMe && (
                                    <div className="w-8 flex-shrink-0">
                                        {showAvatar && sender && <UserAvatar user={sender} size="sm" />}
                                    </div>
                                )}
                                
                                <div className={`group relative px-4 py-2 shadow-sm text-sm ${
                                    isMe 
                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm' 
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700'
                                }`}>
                                    {chatType === 'group' && !isMe && showAvatar && (
                                        <p className="text-[10px] font-bold text-indigo-500 mb-1">{senderName}</p>
                                    )}
                                    
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    
                                    {/* Time tooltip */}
                                    <span className={`absolute bottom-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ${
                                        isMe ? 'right-full mr-2 text-slate-400' : 'left-full ml-2 text-slate-400'
                                    }`}>
                                        {msgTime}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Time below last message in group block could be added here */}
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <footer className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end gap-2">
                    <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Adjuntar archivo">
                        <span className="material-symbols-outlined text-2xl">attach_file</span>
                    </button>
                    
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center border border-transparent focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all shadow-inner">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={`Mensaje a ${targetName}...`}
                            className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400"
                        />
                        <button type="button" className="p-2 text-slate-400 hover:text-yellow-500 transition-colors mr-1">
                             <span className="material-symbols-outlined text-xl">mood</span>
                        </button>
                    </div>

                    <button 
                        type="submit" 
                        className={`p-3 rounded-full shadow-md flex items-center justify-center transition-all ${
                            newMessage.trim() 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 transform active:scale-95' 
                            : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed'
                        }`}
                        disabled={!newMessage.trim()}
                    >
                        <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                </form>
            </footer>
        </div>
    );
};


const InternalChatPage: React.FC = () => {
    const { type, id } = useParams();
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const data = await api.getCollection('messages');
                setMessages(data);
            } catch (err) {
                console.error("Error fetching messages:", err);
            } finally {
                setMessagesLoading(false);
            }
        };

        // Initial fetch
        fetchMessages();

        // Poll for new messages every 3 seconds
        const intervalId = setInterval(fetchMessages, 3000);

        return () => clearInterval(intervalId);
    }, []);

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || !currentUser || !id || !type) return;

        const newChatMessage: Omit<ChatMessage, 'id'> = {
            senderId: currentUser.id,
            receiverId: id,
            text,
            timestamp: new Date().toISOString(),
        };

        const tempId = `temp-${Date.now()}`;
        setMessages(prev => [...(prev || []), { ...newChatMessage, id: tempId } as ChatMessage]);

        try {
            await api.addDoc('messages', newChatMessage);
            
            if (type === 'user' && id !== currentUser.id) {
                const notification = {
                    userId: id, 
                    title: `Nuevo mensaje de ${currentUser.nickname || currentUser.name}`,
                    message: text,
                    type: 'message' as 'message',
                    link: `/communication/chat/user/${currentUser.id}`,
                    isRead: false,
                    createdAt: new Date().toISOString(),
                };
                await api.addDoc('notifications', notification);
            }

        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages(prev => (prev || []).filter(msg => msg.id !== tempId));
            showToast('error', "Error al enviar el mensaje.");
        }
    };

    const conversation = useMemo(() => {
        if (!messages || !currentUser || !id || !type) return [];
        if (type === 'user') {
            return messages.filter(msg =>
                (msg.senderId === currentUser.id && msg.receiverId === id) ||
                (msg.senderId === id && msg.receiverId === currentUser.id)
            ).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }
        return messages.filter(msg => msg.receiverId === id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, currentUser, id, type]);


    return (
        <div className="flex h-full bg-white dark:bg-slate-900 overflow-hidden">
            <ChatSidebar />
            {id ? (
                <ChatWindow 
                    chatId={id} 
                    chatType={type as 'user' | 'group'} 
                    onSendMessage={handleSendMessage}
                    conversation={conversation}
                    loading={messagesLoading}
                />
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-full shadow-sm mb-6">
                        <span className="material-symbols-outlined text-6xl text-indigo-200 dark:text-indigo-900">chat</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Tus Mensajes</h2>
                    <p className="mt-2 text-slate-500 dark:text-slate-500">Selecciona un chat de la lista para comenzar.</p>
                </div>
            )}
        </div>
    );
};

export default InternalChatPage;
