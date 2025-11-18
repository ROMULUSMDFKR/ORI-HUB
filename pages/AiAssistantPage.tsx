





import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { useCollection } from '../hooks/useCollection';
import { SalesOrder, Prospect, Task, User } from '../types';
// FIX: Removed MOCK_USERS import as it is no longer exported.
import { api } from '../data/mockData';

// Polyfill for browser compatibility
// FIX: Cast window to `any` to access non-standard SpeechRecognition properties.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'ai';
}

// MOCK PERMISSIONS - In a real app, this would come from a user context
const MOCK_ACTION_PERMISSIONS: Record<NonNullable<User['role']>, Record<string, boolean>> = {
    'Owner': { 'createTask': true, 'updateClientStatus': true, 'getSummary': true },
    'Admin': { 'createTask': true, 'updateClientStatus': true, 'getSummary': true },
    'Ventas': { 'createTask': true, 'updateClientStatus': true, 'getSummary': true },
    'Logística': { 'createTask': true, 'updateClientStatus': false, 'getSummary': true },
};

// DEFINE ALL POSSIBLE AI FUNCTIONS
const ALL_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
    {
        name: 'createTask',
        description: 'Crea una nueva tarea en el sistema.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: 'El título de la tarea.' },
                dueDate: { type: Type.STRING, description: 'La fecha de vencimiento en formato ISO 8601.' },
            },
            required: ['title'],
        },
    },
    {
        name: 'updateClientStatus',
        description: 'Actualiza la etapa de un cliente o empresa.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                clientName: { type: Type.STRING, description: 'El nombre del cliente a actualizar.' },
                newStatus: { type: Type.STRING, description: 'La nueva etapa del cliente.' },
            },
            required: ['clientName', 'newStatus'],
        },
    },
];

const AiAssistantPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            text: "¡Hola! Soy tu asistente de IA. Puedes pedirme que cree tareas, resuma datos o actualice el estado de un cliente (si tienes permiso). También puedes usar el micrófono para hablar.",
            sender: 'ai'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    // FIX: Use `any` for the ref type to avoid a name collision with the `SpeechRecognition` variable defined above.
    const recognitionRef = useRef<any | null>(null);
    const chatEndRef = useRef<null | HTMLDivElement>(null);

    const { data: salesOrders } = useCollection<SalesOrder>('salesOrders');
    const { data: prospects } = useCollection<Prospect>('prospects');
    const { data: tasks } = useCollection<Task>('tasks');
    // FIX: Fetch users from the collection instead of using mock data.
    const { data: users } = useCollection<User>('users');
    const currentUser = useMemo(() => users?.find(u => u.id === 'user-1'), [users]);


    // Initialize Speech Recognition
    useEffect(() => {
        if (!SpeechRecognition) {
            console.error("Speech Recognition not supported by this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'es-MX';
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsRecording(false);
        };
        
        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;
    }, []);
    
    // Auto-scroll logic
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);
    
    const handleToggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
            setIsRecording(true);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        // FIX: Add a check for currentUser to ensure it's loaded.
        if (input.trim() === '' || isLoading || !currentUser) return;
        
        if (isRecording) {
            recognitionRef.current?.stop();
        }

        const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            // Prepare context from CRM data
            const userTasks = (tasks || []).filter(t => t.assignees.includes(currentUser.id));
            const overdueTasks = userTasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'Hecho');
            
            const context = `
                Datos del CRM:
                - Usuario actual: ${currentUser.name} (Rol: ${currentUser.role})
                - Tareas vencidas del usuario: ${overdueTasks.length}
                - Pregunta del usuario: "${currentInput}"
            `;

            // Filter tools based on user role
            const role = currentUser.role || 'Ventas';
            const userPermissions = MOCK_ACTION_PERMISSIONS[role];
            const allowedFunctionDeclarations = ALL_FUNCTION_DECLARATIONS.filter(
                func => userPermissions && userPermissions[func.name]
            );

            const prompt = `
                Eres "Studio AI", un asistente de IA experto en CRM. Responde a la pregunta del usuario de forma concisa y útil.
                Si la pregunta parece una orden para ejecutar una acción (como 'crear', 'actualizar', 'modificar'), utiliza las herramientas disponibles. 
                Si no tienes una herramienta para la acción o no tienes permiso, informa al usuario amablemente.
                De lo contrario, responde basándote en el contexto.
                Contexto: ${context}
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ functionDeclarations: allowedFunctionDeclarations }],
                },
            });

            if (response.functionCalls && response.functionCalls.length > 0) {
                const functionCall = response.functionCalls[0];
                let apiResponseText = '';

                if (functionCall.name === 'createTask') {
                    console.log('AI wants to create a task:', functionCall.args);
                    await api.addDoc('tasks', { id: `task-${Date.now()}`, assignees: [currentUser.id], ...functionCall.args });
                    apiResponseText = `¡Tarea "${functionCall.args.title}" creada exitosamente!`;
                } else if (functionCall.name === 'updateClientStatus') {
                    console.log('AI wants to update a client:', functionCall.args);
                    apiResponseText = `Acción simulada: Estatus de "${functionCall.args.clientName}" actualizado a "${functionCall.args.newStatus}".`;
                } else {
                    apiResponseText = `No reconozco la acción: ${functionCall.name}`;
                }
                
                const aiMessage: Message = { id: Date.now() + 1, text: apiResponseText, sender: 'ai' };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                const aiMessage: Message = { id: Date.now() + 1, text: response.text, sender: 'ai' };
                setMessages(prev => [...prev, aiMessage]);
            }

        } catch (err) {
            console.error("Error with AI:", err);
            const errorMessage: Message = { id: Date.now() + 1, text: "Lo siento, tuve un problema al procesar tu solicitud. Inténtalo de nuevo.", sender: 'ai' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-[calc(100vh-120px)] bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500">auto_awesome</span>
                    Asistente IA
                </h1>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {messages.map((message) => (
                    <div key={message.id} className={`flex items-start gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {message.sender === 'ai' && (
                            <span className="material-symbols-outlined text-indigo-500 bg-indigo-100 dark:bg-indigo-500/10 p-2 rounded-full flex-shrink-0">
                                auto_awesome
                            </span>
                        )}
                        <div className={`max-w-xl p-3 rounded-xl ${message.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-4 justify-start">
                        <span className="material-symbols-outlined text-indigo-500 bg-indigo-100 dark:bg-indigo-500/10 p-2 rounded-full flex-shrink-0">
                            auto_awesome
                        </span>
                        <div className="max-w-xl p-3 rounded-xl bg-slate-100 dark:bg-slate-700">
                            <div className="flex items-center space-x-1">
                                <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSendMessage} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pregúntale algo a tu asistente..."
                        className="w-full pr-24"
                        disabled={isLoading}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                         <button 
                            type="button"
                            onClick={handleToggleRecording}
                            disabled={!SpeechRecognition || isLoading}
                            className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500'} disabled:opacity-50`}
                         >
                            <span className="material-symbols-outlined">{isRecording ? 'square' : 'mic'}</span>
                        </button>
                        <button type="submit" disabled={isLoading || input.trim() === ''} className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AiAssistantPage;
