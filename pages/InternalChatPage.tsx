
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

    if (loading || !currentUser || !chatTarget) {
        return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;
    }
    
    return (
        <div className="flex-1 flex flex-col">
            <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                {chatType === 'user' ? (
                     <UserAvatar user={chatTarget as User} size="md" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-500">groups</span>
                    </div>
                )}
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{targetName}</h2>
            </header>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-100 dark:bg-slate-900/50">
                {conversation.map(msg => {
                    const sender = usersMap.get(msg.senderId);
                    const isMe = msg.senderId === currentUser.id;
                    const senderName = sender ? (sender.nickname || sender.name) : 'Desconocido';

                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {chatType === 'group' && !isMe && sender && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 ml-10">{senderName}</p>
                            )}
                             <div className={`flex items-end gap-2 max-w-lg ${isMe ? 'flex-row-reverse' : ''}`}>
                                {sender && <UserAvatar user={sender} size="xs" />}
                                <div className={`p-3 rounded-lg ${isMe ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
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
                            placeholder={`Mensaje a ${targetName}...`}
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
            
            // Notification logic is now handled globally by ChatContext for recipients.
            // We still add a system notification record if needed for history.
            if (type === 'user' && id !== currentUser.id) {
                const notification = {
                    userId: id, // receiverId
                    title: `Nuevo mensaje de ${currentUser.nickname || currentUser.name}`,
                    message: text,
                    type: 'message' as 'message',
                    link: `/communication/chat/user/${currentUser.id}`, // Link back to the sender
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
        // Group chat logic
        return messages.filter(msg => msg.receiverId === id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, currentUser, id, type]);


    return (
        <div className="flex h-full bg-white dark:bg-slate-800">
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
                <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900/50">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-6xl text-slate-400">forum</span>
                        <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">Selecciona una conversación para empezar</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InternalChatPage;
