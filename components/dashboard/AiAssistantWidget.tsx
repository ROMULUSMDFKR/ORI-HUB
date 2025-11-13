
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Task, Prospect, SalesOrder } from '../../types';
import { MOCK_USERS } from '../../data/mockData';

interface AiAssistantWidgetProps {
    tasks: Task[];
    prospects: Prospect[];
    salesOrders: SalesOrder[];
}

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*$)/gm, '<li class="list-disc ml-5">$1</li>')
        .replace(/\n/g, '<br />')
        .replace(/<br \/>(<li)/g, '$1') // Remove br before li
        .replace(/(<\/li>)<br \/>/g, '$1');

    // This is a simplified wrapper and might not handle all cases perfectly
    const wrappedHtml = html.replace(/(<li.*<\/li>)/s, '<ul>$1</ul>');

    return <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-200 space-y-2" dangerouslySetInnerHTML={{ __html: wrappedHtml }} />;
};


const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({ tasks, prospects, salesOrders }) => {
    const [summary, setSummary] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const currentUser = MOCK_USERS.natalia;

    const generateSummary = async () => {
        setIsLoading(true);
        setError('');
        setSummary('');

        try {
            // Prepare context
            const overdueTasks = tasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'Hecho');
            const recentSales = salesOrders.filter(o => new Date(o.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
            const staleProspects = prospects
                .filter(p => p.lastInteraction && new Date(p.lastInteraction.date) < new Date(Date.now() - 5 * 24 * 60 * 60 * 1000))
                .sort((a, b) => b.estValue - a.estValue)
                .slice(0, 3);

            const today = new Date();
            const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonth = lastMonthDate.getMonth();
            const lastMonthYear = lastMonthDate.getFullYear();

            const monthBeforeLastDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            const monthBeforeLast = monthBeforeLastDate.getMonth();
            const monthBeforeLastYear = monthBeforeLastDate.getFullYear();

            const salesLastMonth = (salesOrders || [])
                .filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear;
                })
                .reduce((sum, o) => sum + o.total, 0);

            const salesMonthBeforeLast = (salesOrders || [])
                .filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate.getMonth() === monthBeforeLast && orderDate.getFullYear() === monthBeforeLastYear;
                })
                .reduce((sum, o) => sum + o.total, 0);

            const salesChange = salesMonthBeforeLast > 0
                ? ((salesLastMonth - salesMonthBeforeLast) / salesMonthBeforeLast) * 100
                : (salesLastMonth > 0 ? 100 : 0);
            
            const context = `
                Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
                El usuario actual es ${currentUser.name}.

                RESUMEN DE VENTAS DEL MES PASADO (${lastMonthDate.toLocaleString('es-ES', { month: 'long' })}):
                - Total: $${salesLastMonth.toLocaleString()}
                - Cambio vs mes anterior: ${salesChange.toFixed(1)}%

                TAREAS VENCIDAS (${overdueTasks.length}):
                ${overdueTasks.map(t => `- "${t.title}" (Venció el ${new Date(t.dueAt!).toLocaleDateString()})`).join('\n') || 'Ninguna.'}

                VENTAS SIGNIFICATIVAS DE LA ÚLTIMA SEMANA (${recentSales.length}):
                ${recentSales.map(o => `- Venta ${o.id} por $${o.total.toLocaleString()}`).join('\n') || 'Ninguna.'}

                PROSPECTOS IMPORTANTES SIN CONTACTO RECIENTE:
                ${staleProspects.map(p => `- ${p.name} (Valor: $${p.estValue.toLocaleString()}, Último contacto: ${new Date(p.lastInteraction!.date).toLocaleDateString()})`).join('\n') || 'Ninguno.'}
            `;

            const prompt = `
                Eres un asistente de IA proactivo para un CRM. Tu nombre es "Studio AI".
                Analiza el siguiente contexto y genera un resumen ejecutivo matutino para el usuario ${currentUser.name}.
                Tu tono debe ser profesional pero amigable y motivador.
                Empieza con un saludo. Luego, destaca los 2 o 3 puntos más urgentes o importantes para hoy.
                Usa markdown para formatear tu respuesta, usando negritas (**texto**) y listas (- item).
                Para hacerlo más visual y amigable, incluye un emoji relevante al principio de cada punto clave en la lista (por ejemplo, 💰 para ventas, ✅ para tareas, 🎯 para prospectos).
                Finaliza con una frase motivadora. No incluyas el contexto en tu respuesta, solo el resumen.

                Contexto:
                ${context}
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
            });

            // FIX: The `text` property on the response should be accessed directly, not called as a function.
            setSummary(response.text);

        } catch (err) {
            console.error("Error generating summary:", err);
            setError("No se pudo generar el resumen. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        generateSummary();
    }, []);

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
                     <button onClick={generateSummary} disabled={isLoading} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-wait">
                        <span className={`material-symbols-outlined text-slate-500 dark:text-slate-400 ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
                <div className="mt-4 min-h-[100px]">
                    {isLoading && (
                         <div className="flex items-center space-x-1 p-4">
                               <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                               <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                               <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce"></div>
                           </div>
                    )}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {summary && <SimpleMarkdown text={summary} />}
                </div>
            </div>
        </div>
    );
};

export default AiAssistantWidget;
