import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useCollection } from '../hooks/useCollection';
import { SalesOrder, Prospect } from '../types';
import { MOCK_USERS } from '../data/mockData';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'ai';
}

const AiAssistantPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            text: "¡Hola! Soy tu asistente de IA. Puedes preguntarme cosas como 'resume las ventas del último mes' o '¿cuáles son nuestros prospectos más valiosos?'",
            sender: 'ai'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<null | HTMLDivElement>(null);


    const { data: salesOrders } = useCollection<SalesOrder>('salesOrders');
    const { data: prospects } = useCollection<Prospect>('prospects');

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() === '' || isLoading) return;

        const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare context from CRM data
            const context = `
                Datos de Ventas Recientes:
                ${(salesOrders || []).slice(0, 5).map(o => `- Orden ${o.id}: $${o.total.toFixed(2)} el ${new Date(o.createdAt).toLocaleDateString()}`).join('\n')}

                Prospectos Clave:
                ${(prospects || []).slice(0, 5).map(p => `- ${p.name} (Valor: $${p.estValue}, Etapa: ${p.stage})`).join('\n')}
            `;

            const prompt = `
                Eres un asistente de IA experto en análisis de datos para un CRM.
                Responde a la pregunta del usuario utilizando el siguiente contexto de la empresa.
                Sé conciso y directo en tus respuestas. Usa markdown para formatear tu respuesta si es necesario (listas, negritas, etc.).
                
                Contexto:
                ${context}

                Pregunta del Usuario:
                ${input}
            `;

            const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const aiText = response.text;
            
            const aiMessage: Message = { id: Date.now() + 1, text: aiText, sender: 'ai' };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            const errorMessage: Message = { id: Date.now() + 1, text: "Lo siento, tuve un problema al procesar tu solicitud. Por favor, revisa la configuración de la API Key.", sender: 'ai' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const currentUser = MOCK_USERS.natalia;

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Asistente de IA</h2>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'ai' && <span className="material-symbols-outlined text-xl bg-primary text-white p-2 rounded-full">smart_toy</span>}
                        <div className={`max-w-lg p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-100' : 'bg-gray-200'}`}>
                            <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                        </div>
                        {msg.sender === 'user' && <img src={currentUser.avatarUrl} alt="User" className="w-10 h-10 rounded-full" />}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                         <span className="material-symbols-outlined text-xl bg-primary text-white p-2 rounded-full animate-pulse">smart_toy</span>
                        <div className="max-w-lg p-3 rounded-lg bg-gray-200">
                           <div className="flex items-center space-x-1">
                               <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                               <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                               <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></div>
                           </div>
                        </div>
                    </div>
                )}
                 <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pregunta sobre ventas, prospectos, etc."
                        className="w-full pr-12 pl-4 py-2 border rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary text-white hover:bg-primary-dark disabled:bg-gray-400">
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AiAssistantPage;
