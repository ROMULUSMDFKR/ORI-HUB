
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Email, Attachment, User, ConnectedEmailAccount } from '../types';
import Spinner from '../components/ui/Spinner';
import { emailFooterHtml } from '../components/emails/EmailFooter';
import CustomSelect from '../components/ui/CustomSelect';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';

type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'trash';
type ComposeMode = 'new' | 'reply' | 'forward';

const FOLDER_CONFIG: { id: EmailFolder; name: string; icon: string }[] = [
    { id: 'inbox', name: 'Recibidos', icon: 'inbox' },
    { id: 'sent', name: 'Enviados', icon: 'send' },
    { id: 'drafts', name: 'Borradores', icon: 'drafts' },
    { id: 'trash', name: 'Papelera', icon: 'delete' },
];

const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper seguro para mostrar remitente/destinatario independientemente del formato de Make
const getSafeContactName = (contact: any): string => {
    if (!contact) return 'Desconocido';
    if (typeof contact === 'string') return contact;
    return contact.name || contact.email || 'Desconocido';
};

const getSafeContactEmail = (contact: any): string => {
    if (!contact) return '';
    if (typeof contact === 'string') return contact;
    return contact.email || '';
};

// Componente para renderizar el email en un iframe aislado (Sandboxed)
const SafeEmailFrame: React.FC<{ htmlContent: string }> = ({ htmlContent }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                // Detectar si es texto plano (sin etiquetas HTML comunes) y convertir saltos de línea
                // Esto arregla correos de sistema o rebotes que vienen como texto plano
                let safeContent = htmlContent;
                if (!/<[a-z][\s\S]*>/i.test(htmlContent)) {
                    // Es texto plano, convertir \n a <br>
                    safeContent = htmlContent.replace(/\r\n/g, '<br/>').replace(/\n/g, '<br/>');
                }

                doc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #334155; word-wrap: break-word; font-size: 14px; line-height: 1.6; }
                            a { color: #4f46e5; }
                            img { max-width: 100%; height: auto; }
                            pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
                            /* Scrollbar styling for the iframe content */
                            ::-webkit-scrollbar { width: 8px; height: 8px; }
                            ::-webkit-scrollbar-track { background: transparent; }
                            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                            ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                        </style>
                        <base target="_blank">
                    </head>
                    <body>
                        ${safeContent}
                    </body>
                    </html>
                `);
                doc.close();
            }
        }
    }, [htmlContent]);

    return (
        <iframe 
            ref={iframeRef}
            title="Email Content"
            className="w-full h-full border-none bg-white"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" 
        />
    );
};

const EmailListItem: React.FC<{ email: Email; isSelected: boolean; onSelect: () => void }> = ({ email, isSelected, onSelect }) => {
    const isUnread = email.status === 'unread';
    
    const getDeliveryIcon = () => {
        if (email.folder !== 'sent') return null;
        if (email.deliveryStatus === 'pending') return <span className="material-symbols-outlined text-[14px] text-amber-500 ml-1" title="En cola de envío">schedule</span>;
        if (email.deliveryStatus === 'sent') return <span className="material-symbols-outlined text-[14px] text-green-500 ml-1" title="Enviado correctamente">check_circle</span>;
        if (email.deliveryStatus === 'error') return <span className="material-symbols-outlined text-[14px] text-red-500 ml-1" title="Error al enviar">error</span>;
        return null;
    };

    let displayContact = 'Desconocido';
    if (email.folder === 'sent') {
        if (Array.isArray(email.to) && email.to.length > 0) {
            displayContact = `Para: ${getSafeContactName(email.to[0])}`;
        } else {
             displayContact = `Para: ${getSafeContactName(email.to)}`;
        }
    } else {
        displayContact = getSafeContactName(email.from);
    }

    // Calcular snippet si no viene de Nylas
    const displaySnippet = email.snippet || (email.body ? email.body.replace(/<[^>]*>?/gm, '').substring(0, 100) : 'Sin contenido');

    return (
        <li 
            onClick={onSelect} 
            className={`p-4 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 pl-[12px]' : 'border-l-4 border-transparent pl-4'}`}
        >
            <div className="flex justify-between items-start">
                <p className={`text-sm font-semibold truncate pr-2 max-w-[70%] ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {displayContact}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                    {getDeliveryIcon()}
                    <p className={`text-xs ${isUnread ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'}`}>
                        {email.timestamp ? new Date(email.timestamp).toLocaleDateString(undefined, {day: 'numeric', month: 'short'}) : ''}
                    </p>
                </div>
            </div>
            <p className={`text-sm mt-0.5 truncate ${isUnread ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                {email.subject || '(Sin asunto)'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate pr-2">
                {displaySnippet}
            </p>
        </li>
    );
};

const stringToRecipients = (str: string): { name: string; email: string; }[] => {
    if (!str) return [];
    return str.split(/[,;]/).map(emailStr => {
        const email = emailStr.trim();
        if (!email) return null;
        return { name: email.split('@')[0], email };
    }).filter(Boolean) as { name: string; email: string; }[];
};

interface ComposeEmailModalProps {
    mode: ComposeMode;
    initialData: Partial<Email>;
    isOpen: boolean;
    onClose: () => void;
    onSend: (emailData: { to: string; cc?: string; bcc?: string; subject: string; body: string; attachments: File[] }) => void;
}

const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({ mode, initialData, isOpen, onClose, onSend }) => {
    const [to, setTo] = useState('');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [showCcBcc, setShowCcBcc] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const safeMap = (arr: any) => Array.isArray(arr) ? arr.map((r: any) => getSafeContactEmail(r)).join(', ') : '';
            
            setTo(safeMap(initialData.to));
            setCc(safeMap(initialData.cc));
            setBcc(safeMap(initialData.bcc));
            
            setSubject(initialData.subject || '');
            const newBody = initialData.body || '';
            setBody(newBody);
            if (bodyRef.current) {
                bodyRef.current.innerHTML = newBody;
            }
            setShowCcBcc(!!(initialData.cc || initialData.bcc));
            setAttachments([]); 
        }
    }, [isOpen, initialData]);
    
    const titleMap: Record<ComposeMode, string> = {
        'new': 'Redactar Correo',
        'reply': 'Responder',
        'forward': 'Reenviar',
    };

    const handleSend = () => {
        if (!to || !subject) {
            alert('El destinatario y el asunto son obligatorios.');
            return;
        }
        onSend({ to, cc, bcc, subject, body, attachments });
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };

    const handleRemoveAttachment = (fileName: string) => {
        setAttachments(prev => prev.filter(file => file.name !== fileName));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl m-4 w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{titleMap[mode]}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Cerrar">
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">close</span>
                    </button>
                </div>
                
                <div className="p-6 space-y-3 overflow-y-auto">
                    <div className="flex items-center">
                        <label className="w-16 text-sm font-medium text-slate-500 dark:text-slate-400">Para</label>
                        <div className="flex-1 flex items-center border border-slate-300 dark:border-slate-600 rounded-lg px-3 bg-white dark:bg-slate-900">
                            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="destinatario@ejemplo.com" className="flex-1 border-none ring-0 shadow-none p-2 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none" />
                            <button onClick={() => setShowCcBcc(!showCcBcc)} className="ml-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Cc/Cco</button>
                        </div>
                    </div>
                    {showCcBcc && (
                        <>
                            <div className="flex items-center">
                                <label className="w-16 text-sm font-medium text-slate-500 dark:text-slate-400">Cc</label>
                                <input type="email" value={cc} onChange={(e) => setCc(e.target.value)} className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
                            </div>
                             <div className="flex items-center">
                                <label className="w-16 text-sm font-medium text-slate-500 dark:text-slate-400">Cco</label>
                                <input type="email" value={bcc} onChange={(e) => setBcc(e.target.value)} className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
                            </div>
                        </>
                    )}
                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto" className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
                    <div
                        ref={bodyRef}
                        contentEditable
                        onInput={e => setBody(e.currentTarget.innerHTML)}
                        className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-lg overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />

                    {attachments.length > 0 && (
                        <div className="space-y-2 pt-2">
                             {attachments.map(file => (
                                <div key={file.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 flex-shrink-0">description</span>
                                        <div className="truncate">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveAttachment(file.name)} className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600">
                                        <span className="material-symbols-outlined !text-base">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-800 rounded-b-xl">
                    <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Adjuntar archivo">
                        <span className="material-symbols-outlined">attach_file</span>
                    </button>
                    <button onClick={handleSend} className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg shadow-lg hover:bg-indigo-700 flex items-center gap-2 transition-all transform hover:scale-105">
                        Enviar
                        <span className="material-symbols-outlined !text-lg">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};


const EmailsPage: React.FC = () => {
    const { data: allAccounts, loading: accountsLoading } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    const [nylasEmails, setNylasEmails] = useState<Email[]>([]);
    const [isNylasLoading, setIsNylasLoading] = useState(false);
    const [nylasError, setNylasError] = useState<string | null>(null);
    
    const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    
    const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
    const [composeInitialData, setComposeInitialData] = useState<Partial<Email>>({});
    
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    const { user: currentUser } = useAuth();
    const userSignature = (currentUser as any)?.signature || '';

    // Get user accounts
    const userAccounts = useMemo(() => {
        if (!allAccounts || !currentUser) return [];
        return allAccounts.filter(acc => acc.userId === currentUser.id);
    }, [allAccounts, currentUser]);

    // Select first account by default
    useEffect(() => {
        if (userAccounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(userAccounts[0].id);
        }
    }, [userAccounts, selectedAccountId]);

    // Fetch Emails from Nylas when account selected
    useEffect(() => {
        const fetchNylasEmails = async () => {
            const account = userAccounts.find(a => a.id === selectedAccountId);
            if (!account || account.provider !== 'nylas' || !account.nylasConfig) return;

            setIsNylasLoading(true);
            setNylasError(null);
            
            // Clean keys to ensure no spaces
            const grantId = account.nylasConfig.grantId.trim();
            const apiKey = account.nylasConfig.apiKey.trim();

            try {
                // Nylas API v3 Fetch
                const limit = 50;
                let query = `limit=${limit}`;
                
                // Nylas folder filtering logic
                // Note: Gmail uses labels (e.g., 'INBOX', 'SENT'), others use folders.
                // v3 often infers standard folders from 'in' param.
                if (selectedFolder === 'sent') query += '&in=sent';
                else if (selectedFolder === 'trash') query += '&in=trash';
                // Default or inbox
                // else query += '&in=inbox'; // Sometimes removing this helps see ALL, then filter client-side if needed. But try without first.
                
                // Fallback if 'in=' param is problematic: fetch all and filter client side if needed, but better to filter server side.
                // For 'inbox', usually no param or '&in=inbox' works.

                const response = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages?${query}`, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Nylas API Error Response:", errorData);
                    throw new Error(errorData.message || `Error ${response.status}: No se pudo conectar con Nylas`);
                }
                
                const data = await response.json();
                console.log("Nylas Data Received:", data); // Debugging
                
                // Map Nylas Message to App Email Interface
                const mappedEmails: Email[] = (data.data || []).map((msg: any) => ({
                    id: msg.id, // Nylas ID or Message-ID
                    subject: msg.subject,
                    body: msg.body, 
                    snippet: msg.snippet,
                    from: msg.from?.[0] || { name: 'Desconocido', email: '' },
                    to: msg.to || [],
                    cc: msg.cc || [],
                    bcc: msg.bcc || [],
                    // Nylas returns Unix Timestamp (seconds), convert to ms
                    timestamp: new Date(msg.date * 1000).toISOString(),
                    status: msg.unread ? 'unread' : 'read',
                    folder: selectedFolder, 
                    attachments: (msg.attachments || []).map((att: any) => ({
                        id: att.id,
                        name: att.filename || 'Adjunto',
                        size: att.size || 0,
                        url: '#' 
                    }))
                }));

                setNylasEmails(mappedEmails);
            } catch (error: any) {
                console.error("Nylas Logic Error:", error);
                setNylasError(error.message || 'Error al procesar correos');
                setNylasEmails([]);
            } finally {
                setIsNylasLoading(false);
            }
        };

        if (selectedAccountId) {
            fetchNylasEmails();
        }
    }, [selectedAccountId, selectedFolder, userAccounts]);

    // Helper to get current account object
    const currentAccount = useMemo(() => userAccounts.find(a => a.id === selectedAccountId), [userAccounts, selectedAccountId]);

    const filteredEmails = useMemo(() => {
        if (currentAccount?.provider === 'nylas') {
            return nylasEmails;
        }
        // Fallback for legacy Firestore emails (if any remain)
        return []; 
    }, [currentAccount, nylasEmails]);

    const selectedEmail = useMemo(() => {
        if (!selectedEmailId || !filteredEmails) return null;
        return filteredEmails.find(e => e.id === selectedEmailId);
    }, [selectedEmailId, filteredEmails]);

    const handleRefresh = () => {
        // Trigger re-fetch by toggling state slightly or reloading
        // In a real app, extract fetch logic to a useCallback and call it here.
        // For now, toggle folder to force refresh
        const current = selectedFolder;
        setSelectedFolder(prev => prev === 'inbox' ? 'sent' : 'inbox'); // Temp toggle
        setTimeout(() => setSelectedFolder(current), 50);
    };

    const handleOpenCompose = (mode: ComposeMode, baseEmail?: Email) => {
        const fullSignatureAndFooter = `${userSignature}<br /><br />${emailFooterHtml}`;
        let data: Partial<Email> = { body: `<br /><br />${fullSignatureAndFooter}` };

        if (mode === 'reply' && baseEmail) {
            data = {
                to: [baseEmail.from],
                subject: `Re: ${baseEmail.subject}`,
                body: `<br /><br />${fullSignatureAndFooter}<br /><br /><div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px;">---- Mensaje Original ----<br />De: ${getSafeContactName(baseEmail.from)} &lt;${getSafeContactEmail(baseEmail.from)}&gt;<br />Enviado: ${new Date(baseEmail.timestamp).toLocaleString('es-ES')}<br />Asunto: ${baseEmail.subject}<br /><br />${baseEmail.body}</div>`,
            };
        } else if (mode === 'forward' && baseEmail) {
            const toString = Array.isArray(baseEmail.to) ? baseEmail.to.map(t => getSafeContactEmail(t)).join(', ') : '';
            data = {
                to: [],
                subject: `Fwd: ${baseEmail.subject}`,
                body: `<br /><br />${fullSignatureAndFooter}<br /><br /><div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px;">---------- Mensaje reenviado ----------<br />De: ${getSafeContactName(baseEmail.from)} &lt;${getSafeContactEmail(baseEmail.from)}&gt;<br />Fecha: ${new Date(baseEmail.timestamp).toLocaleString('es-ES')}<br />Asunto: ${baseEmail.subject}<br />Para: ${toString}<br /><br />${baseEmail.body}</div>`,
            };
        }
        setComposeInitialData(data);
        setComposeMode(mode);
    };

    const handleCloseCompose = () => {
        setComposeMode(null);
        setComposeInitialData({});
    };

     const handleSendEmail = async (emailData: { to: string; cc?: string; bcc?: string; subject: string; body: string; attachments: File[] }) => {
        if (!currentAccount || !currentUser) return;

        try {
            if (currentAccount.provider === 'nylas' && currentAccount.nylasConfig) {
                 // Send via Nylas API
                 const grantId = currentAccount.nylasConfig.grantId.trim();
                 const apiKey = currentAccount.nylasConfig.apiKey.trim();
                 
                 const payload = {
                     subject: emailData.subject,
                     body: emailData.body,
                     to: stringToRecipients(emailData.to),
                     cc: stringToRecipients(emailData.cc || ''),
                     bcc: stringToRecipients(emailData.bcc || '')
                 };

                 const response = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages/send`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error('Failed to send via Nylas');
                
                alert("Correo enviado exitosamente vía Nylas.");
                handleCloseCompose();
                setSelectedFolder('sent');

            } else {
                // Fallback to Firestore logic (Legacy)
                const newEmail: Omit<Email, 'id'> = {
                    from: { name: currentUser.name, email: currentAccount.email },
                    to: stringToRecipients(emailData.to),
                    subject: emailData.subject,
                    body: emailData.body,
                    timestamp: new Date().toISOString(),
                    status: 'read',
                    folder: 'sent',
                    attachments: [],
                    deliveryStatus: 'pending'
                };
                await api.addDoc('emails', newEmail);
                alert("Correo en cola de envío.");
                handleCloseCompose();
            }

        } catch (error) {
            console.error("Error sending email:", error);
            alert("Error al enviar el correo.");
        }
    };

    const loading = accountsLoading;

    const renderContent = () => {
        if (loading) return <div className="flex-1 flex justify-center items-center"><Spinner /></div>;
        
        return (
            <>
                <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold capitalize text-slate-800 dark:text-slate-200">{FOLDER_CONFIG.find(f=>f.id === selectedFolder)?.name} ({filteredEmails.length})</h2>
                    </div>
                    
                    {nylasError ? (
                        <div className="p-4 m-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                            <span className="material-symbols-outlined text-2xl mb-1 block">error</span>
                            <p className="font-bold">Error de conexión</p>
                            <p>{nylasError}</p>
                            <p className="text-xs mt-2">Verifica tus credenciales en Configuración.</p>
                        </div>
                    ) : isNylasLoading ? (
                         <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Spinner />
                            <p className="text-sm mt-2">Sincronizando...</p>
                         </div>
                    ) : (
                        <ul className="overflow-y-auto flex-1">
                            {filteredEmails.map(email => (
                                <EmailListItem key={email.id} email={email} isSelected={selectedEmailId === email.id} onSelect={() => setSelectedEmailId(email.id)} />
                            ))}
                             {filteredEmails.length === 0 && (
                                <li className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                                    <p className="text-sm">Carpeta vacía</p>
                                </li>
                            )}
                        </ul>
                    )}
                </div>

                <div className="w-2/3 flex flex-col bg-white dark:bg-slate-800">
                    {selectedEmail ? (
                        <>
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 leading-tight">{selectedEmail.subject}</h3>
                                    {selectedEmail.deliveryStatus === 'pending' && (
                                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-xs">schedule</span> Enviando...
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-start mt-4 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center mr-3 text-slate-500 dark:text-slate-300 font-bold">
                                        {getSafeContactName(selectedEmail.from).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <p className="text-slate-900 dark:text-white font-semibold">{getSafeContactName(selectedEmail.from)} <span className="text-slate-500 dark:text-slate-400 font-normal">&lt;{getSafeContactEmail(selectedEmail.from)}&gt;</span></p>
                                            <p className="text-xs">{selectedEmail.timestamp ? new Date(selectedEmail.timestamp).toLocaleString() : ''}</p>
                                        </div>
                                        <p className="mt-1">Para: {Array.isArray(selectedEmail.to) ? selectedEmail.to.map(t => getSafeContactName(t) || getSafeContactEmail(t)).join(', ') : getSafeContactName(selectedEmail.to)}</p>
                                        {selectedEmail.cc && Array.isArray(selectedEmail.cc) && selectedEmail.cc.length > 0 && (
                                            <p>Cc: {selectedEmail.cc.map(t => getSafeContactName(t)).join(', ')}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-0 overflow-y-auto bg-white relative">
                                {/* Use Iframe for safe and accurate HTML rendering */}
                                <SafeEmailFrame htmlContent={selectedEmail.body} />
                            </div>
                            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3">Archivos Adjuntos ({selectedEmail.attachments.length})</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedEmail.attachments.map(att => ( 
                                            <a key={att.id} href={att.url} download={att.name} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors text-sm max-w-xs">
                                                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">attach_file</span>
                                                <div className="overflow-hidden">
                                                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{att.name}</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatBytes(att.size)}</p>
                                                </div>
                                                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 ml-auto">download</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center gap-3">
                                <button onClick={() => handleOpenCompose('reply', selectedEmail)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center transition-colors"><span className="material-symbols-outlined mr-2 text-base">reply</span>Responder</button>
                                <button onClick={() => handleOpenCompose('forward', selectedEmail)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center transition-colors"><span className="material-symbols-outlined mr-2 text-base">forward</span>Reenviar</button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                           <span className="material-symbols-outlined text-6xl mb-2 opacity-20">email</span>
                           <p>{filteredEmails.length > 0 ? 'Selecciona un correo para leerlo' : 'No hay correos en esta carpeta'}</p>
                        </div>
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-col relative overflow-hidden">
            <div className="flex flex-1 overflow-hidden relative">
                <div className="w-64 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                    <div className="p-4">
                        <button onClick={() => handleOpenCompose('new')} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-[1.02]">
                            <span className="material-symbols-outlined mr-2">edit</span>Redactar
                        </button>
                    </div>
                    
                    <div className="px-4 py-2 border-y border-slate-200 dark:border-slate-700 flex items-end gap-2 bg-white dark:bg-slate-800">
                        <div className="flex-1">
                            <CustomSelect
                                label="Cuenta"
                                options={userAccounts.map(acc => ({ value: acc.id, name: acc.email }))}
                                value={selectedAccountId || ''}
                                onChange={(val) => setSelectedAccountId(val)}
                                placeholder="Seleccionar..."
                                buttonClassName="w-full text-xs p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded"
                            />
                        </div>
                        <button 
                            onClick={handleRefresh}
                            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 mb-[2px] transition-colors"
                            title="Sincronizar correos ahora"
                        >
                            <span className="material-symbols-outlined text-base">sync</span>
                        </button>
                    </div>

                    <nav className="flex-1 px-3 py-4 space-y-1">
                        {FOLDER_CONFIG.map(folder => (
                            <button key={folder.id} onClick={() => setSelectedFolder(folder.id)} className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 ${selectedFolder === folder.id ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium'}`}>
                                <div className="flex items-center">
                                    <span className={`material-symbols-outlined w-6 h-6 mr-3 ${selectedFolder === folder.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{folder.icon}</span>
                                    <span>{folder.name}</span>
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>
                {renderContent()}
            </div>

            {composeMode && (
                <ComposeEmailModal 
                    mode={composeMode}
                    initialData={composeInitialData}
                    isOpen={composeMode !== null}
                    onClose={handleCloseCompose}
                    onSend={handleSendEmail}
                />
            )}
        </div>
    );
};

export default EmailsPage;
