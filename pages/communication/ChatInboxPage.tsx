
import React, { useState, useEffect } from 'react';
import ChatListSidebar from '../../components/communication/ChatListSidebar';
import ChatWindow from '../../components/communication/ChatWindow';
import ChatCrmSidebar from '../../components/communication/ChatCrmSidebar';
import { ChatSession, ChatSessionMessage } from '../../types';
import { useToast } from '../../hooks/useToast';

// Mock Data for prototyping
const MOCK_SESSIONS: ChatSession[] = [
    { id: 's1', source: 'web', visitorName: 'Visitante #4092', status: 'active', lastMessage: 'Hola, quisiera cotizar Urea', lastMessageAt: new Date().toISOString(), unreadCount: 2, isAiActive: true },
    { id: 's2', source: 'instagram', visitorName: '@juanperez_agro', status: 'active', lastMessage: 'Gracias por la info', lastMessageAt: new Date(Date.now() - 3600000).toISOString(), unreadCount: 0, isAiActive: false },
    { id: 's3', source: 'facebook', visitorName: 'AgroInsumos del Norte', status: 'pending', lastMessage: '¿Tienen envíos a Sonora?', lastMessageAt: new Date(Date.now() - 7200000).toISOString(), unreadCount: 1, isAiActive: true, visitorEmail: 'contacto@agronorte.mx' },
];

const MOCK_MESSAGES: Record<string, ChatSessionMessage[]> = {
    's1': [
        { id: 'm1', sessionId: 's1', text: 'Hola, bienvenido a Trade Aitirik. ¿En qué puedo ayudarte hoy?', sender: 'ai', timestamp: new Date(Date.now() - 60000).toISOString(), isRead: true },
        { id: 'm2', sessionId: 's1', text: 'Hola, quisiera cotizar Urea', sender: 'user', timestamp: new Date().toISOString(), isRead: false },
    ],
    's2': [
         { id: 'm3', sessionId: 's2', text: 'Hola @juanperez_agro, ¿buscas algún producto en específico?', sender: 'agent', timestamp: new Date(Date.now() - 4000000).toISOString(), isRead: true },
         { id: 'm4', sessionId: 's2', text: 'Gracias por la info', sender: 'user', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: true },
    ]
};

const ChatInboxPage: React.FC = () => {
    const [sessions, setSessions] = useState<ChatSession[]>(MOCK_SESSIONS);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
    const [filter, setFilter] = useState<'all' | 'mine' | 'unread'>('all');
    const { showToast } = useToast();

    useEffect(() => {
        if (activeSessionId) {
            // Simulate fetching messages
            setMessages(MOCK_MESSAGES[activeSessionId] || []);
        } else {
            setMessages([]);
        }
    }, [activeSessionId]);

    const activeSession = sessions.find(s => s.id === activeSessionId) || null;

    const handleSendMessage = (text: string) => {
        if (!activeSessionId) return;
        
        const newMessage: ChatSessionMessage = {
            id: `m-${Date.now()}`,
            sessionId: activeSessionId,
            text,
            sender: 'agent', // Human agent
            timestamp: new Date().toISOString(),
            isRead: true
        };

        setMessages(prev => [...prev, newMessage]);
        
        // Update session last message and stop AI
        setSessions(prev => prev.map(s => 
            s.id === activeSessionId 
            ? { ...s, lastMessage: text, lastMessageAt: new Date().toISOString(), isAiActive: false } 
            : s
        ));
    };

    const handleTakeOver = () => {
        if (!activeSessionId) return;
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, isAiActive: false } : s));
        showToast('info', 'Has tomado el control del chat. La IA se ha pausado.');
    };

    const handleCreateProspect = () => {
        showToast('success', 'Prospecto creado y vinculado (Simulado)');
        if (activeSessionId) {
             setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, prospectId: 'temp-prospect-id' } : s));
        }
    };
    
    // Simulating an incoming message for demo purposes
    const handleSimulateIncoming = () => {
         if (!activeSessionId) return;
         const responses = ["¿Cuál es el precio por tonelada?", "Me interesa, ¿puedo facturar?", "Okay, déjame revisarlo.", "¿Tienen ficha técnica?"];
         const randomResponse = responses[Math.floor(Math.random() * responses.length)];
         
         const msg: ChatSessionMessage = {
             id: `m-${Date.now()}`,
             sessionId: activeSessionId,
             text: randomResponse,
             sender: 'user',
             timestamp: new Date().toISOString(),
             isRead: false
         };
         setMessages(prev => [...prev, msg]);
         setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, lastMessage: randomResponse, lastMessageAt: new Date().toISOString(), unreadCount: s.unreadCount + 1 } : s));

         // If AI is active, simulate AI response after delay
         if (activeSession?.isAiActive) {
             setTimeout(() => {
                  const aiMsg: ChatSessionMessage = {
                     id: `ai-${Date.now()}`,
                     sessionId: activeSessionId,
                     text: "Entiendo. Para darte el mejor precio, ¿podrías compartirme tu correo electrónico?",
                     sender: 'ai',
                     timestamp: new Date().toISOString(),
                     isRead: true
                 };
                 setMessages(prev => [...prev, aiMsg]);
             }, 1500);
         }
    };


    return (
        <div className="flex h-[calc(100vh-64px)] -m-6"> {/* Negative margin to fill content area */}
            <ChatListSidebar 
                sessions={sessions} 
                activeSessionId={activeSessionId} 
                onSelectSession={setActiveSessionId}
                filter={filter}
                setFilter={setFilter}
            />
            
            <ChatWindow 
                session={activeSession}
                messages={messages}
                onSendMessage={handleSendMessage}
                onTakeOver={handleTakeOver}
            />

            <ChatCrmSidebar 
                session={activeSession}
                onCreateProspect={handleCreateProspect}
            />
            
            {/* Dev Tool for Demo */}
            <button onClick={handleSimulateIncoming} className="fixed bottom-4 right-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-50 hover:opacity-100 z-50">
                Simular Mensaje Entrante
            </button>
        </div>
    );
};

export default ChatInboxPage;
