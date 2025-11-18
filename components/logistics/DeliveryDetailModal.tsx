import React, { useState, useEffect } from 'react';
import { Delivery, DeliveryStatus, User } from '../../types';
// FIX: Se eliminó la importación de datos falsos.
import { GoogleGenAI, Type } from '@google/genai';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import CustomSelect from '../ui/CustomSelect';
import { useCollection } from '../../hooks/useCollection';

interface DeliveryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
  onUpdateDelivery: (updatedDelivery: Delivery) => void;
}

const DeliveryDetailModal: React.FC<DeliveryDetailModalProps> = ({ isOpen, onClose, delivery, onUpdateDelivery }) => {
    const [currentStatus, setCurrentStatus] = useState<DeliveryStatus | undefined>(delivery?.status);
    const [note, setNote] = useState('');
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState('');
    // FIX: Se obtienen los usuarios para mostrar sus nombres.
    const { data: users } = useCollection<User>('users');
    const usersMap = React.useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

    useEffect(() => {
        if (delivery) {
            setCurrentStatus(delivery.status);
        }
        setNote('');
        setAiError('');
    }, [delivery]);

    if (!isOpen || !delivery) return null;
    
    const handleManualUpdate = () => {
        if (currentStatus) {
            const updatedDelivery: Delivery = {
                ...delivery,
                status: currentStatus,
                notes: [
                    { text: note || `Estado actualizado manualmente a ${currentStatus}.`, userId: 'user-1', createdAt: new Date().toISOString() },
                    ...delivery.notes,
                ],
            };
            onUpdateDelivery(updatedDelivery);
            onClose();
        }
    };

    const handleAiUpdate = async () => {
        if (!delivery.trackingUrl || !delivery.trackingNumber) return;
        setIsLoadingAI(true);
        setAiError('');

        try {
            // SIMULATION: In a real scenario, you might scrape the site or use a carrier's API.
            // Here, we simulate having fetched text and ask Gemini to interpret it.
            const simulatedScrapedText = "Your package TRN-54321 is currently in transit to the destination facility in Mexico City. Last scan: 2 hours ago.";
            
            const prompt = `As a logistics expert, analyze the following tracking update for tracking number ${delivery.trackingNumber}: "${simulatedScrapedText}". Based on this, what is the new status ('En Tránsito', 'Entregada', 'Incidencia') and a brief summary? Respond in JSON format with "status" and "summary" keys.`;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            status: { type: Type.STRING, enum: Object.values(DeliveryStatus) },
                            summary: { type: Type.STRING },
                        }
                    }
                }
            });
            
            const jsonStr = response.text.trim();
            const result = JSON.parse(jsonStr);

            if (result.status && Object.values(DeliveryStatus).includes(result.status)) {
                const updatedDelivery: Delivery = {
                    ...delivery,
                    status: result.status,
                    notes: [
                        { text: `Actualización IA: ${result.summary}`, userId: 'ai', createdAt: new Date().toISOString() },
                        ...delivery.notes,
                    ],
                };
                onUpdateDelivery(updatedDelivery);
                onClose();
            } else {
                throw new Error("Respuesta de IA inválida.");
            }
        } catch (error) {
            console.error("Error with Gemini AI update:", error);
            setAiError("No se pudo obtener la actualización de la IA. Por favor, inténtelo de nuevo.");
        } finally {
            setIsLoadingAI(false);
        }
    };

    const statusOptions = Object.values(DeliveryStatus).map(s => ({ value: s, name: s }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl m-4 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Detalle de Entrega: {delivery.salesOrderId} ({delivery.deliveryNumber})</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Cerrar">
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">close</span>
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-800 dark:text-slate-200">
                       <p><strong>Tracking #:</strong> {delivery.trackingNumber || 'N/A'}</p>
                       <p><strong>URL de Rastreo:</strong> {delivery.trackingUrl ? <a href={delivery.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Abrir</a> : 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex gap-2 items-end">
                            <div className="flex-grow">
                                <CustomSelect 
                                    label="Actualizar Estado Manualmente"
                                    options={statusOptions}
                                    value={currentStatus || ''}
                                    onChange={val => setCurrentStatus(val as DeliveryStatus)}
                                />
                            </div>
                           <button onClick={handleManualUpdate} className="bg-indigo-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">Guardar</button>
                        </div>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Añadir nota sobre la actualización..." className="w-full mt-2"/>
                    </div>
                    
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Actualización con IA</h4>
                         {delivery.trackingUrl ? (
                            <>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Usa IA para interpretar el estado desde la página del transportista (simulado).</p>
                                <button onClick={handleAiUpdate} disabled={isLoadingAI} className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-400">
                                    {isLoadingAI ? <Spinner /> : <span className="material-symbols-outlined">auto_awesome</span>}
                                    {isLoadingAI ? 'Analizando...' : 'Actualizar con IA'}
                                </button>
                                {aiError && <p className="text-red-500 text-xs mt-1 text-center">{aiError}</p>}
                            </>
                         ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md">El rastreo con IA no está disponible para esta entrega (sin URL de seguimiento).</p>
                         )}
                    </div>
                    
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <h4 className="text-sm font-semibold mb-2 text-slate-800 dark:text-slate-200">Historial de Notas</h4>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                            {delivery.notes.map((n, i) => (
                                <div key={i} className="text-xs p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                    {/* FIX: Se usa el `usersMap` para obtener el nombre del autor de la nota. */}
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">{(usersMap.get(n.userId) || {name: 'Sistema IA'}).name} <span className="font-normal text-slate-500 dark:text-slate-400">- {new Date(n.createdAt).toLocaleString()}</span></p>
                                    <p className="mt-1 text-slate-800 dark:text-slate-200">{n.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DeliveryDetailModal;