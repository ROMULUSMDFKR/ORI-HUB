
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, SchemaType } from '@google/genai';
import { useCollection } from '../hooks/useCollection';
import { SalesOrder, Prospect, Task, User, ProspectStage, Priority, TaskStatus } from '../types';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

// Polyfill for browser compatibility
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'ai';
    actionData?: any; // Store details of action performed for UI rendering
}

// DEFINE ALL POSSIBLE AI FUNCTIONS
const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
    {
        name: 'manageTask',
        description: 'Crea una nueva tarea o actualiza una existente. Para "proponer", crea la tarea con estado "Por Hacer" y etiqueta "Propuesta".',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update'], description: 'Acción a realizar.' },
                searchTitle: { type: Type.STRING, description: 'Si es update, el título aproximado de la tarea a buscar.' },
                title: { type: Type.STRING, description: 'El nuevo título de la tarea.' },
                description: { type: Type.STRING, description: 'Descripción detallada.' },
                priority: { type: Type.STRING, enum: ['Alta', 'Media', 'Baja'], description: 'Prioridad de la tarea.' },
                status: { type: Type.STRING, enum: ['Por Hacer', 'En Progreso', 'Hecho'], description: 'Estado de la tarea.' },
                dueInDays: { type: Type.NUMBER, description: 'Días a partir de hoy para el vencimiento.' },
                isProposal: { type: Type.BOOLEAN, description: 'Si es verdadero, añade la etiqueta "Propuesta".' }
            },
            required: ['action'],
        },
    },
    {
        name: 'assignTaskToUser',
        description: 'Asigna una tarea existente a un usuario buscando por su nombre.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                taskTitle: { type: Type.STRING, description: 'El título aproximado de la tarea.' },
                userName: { type: Type.STRING, description: 'El nombre o parte del nombre del usuario a asignar.' },
            },
            required: ['taskTitle', 'userName'],
        },
    },
    {
        name: 'getSystemSummary',
        description: 'Obtiene un resumen general de los datos actuales.',
        parameters: { type: Type.OBJECT, properties: {} },
    },
];

const SUGGESTION_CHIPS = [
    { label: 'Crear Tarea Urgente', icon: 'add_alert', prompt: 'Crea una tarea urgente llamada "Revisión Mensual" para el viernes.' },
    { label: 'Asignar Tarea', icon: 'person_add', prompt: 'Asigna la tarea de "Revisión Mensual" a Roberto.' },
    { label: 'Proponer Estrategia', icon: 'lightbulb', prompt: 'Propón una tarea para mejorar el seguimiento de clientes inactivos.' },
    { label: 'Resumen del día', icon: 'summarize', prompt: 'Dame un resumen de mis actividades y prioridades para hoy.' },
];

const AiAssistantPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            text: "Hola, soy Studio AI. Tengo control total sobre la gestión de tareas. Puedo crear, modificar, asignar y proponer acciones por ti. ¿Qué necesitas?",
            sender: 'ai'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any | null>(null);
    const chatEndRef = useRef<null | HTMLDivElement>(null);

    // Context Data
    const { data: tasks } = useCollection<Task>('tasks');
    const { data: users } = useCollection<User>('users');
    const { data: prospects } = useCollection<Prospect>('prospects');
    
    const { user: currentUser } = useAuth();

    // Initialize Speech Recognition
    useEffect(() => {
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'es-MX';
        recognition.interimResults = false;
        recognition.onresult = (event: any) => setInput(event.results[0][0].transcript);
        recognition.onend = () => setIsRecording(false);
        recognitionRef.current = recognition;
    }, []);
    
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

    // --- HELPER FUNCTIONS FOR AI LOGIC ---

    const findUserByName = (nameQuery: string): User | undefined => {
        if (!users) return undefined;
        const lowerQuery = nameQuery.toLowerCase();
        return users.find(u => 
            u.name.toLowerCase().includes(lowerQuery) || 
            (u.nickname && u.nickname.toLowerCase().includes(lowerQuery))
        );
    };

    const findTaskByTitle = (titleQuery: string): Task | undefined => {
        if (!tasks) return undefined;
        const lowerQuery = titleQuery.toLowerCase();
        // Simple fuzzy match: exact includes
        return tasks.find(t => t.title.toLowerCase().includes(lowerQuery));
    };

    const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
        if (e) e.preventDefault();
        const textToSend = overrideText || input;

        if (textToSend.trim() === '' || isLoading || !currentUser) return;
        if (isRecording) recognitionRef.current?.stop();

        const userMessage: Message = { id: Date.now(), text: textToSend, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Build Dynamic Context
            const userListString = users?.map(u => `${u.name} (Role: ${u.role})`).join(', ');
            const myTasks = tasks?.filter(t => t.assignees.includes(currentUser.id)).map(t => `${t.title} (${t.status})`).join(', ');

            const prompt = `
                Eres "Studio AI", un gestor de proyectos experto. Tienes capacidades operativas reales.
                
                CONTEXTO ACTUAL:
                - Usuario: ${currentUser.name}
                - Usuarios Disponibles para asignar: ${userListString}
                - Mis Tareas actuales: ${myTasks || 'Ninguna'}

                INSTRUCCIONES:
                1. Interpreta la intención del usuario (Crear, Modificar, Asignar, Proponer).
                2. Si pide "Proponer", usa 'manageTask' con 'create' y marca 'isProposal' como true.
                3. Si pide "Modificar" o "Cambiar", busca la tarea primero mentalmente y luego usa 'manageTask' con 'update'.
                4. Si pide "Asignar", usa 'assignTaskToUser'.
                5. Responde siempre confirmando la acción realizada de forma clara.

                Solicitud del Usuario: "${textToSend}"
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
                },
            });

            const call = response.functionCalls?.[0];
            let aiResponseText = response.text || "Entendido.";
            let actionDetails = null;

            if (call) {
                const args = call.args as any;
                
                // --- ACTION: MANAGE TASK (CREATE / UPDATE) ---
                if (call.name === 'manageTask') {
                    if (args.action === 'create') {
                        const newTask: Partial<Task> = {
                            id: `task-${Date.now()}`,
                            title: args.title || 'Nueva Tarea IA',
                            description: args.description || `Creada por Studio AI a petición de ${currentUser.name}`,
                            status: args.status as TaskStatus || TaskStatus.PorHacer,
                            priority: args.priority as Priority || Priority.Media,
                            assignees: [currentUser.id], // Default to self
                            createdAt: new Date().toISOString(),
                            tags: args.isProposal ? ['Propuesta', 'IA'] : ['IA'],
                            impact: 'Medio'
                        };
                        
                        if (args.dueInDays) {
                            const date = new Date();
                            date.setDate(date.getDate() + args.dueInDays);
                            newTask.dueAt = date.toISOString();
                        }

                        await api.addDoc('tasks', newTask);
                        aiResponseText = args.isProposal 
                            ? `He redactado la propuesta de tarea: "${newTask.title}". Puedes revisarla en tu tablero.`
                            : `✅ Tarea creada exitosamente: "${newTask.title}".`;
                        
                        actionDetails = { type: 'task_created', data: newTask };

                    } else if (args.action === 'update') {
                        const targetTask = findTaskByTitle(args.searchTitle);
                        if (targetTask) {
                            const updates: any = {};
                            if (args.title) updates.title = args.title;
                            if (args.priority) updates.priority = args.priority;
                            if (args.status) updates.status = args.status;
                            if (args.description) updates.description = args.description;

                            await api.updateDoc('tasks', targetTask.id, updates);
                            aiResponseText = `He modificado la tarea "${targetTask.title}" según tus indicaciones.`;
                            actionDetails = { type: 'task_updated', data: { ...targetTask, ...updates } };
                        } else {
                            aiResponseText = `No pude encontrar una tarea que coincida con "${args.searchTitle}". ¿Podrías ser más específico con el nombre?`;
                        }
                    }
                } 
                
                // --- ACTION: ASSIGN TASK ---
                else if (call.name === 'assignTaskToUser') {
                    const targetTask = findTaskByTitle(args.taskTitle);
                    const targetUser = findUserByName(args.userName);

                    if (targetTask && targetUser) {
                        const currentAssignees = targetTask.assignees || [];
                        // Avoid duplicates
                        const newAssignees = Array.from(new Set([...currentAssignees, targetUser.id]));
                        
                        await api.updateDoc('tasks', targetTask.id, { assignees: newAssignees });
                        
                        // Notify user
                        const notification = {
                            userId: targetUser.id,
                            title: 'Tarea Asignada por IA',
                            message: `Se te ha asignado la tarea "${targetTask.title}"`,
                            type: 'task' as const,
                            link: `/tasks/${targetTask.id}`,
                            isRead: false,
                            createdAt: new Date().toISOString()
                        };
                        await api.addDoc('notifications', notification);

                        aiResponseText = `Listo. He asignado la tarea "${targetTask.title}" a ${targetUser.name}.`;
                        actionDetails = { type: 'assignment', data: { task: targetTask.title, user: targetUser } };
                    } else {
                        aiResponseText = `No pude completar la asignación. ${!targetTask ? 'No encontré la tarea.' : ''} ${!targetUser ? `No encontré al usuario "${args.userName}".` : ''}`;
                    }
                }

                 // --- ACTION: GET SUMMARY ---
                 else if (call.name === 'getSystemSummary') {
                     aiResponseText = `Actualmente tienes ${tasks?.length} tareas en el sistema, de las cuales ${tasks?.filter(t => t.status === 'Hecho').length} están completadas. Hay ${users?.length} usuarios activos en el equipo.`;
                 }
            }

            const aiMessage: Message = { id: Date.now() + 1, text: aiResponseText, sender: 'ai', actionData: actionDetails };
            setMessages(prev => [...prev, aiMessage]);

        } catch (err) {
            console.error("Error with AI:", err);
            setMessages(prev => [...prev, { id: Date.now() + 1, text: "Hubo un error técnico al procesar tu solicitud.", sender: 'ai' }]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER HELPERS ---
    
    const renderActionCard = (data: any) => {
        if (!data) return null;
        
        if (data.type === 'task_created' || data.type === 'task_updated') {
            const t = data.data;
            return (
                <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-left">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{data.type === 'task_created' ? 'Nueva Tarea' : 'Actualización'}</span>
                        <Badge text={t.priority} color={t.priority === 'Alta' ? 'red' : 'blue'} />
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{t.title}</p>
                    {t.tags?.includes('Propuesta') && (
                        <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Propuesta IA</span>
                    )}
                </div>
            );
        }

        if (data.type === 'assignment') {
            return (
                <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                     <img src={data.data.user.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
                     <div>
                         <p className="text-xs text-slate-500">Asignado a</p>
                         <p className="font-bold text-slate-800 dark:text-slate-200">{data.data.user.name}</p>
                     </div>
                </div>
            )
        }
        return null;
    };
    
    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 relative">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <span className="material-symbols-outlined">smart_toy</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Studio AI: Agente de Tareas</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Gestión inteligente y automatizada</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
                {messages.map((message) => (
                    <div key={message.id} className={`flex gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {message.sender === 'ai' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs shadow-md flex-shrink-0 mt-1">
                                <span className="material-symbols-outlined !text-sm">auto_awesome</span>
                            </div>
                        )}
                        
                        <div className={`max-w-2xl p-4 shadow-sm text-sm leading-relaxed animate-fade-in ${
                            message.sender === 'user' 
                            ? 'bg-slate-800 dark:bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700'
                        }`}>
                            <p className="whitespace-pre-wrap">{message.text}</p>
                            {/* Render Rich Action Cards if available */}
                            {message.actionData && renderActionCard(message.actionData)}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex gap-4 justify-start items-center animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs shadow-md flex-shrink-0">
                             <span className="material-symbols-outlined !text-sm">settings_suggest</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                            Procesando acción en la base de datos...
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                    {SUGGESTION_CHIPS.map((chip, idx) => (
                        <button 
                            key={idx}
                            onClick={() => { setInput(chip.prompt); if(!chip.prompt.endsWith(' ')) handleSendMessage(undefined, chip.prompt); }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full text-xs font-medium transition-colors whitespace-nowrap border border-slate-200 dark:border-slate-700 hover:border-indigo-200"
                        >
                            <span className="material-symbols-outlined !text-base">{chip.icon}</span>
                            {chip.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={(e) => handleSendMessage(e)} className="relative max-w-4xl mx-auto">
                    <div className="relative flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full p-1 pr-2 border border-transparent focus-within:border-indigo-300 dark:focus-within:border-indigo-700 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:shadow-md transition-all">
                        <button type="button" className="p-2.5 rounded-full text-slate-400 hover:text-indigo-500 transition-colors">
                            <span className="material-symbols-outlined">add</span>
                        </button>
                        
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ej: 'Crea una tarea urgente para revisar inventario'..."
                            className="flex-1 bg-transparent border-none focus:ring-0 px-2 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400"
                            autoFocus
                        />

                        {input.trim() ? (
                             <button 
                                type="submit" 
                                disabled={isLoading} 
                                className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined">arrow_upward</span>
                            </button>
                        ) : (
                             <button 
                                type="button"
                                onClick={handleToggleRecording}
                                className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                <span className="material-symbols-outlined">{isRecording ? 'stop' : 'mic'}</span>
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AiAssistantPage;
