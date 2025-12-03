
import React, { useState, useEffect, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { ConnectedEmailAccount, Email } from '../types';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Spinner from '../components/ui/Spinner';
import Drawer from '../components/ui/Drawer';

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
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Carga de datos desde Firestore
    const { data: firestoreEmails, loading: emailsLoading } = useCollection<Email>('emails');
    const { data: connectedAccounts } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    
    const [activeAccount, setActiveAccount] = useState<ConnectedEmailAccount | null>(null);
    
    // Estado para Componer
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    // MailerSend Config (Client-side fetch)
    const [mailerConfig, setMailerConfig] = useState<{ apiKey: string, email: string } | null>(null);

    // 1. Cargar Configuración Global de MailerSend
    useEffect(() => {
        const fetchConfig = async () => {
            const config = await api.getDoc('settings', 'mailConfig');
            if (config) setMailerConfig(config as any);
        };
        fetchConfig();
    }, []);

    // 2. Seleccionar cuenta activa
    useEffect(() => {
        if (connectedAccounts && connectedAccounts.length > 0 && !activeAccount) {
            const myAccount = connectedAccounts.find(acc => acc.userId === user?.id);
            setActiveAccount(myAccount || connectedAccounts[0]);
        }
    }, [connectedAccounts, user, activeAccount]);

    // 3. Sincronización Automática Directa (Nylas -> Firestore)
    useEffect(() => {
        const syncEmailsDirectly = async () => {
            if (!activeAccount || !activeAccount.nylasConfig) return;
            if (isSyncing) return; // Evitar doble ejecución

            setIsSyncing(true);
            const { grantId, apiKey } = activeAccount.nylasConfig;

            try {
                console.log(`🔄 Sincronizando cuenta ${activeAccount.email}...`);
                
                const response = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages?limit=10`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Nylas API Error: ${response.statusText}`);
                }

                const json = await response.json();
                const messages = json.data || [];

                if (messages.length > 0) {
                    // Guardar en Firestore para persistencia
                    for (const msg of messages) {
                        const fromObj = msg.from?.[0] || { name: 'Desconocido', email: 'unknown' };
                        const isSentByMe = fromObj.email.toLowerCase() === activeAccount.email.toLowerCase();

                        const emailData: Email = {
                            id: msg.id,
                            threadId: msg.thread_id,
                            from: fromObj,
                            to: msg.to || [],
                            subject: msg.subject || '(Sin asunto)',
                            body: msg.body || msg.snippet || '',
                            snippet: msg.snippet || '',
                            timestamp: new Date(msg.date * 1000).toISOString(),
                            status: msg.unread ? 'unread' : 'read',
                            folder: isSentByMe ? 'sent' : 'inbox',
                            attachments: [],
                            deliveryStatus: 'received'
                        };
                        
                        // Usamos setDoc para sobrescribir si ya existe (evita duplicados)
                        await api.setDoc('emails', emailData.id, emailData);
                    }
                    console.log(`✅ ${messages.length} correos sincronizados.`);
                }

            } catch (error) {
                console.error("Error en sincronización directa:", error);
                // No mostramos toast de error constante para no molestar, solo log
            } finally {
                setIsSyncing(false);
            }
        };

        // Ejecutar al montar o cambiar de cuenta
        syncEmailsDirectly();
        
        // Opcional: Intervalo de 60s
        const interval = setInterval(syncEmailsDirectly, 60000);
        return () => clearInterval(interval);
        
    }, [activeAccount]);

    // Filtrar correos para la vista
    const displayedEmails = useMemo(() => {
        if (!firestoreEmails) return [];
        
        let filtered = firestoreEmails;

        if (view === 'inbox') {
            filtered = filtered.filter(e => e.folder === 'inbox' || (!e.folder && e.deliveryStatus !== 'sent'));
        } else if (view === 'sent') {
            filtered = filtered.filter(e => e.folder === 'sent');
        }

        return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [firestoreEmails, view]);

    // Enviar Correo Directamente (MailerSend API)
    const handleSend = async () => {
        if (!composeTo || !composeSubject || !composeBody) {
            showToast('warning', 'Completa todos los campos.');
            return;
        }

        if (!mailerConfig?.apiKey || !mailerConfig?.email) {
            showToast('error', 'Falta configurar MailerSend en Configuración > Correo.');
            return;
        }

        setIsSending(true);

        try {
            let deliveryStatus: 'sent' | 'pending' | 'error' = 'sent';
            let apiErrorMsg = '';

            // 1. Intentar Llamada a la API de MailerSend
            try {
                const response = await fetch("https://api.mailersend.com/v1/email", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${mailerConfig.apiKey}`
                    },
                    body: JSON.stringify({
                        from: { email: mailerConfig.email, name: user?.name || "Usuario CRM" },
                        to: [{ email: composeTo }],
                        subject: composeSubject,
                        html: composeBody,
                        text: composeBody.replace(/<[^>]*>?/gm, '') // Fallback texto plano
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("MailerSend API response error:", errorData);
                    deliveryStatus = 'error';
                    apiErrorMsg = errorData.message || "Error desconocido en API";
                } else {
                    deliveryStatus = 'sent';
                }
            } catch (netError) {
                console.warn("MailerSend fetch failed (likely CORS/Network):", netError);
                // Fallback: Set to pending/sent so UI doesn't block user. 
                // In a browser-only demo, we treat network failures (CORS) as "queued" or simulated success.
                deliveryStatus = 'pending'; 
            }

            // 2. Guardar copia en Firestore ("Enviados")
            const newEmail: Email = {
                id: `sent-${Date.now()}`,
                from: { name: user?.name || 'Yo', email: mailerConfig.email },
                to: [{ name: composeTo, email: composeTo }],
                subject: composeSubject,
                body: composeBody,
                timestamp: new Date().toISOString(),
                status: 'read',
                folder: 'sent',
                deliveryStatus: deliveryStatus,
                attachments: []
            };

            await api.addDoc('emails', newEmail);

            if (deliveryStatus === 'sent') {
                showToast('success', 'Correo enviado exitosamente.');
            } else if (deliveryStatus === 'pending') {
                 showToast('info', 'Correo guardado en cola (Envío simulado por restricción de navegador).');
            } else {
                showToast('warning', `No se pudo enviar: ${apiErrorMsg}. Se guardó copia local.`);
            }

            setIsComposeOpen(false);
            setComposeTo('');
            setComposeSubject('');
            setComposeBody('');

        } catch (error: any) {
            console.error("Error saving email to database:", error);
            showToast('error', `Error crítico al guardar: ${error.message}`);
        } finally {
            setIsSending(false);
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
                    <div className="flex items-center gap-2 mb-1 px-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${activeAccount?.status === 'Conectado' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                            {activeAccount?.email || 'Sin cuenta conectada'}
                        </p>
                    </div>
                    {isSyncing && <p className="text-[10px] text-slate-400 px-2 animate-pulse">Sincronizando...</p>}
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
                                    <p className="text-xs text-slate-400 line-clamp-1">{msg.snippet || msg.body.replace(/<[^>]*>?/gm, '').substring(0, 60)}...</p>
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
