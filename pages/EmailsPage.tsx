
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Email, Attachment, ConnectedEmailAccount } from '../types';
import Spinner from '../components/ui/Spinner';
import { emailFooterHtml } from '../components/emails/EmailFooter';
import CustomSelect from '../components/ui/CustomSelect';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';

type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'archived';
type ComposeMode = 'new' | 'reply' | 'forward';

const FOLDER_CONFIG: { id: EmailFolder; name: string; icon: string }[] = [
    { id: 'inbox', name: 'Recibidos', icon: 'inbox' },
    { id: 'sent', name: 'Enviados', icon: 'send' },
    { id: 'drafts', name: 'Borradores', icon: 'drafts' },
    { id: 'archived', name: 'Archivados', icon: 'archive' },
];

const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper seguro para mostrar remitente/destinatario independientemente del formato de Make/Nylas
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

// Attachment Preview Modal
const AttachmentModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    attachment: Attachment | null; 
}> = ({ isOpen, onClose, attachment }) => {
    if (!isOpen || !attachment) return null;

    const isImage = attachment.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-500">{isImage ? 'image' : 'description'}</span>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-md">{attachment.name}</h3>
                        <span className="text-xs text-slate-500">({formatBytes(attachment.size)})</span>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-black/50 min-h-[300px]">
                    {isImage ? (
                        <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-full object-contain rounded shadow-lg" />
                    ) : (
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">insert_drive_file</span>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">Este archivo no tiene vista previa disponible.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-white dark:bg-slate-800">
                    <a 
                        href={attachment.url} 
                        download={attachment.name} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">download</span> Descargar
                    </a>
                </div>
            </div>
        </div>
    );
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
                let safeContent = htmlContent;
                if (!/<[a-z][\s\S]*>/i.test(htmlContent)) {
                    safeContent = htmlContent.replace(/\r\n/g, '<br/>').replace(/\n/g, '<br/>');
                }

                // Inyectar estilos base para que se vea bien dentro del iframe
                doc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 16px; color: #334155; word-wrap: break-word; font-size: 15px; line-height: 1.6; }
                            a { color: #4f46e5; text-decoration: none; }
                            a:hover { text-decoration: underline; }
                            img { max-width: 100%; height: auto; border-radius: 4px; }
                            pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
                            blockquote { border-left: 3px solid #cbd5e1; padding-left: 12px; margin-left: 0; color: #64748b; }
                            /* Scrollbar styling */
                            ::-webkit-scrollbar { width: 6px; height: 6px; }
                            ::-webkit-scrollbar-track { background: transparent; }
                            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
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
            className="w-full h-full border-none bg-transparent"
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

    const displaySnippet = email.snippet || (email.body ? email.body.replace(/<[^>]*>?/gm, '').substring(0, 90) + '...' : 'Sin contenido');
    const initial = displayContact.replace('Para: ', '').charAt(0).toUpperCase();
    
    // Colors
    const bgColors = ['bg-blue-100', 'bg-emerald-100', 'bg-violet-100', 'bg-amber-100', 'bg-rose-100'];
    const textColors = ['text-blue-700', 'text-emerald-700', 'text-violet-700', 'text-amber-700', 'text-rose-700'];
    const colorIndex = initial.charCodeAt(0) % 5;

    return (
        <li 
            onClick={onSelect} 
            className={`group p-4 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-all relative ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
        >
            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-full"></div>}
            {isUnread && <div className="absolute right-4 top-4 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm"></div>}
            
            <div className="flex gap-4 items-start">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${bgColors[colorIndex]} ${textColors[colorIndex]}`}>
                    {initial}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <p className={`text-sm truncate pr-2 ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                            {displayContact}
                        </p>
                        <div className="flex items-center gap-1 shrink-0 opacity-70 text-xs">
                            {email.isStarred && <span className="material-symbols-outlined text-[14px] text-amber-400 mr-1" style={{fontVariationSettings: "'FILL' 1"}}>star</span>}
                            {getDeliveryIcon()}
                            <span className={`${isUnread ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'}`}>
                                {email.timestamp ? new Date(email.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''}
                            </span>
                        </div>
                    </div>
                    
                    <p className={`text-sm truncate mb-1 ${isUnread ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                        {email.subject || '(Sin asunto)'}
                    </p>
                    
                    <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                        {displaySnippet}
                    </p>

                    {email.attachments && email.attachments.length > 0 && (
                        <div className="mt-2 flex gap-1">
                             <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                <span className="material-symbols-outlined !text-[12px] mr-1">attach_file</span>
                                {email.attachments.length}
                             </span>
                        </div>
                    )}
                </div>
            </div>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all animate-zoom-in" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">edit_square</span>
                        {titleMap[mode]}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors" aria-label="Cerrar">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                {/* Form */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-1 focus-within:border-indigo-500 transition-colors">
                            <span className="text-sm font-semibold text-slate-500 w-12">Para</span>
                            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400" placeholder="destinatario@ejemplo.com" autoFocus />
                            <button onClick={() => setShowCcBcc(!showCcBcc)} className="text-xs text-slate-400 hover:text-indigo-600 font-medium px-2">Cc/Cco</button>
                        </div>

                        {showCcBcc && (
                            <>
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-1 focus-within:border-indigo-500 transition-colors">
                                    <span className="text-sm font-semibold text-slate-500 w-12">Cc</span>
                                    <input type="email" value={cc} onChange={(e) => setCc(e.target.value)} className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200" />
                                </div>
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-1 focus-within:border-indigo-500 transition-colors">
                                    <span className="text-sm font-semibold text-slate-500 w-12">Cco</span>
                                    <input type="email" value={bcc} onChange={(e) => setBcc(e.target.value)} className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200" />
                                </div>
                            </>
                        )}

                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-1 focus-within:border-indigo-500 transition-colors">
                             <span className="text-sm font-semibold text-slate-500 w-12">Asunto</span>
                             <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200 font-medium" placeholder="Escribe el asunto..." />
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                        {/* Simple Toolbar Mock */}
                        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-2 flex gap-2 text-slate-500">
                            <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-all"><span className="material-symbols-outlined text-lg">format_bold</span></button>
                            <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-all"><span className="material-symbols-outlined text-lg">format_italic</span></button>
                            <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-all"><span className="material-symbols-outlined text-lg">format_list_bulleted</span></button>
                            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-all text-indigo-600"><span className="material-symbols-outlined text-lg">attach_file</span></button>
                        </div>
                        <div
                            ref={bodyRef}
                            contentEditable
                            onInput={e => setBody(e.currentTarget.innerHTML)}
                            className="flex-1 p-4 overflow-y-auto focus:outline-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
                            style={{ minHeight: '200px' }}
                        />
                    </div>

                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                             {attachments.map(file => (
                                <div key={file.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium shadow-sm">
                                    <span className="material-symbols-outlined text-base">description</span>
                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                    <span className="opacity-70">({formatBytes(file.size)})</span>
                                    <button onClick={() => handleRemoveAttachment(file.name)} className="ml-1 hover:text-red-500 transition-colors">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium text-sm px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Descartar
                    </button>
                    <button onClick={handleSend} className="bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 flex items-center gap-2 transition-all transform hover:scale-[1.02] hover:shadow-xl">
                        <span>Enviar</span>
                        <span className="material-symbols-outlined text-lg">send</span>
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
    const [searchQuery, setSearchQuery] = useState('');
    
    const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
    const [composeInitialData, setComposeInitialData] = useState<Partial<Email>>({});
    
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    // Attachment Modal State
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

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
                const limit = 50;
                let query = `limit=${limit}`;
                
                if (selectedFolder === 'sent') query += '&in=sent';
                else if (selectedFolder === 'archived') query += '&in=archive'; // Or whatever 'All Mail' equivalent
                // For 'inbox', default behavior usually works best or '&in=inbox'

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
                
                // Map Nylas Message to App Email Interface
                const mappedEmails: Email[] = (data.data || []).map((msg: any) => ({
                    id: msg.id,
                    subject: msg.subject,
                    body: msg.body, 
                    snippet: msg.snippet,
                    from: msg.from?.[0] || { name: 'Desconocido', email: '' },
                    to: msg.to || [],
                    cc: msg.cc || [],
                    bcc: msg.bcc || [],
                    timestamp: new Date(msg.date * 1000).toISOString(),
                    status: msg.unread ? 'unread' : 'read',
                    folder: selectedFolder, 
                    attachments: (msg.attachments || []).map((att: any) => ({
                        id: att.id,
                        name: att.filename || 'Adjunto',
                        size: att.size || 0,
                        url: '#' 
                    })),
                    isStarred: msg.starred || false
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

    const currentAccount = useMemo(() => userAccounts.find(a => a.id === selectedAccountId), [userAccounts, selectedAccountId]);

    const filteredEmails = useMemo(() => {
        let emails: Email[] = [];
        if (currentAccount?.provider === 'nylas') {
            emails = nylasEmails;
        }
        
        // Apply folder logic for non-API local filtering simulation if needed, 
        // but currently API does it.
        
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            return emails.filter(e => 
                (e.subject || '').toLowerCase().includes(lowerQuery) || 
                (getSafeContactName(e.from) || '').toLowerCase().includes(lowerQuery) ||
                (e.snippet || '').toLowerCase().includes(lowerQuery)
            );
        }
        
        return emails;
    }, [currentAccount, nylasEmails, searchQuery]);

    const selectedEmail = useMemo(() => {
        if (!selectedEmailId || !filteredEmails) return null;
        return filteredEmails.find(e => e.id === selectedEmailId);
    }, [selectedEmailId, filteredEmails]);

    const handleRefresh = () => {
        const current = selectedFolder;
        setSelectedFolder(prev => prev === 'inbox' ? 'sent' : 'inbox');
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

    const handleToggleStar = async (emailId: string, currentStarred: boolean) => {
        // Optimistic Update
        setNylasEmails(prev => prev.map(e => e.id === emailId ? { ...e, isStarred: !currentStarred } : e));
        // Note: Real implementation requires Nylas PUT to update message labels or metadata
        // For this mock/hybrid, we just update local state visualization
    };

    const handleArchiveEmail = async (emailId: string) => {
         // Optimistic Update: Remove from current view (unless view is archived)
         if (selectedFolder !== 'archived') {
             setNylasEmails(prev => prev.filter(e => e.id !== emailId));
         }
         if (selectedEmailId === emailId) setSelectedEmailId(null);

         // Note: Real implementation requires Nylas PUT to update folders/labels
         alert("Correo archivado (simulación).");
    };

     const handleSendEmail = async (emailData: { to: string; cc?: string; bcc?: string; subject: string; body: string; attachments: File[] }) => {
        if (!currentAccount || !currentUser) return;

        try {
            if (currentAccount.provider === 'nylas' && currentAccount.nylasConfig) {
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

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex-col relative overflow-hidden">
            <div className="flex flex-1 overflow-hidden relative">
                
                {/* LEFT SIDEBAR: Folders & List */}
                <div className="w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                    
                    {/* Account & Compose Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <div className="mb-4">
                            <CustomSelect
                                options={userAccounts.map(acc => ({ value: acc.id, name: acc.email }))}
                                value={selectedAccountId || ''}
                                onChange={(val) => setSelectedAccountId(val)}
                                placeholder="Seleccionar cuenta..."
                                buttonClassName="w-full text-sm py-2 px-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200"
                            />
                        </div>
                        <button 
                            onClick={() => handleOpenCompose('new')} 
                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-all transform hover:scale-[1.02]"
                        >
                            <span className="material-symbols-outlined mr-2">edit</span>Redactar
                        </button>
                    </div>

                    {/* Folder Tabs - Redesigned as Pills */}
                    <div className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex overflow-x-auto space-x-2 custom-scrollbar">
                        {FOLDER_CONFIG.map(folder => (
                            <button 
                                key={folder.id} 
                                onClick={() => setSelectedFolder(folder.id)}
                                className={`flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap border ${selectedFolder === folder.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                            >
                                <span className="material-symbols-outlined text-base mr-1.5">{folder.icon}</span>
                                {folder.name}
                            </button>
                        ))}
                         <button onClick={handleRefresh} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 ml-auto" title="Sincronizar">
                            <span className="material-symbols-outlined text-lg">sync</span>
                        </button>
                    </div>
                    
                    {/* Search - Redesigned */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">search</span>
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar correos..."
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                            />
                        </div>
                    </div>
                    
                    {/* Email List */}
                    <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
                        {loading ? (
                            <div className="flex justify-center py-8"><Spinner /></div>
                        ) : nylasError ? (
                            <div className="p-6 text-center">
                                <div className="inline-flex p-3 rounded-full bg-red-50 text-red-500 mb-3"><span className="material-symbols-outlined text-2xl">cloud_off</span></div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Error de conexión</p>
                                <p className="text-xs text-slate-500 mt-1 mb-3">{nylasError}</p>
                                <Link to="/settings/email-accounts" className="text-xs text-indigo-600 hover:underline">Revisar configuración</Link>
                            </div>
                        ) : isNylasLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-slate-400">
                                <Spinner />
                                <p className="text-sm">Sincronizando...</p>
                            </div>
                        ) : filteredEmails.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                                <span className="material-symbols-outlined text-5xl mb-3 opacity-20">inbox</span>
                                <p className="text-sm font-medium">Carpeta vacía</p>
                            </div>
                        ) : (
                            <ul>
                                {filteredEmails.map(email => (
                                    <EmailListItem key={email.id} email={email} isSelected={selectedEmailId === email.id} onSelect={() => setSelectedEmailId(email.id)} />
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* RIGHT CONTENT: Email Detail */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 min-w-0">
                    {selectedEmail ? (
                        <>
                            {/* Email Header */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                                <div className="flex justify-between items-start gap-4 mb-4">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                                        <button 
                                            onClick={() => handleToggleStar(selectedEmail.id, !!selectedEmail.isStarred)}
                                            className={`p-1 rounded-full transition-colors ${selectedEmail.isStarred ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                                            title={selectedEmail.isStarred ? "Quitar destacado" : "Marcar como destacado"}
                                        >
                                            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: `'FILL' ${selectedEmail.isStarred ? 1 : 0}`}}>star</span>
                                        </button>
                                        {selectedEmail.subject || '(Sin asunto)'}
                                    </h2>
                                    <div className="flex gap-2 shrink-0">
                                        {selectedEmail.deliveryStatus === 'pending' && (
                                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-xs">schedule</span> Enviando...
                                            </span>
                                        )}
                                        <div className="flex gap-1">
                                             <button onClick={() => handleOpenCompose('reply', selectedEmail)} className="bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 hover:text-indigo-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-lg">reply</span> Responder
                                            </button>
                                            <button onClick={() => handleOpenCompose('forward', selectedEmail)} className="bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 hover:text-indigo-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-lg">forward</span> Reenviar
                                            </button>
                                            <button onClick={() => handleArchiveEmail(selectedEmail.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Archivar">
                                                <span className="material-symbols-outlined">archive</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md ring-4 ring-indigo-50 dark:ring-slate-700">
                                        {getSafeContactName(selectedEmail.from).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <p className="font-bold text-slate-900 dark:text-white truncate text-lg">
                                                {getSafeContactName(selectedEmail.from)} 
                                            </p>
                                            <p className="text-xs text-slate-500 whitespace-nowrap bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                                                {selectedEmail.timestamp ? new Date(selectedEmail.timestamp).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }) : ''}
                                            </p>
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex flex-col sm:flex-row sm:items-center gap-1">
                                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">&lt;{getSafeContactEmail(selectedEmail.from)}&gt;</span>
                                            <span className="hidden sm:inline text-slate-300">•</span>
                                            <span className="truncate">
                                                Para: {Array.isArray(selectedEmail.to) ? selectedEmail.to.map(t => getSafeContactName(t)).join(', ') : getSafeContactName(selectedEmail.to)}
                                            </span>
                                            {selectedEmail.cc && Array.isArray(selectedEmail.cc) && selectedEmail.cc.length > 0 && (
                                                <span className="truncate text-xs ml-1 text-slate-400">Cc: {selectedEmail.cc.map(t => getSafeContactName(t)).join(', ')}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Email Body */}
                            <div className="flex-1 p-0 overflow-y-auto relative bg-slate-50/30 dark:bg-slate-900/30">
                                <SafeEmailFrame htmlContent={selectedEmail.body} />
                            </div>

                            {/* Attachments Footer */}
                            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">attachment</span>
                                        Adjuntos ({selectedEmail.attachments.length})
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {selectedEmail.attachments.map(att => ( 
                                            <div 
                                                key={att.id} 
                                                onClick={() => setPreviewAttachment(att)}
                                                className="flex flex-col p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-sm group text-center cursor-pointer"
                                            >
                                                <div className="h-10 flex items-center justify-center text-indigo-500 mb-2">
                                                     <span className="material-symbols-outlined text-3xl">
                                                        {att.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? 'image' : 'description'}
                                                     </span>
                                                </div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200 truncate text-xs w-full" title={att.name}>{att.name}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{formatBytes(att.size)}</p>
                                                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600 w-full flex justify-center">
                                                     <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500 text-sm">visibility</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Quick Reply Bar - Enhanced */}
                            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                <div 
                                    onClick={() => handleOpenCompose('reply', selectedEmail)}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 cursor-text hover:border-indigo-400 hover:shadow-md transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                         <span className="material-symbols-outlined text-lg">reply</span>
                                    </div>
                                    <div className="flex-1">
                                         <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-medium">Haz clic aquí para responder a {getSafeContactName(selectedEmail.from)}...</span>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-indigo-400">send</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/20">
                           <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-inner">
                               <span className="material-symbols-outlined text-6xl opacity-50">mail_outline</span>
                           </div>
                           <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 mb-2">Bandeja de Entrada</h3>
                           <p className="text-sm text-slate-400">Selecciona un correo de la lista para leerlo.</p>
                        </div>
                    )}
                </div>
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

            <AttachmentModal 
                isOpen={!!previewAttachment} 
                onClose={() => setPreviewAttachment(null)} 
                attachment={previewAttachment} 
            />
        </div>
    );
};

export default EmailsPage;
