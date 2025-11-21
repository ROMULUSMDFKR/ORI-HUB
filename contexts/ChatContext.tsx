
import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { collection, query, onSnapshot, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ChatMessage, User, Group } from '../types';
import { api } from '../api/firebaseApi';

interface ChatContextType {
    unreadChats: Set<string>; // Set de IDs (userId o groupId) que tienen mensajes no leídos
    markAsRead: (chatId: string) => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    
    // Almacena los IDs de los chats que tienen mensajes nuevos no leídos
    const [unreadChats, setUnreadChats] = useState<Set<string>>(new Set());
    
    // Referencia para saber cuándo cargó la app y no notificar mensajes históricos
    const appLoadTimeRef = useRef(new Date());
    // Referencia al chat que el usuario está viendo actualmente para no notificar
    const activeChatRef = useRef<string | null>(null);

    // Mapeo de nombres para las notificaciones
    const [entityNames, setEntityNames] = useState<Map<string, string>>(new Map());

    // Cargar nombres de usuarios y grupos para mostrar en la notificación
    useEffect(() => {
        const loadEntities = async () => {
            const users = await api.getCollection('users');
            const groups = await api.getCollection('groups');
            const map = new Map<string, string>();
            users.forEach((u: User) => map.set(u.id, u.name));
            groups.forEach((g: Group) => map.set(g.id, g.name));
            setEntityNames(map);
        };
        loadEntities();
    }, []);

    // Escuchar mensajes en tiempo real
    useEffect(() => {
        if (!user) return;

        // Escuchar mensajes donde soy el receptor O mensajes de grupos (simplificado: escuchamos todo y filtramos)
        // En una app real de producción, esto debería ser una query compuesta o cloud function.
        const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const msg = change.doc.data() as ChatMessage;
                    const msgDate = new Date(msg.timestamp);

                    // 1. Ignorar mensajes propios
                    if (msg.senderId === user.id) return;

                    // 2. Ignorar mensajes viejos (anteriores a la carga de la app)
                    if (msgDate < appLoadTimeRef.current) return;

                    // Determinar el ID del chat (Si es grupo, es el receiverId. Si es DM, es el senderId)
                    // Asumimos que si receiverId NO es el usuario actual, es un grupo.
                    const isGroup = msg.receiverId !== user.id;
                    const chatId = isGroup ? msg.receiverId : msg.senderId;

                    // 3. Ignorar si ya estoy viendo este chat
                    if (activeChatRef.current === chatId) return;

                    // 4. Lógica de "Notificación Única"
                    // Solo notificamos si este chat NO estaba ya en la lista de no leídos
                    setUnreadChats((prev) => {
                        if (!prev.has(chatId)) {
                            // Es un mensaje nuevo en una conversación que estaba "limpia"
                            // Disparamos la notificación visual
                            const senderName = entityNames.get(msg.senderId) || 'Alguien';
                            const chatName = isGroup ? (entityNames.get(chatId) || 'Grupo') : senderName;
                            
                            const title = isGroup ? `Nuevo mensaje en ${chatName}` : `Nuevo mensaje de ${senderName}`;
                            const body = isGroup ? `${senderName}: ${msg.text}` : msg.text;

                            showToast('info', `${title}: "${body.substring(0, 30)}${body.length > 30 ? '...' : ''}"`);
                            
                            // Agregamos al Set
                            const newSet = new Set(prev);
                            newSet.add(chatId);
                            return newSet;
                        }
                        // Si ya estaba en el Set, NO notificamos de nuevo (evitamos spam), pero el estado se mantiene
                        return prev;
                    });
                }
            });
        });

        return () => unsubscribe();
    }, [user, showToast, entityNames]);

    const markAsRead = useCallback((chatId: string) => {
        // Actualizamos la referencia del chat activo
        activeChatRef.current = chatId;
        
        // Removemos del set de no leídos
        setUnreadChats((prev) => {
            if (prev.has(chatId)) {
                const newSet = new Set(prev);
                newSet.delete(chatId);
                return newSet;
            }
            return prev;
        });
    }, []);

    // Cuando se desmonta o cambia, limpiamos el chat activo
    const clearActiveChat = useCallback(() => {
        activeChatRef.current = null;
    }, []);

    return (
        <ChatContext.Provider value={{ unreadChats, markAsRead }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChatNotifications = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChatNotifications must be used within a ChatProvider');
    }
    return context;
};
