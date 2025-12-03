
import React, { useState, useEffect, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { ConnectedEmailAccount, Email, Attachment } from '../types';
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
    const [view, setView] = useState<'inbox' | 'sent' | 'drafts' | 'archived' | 'trash'>('inbox');
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
                
                const response = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages?limit=20`, {
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
                        
                        // Map Folders / Labels
                        let folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archived' = 'inbox';
                        const folders = msg.folders || [];
                        
                        if (folders.includes("SENT") || folders.includes("Sent Items") || isSentByMe) folder = 'sent';
                        else if (folders.includes("DRAFTS") || folders.includes("Drafts")) folder = 'drafts';
                        else if (folders.includes("TRASH") || folders.includes("Trash") || folders.includes("Bin")) folder = 'trash';
                        else if (folders.includes("ARCHIVE") || folders.includes("Archive") || folders.includes("All Mail")) folder = 'archived';
                        
                        // Map Attachments
                        const attachments: Attachment[] = (msg.attachments || []).map((att: any) => ({
                            id: att.id,
                            name: att.filename || 'Archivo adjunto',
                            size: att.size || 0,
                            url: '', // URL needs fetch with auth, handled in UI
                            messageId: msg.id
                        }));

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
                            folder: folder,
                            attachments: attachments,
                            deliveryStatus: 'received'
                        };
                        
                        // Usamos setDoc para sobrescribir si ya existe (evita duplicados)
                        await api.setDoc('emails', emailData.id, emailData);
                    }
                    console.log(`✅ ${messages.length} correos sincronizados.`);
                }

            } catch (error) {
                console.error("Error en sincronización directa:", error);
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
        
        return firestoreEmails.filter(e => e.folder === view)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [firestoreEmails, view]);

    // Función para descargar adjuntos usando la API Key de Nylas
    const handleDownloadAttachment = async (attachment: Attachment) => {
        if (!activeAccount?.nylasConfig) {
             showToast('error', 'No hay cuenta conectada para descargar adjuntos.');
             return;
        }
        
        const { grantId, apiKey } = activeAccount.nylasConfig;
        
        try {
            showToast('info', `Descargando ${attachment.name}...`);
            const response = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/attachments/${attachment.id}/download`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!response.ok) throw new Error('Error al descargar adjunto');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('success', 'Descarga completada.');
            
        } catch (error) {
            console.error(error);
            showToast('error', 'No se pudo descargar el archivo.');
        }
    };

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
                    apiErrorMsg = errorData.message || "Error de API (posible CORS o credenciales)";
                } else {
                    deliveryStatus = 'sent';
                }
            } catch (netError: any) {
                console.warn("MailerSend fetch failed (likely CORS/Network):", netError);
                // If it's a network error (often CORS in browser), we mark as pending/simulation
                // but user wants to connect. We tell them if it's CORS.
                deliveryStatus = 'pending';
                apiErrorMsg = "Restricción de navegador (CORS).";
            }

            // 2. Guardar copia en Firestore
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
                 // More descriptive message for the user
                 showToast('info', 'Envío simulado (Bloqueo de seguridad del navegador/CORS detectado). El correo se guardó en Enviados.');
            } else {
                showToast('warning', `Error al enviar: ${apiErrorMsg}. Se guardó en Enviados (Error).`);
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
    
    const handleSaveDraft = async () => {
         if (!composeSubject && !composeTo) {
             setIsComposeOpen(false);
             return;
         }
         
         const draftEmail: Email = {
            id: `draft-${Date.now()}`,
            from: { name: user?.name || 'Yo', email: mailerConfig?.email || '' },
            to: [{ name: composeTo, email: composeTo }],
            subject: composeSubject || '(Sin asunto)',
            body: composeBody,
            timestamp: new Date().toISOString(),
            status: 'read',
            folder: 'drafts',
            deliveryStatus: 'pending',
            attachments: []
        };
        
        await api.addDoc('emails', draftEmail);
        showToast('success', 'Borrador guardado.');
        setIsComposeOpen(false);
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
                    <button onClick={() => setView('inbox')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${view === 'inbox' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3"><span className="material-symbols-outlined">inbox</span>Bandeja de Entrada</div>
                    </button>
                    <button onClick={() => setView('sent')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${view === 'sent' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3"><span className="material-symbols-outlined">send</span>Enviados</div>
                    </button>
                    <button onClick={() => setView('drafts')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${view === 'drafts' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3"><span className="material-symbols-outlined">draft</span>Borradores</div>
                    </button>
                     <button onClick={() => setView('archived')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${view === 'archived' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3"><span className="material-symbols-outlined">archive</span>Archivados</div>
                    </button>
                     <button onClick={() => setView('trash')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${view === 'trash' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3"><span className="material-symbols-outlined">delete</span>Papelera</div>
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
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg capitalize">{view === 'inbox' ? 'Recibidos' : view}</h3>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">{displayedEmails.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {emailsLoading ? (
                        <div className="flex justify-center py-10"><Spinner /></div>
                    ) : displayedEmails.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 px-6">
                            <span className="material-symbols-outlined text-5xl mb-3 text-slate-300">mark_email_unread</span>
                            <p className="font-medium text-slate-600 dark:text-slate-300">Carpeta vacía</p>
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
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mt-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-slate-400 text-xs">attach_file</span>
                                            <span className="text-[10px] text-slate-500">{msg.attachments.length} adjunto(s)</span>
                                        </div>
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

                            {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {selectedMessage.attachments.map((att) => (
                                        <button 
                                            key={att.id} 
                                            onClick={() => handleDownloadAttachment(att)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300"
                                        >
                                            <span className="material-symbols-outlined text-sm">attach_file</span>
                                            <span className="truncate max-w-[150px]">{att.name}</span>
                                            <span className="text-slate-400 text-[10px] ml-1">{(att.size / 1024).toFixed(0)}KB</span>
                                        </button>
                                    ))}
                                </div>
                            )}
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
                    
                    <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-700">
                         <button onClick={handleSaveDraft} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1">
                             <span className="material-symbols-outlined text-base">save</span> Guardar Borrador
                         </button>
                        <div className="flex gap-3">
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
                </div>
            </Drawer>
        </div>
    );
};

export default EmailsPage;
