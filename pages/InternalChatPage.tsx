import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCollection } from '../hooks/useCollection';
import { ChatMessage, User } from '../types';
import { MOCK_USERS } from '../data/mockData';
import Spinner from '../components/ui/Spinner';

const InternalChatPage: React.FC = () => {
    const { data: messagesData, loading: messagesLoading } = useCollection<ChatMessage>('messages');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const currentUser = MOCK_USERS.natalia; // Assume current user
    const chatEndRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
      if (messagesData) {
        setMessages(messagesData);
      }
    }, [messagesData]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const users = Object.values(MOCK_USERS).filter(u => u.id !== currentUser.id);

    const conversation = useMemo(() => {
        if (!selectedUserId || !messages) return [];
        return messages
            .filter(msg =>
                (msg.senderId === currentUser.id && msg.receiverId === selectedUserId) ||
                (msg.senderId === selectedUserId && msg.receiverId === currentUser.id)
            )
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, selectedUserId, currentUser.id]);
    
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !selectedUserId) return;

        const message: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: currentUser.id,
            receiverId: selectedUserId,
            text: newMessage,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, message]);
        setNewMessage('');
    };

    const selectedUser = selectedUserId ? MOCK_USERS[selectedUserId] || Object.values(MOCK_USERS).find(u => u.id === selectedUserId) : null;

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white rounded-lg shadow-sm border">
            {/* User List */}
            <div className="w-1/3 border-r flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">Chats</h2>
                </div>
                <ul className="overflow-y-auto flex-1">
                    {users.map(user => (
                        <li key={user.id} onClick={() => setSelectedUserId(user.id)} className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 ${selectedUserId === user.id ? 'bg-primary/10' : ''}`}>
                            <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full mr-3" />
                            <div>
                                <p className="font-semibold">{user.name}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Chat Window */}
            <div className="w-2/3 flex flex-col">
                {selectedUser ? (
                    <>
                        <div className="p-4 border-b flex items-center">
                            <img src={selectedUser.avatarUrl} alt={selectedUser.name} className="w-10 h-10 rounded-full mr-3" />
                            <h2 className="text-lg font-semibold">{selectedUser.name}</h2>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                            {messagesLoading ? <Spinner /> : conversation.map(msg => (
                                <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.senderId === currentUser.id ? 'bg-primary text-on-primary' : 'bg-gray-200'}`}>
                                        <p>{msg.text}</p>
                                        <p className="text-xs mt-1 opacity-70 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))}
                             <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="w-full pr-12 pl-4 py-2 border rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary text-on-primary hover:opacity-90">
                                    <span className="material-symbols-outlined">send</span>
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Selecciona un chat para empezar a conversar
                    </div>
                )}
            </div>
        </div>
    );
};

export default InternalChatPage;