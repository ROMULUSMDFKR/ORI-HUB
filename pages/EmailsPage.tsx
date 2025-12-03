
import React, { useState, useEffect, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { ConnectedEmailAccount, Email } from '../types';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Spinner from '../components/ui/Spinner';
import Drawer from '../components/ui/Drawer';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Componente auxiliar para renderizar HTML seguro en un iframe
const EmailBodyViewer: React.FC<{ htmlContent: string }> = ({ htmlContent }) => {
    return (
        <div className="w-full h-full bg-white rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <iframe
                title="Contenido del Correo"
                srcDoc={`
                    <html>
                    <head>
                        <style>
                            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 1rem; color: #334155; }
                            img { max-width: 100%; height: auto; }
                            a { color: #4f46e5; }
                        </style>
                    </head>
                    <body>${htmlContent || '<p style="color: #94a3b8; font-style: italic;">Sin contenido.</p>'}</body>
                    </html>
                `}
                className="w-full h-full border-none block"
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
        </div>
    );
};

const EmailsPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    
    // Estado de la UI
    const [view, setView] = useState<'inbox' | 'sent'>('inbox');
    const [selectedMessage, setSelectedMessage] = useState<Email | null>(null);
    
    // Carga de datos desde Firestore (Sincronizado con email-server.js)
    const { data: allEmails, loading: emailsLoading } = useCollection<Email>('emails');
    const { data: connectedAccounts } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    
    const [activeAccount, setActiveAccount] = useState<ConnectedEmailAccount | null>(null);
    
    // Estado para Componer
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Detectar cuenta activa o usar Fallback del Sistema
    useEffect(() => {
        if (connectedAccounts && connectedAccounts.length > 0) {
            if (!activeAccount) {
                const myAccount = connectedAccounts.find(acc => acc.userId === user?.id);
                setActiveAccount(myAccount || connectedAccounts[0]);
            }
        } else if (!activeAccount) {
            // FALLBACK: Si no hay cuentas configuradas en la DB, asumimos que se usa el email-server.js
            setActiveAccount({
                id: 'system-account',
                userId: user?.id || 'system',
                email: 'Servidor Local (Bridge)',
                status: 'Conectado', // Visualmente verde para indicar disponibilidad
                provider: 'other'
            });
        }
    }, [connectedAccounts, user, activeAccount]);

    // Filtrar correos según la vista
    const displayedEmails = useMemo(() => {
        if (!allEmails) return [];
        
        let filtered = allEmails;

        // Filtrar por carpeta (Inbox vs Sent)
        if (view === 'inbox') {
            filtered = filtered.filter(e => e.folder === 'inbox' || !e.folder);
        } else if (view === 'sent') {
            filtered = filtered.filter(e => e.folder === 'sent');
        }

        // Ordenar por fecha descendente
        return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [allEmails, view]);

    // --- ACCIONES ---

    // 1. Enviar Correo (Metodo Outbox para email-server.js)
    const handleSend = async () => {
        if (!composeTo || !composeSubject || !composeBody) {
            showToast('warning', 'Completa todos los campos.');
            return;
        }

        setIsSending(true);

        try {
            // Guardamos en Firestore con estado 'pending'. El script email-server.js escuchará esto.
            const newEmail: Omit<Email, 'id'> = {
                to: [{ email: composeTo, name: composeTo }],
                from: { email: user?.email || 'usuario@sistema.com', name: user?.name || 'Usuario' },
                subject: composeSubject,
                body: composeBody,
                timestamp: new Date().toISOString(),
                folder: 'sent',
                status: 'read',
                deliveryStatus: 'pending', // CLAVE: Esto activa el script de servidor
                attachments: []
            };

            const docRef = await api.addDoc('emails', newEmail);
            
            showToast('info', 'Correo en cola. Esperando al servidor...');
            setIsComposeOpen(false);
            setComposeTo('');
            setComposeSubject('');
            setComposeBody('');

            // Escuchar cambios en ese documento para confirmar envío
            const unsubscribe = onSnapshot(doc(db, 'emails', docRef.id), (docSnap) => {
                const data = docSnap.data();
                if (data?.deliveryStatus === 'sent') {
                    showToast('success', '¡Correo enviado exitosamente!');
                    setIsSending(false);
                    unsubscribe();
                } else if (data?.deliveryStatus === 'error') {
                    showToast('error', 'El servidor falló al enviar el correo.');
                    setIsSending(false);
                    unsubscribe();
                }
            });

            // Timeout de seguridad visual (15s)
            setTimeout(() => {
                if (isSending) setIsSending(false);
            }, 15000);

        } catch (error: any) {
            console.error("Error creating email doc:", error);
            showToast('error', `Error interno: ${error.message}`);
            setIsSending(false);
        }
    };

    // 2. Sincronizar (Pedir al servidor que busque correos nuevos)
    const handleRefresh = async () => {
        showToast('info', 'Enviando señal de sincronización...');
        try {
            // Actualizamos un documento de configuración que el script escucha
            await api.setDoc('settings', 'mailSync', { 
                lastSyncRequest: new Date().toISOString(),
                requestedBy: user?.id
            });
            // El useCollection actualizará la lista automáticamente cuando el servidor guarde nuevos correos
        } catch (e) {
            console.error(e);
            showToast('error', 'No se pudo enviar la señal.');
        }
    };

    const handleReply = () => {
        if (!selectedMessage) return;
        setComposeTo(selectedMessage.from.email);
        setComposeSubject(`Re: ${selectedMessage.subject}`);
        setComposeBody(`<br><br>--- El ${new Date(selectedMessage.timestamp).toLocaleString()} ${selectedMessage.from.name} escribió: ---<br>${selectedMessage.body}`);
        setIsComposeOpen(true);
    };

    const handleForward = () => {
        if (!selectedMessage) return;
        setComposeTo('');
        setComposeSubject(`Fwd: ${selectedMessage.subject}`);
        setComposeBody(`<br><br>--- Mensaje Reenviado ---<br>De: ${selectedMessage.from.email}<br>Asunto: ${selectedMessage.subject}<br><br>${selectedMessage.body}`);
        setIsComposeOpen(true);
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            
            {/* Sidebar */}
            <div className="w-64 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="p-4">
                    <button 
                        onClick={() => setIsComposeOpen(true)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                        <span className="material-symbols-outlined">edit</span>
                        Redactar
                    </button>
                </div>
                <nav className="flex-1 px-2 space-y-1">
                    <button 
                        onClick={() => setView('inbox')}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${view === 'inbox' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <div className="flex items-center gap-3"><span className="material-symbols-outlined">inbox</span>Bandeja de Entrada</div>
                    </button>
                    <button 
                        onClick={() => setView('sent')}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${view === 'sent' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <div className="flex items-center gap-3"><span className="material-symbols-outlined">send</span>Enviados</div>
                    </button>
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3 px-2">
                         {/* Use a yellow dot if it's the fallback system account to indicate "Manual/Local" mode */}
                        <div className={`w-2.5 h-2.5 rounded-full ${activeAccount?.id === 'system-account' ? 'bg-emerald-500 animate-pulse' : 'bg-green-500'}`}></div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                            {activeAccount?.email || 'Sin conexión'}
                        </p>
                    </div>
                    <button onClick={handleRefresh} className="flex items-center justify-center gap-2 w-full text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 py-2 rounded-lg hover:shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-base">sync</span> Sincronizar Ahora
                    </button>
                </div>
            </div>

            {/* Lista de Mensajes */}
            <div className={`w-full lg:w-96 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col ${selectedMessage ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{view === 'inbox' ? 'Recibidos' : 'Enviados'}</h3>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">{displayedEmails.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {emailsLoading ? (
                        <div className="flex justify-center py-10"><Spinner /></div>
                    ) : displayedEmails.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 px-6">
                            <span className="material-symbols-outlined text-5xl mb-3 text-slate-300">mark_email_unread</span>
                            <p className="font-medium text-slate-600 dark:text-slate-300">Bandeja vacía</p>
                            <p className="text-xs mt-2 leading-relaxed text-slate-500">
                                Si esperas correos, asegúrate de que el archivo <code>email-server.js</code> se esté ejecutando en tu terminal y presiona "Sincronizar".
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                            {displayedEmails.map(msg => (
                                <li 
                                    key={msg.id} 
                                    onClick={() => setSelectedMessage(msg)}
                                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${selectedMessage?.id === msg.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-sm truncate max-w-[70%] ${msg.status === 'unread' ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {msg.from.name || msg.from.email}
                                        </span>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                            {new Date(msg.timestamp).toLocaleDateString(undefined, {month: 'short', day:'numeric'})}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate mb-1 ${msg.status === 'unread' ? 'font-semibold text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>{msg.subject || '(Sin asunto)'}</p>
                                    <p className="text-xs text-slate-400 line-clamp-1">{msg.body.replace(/<[^>]*>?/gm, '').substring(0, 60)}...</p>
                                    {msg.deliveryStatus === 'pending' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 mt-1">
                                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1 animate-pulse"></span> En cola
                                        </span>
                                    )}
                                    {msg.deliveryStatus === 'error' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 mt-1">
                                            Error envío
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Detalle del Mensaje */}
            <div className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 ${selectedMessage ? 'flex' : 'hidden lg:flex'}`}>
                {selectedMessage ? (
                    <>
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                            <div className="flex justify-between items-start mb-4">
                                <button onClick={() => setSelectedMessage(null)} className="lg:hidden mr-2 text-slate-500"><span className="material-symbols-outlined">arrow_back</span></button>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex-1 leading-snug">{selectedMessage.subject}</h2>
                                <div className="flex gap-2 ml-4">
                                    <button onClick={handleReply} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Responder"><span className="material-symbols-outlined">reply</span></button>
                                    <button onClick={handleForward} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Reenviar"><span className="material-symbols-outlined">forward</span></button>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold text-lg">
                                        {(selectedMessage.from.name || selectedMessage.from.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            {selectedMessage.from.name} <span className="font-normal text-slate-500 dark:text-slate-400 text-xs">&lt;{selectedMessage.from.email}&gt;</span>
                                        </p>
                                        <p className="text-xs text-slate-500">Para: {selectedMessage.to.map(t => t.email).join(', ')}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-slate-500">{new Date(selectedMessage.timestamp).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-800">
                            <EmailBodyViewer htmlContent={selectedMessage.body} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                        <span className="material-symbols-outlined text-8xl opacity-20">email</span>
                        <p className="mt-4 text-lg">Selecciona un correo para leerlo</p>
                    </div>
                )}
            </div>

            {/* Modal de Redacción */}
            <Drawer isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} title="Redactar Correo" size="lg">
                <div className="space-y-4 flex flex-col h-full">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Para:</label>
                        <input 
                            type="email" 
                            value={composeTo}
                            onChange={e => setComposeTo(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="destinatario@ejemplo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asunto:</label>
                        <input 
                            type="text" 
                            value={composeSubject}
                            onChange={e => setComposeSubject(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Asunto..."
                        />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mensaje:</label>
                        <textarea 
                            value={composeBody}
                            onChange={e => setComposeBody(e.target.value)}
                            className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none focus:ring-2 focus:ring-indigo-500 outline-none font-sans min-h-[300px]"
                            placeholder="Escribe tu mensaje..."
                        />
                    </div>
                    
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                        <button onClick={() => setIsComposeOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                        <button 
                            onClick={handleSend} 
                            disabled={isSending}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {isSending ? <Spinner /> : <span className="material-symbols-outlined">send</span>}
                            {isSending ? 'Enviando...' : 'Enviar'}
                        </button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

export default EmailsPage;
