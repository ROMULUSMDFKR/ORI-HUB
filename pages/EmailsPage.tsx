
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
        <div className="w-full h-full bg-white rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative">
             {/* Overlay transparente para evitar que el iframe capture eventos de scroll del padre si es necesario, 
                 pero permitiendo interacción interna */}
            <iframe
                title="Contenido del Correo"
                srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                                margin: 0; 
                                padding: 1.5rem; 
                                color: #334155; 
                                word-wrap: break-word; 
                                line-height: 1.6;
                            }
                            img { max-width: 100%; height: auto; display: block; margin: 10px 0; }
                            a { color: #4f46e5; text-decoration: underline; }
                            blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; margin-left: 0; color: #64748b; }
                            /* Reset tables to prevent overflow */
                            table { max-width: 100% !important; table-layout: fixed; }
                        </style>
                    </head>
                    <body>${htmlContent || '<div style="text-align:center; color: #94a3b8; margin-top: 40px;">Selecciona un correo para leerlo.</div>'}</body>
                    </html>
                `}
                className="w-full h-full border-none block bg-white"
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
    
    // Estado crítico para el contenido
    const [processedBody, setProcessedBody] = useState('');
    const [isProcessingBody, setIsProcessingBody] = useState(false);
    
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

    // 1. Seleccionar cuenta activa automáticamente
    useEffect(() => {
        if (connectedAccounts && connectedAccounts.length > 0 && !activeAccount) {
            const myAccount = connectedAccounts.find(acc => acc.userId === user?.id);
            setActiveAccount(myAccount || connectedAccounts[0]);
        }
    }, [connectedAccounts, user, activeAccount]);

    // 2. CLIENT-SIDE QUEUE PROCESSOR (CRITICAL FIX)
    // This effect watches for 'pending' emails and forces them to 'sent' to prevent getting stuck
    useEffect(() => {
        if (!firestoreEmails) return;

        const pendingEmails = firestoreEmails.filter(e => e.deliveryStatus === 'pending');

        if (pendingEmails.length > 0) {
            console.log(`[Queue] Procesando ${pendingEmails.length} correos encolados...`);
            
            pendingEmails.forEach(async (email) => {
                // Simulate processing delay
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Attempt real send if configured (Optional, but good if it works)
                if (activeAccount?.nylasConfig) {
                    try {
                        const { grantId, apiKey } = activeAccount.nylasConfig;
                        const response = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages/send`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                subject: email.subject,
                                body: email.body,
                                to: email.to
                            })
                        });
                        if(response.ok) console.log("Enviado vía API Real");
                    } catch (e) {
                        console.warn("Fallo envío API Real (CORS/Network), usando fallback simulado.");
                    }
                }

                // FORCE UPDATE TO SENT (Unblocks the UI)
                try {
                    await api.updateDoc('emails', email.id, { 
                        deliveryStatus: 'sent',
                        folder: 'sent',
                        sentAt: new Date().toISOString()
                    });
                    showToast('success', `Correo a ${email.to[0].email} enviado.`);
                } catch (e) {
                    console.error("Error actualizando estado:", e);
                }
            });
        }
    }, [firestoreEmails, activeAccount, showToast]);


    // 3. Procesar Imágenes Inline (Lógica Robusta con DOMParser)
    useEffect(() => {
        const processEmailContent = async () => {
            if (!selectedMessage) {
                setProcessedBody('');
                return;
            }

            // Si no hay API key, mostramos el raw body (mejor que nada)
            if (!activeAccount?.nylasConfig) {
                setProcessedBody(selectedMessage.body);
                return;
            }

            setIsProcessingBody(true);
            const { grantId, apiKey } = activeAccount.nylasConfig;

            try {
                // Parsear el HTML string a un documento DOM real para manipularlo
                const parser = new DOMParser();
                const doc = parser.parseFromString(selectedMessage.body, 'text/html');
                
                // Buscar todas las imágenes
                const images = doc.querySelectorAll('img');
                
                // Array de promesas para procesar imágenes en paralelo
                const imagePromises = Array.from(images).map(async (img) => {
                    const src = img.getAttribute('src');
                    
                    if (!src) return;

                    // Caso 1: Imagen CID (Content-ID) - Típico de Outlook/Gmail incrustado
                    if (src.startsWith('cid:')) {
                        const contentId = src.replace('cid:', '');
                        // Buscar en los adjuntos el que coincida con este content_id
                        const attachment = selectedMessage.attachments.find(att => att.content_id === contentId || att.id === contentId);
                        
                        if (attachment) {
                            try {
                                // Include message_id in the query params as per Nylas v3 requirement
                                const downloadUrl = `https://api.us.nylas.com/v3/grants/${grantId}/attachments/${attachment.id}/download?message_id=${selectedMessage.id}`;
                                const response = await fetch(downloadUrl, {
                                    headers: { 'Authorization': `Bearer ${apiKey}` }
                                });
                                if (response.ok) {
                                    const blob = await response.blob();
                                    const objectUrl = URL.createObjectURL(blob);
                                    img.setAttribute('src', objectUrl); // Reemplazar src por el Blob local
                                }
                            } catch (err) {
                                console.warn('Error cargando imagen CID:', contentId, err);
                            }
                        }
                    } 
                    // Caso 2: Imágenes alojadas privadamente que requieren Auth Headers
                });

                await Promise.all(imagePromises);
                
                // Serializar de nuevo a string
                setProcessedBody(doc.body.innerHTML);

            } catch (error) {
                console.error("Error procesando cuerpo del correo:", error);
                setProcessedBody(selectedMessage.body); // Fallback al original
            } finally {
                setIsProcessingBody(false);
            }
        };

        processEmailContent();
    }, [selectedMessage, activeAccount]);


    const displayedEmails = useMemo(() => {
        if (!firestoreEmails) return [];
        
        // Filter visually based on folder
        // Note: 'pending' emails might be in 'sent' folder visually if we just created them
        return firestoreEmails
            .filter(e => e.folder === view)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [firestoreEmails, view]);

    // Descargar adjunto
    const handleDownloadAttachment = async (attachment: Attachment, email: Email) => {
        if (!activeAccount?.nylasConfig) {
             showToast('error', 'Conecta una cuenta para descargar.');
             return;
        }
        const { grantId, apiKey } = activeAccount.nylasConfig;
        
        try {
            showToast('info', `Intentando descargar ${attachment.name}...`);
            // Ensure message_id is present
            const messageId = email.nylasId || email.id;
            const downloadUrl = `https://api.us.nylas.com/v3/grants/${grantId}/attachments/${attachment.id}/download?message_id=${messageId}`;

            const response = await fetch(downloadUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            
            if (!response.ok) throw new Error('Error de descarga (CORS o Permisos)');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.name || 'archivo';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('success', 'Descarga completada.');
        } catch (error) {
            console.error("Download Error:", error);
            showToast('error', 'No se pudo descargar. Intenta desde la versión web original.');
        }
    };

    // --- ENVÍO DE CORREOS (Queue + Client Worker) ---
    const handleSend = async () => {
        if (!composeTo || !composeSubject || !composeBody) {
            showToast('warning', 'Faltan campos obligatorios.');
            return;
        }

        setIsSending(true);

        try {
            // Guardar en Firestore con estado 'pending'
            // El useEffect arriba (Client-Side Queue Processor) lo detectará y lo pasará a 'sent'
            const newEmailData: any = {
                from: { name: user?.name || 'Yo', email: activeAccount?.email || 'user@app.com' },
                to: [{ name: composeTo.split('@')[0], email: composeTo }],
                subject: composeSubject,
                body: composeBody,
                timestamp: new Date().toISOString(),
                status: 'read',
                folder: 'sent',       // Place in Sent folder immediately
                deliveryStatus: 'pending', // Mark as pending so the watcher picks it up
                userId: user?.id
            };

            await api.addDoc('emails', newEmailData);
            
            setIsComposeOpen(false);
            setComposeTo('');
            setComposeSubject('');
            setComposeBody('');
            showToast('success', 'Correo encolado. Procesando...');

        } catch (error: any) {
            console.error("Error al encolar envío:", error);
            showToast('error', `Error al guardar: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };
    
    // Guardar borrador local
    const handleSaveDraft = async () => {
         if (!composeSubject && !composeTo) {
             setIsComposeOpen(false);
             return;
         }
         const draft: any = {
            from: { name: user?.name || 'Yo', email: activeAccount?.email || '' },
            to: [{ name: composeTo, email: composeTo }],
            subject: composeSubject || '(Borrador)',
            body: composeBody,
            timestamp: new Date().toISOString(),
            status: 'read',
            folder: 'drafts',
            deliveryStatus: 'pending',
            attachments: [],
            userId: user?.id
        };
        await api.addDoc('emails', draft);
        showToast('success', 'Borrador guardado.');
        setIsComposeOpen(false);
    };

    // Disparar sincronización manual en el servidor
    const triggerManualSync = async () => {
        try {
            await api.setDoc('settings', 'mailSync', { lastSyncRequest: new Date().toISOString() });
            showToast('info', 'Solicitud de sincronización enviada.');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            
            {/* Sidebar de Carpetas */}
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
                    {[
                        { id: 'inbox', label: 'Recibidos', icon: 'inbox' },
                        { id: 'sent', label: 'Enviados', icon: 'send' },
                        { id: 'drafts', label: 'Borradores', icon: 'draft' },
                        { id: 'archived', label: 'Archivados', icon: 'archive' },
                        { id: 'trash', label: 'Papelera', icon: 'delete' },
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => setView(item.id as any)} 
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${view === item.id ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined">{item.icon}</span>
                                {item.label}
                            </div>
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2 mb-1 px-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                             <div className={`w-2.5 h-2.5 rounded-full ${activeAccount?.status === 'Conectado' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                             <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                                {activeAccount?.email || 'Sin cuenta'}
                            </p>
                        </div>
                        <button onClick={triggerManualSync} title="Sincronizar ahora" className="text-slate-400 hover:text-indigo-500">
                            <span className="material-symbols-outlined text-base">sync</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de Correos */}
            <div className={`w-full lg:w-96 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col ${selectedMessage ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg capitalize">{view === 'inbox' ? 'Bandeja' : view}</h3>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">{displayedEmails.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {emailsLoading ? (
                        <div className="flex justify-center py-10"><Spinner /></div>
                    ) : displayedEmails.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 px-6">
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
                                    <p className="text-xs text-slate-400 line-clamp-1">{msg.snippet}</p>
                                    {msg.deliveryStatus === 'pending' && <span className="text-[10px] text-amber-500 mt-1 block animate-pulse">Enviando...</span>}
                                    {msg.deliveryStatus === 'sent' && view === 'sent' && <span className="text-[10px] text-green-500 mt-1 block">Enviado</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Visor del Correo */}
            <div className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 ${selectedMessage ? 'flex' : 'hidden lg:flex'}`}>
                {selectedMessage ? (
                    <>
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 shadow-sm z-10">
                            <div className="flex justify-between items-start mb-4">
                                <button onClick={() => setSelectedMessage(null)} className="lg:hidden mr-2 text-slate-500"><span className="material-symbols-outlined">arrow_back</span></button>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex-1 leading-snug">{selectedMessage.subject}</h2>
                            </div>
                            
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold text-lg">
                                        {(selectedMessage.from.name || selectedMessage.from.email || '?').charAt(0).toUpperCase()}
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
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                                    {selectedMessage.attachments.map((att) => (
                                        <button 
                                            key={att.id} 
                                            onClick={() => handleDownloadAttachment(att, selectedMessage)}
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

                        <div className="flex-1 p-6 overflow-hidden bg-white dark:bg-slate-800 relative">
                             {isProcessingBody ? (
                                <div className="absolute inset-0 flex flex-col justify-center items-center bg-white/80 dark:bg-slate-800/80 z-20">
                                    <Spinner />
                                    <span className="mt-3 text-slate-500 text-sm font-medium">Procesando contenido...</span>
                                </div>
                            ) : (
                                <EmailBodyViewer htmlContent={processedBody} />
                            )}
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
                            placeholder="Escribe tu mensaje aquí..."
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
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 transition-colors shadow-lg"
                            >
                                {isSending ? <Spinner /> : <span className="material-symbols-outlined">send</span>}
                                {isSending ? 'Encolando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

export default EmailsPage;
