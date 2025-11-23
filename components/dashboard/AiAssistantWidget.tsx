
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Task, Prospect, SalesOrder, User } from '../../types';
import Spinner from '../ui/Spinner';
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../hooks/useAuth';

interface AiAssistantWidgetProps {
    tasks: Task[];
    prospects: Prospect[];
    salesOrders: SalesOrder[];
    isLoadingData?: boolean;
}

interface AiSummaryCard {
    title: string;
    summary: string;
    icon: string;
    type: 'info' | 'positive' | 'warning';
    details?: string[];
}

const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({ tasks, prospects, salesOrders, isLoadingData = false }) => {
    const [summaryCards, setSummaryCards] = useState<AiSummaryCard[]>([]);
    const [closingStatement, setClosingStatement] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { user: currentUser } = useAuth();

    const generateSummary = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        setError('');
        setSummaryCards([]);
        setClosingStatement('');

        try {
            const overdueTasks = tasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'Hecho');
            
            const today = new Date();
            const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonth = lastMonthDate.getMonth();
            const lastMonthYear = lastMonthDate.getFullYear();

            const salesLastMonth = (salesOrders || [])
                .filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear;
                })
                .reduce((sum, o) => sum + o.total, 0);
            
            const staleProspects = prospects
                .filter(p => p.lastInteraction && new Date(p.lastInteraction.date) < new Date(Date.now() - 5 * 24 * 60 * 60 * 1000))
                .sort((a, b) => b.estValue - a.estValue)
                .slice(0, 3);
            
            const context = `
                Datos del CRM para el usuario ${currentUser.name}:
                - Tareas vencidas: ${overdueTasks.length} (${overdueTasks.map(t => t.title).join(', ')})
                - Resumen de ventas del mes pasado: Total $${salesLastMonth.toLocaleString()}
                - Prospectos importantes sin contacto reciente: ${staleProspects.length} (${staleProspects.map(p => p.name).join(', ')})
            `;

            const prompt = `
                Eres un asistente de IA experto en CRM. Analiza los siguientes datos para ${currentUser.name}.
                Tu objetivo es generar un JSON con dos claves: "summaryPoints" y "closingStatement".

                "summaryPoints" debe ser un array de 2 a 3 objetos JSON. Cada objeto representa un punto clave del resumen diario y debe tener las siguientes propiedades:
                - "title": Un título breve y descriptivo (ej. "Rendimiento de Ventas", "Tareas Vencidas").
                - "summary": Un resumen conciso y objetivo del punto, sin calificativos como "excelente" o "impecable".
                - "icon": Un nombre de icono de Material Symbols Outlined (ej. 'monitoring', 'task_alt', 'warning', 'group_off').
                - "type": El tipo de tarjeta. Usa 'warning' para temas urgentes como tareas vencidas o prospectos sin seguimiento. Usa 'positive' para logros. Usa 'info' para datos neutrales.
                - "details": (Opcional) Un array de strings con nombres específicos si el punto se refiere a tareas, prospectos, etc.

                "closingStatement" debe ser una única frase motivacional y de cierre, como "Continúa con ese impulso. ¡Tienes todo para una semana exitosa!".

                Concéntrate en los elementos más urgentes e importantes. Si hay tareas vencidas o prospectos sin seguimiento, prioriza crear una tarjeta de tipo 'warning' para ellos. No incluyas saludos ni introducciones.

                Contexto:
                ${context}
            `;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summaryPoints: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                summary: { type: Type.STRING },
                                icon: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['info', 'positive', 'warning'] },
                                details: { type: Type.ARRAY, items: { type: Type.STRING } },
                            },
                            required: ['title', 'summary', 'icon', 'type'],
                        }
                    },
                    closingStatement: { type: Type.STRING }
                },
                required: ['summaryPoints', 'closingStatement']
            };

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                }
            });

            try {
              const jsonResponse = JSON.parse(response.text);
              setSummaryCards(jsonResponse.summaryPoints || []);
              setClosingStatement(jsonResponse.closingStatement || '');
            } catch (e) {
              console.error("Failed to parse AI JSON response:", response.text, e);
              setError("No se pudo interpretar la respuesta del asistente.");
            }

        } catch (err) {
            console.error("Error generating summary:", err);
            setError("No se pudo generar el resumen. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        // Only run generation when user is present AND data has finished loading
        if(currentUser && !isLoadingData) {
            generateSummary();
        }
    }, [currentUser, isLoadingData]);

    const cardTypeStyles = {
        info: {
            bg: 'bg-slate-50 dark:bg-slate-700/50',
            iconBg: 'bg-indigo-100 dark:bg-indigo-500/10',
            iconColor: 'text-indigo-500'
        },
        positive: {
            bg: 'bg-green-50 dark:bg-green-500/10',
            iconBg: 'bg-green-100 dark:bg-green-500/10',
            iconColor: 'text-green-600 dark:text-green-400'
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            iconBg: 'bg-amber-100 dark:bg-amber-500/10',
            iconColor: 'text-amber-600 dark:text-amber-400'
        },
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-100 dark:bg-indigo-500/10 rounded-bl-full"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                           <span className="material-symbols-outlined text-indigo-500 text-2xl">auto_awesome</span>
                           Tu Resumen Diario
                        </h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400">Un vistazo rápido a tus prioridades, por Studio AI.</p>
                    </div>
                     <button onClick={generateSummary} disabled={isLoading || isLoadingData} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-wait">
                        <span className={`material-symbols-outlined text-slate-500 dark:text-slate-400 ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
                
                <div className="mt-4 min-h-[100px]">
                    {(isLoading || isLoadingData) ? (
                         <div className="flex items-center justify-center p-4 h-full">
                            <Spinner />
                         </div>
                    ) : error ? (
                        <p className="text-red-500 text-sm text-center py-4">{error}</p>
                    ) : summaryCards.length > 0 ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {summaryCards.map((card, index) => {
                                    const styles = cardTypeStyles[card.type] || cardTypeStyles.info;
                                    return (
                                        <div key={index} className={`flex items-start gap-4 p-4 rounded-lg ${styles.bg}`}>
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${styles.iconBg} flex items-center justify-center`}>
                                                <span className={`material-symbols-outlined ${styles.iconColor}`}>{card.icon}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">{card.title}</h4>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">{card.summary}</p>
                                                {card.details && card.details.length > 0 && (
                                                    <ul className="mt-2 list-disc list-inside text-xs text-slate-500 dark:text-slate-400">
                                                        {card.details.map((detail, i) => <li key={i}>{detail}</li>)}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {closingStatement && (
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg text-center border border-indigo-200 dark:border-indigo-800">
                                    <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                                        {closingStatement}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                         <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">No hay un resumen disponible en este momento.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiAssistantWidget;
