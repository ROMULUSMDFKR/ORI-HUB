
import React from 'react';
import { ChatSession } from '../../types';

interface ChatCrmSidebarProps {
    session: ChatSession | null;
    onCreateProspect: () => void;
}

const ChatCrmSidebar: React.FC<ChatCrmSidebarProps> = ({ session, onCreateProspect }) => {
    if (!session) return <div className="w-72 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 hidden xl:block"></div>;

    return (
        <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full overflow-y-auto hidden xl:block">
            <div className="p-6 text-center border-b border-slate-200 dark:border-slate-700">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 mx-auto flex items-center justify-center mb-3 text-2xl font-bold text-slate-500">
                    {session.visitorName.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{session.visitorName}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Visitante Web</p>
            </div>

            <div className="p-6 space-y-6">
                {/* Contact Info */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Información Capturada</h4>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">email</span>
                            <div>
                                <p className="text-xs text-slate-500">Email</p>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{session.visitorEmail || 'No capturado'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">phone</span>
                            <div>
                                <p className="text-xs text-slate-500">Teléfono</p>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{session.visitorPhone || 'No capturado'}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">language</span>
                            <div>
                                <p className="text-xs text-slate-500">Origen</p>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{session.source}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    {session.prospectId ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                            <p className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">check_circle</span>
                                Prospecto Creado
                            </p>
                            <button className="text-xs text-green-600 underline mt-1 hover:text-green-800">Ver en CRM</button>
                        </div>
                    ) : (
                        <button 
                            onClick={onCreateProspect}
                            className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">person_add</span>
                            Crear Prospecto
                        </button>
                    )}
                </div>

                {/* AI Summary Placeholder */}
                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span> Resumen de la IA
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        El usuario está interesado en precios de mayoreo para Urea. Ha preguntado por tiempos de entrega en Monterrey. Parece ser un lead calificado.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatCrmSidebar;
