
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Email, Attachment, ConnectedEmailAccount, SignatureTemplate } from '../types';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'archived' | 'trash';
type ComposeMode = 'new' | 'reply' | 'forward';

const BUSINESS_TAGS: Record<string, string> = {
    'Cotización': 'bg-blue-100 text-blue-700 border-blue-200',
    'Factura': 'bg-green-100 text-green-700 border-green-200',
    'Logística': 'bg-orange-100 text-orange-700 border-orange-200',
    'Urgente': 'bg-red-100 text-red-700 border-red-200',
    'Soporte': 'bg-purple-100 text-purple-700 border-purple-200',
    'Ventas': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

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

const stringToRecipients = (str: string): { name: string; email: string; }[] => {
    if (!str) return [];
    return str.split(/[,;]/).map(emailStr => {
        const clean = emailStr.trim();
        if (!clean) return null;
        const match = clean.match(/<([^>]+)>/);
        const email = match ? match[1] : clean;
        const name = match ? clean.replace(match[0], '').trim() : email.split('@')[0];
        return { name, email };
    }).filter(Boolean) as { name: string; email: string; }[];
};

const formatDateSmart = (isoDate: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (isThisYear) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// --- Contact Pill Component ---
const ContactPill: React.FC<{ 
    contact: { name: string, email: string } | any, 
    prefix?: string,
    onCompose?: (email: string) => void 
}> = ({ contact, prefix, onCompose }) => {
    const { showToast } = useToast();
    const [showTooltip, setShowTooltip] = useState(false);
    
    const name = getSafeContactName(contact);
    const email = getSafeContactEmail(contact);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(email);
        showToast('success', 'Correo copiado al portapapeles');
        setShowTooltip(false);
    };

    const handleComposeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onCompose) onCompose(email);
        setShowTooltip(false);
    };

    return (
        <div 
            className="relative inline-block"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                {prefix && <span className="text-slate-400 dark:text-slate-500 font-normal text-xs mr-0.5">{prefix}</span>}
                <span className="truncate max-w-[200px]">{name}</span>
            </div>

            {showTooltip && (
                <div className="absolute z-50 bottom-full left-0 mb-2 w-max bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg py-2 px-3 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <span className="font-mono">{email}</span>
                        <div className="h-4 w-px bg-slate-600"></div>
                        <button 
                            onClick={handleCopy}
                            className="hover:text-indigo-300 transition-colors p-1 rounded hover:bg-white/10"
                            title="Copiar dirección"
                        >
                            <span className="material-symbols-outlined !text-sm">content_copy</span>
                        </button>
                        {onCompose && (
                            <button 
                                onClick={handleComposeClick}
                                className="hover:text-indigo-300 transition-colors p-1 rounded hover:bg-white/10"
                                title="Escribir correo"
                            >
                                <span className="material-symbols-outlined !text-sm">edit_square</span>
                            </button>
                        )}
                    </div>
                    <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                </div>
            )}
        </div>
    );
};

const EmailListItem: React.FC<{ 
    email: Email; 
    isSelected: boolean; 
    currentAccountEmail?: string;
    onSelect: () => void; 
    onToggleStar: (e: React.MouseEvent) => void; 
    onArchive: (e: React.MouseEvent) => void; 
    onDeleteTag: (tag: string, e: React.MouseEvent) => void;
    onCompose: (email: string) => void;
}> = ({ email, isSelected, currentAccountEmail, onSelect, onToggleStar, onArchive, onDeleteTag, onCompose }) => {
    const isUnread = email.status === 'unread';
    const displaySnippet = email.snippet || (email.body ? email.body.replace(/<[^>]*>?/gm, '').substring(0, 90) + '...' : '');

    // Improved Outgoing Check Logic: Use Folder as primary truth
    let isOutgoing = email.folder === 'sent';
    
    // Fallback check if folder isn't explicitly 'sent' (e.g. legacy data)
    if (!isOutgoing && currentAccountEmail) {
         const senderEmail = getSafeContactEmail(email.from).trim().toLowerCase();
         const myEmail = currentAccountEmail.trim().toLowerCase();
         isOutgoing = senderEmail === myEmail;
    }
    
    // If outgoing, show who it was sent TO. If incoming, show who it was FROM.
    const displayContact = isOutgoing 
        ? (email.to && email.to.length > 0 ? email.to[0] : { name: 'Sin destinatario', email: '' }) 
        : email.from;
        
    const prefix = isOutgoing ? 'Para: ' : '';

    return (
        <div 
            onClick={onSelect} 
            className={`group flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 relative ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500 pl-3' : 'border-l-4 border-l-transparent pl-3'} ${isUnread ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/30 dark:bg-slate-900/30'}`}
        >
             <div className="flex flex-col items-center gap-3 pt-1">
                <button 
                    onClick={onToggleStar} 
                    className={`transition-colors p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 ${email.isStarred ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'}`}
                    title={email.isStarred ? "Quitar destacado" : "Destacar"}
                >
                    <span className="material-symbols-outlined text-xl" style={{fontVariationSettings: `'FILL' ${email.isStarred ? 1 : 0}`}}>star</span>
                </button>
             </div>
             
             <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-center mb-1">
                     <div className="max-w-[70%]">
                        <ContactPill contact={displayContact} prefix={prefix} onCompose={onCompose} />
                     </div>
                     <span className={`text-xs whitespace-nowrap ${isUnread ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                         {formatDateSmart(email.timestamp)}
                     </span>
                 </div>
                 
                 <p className={`text-xs truncate mb-1.5 ${isUnread ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                     {email.subject || '(Sin asunto)'}
                 </p>
                 <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                     {displaySnippet}
                 </p>

                 <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    {email.attachments && email.attachments.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500 font-medium">
                            <span className="material-symbols-outlined !text-[12px] mr-1">attach_file</span> {email.attachments.length}
                        </span>
                    )}
                    {email.tags && email.tags.map(tag => (
                        <span key={tag} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${BUSINESS_TAGS[tag] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {tag}
                            <button 
                                onClick={(e) => onDeleteTag(tag, e)}
                                className="hover:text-red-600 flex items-center"
                                title="Eliminar etiqueta"
                            >
                                <span className="material-symbols-outlined !text-[10px]">close</span>
                            </button>
                        </span>
                    ))}
                 </div>
             </div>

             <div className="absolute right-2 bottom-2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-600 rounded-lg p-1 z-10">
                 <button onClick={onArchive} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" title="Archivar">
                     <span className="material-symbols-outlined text-lg">archive</span>
                 </button>
             </div>
        </div>
    );
};

const EmailAttachmentTile: React.FC<{ 
    attachment: Attachment; 
    nylasConfig?: { grantId: string; apiKey: string };
}> = ({ attachment, nylasConfig }) => {
    // State to hold the blob URL
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const isImage = attachment.name.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i);
    
    // Clean up blob URL on unmount
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    const fetchAttachment = useCallback(async () => {
        if (!nylasConfig || !nylasConfig.grantId || !nylasConfig.apiKey) {
            setStatus('error');
            return;
        }

        setStatus('loading');
        
        try {
            const { grantId, apiKey } = nylasConfig;
            const queryParams = attachment.messageId ? `?message_id=${attachment.messageId}` : '';
            const cleanGrant = grantId.trim();
            const cleanKey = apiKey.trim();

            const response = await fetch(`https://api.us.nylas.com/v3/grants/${cleanGrant}/attachments/${attachment.id}/download${queryParams}`, {
                headers: { 'Authorization': `Bearer ${cleanKey}` }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const newUrl = URL.createObjectURL(blob);
            setBlobUrl(newUrl);
            setStatus('success');
            return newUrl;
        } catch (err) {
            console.error("Download failed:", err);
            setStatus('error');
            return null;
        }
    }, [attachment.id, attachment.messageId, nylasConfig]);

    // Auto-fetch ONLY for images when config is available and we haven't fetched yet
    useEffect(() => {
        if (isImage && status === 'idle' && nylasConfig) {
            fetchAttachment();
        }
    }, [isImage, status, nylasConfig, fetchAttachment]);

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!nylasConfig) {
            alert("Falta configuración de la cuenta de correo.");
            return;
        }

        let downloadUrl = blobUrl;
        if (!downloadUrl) {
            downloadUrl = await fetchAttachment();
        }
        
        if (downloadUrl) {
             const a = document.createElement('a');
             a.href = downloadUrl;
             a.download = attachment.name;
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
        }
    };
    
    // Retry handler
    const handleRetry = (e: React.MouseEvent) => {
        e.stopPropagation();
        fetchAttachment();
    };

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 max-w-sm shadow-sm hover:shadow-md transition-all relative group">
            {isImage ? (
                <div className="relative bg-slate-200 dark:bg-slate-800 min-h-[150px] flex items-center justify-center group">
                    {status === 'success' && blobUrl ? (
                        <img src={blobUrl} alt={attachment.name} className="w-full h-auto object-contain max-h-[400px]" />
                    ) : status === 'loading' ? (
                        <div className="flex flex-col items-center text-slate-400 gap-2 p-4">
                            <Spinner />
                            <span className="text-xs">Cargando...</span>
                        </div>
                    ) : status === 'error' ? (
                         <div className="flex flex-col items-center text-slate-400 gap-2 p-4 text-center">
                            <span className="material-symbols-outlined text-red-400">broken_image</span>
                            <span className="text-xs text-red-400">Error al cargar</span>
                            <button onClick={handleRetry} className="text-xs underline mt-1 hover:text-indigo-500 cursor-pointer bg-white/50 px-2 py-1 rounded">Reintentar</button>
                        </div>
                    ) : (
                        /* Idle / No Config */
                        <div className="flex flex-col items-center text-slate-400 gap-2 p-4 text-center">
                             <span className="material-symbols-outlined text-3xl opacity-30">image</span>
                             {!nylasConfig ? <span className="text-xs opacity-50 text-amber-500">Sin Credenciales</span> : <span className="text-xs opacity-50">Esperando...</span>}
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 text-slate-500">
                         <span className="material-symbols-outlined">description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={attachment.name}>{attachment.name}</p>
                        <p className="text-xs text-slate-500">{formatBytes(attachment.size)}</p>
                        {status === 'error' && <p className="text-xs text-red-500 mt-1">Error al descargar</p>}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2 flex justify-between items-center">
                {!isImage && <span className="text-xs text-slate-400 ml-2 truncate max-w-[150px]">{attachment.name}</span>}
                {isImage && <span className="text-xs text-slate-400 ml-2">{formatBytes(attachment.size)}</span>}
                
                <button 
                    onClick={handleDownload} 
                    className={`p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ${!nylasConfig ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!nylasConfig ? "Configuración faltante" : "Descargar"}
                    disabled={!nylasConfig || status === 'loading'}
                >
                    <span className="material-symbols-outlined text-lg">download</span>
                </button>
            </div>
        </div>
    );
};

const SafeEmailFrame: React.FC<{ htmlContent: string; showImages: boolean }> = ({ htmlContent, showImages }) => {
    const [frameHeight, setFrameHeight] = useState('100px');
    
    const processedHtml = useMemo(() => {
        let content = htmlContent || '';
        
        if (!showImages) {
            content = content.replace(/<img([^>]*?)src=["']([^"']*)["']([^>]*?)>/gi, (match, p1, src, p2) => {
                return `<img ${p1} data-src-blocked="${src}" src="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3e" style="opacity: 0.5; max-width: 100%; height: auto; border: 1px dashed #cbd5e1;" ${p2}>`;
            });
            content = content.replace(/background-image:/gi, 'x-background-image:');
            content = content.replace(/background:/gi, 'x-background:');
        }

        if (!content.includes('<base target="_blank">')) {
             content = `<base target="_blank">${content}`;
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        font-family: system-ui, -apple-system, sans-serif; 
                        margin: 0; 
                        padding: 0; 
                        word-wrap: break-word; 
                        color: #0f172a;
                    }
                    img { max-width: 100%; height: auto; }
                    a { color: #4f46e5; }
                    blockquote { border-left: 3px solid #cbd5e1; padding-left: 12px; margin-left: 0; color: #64748b; }
                    p { margin-bottom: 1em; }
                    @media (prefers-color-scheme: dark) {
                        body { color: #f8fafc; }
                        blockquote { border-left-color: #475569; color: #94a3b8; }
                    }
                </style>
            </head>
            <body>
                ${content}
                <div id="end-of-content"></div>
                <script>
                    const ro = new ResizeObserver(() => {
                        const height = document.body.scrollHeight;
                        window.parent.postMessage({ type: 'email-frame-resize', height: height }, '*');
                    });
                    ro.observe(document.body);
                </script>
            </body>
            </html>
        `;
    }, [htmlContent, showImages]);

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data && e.data.type === 'email-frame-resize' && typeof e.data.height === 'number') {
                setFrameHeight(`${e.data.height + 20}px`);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    return (
        <iframe 
            srcDoc={processedHtml} 
            title="Email Content" 
            style={{ width: '100%', height: frameHeight, border: 'none', overflow: 'hidden' }} 
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-scripts"
        />
    );
};

const RichTextToolbar: React.FC<{ onCommand: (cmd: string, val?: string) => void }> = ({ onCommand }) => {
    return (
        <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
            <button onClick={() => onCommand('bold')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Negrita"><span className="material-symbols-outlined text-lg">format_bold</span></button>
            <button onClick={() => onCommand('italic')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Cursiva"><span className="material-symbols-outlined text-lg">format_italic</span></button>
            <button onClick={() => onCommand('underline')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Subrayado"><span className="material-symbols-outlined text-lg">format_underlined</span></button>
        </div>
    );
};

interface ComposeEmailModalProps {
    mode: ComposeMode;
    initialData: Partial<Email>;
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: any) => Promise<void>;
    defaultSignature?: string;
}

const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({ mode, initialData, isOpen, onClose, onSend, defaultSignature }) => {
    const [to, setTo] = useState('');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [showCc, setShowCc] = useState(false);
    const [useSignature, setUseSignature] = useState(true);
    const [isSending, setIsSending] = useState(false);
    
    const [attachments, setAttachments] = useState<File[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (typeof initialData.to === 'string') {
                setTo(initialData.to);
            } else {
                setTo(Array.isArray(initialData.to) ? initialData.to.map((r:any) => getSafeContactEmail(r)).join(', ') : '');
            }
            
            setSubject(initialData.subject || '');
            let initialBody = '';
            if (mode === 'reply' || mode === 'forward') {
                initialBody = `<br><br><div class="gmail_quote">${initialData.body || ''}</div>`;
            } else {
                initialBody = initialData.body || '';
            }
            setBody(initialBody);
            if(bodyRef.current) bodyRef.current.innerHTML = initialBody;
            setAttachments([]);
        }
    }, [isOpen, initialData, mode]);
    
    const handleExecCommand = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
    };

    const handleSend = async () => {
        if (!to) return alert('Por favor, especifica al menos un destinatario.');
        
        setIsSending(true);
        try {
            let finalBody = bodyRef.current?.innerHTML || '';
            if (useSignature && defaultSignature) {
                finalBody += `<br><div class="signature-block">${defaultSignature}</div>`;
            }
            
            await onSend({ to, cc, bcc, subject, body: finalBody, attachments });
        } catch (e) {
            console.error("Send failed in modal", e);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-[90vh] animate-slide-in-up overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">{mode === 'new' ? 'edit_square' : (mode === 'reply' ? 'reply' : 'forward')}</span>
                        {mode === 'new' ? 'Nuevo Mensaje' : mode === 'reply' ? 'Responder' : 'Reenviar'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><span className="material-symbols-outlined text-slate-500">close</span></button>
                </div>
                <div className="p-6 space-y-4 bg-white dark:bg-slate-800 flex-shrink-0 overflow-y-auto">
                    <div className="grid gap-4">
                        <div className="relative group">
                             <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Destinatarios</label>
                             <div className="flex items-center border-b border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 transition-colors pb-1">
                                <input 
                                    className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none py-1" 
                                    placeholder="Para: (ej. cliente@empresa.com)" 
                                    value={to} 
                                    onChange={e => setTo(e.target.value)} 
                                    autoFocus
                                />
                                <button onClick={() => setShowCc(!showCc)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium ml-2">CC/BCC</button>
                            </div>
                        </div>
                        {showCc && (
                            <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                <div className="border-b border-slate-200 dark:border-slate-700 pb-1">
                                    <input className="w-full bg-transparent text-sm outline-none text-slate-800 dark:text-white" placeholder="CC:" value={cc} onChange={e => setCc(e.target.value)} />
                                </div>
                                <div className="border-b border-slate-200 dark:border-slate-700 pb-1">
                                    <input className="w-full bg-transparent text-sm outline-none text-slate-800 dark:text-white" placeholder="BCC:" value={bcc} onChange={e => setBcc(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Asunto</label>
                            <input 
                                className="w-full text-lg font-semibold bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none py-1 text-slate-800 dark:text-white transition-colors placeholder-slate-300" 
                                placeholder="Escribe el asunto aquí..." 
                                value={subject} 
                                onChange={e => setSubject(e.target.value)} 
                            />
                        </div>
                    </div>
                    <div className="flex flex-col border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden min-h-[300px]">
                         <RichTextToolbar onCommand={handleExecCommand} />
                        <div className="flex-1 p-4 bg-white dark:bg-slate-800 cursor-text" onClick={() => bodyRef.current?.focus()}>
                            <div 
                                className="w-full h-full outline-none text-sm text-slate-700 dark:text-slate-300 prose max-w-none" 
                                contentEditable 
                                ref={bodyRef}
                            />
                        </div>
                    </div>
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                {attachments.map((f, i) => (
                                    <span key={i} className="text-xs bg-white dark:bg-slate-800 pl-2 pr-1 py-1 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1 text-slate-600 dark:text-slate-300 shadow-sm">
                                        <span className="material-symbols-outlined text-xs text-slate-400">attach_file</span>
                                        {f.name} 
                                        <button onClick={() => setAttachments(prev => prev.filter(x => x !== f))} className="hover:text-red-500 ml-1 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                    </span>
                                ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 mt-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => fileRef.current?.click()} className="p-2 text-slate-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all border border-transparent hover:border-slate-200 hover:shadow-sm" title="Adjuntar Archivo">
                             <span className="material-symbols-outlined">attach_file</span>
                        </button>
                        <input type="file" multiple ref={fileRef} className="hidden" onChange={e => e.target.files && setAttachments([...attachments, ...Array.from(e.target.files)])} />
                        {defaultSignature && (
                            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <input type="checkbox" checked={useSignature} onChange={e => setUseSignature(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                Incluir firma
                            </label>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors">Descartar</button>
                        <button onClick={handleSend} disabled={isSending} className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50">
                            {isSending ? <Spinner /> : <>Enviar <span className="material-symbols-outlined text-sm">send</span></>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmailsPage: React.FC = () => {
    const { data: allAccounts } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    const { data: signatureTemplates } = useCollection<SignatureTemplate>('signatureTemplates');
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();

    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null); 
    const [searchQuery, setSearchQuery] = useState('');
    
    const [nylasEmails, setNylasEmails] = useState<Email[]>([]);
    const [isNylasLoading, setIsNylasLoading] = useState(false);
    const [nylasError, setNylasError] = useState<string | null>(null);
    
    const [showImages, setShowImages] = useState(false);
    const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null); 

    const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
    const [composeData, setComposeData] = useState<Partial<Email> | { to: string }>({}); 
    const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

    const userAccounts = useMemo(() => {
        if (!allAccounts || !currentUser) return [];
        return allAccounts.filter(acc => acc.userId === currentUser.id);
    }, [allAccounts, currentUser]);

    useEffect(() => {
        if (userAccounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(userAccounts[0].id);
        }
    }, [userAccounts, selectedAccountId]);

    const currentAccount = useMemo(() => userAccounts.find(a => a.id === selectedAccountId), [userAccounts, selectedAccountId]);
    
    const currentSignature = useMemo(() => {
        if (!currentAccount?.signatureTemplate || !signatureTemplates || !currentUser) return undefined;
        const template = signatureTemplates.find(t => t.id === currentAccount.signatureTemplate);
        if (!template) return undefined;
        let sig = template.htmlContent;
        sig = sig.replace(/{{name}}/g, currentUser.name || '');
        sig = sig.replace(/{{email}}/g, currentAccount.email || '');
        sig = sig.replace(/{{role}}/g, currentUser.role || '');
        sig = sig.replace(/{{phone}}/g, currentUser.phone || '');
        return sig;
    }, [currentAccount, signatureTemplates, currentUser]);

    const updateNylasMessage = async (messageId: string, updates: { unread?: boolean, starred?: boolean, folders?: string[] }) => {
        if (!currentAccount || !currentAccount.nylasConfig) return;
        const { grantId, apiKey } = currentAccount.nylasConfig;
        try {
            await fetch(`https://api.us.nylas.com/v3/grants/${grantId.trim()}/messages/${messageId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
        } catch (error) {
            console.error('Failed to update Nylas message:', error);
        }
    };

    const updateLocalMetadata = async (messageId: string, data: any) => {
        try {
            await api.setDoc('email_metadata', messageId, data, { merge: true }); 
        } catch (error) {
            console.error('Failed to update metadata:', error);
        }
    };

    const fetchEmails = useCallback(async () => {
        if (!currentAccount || !currentAccount.nylasConfig) return;
        const { grantId, apiKey } = currentAccount.nylasConfig;
        
        if (!grantId || !apiKey) return;

        setIsNylasLoading(true);
        setNylasError(null);
        
        try {
            const response = await fetch(`https://api.us.nylas.com/v3/grants/${grantId.trim()}/messages?limit=50`, {
                headers: { 'Authorization': `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error(`Error conectando con Nylas (${response.status})`);
            
            const nylasData = await response.json();
            const messages = nylasData.data || [];
            const metadataSnapshot = await api.getCollection('email_metadata');
            const metadataMap = new Map(metadataSnapshot.map(m => [m.id, m]));

            const mapped: Email[] = messages.map((msg: any) => {
                const folders = msg.folders || [];
                const metadata = metadataMap.get(msg.id) || {};
                let folder: EmailFolder = 'inbox';
                if (metadata.isArchived) folder = 'archived'; 
                else if (folders.some((f: string) => f.toLowerCase().includes('sent'))) folder = 'sent';
                else if (folders.some((f: string) => f.toLowerCase().includes('draft'))) folder = 'drafts';
                else if (folders.some((f: string) => f.toLowerCase().includes('trash'))) folder = 'trash';
                else if (folders.some((f: string) => f.toLowerCase().includes('archive'))) folder = 'archived';

                const isRead = metadata.unread !== undefined ? !metadata.unread : !msg.unread;
                const isStarred = metadata.starred !== undefined ? metadata.starred : msg.starred;

                return {
                    id: msg.id,
                    threadId: msg.thread_id || msg.subject,
                    subject: msg.subject || '(Sin asunto)',
                    body: msg.body || '',
                    snippet: msg.snippet || '',
                    from: msg.from?.[0] || { name: 'Desconocido', email: '' },
                    to: msg.to || [],
                    cc: msg.cc || [],
                    bcc: msg.bcc || [],
                    timestamp: new Date(msg.date * 1000).toISOString(),
                    status: isRead ? 'read' : 'unread',
                    folder: folder, 
                    attachments: (msg.attachments || []).map((a: any) => ({ 
                        id: a.id, 
                        name: a.filename || 'File', 
                        size: a.size || 0, 
                        url: '#', 
                        messageId: msg.id 
                    })), 
                    isStarred: isStarred || false,
                    isArchived: metadata.isArchived || false, 
                    tags: metadata.tags || [] 
                };
            });
            setNylasEmails(mapped);
        } catch (e: any) {
            console.error(e);
            setNylasError(e.message);
        } finally {
            setIsNylasLoading(false);
        }
    }, [currentAccount]);

    useEffect(() => { if (selectedAccountId) fetchEmails(); }, [fetchEmails, selectedAccountId]);

    const groupedThreads = useMemo(() => {
        const threads: Record<string, Email[]> = {};
        const filtered = nylasEmails.filter(e => {
            if (selectedFolder === 'archived') { if (!e.isArchived && e.folder !== 'archived') return false; } 
            else if (selectedFolder === 'inbox') { if (e.isArchived || e.folder === 'archived' || e.folder === 'trash') return false; if (e.folder !== 'inbox' && e.folder !== 'sent') return false; } 
            else { if (e.folder !== selectedFolder) return false; }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!(e.subject.toLowerCase().includes(q) || getSafeContactName(e.from).toLowerCase().includes(q))) return false;
            }
            if (selectedTagFilter && (!e.tags || !e.tags.includes(selectedTagFilter))) return false;
            return true;
        });

        filtered.forEach(email => {
            const key = email.threadId || email.subject; 
            if (!threads[key]) threads[key] = [];
            threads[key].push(email);
        });

        return Object.entries(threads)
            .map(([id, msgs]) => ({ id, messages: msgs.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), latestMessage: msgs[msgs.length - 1] }))
            .sort((a, b) => new Date(b.latestMessage.timestamp).getTime() - new Date(a.latestMessage.timestamp).getTime());
    }, [nylasEmails, selectedFolder, searchQuery, selectedTagFilter]);

    const activeThread = useMemo(() => selectedThreadId ? groupedThreads.find(t => t.id === selectedThreadId) : null, [selectedThreadId, groupedThreads]);

    useEffect(() => { setShowImages(false); }, [selectedThreadId]);
    
    // Determine Reply-To Address Correctly
    const getReplyToAddress = (email: Email, myEmail?: string) => {
        if (!email || !email.from) return '';
        
        const myEmailLower = myEmail?.toLowerCase().trim() || '';
        const senderEmail = email.from.email?.toLowerCase().trim() || '';
        
        // If the email is in the 'sent' folder, then I sent it.
        // OR if the sender is me.
        // In both cases, reply to the first recipient (not myself).
        if (email.folder === 'sent' || senderEmail === myEmailLower) {
             const recipients = email.to || [];
             return recipients[0]?.email || '';
        }

        // Default: Reply to sender (Incoming email)
        return email.from.email;
    };

    const handleComposeTo = (email: string) => {
        setComposeMode('new');
        setComposeData({ to: email });
    };

    const handleSendEmail = async (data: any) => {
        if (!currentAccount || !currentUser) {
             showToast('warning', 'No se ha seleccionado una cuenta de envío.');
             return;
        }
        
        const toRecipients = stringToRecipients(data.to);
        const ccRecipients = stringToRecipients(data.cc || '');
        const bccRecipients = stringToRecipients(data.bcc || '');
        
        // Basic validation: at least one recipient
        if(toRecipients.length === 0) {
             showToast('warning', 'Debes especificar al menos un destinatario.');
             return;
        }

        const payload = {
            subject: data.subject || '(Sin asunto)',
            body: data.body || '',
            to: toRecipients,
            cc: ccRecipients, 
            bcc: bccRecipients,
        };
        
        let sentViaApi = false;
        try {
            if (currentAccount.provider === 'nylas' && currentAccount.nylasConfig) {
                 const { grantId, apiKey } = currentAccount.nylasConfig;
                 // Trim credentials to avoid spaces issues
                 const cleanGrant = grantId.trim();
                 const cleanKey = apiKey.trim();
                 
                 if (cleanGrant && cleanKey) {
                     const res = await fetch(`https://api.us.nylas.com/v3/grants/${cleanGrant}/messages/send`, {
                         method: 'POST',
                         headers: { 'Authorization': `Bearer ${cleanKey}`, 'Content-Type': 'application/json' },
                         body: JSON.stringify(payload)
                     });
                     
                     if (res.ok) {
                         sentViaApi = true;
                     } else {
                         const errText = await res.text(); 
                         let message = 'API Error';
                         try {
                             const errJson = JSON.parse(errText);
                             message = errJson.message || message;
                         } catch (e) {
                             message = errText || message;
                         }
                         console.warn("Nylas API send failed", message);
                         
                         // IMPORTANT: If it's a network error or CORS, we might not get here if fetch throws. 
                         // But if we get a response, it means we connected.
                         showToast('error', `Error de envío: ${message}`);
                         return; // Don't fallback if API explicitly rejected it (e.g. bad auth)
                     }
                 }
            }
        } catch (e) { 
            console.error("Error in email logic (likely network/CORS)", e); 
            // Fallback proceeds below
        }

        if (!sentViaApi) {
            try {
                const emailDoc = { 
                    ...payload, 
                    from: { name: currentUser.name || 'Usuario', email: currentAccount.email || 'unknown@domain.com' }, 
                    folder: 'sent', 
                    timestamp: new Date().toISOString(), 
                    status: 'read',
                    deliveryStatus: 'pending_retry' 
                };
                const cleanDoc = JSON.parse(JSON.stringify(emailDoc));
                await api.addDoc('emails', cleanDoc);
                
                showToast('warning', 'Correo guardado localmente (Sin conexión / Error API).');
                setComposeMode(null);
            } catch (err) {
                console.error("Failed to save email locally", err);
                showToast('error', 'Error crítico: No se pudo guardar el correo.');
            }
        } else {
            showToast('success', 'Correo enviado exitosamente.');
            setComposeMode(null);
            setTimeout(fetchEmails, 2000);
        }
    };

    const toggleThreadStar = async (threadId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const targetEmail = nylasEmails.find(email => email.threadId === threadId || email.subject === threadId);
        if (!targetEmail) return;
        const newStatus = !targetEmail.isStarred;
        setNylasEmails(prev => prev.map(email => (email.threadId === threadId || email.subject === threadId) ? { ...email, isStarred: newStatus } : email));
        const threadEmails = nylasEmails.filter(email => email.threadId === threadId || email.subject === threadId);
        for (const email of threadEmails) {
             updateNylasMessage(email.id, { starred: newStatus });
             updateLocalMetadata(email.id, { starred: newStatus });
        }
    };

    const archiveThread = async (threadId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setNylasEmails(prev => prev.map(email => (email.threadId === threadId || email.subject === threadId) ? { ...email, isArchived: true, folder: 'archived' } : email));
        if (selectedThreadId === threadId) setSelectedThreadId(null);
        showToast('success', 'Conversación archivada');
        const threadEmails = nylasEmails.filter(email => email.threadId === threadId || email.subject === threadId);
        for (const email of threadEmails) {
            updateLocalMetadata(email.id, { isArchived: true });
        }
    };
    
    const markThreadReadStatus = async (threadId: string, status: 'read' | 'unread') => {
        setNylasEmails(prev => prev.map(email => (email.threadId === threadId || email.subject === threadId) ? { ...email, status: status } : email));
        showToast('info', `Marcado como ${status === 'read' ? 'leído' : 'no leído'}`);
        const isUnread = status === 'unread';
        const threadEmails = nylasEmails.filter(email => email.threadId === threadId || email.subject === threadId);
        for (const email of threadEmails) {
            updateNylasMessage(email.id, { unread: isUnread });
            updateLocalMetadata(email.id, { unread: isUnread });
        }
    };
    
    const addTagToThread = async (tag: string) => {
        if (!selectedThreadId) return;
        const threadEmails = nylasEmails.filter(email => email.threadId === selectedThreadId || email.subject === selectedThreadId);
        setNylasEmails(prev => prev.map(email => (email.threadId === selectedThreadId || email.subject === selectedThreadId) ? { ...email, tags: [...(new Set([...(email.tags || []), tag]))] } : email));
        setIsTagMenuOpen(false);
        showToast('success', `Etiqueta "${tag}" añadida`);
        for (const email of threadEmails) {
            const newTags = [...(new Set([...(email.tags || []), tag]))];
            updateLocalMetadata(email.id, { tags: newTags });
        }
    };
    
    const deleteTagFromEmail = async (emailId: string, tagToRemove: string) => {
         const targetEmail = nylasEmails.find(e => e.id === emailId);
         if (!targetEmail) return;
         const newTags = targetEmail.tags?.filter(t => t !== tagToRemove) || [];
         setNylasEmails(prev => prev.map(e => e.id === emailId ? { ...e, tags: newTags } : e));
         showToast('info', 'Etiqueta eliminada');
         updateLocalMetadata(emailId, { tags: newTags });
    }

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="p-4">
                    <button onClick={() => { setComposeMode('new'); setComposeData({}); }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                        <span className="material-symbols-outlined">edit_square</span> Redactar
                    </button>
                </div>
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {FOLDER_CONFIG.map(folder => (
                        <button key={folder.id} onClick={() => { setSelectedFolder(folder.id); setSelectedThreadId(null); setSelectedTagFilter(null); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFolder === folder.id && !selectedTagFilter ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                            <div className="flex items-center gap-3"><span className="material-symbols-outlined text-xl">{folder.icon}</span>{folder.name}</div>
                            {folder.id === 'inbox' && <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-1.5 rounded-md">{nylasEmails.filter(e => e.status === 'unread' && e.folder === 'inbox' && !e.isArchived).length || ''}</span>}
                        </button>
                    ))}
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Etiquetas</p>
                        {Object.keys(BUSINESS_TAGS).map(tag => (
                            <button key={tag} onClick={() => { setSelectedTagFilter(tag); setSelectedThreadId(null); }} className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm transition-colors rounded-lg ${selectedTagFilter === tag ? 'bg-white dark:bg-slate-800 font-semibold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${BUSINESS_TAGS[tag].split(' ')[0].replace('bg-', 'bg-')}`}></span>{tag}
                            </button>
                        ))}
                    </div>
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 relative">
                     <button onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                         <span className="truncate flex-1 text-left">{currentAccount?.email || 'Seleccionar cuenta'}</span><span className="material-symbols-outlined text-slate-400">unfold_more</span>
                     </button>
                     {isAccountDropdownOpen && (
                         <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                             {userAccounts.map(acc => (
                                 <button key={acc.id} onClick={() => { setSelectedAccountId(acc.id); setIsAccountDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedAccountId === acc.id ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{acc.email}</button>
                             ))}
                         </div>
                     )}
                </div>
            </div>
            <div className="w-80 lg:w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800 transition-all">
                <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar..." className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <button onClick={() => fetchEmails()} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Actualizar"><span className="material-symbols-outlined text-lg">refresh</span></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isNylasLoading ? <div className="py-12 flex justify-center"><Spinner /></div> : nylasError ? <div className="p-6 text-center"><p className="text-red-500 text-sm mb-2">Error de conexión</p><p className="text-xs text-slate-400">{nylasError}</p><button onClick={() => fetchEmails()} className="mt-4 text-xs text-indigo-600 underline">Reintentar</button></div> : groupedThreads.length === 0 ? <div className="flex flex-col items-center justify-center h-64 text-slate-400"><span className="material-symbols-outlined text-4xl mb-2">inbox</span><p className="text-sm">No hay conversaciones</p></div> : (
                        <ul>
                            {groupedThreads.map(thread => (
                                <li key={thread.id}>
                                    <EmailListItem 
                                        email={thread.latestMessage} 
                                        isSelected={selectedThreadId === thread.id} 
                                        currentAccountEmail={currentAccount?.email}
                                        onSelect={() => setSelectedThreadId(thread.id)} 
                                        onToggleStar={(e) => toggleThreadStar(thread.id, e)} 
                                        onArchive={(e) => archiveThread(thread.id, e)} 
                                        onDeleteTag={(tag, e) => { e.stopPropagation(); deleteTagFromEmail(thread.latestMessage.id, tag); }} 
                                        onCompose={handleComposeTo}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0 relative">
                {activeThread ? (
                    <>
                        <div className="h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 bg-white dark:bg-slate-800 sticky top-0 z-10">
                            <div className="flex-1 min-w-0 mr-4">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate" title={activeThread.latestMessage.subject}>{activeThread.latestMessage.subject}</h2>
                                <div className="flex flex-wrap gap-2 mt-1">{activeThread.latestMessage.tags?.map(t => <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${BUSINESS_TAGS[t] || 'bg-slate-100 border-slate-200'}`}>{t}<button onClick={() => deleteTagFromEmail(activeThread.latestMessage.id, t)} className="hover:opacity-70"><span className="material-symbols-outlined !text-[10px]">close</span></button></span>)}</div>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500">
                                <button 
                                    onClick={() => { 
                                        setComposeMode('reply'); 
                                        setComposeData({ 
                                            to: getReplyToAddress(activeThread.latestMessage, currentAccount?.email),
                                            subject: `Re: ${activeThread.latestMessage.subject}`, 
                                            body: activeThread.latestMessage.body 
                                        }); 
                                    }} 
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700" 
                                    title="Responder"
                                >
                                    <span className="material-symbols-outlined">reply</span>
                                </button>
                                <button 
                                    onClick={() => { 
                                        setComposeMode('forward'); 
                                        setComposeData({ 
                                            subject: `Fwd: ${activeThread.latestMessage.subject}`, 
                                            body: activeThread.latestMessage.body 
                                        }); 
                                    }} 
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700" 
                                    title="Reenviar"
                                >
                                    <span className="material-symbols-outlined">forward</span>
                                </button>
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <div className="relative">
                                    <button onClick={() => setIsTagMenuOpen(!isTagMenuOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Añadir Etiqueta"><span className="material-symbols-outlined">label</span></button>
                                    {isTagMenuOpen && <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-slate-200 dark:border-slate-700 z-50 py-1">{Object.keys(BUSINESS_TAGS).map(tag => <button key={tag} onClick={() => addTagToThread(tag)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${BUSINESS_TAGS[tag].split(' ')[0].replace('bg-','bg-')}`}></span>{tag}</button>)}</div>}
                                </div>
                                <button onClick={(e) => toggleThreadStar(activeThread.id, e)} className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded ${activeThread.latestMessage.isStarred ? 'text-amber-400' : ''}`} title="Destacar"><span className="material-symbols-outlined" style={{fontVariationSettings: `'FILL' ${activeThread.latestMessage.isStarred ? 1 : 0}`}}>star</span></button>
                                <button onClick={() => markThreadReadStatus(activeThread.id, activeThread.latestMessage.status === 'read' ? 'unread' : 'read')} className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded ${activeThread.latestMessage.status === 'unread' ? 'text-indigo-600' : ''}`} title={activeThread.latestMessage.status === 'read' ? 'Marcar como no leído' : 'Marcar como leído'}><span className="material-symbols-outlined" style={{fontVariationSettings: `'FILL' ${activeThread.latestMessage.status === 'unread' ? 1 : 0}`}}>mark_email_unread</span></button>
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <button onClick={() => archiveThread(activeThread.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700" title="Archivar"><span className="material-symbols-outlined">archive</span></button>
                            </div>
                        </div>
                        {!showImages && activeThread.messages.some(m => m.body.includes('<img')) && <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-6 py-2 flex items-center justify-between"><div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200"><span className="material-symbols-outlined !text-sm">image_not_supported</span>Las imágenes se han ocultado para proteger tu privacidad.</div><button onClick={() => setShowImages(true)} className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline">Mostrar imágenes</button></div>}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                            {activeThread.messages.map((msg, index) => {
                                const isLast = index === activeThread.messages.length - 1;
                                
                                // Determine if outgoing based on message content sender
                                const msgIsOutgoing = !!currentAccount?.email && msg.from.email.trim().toLowerCase() === currentAccount.email.trim().toLowerCase();
                                const contactName = getSafeContactName(msgIsOutgoing ? (msg.to && msg.to.length > 0 ? msg.to[0] : msg.from) : msg.from);
                                const initial = contactName.charAt(0).toUpperCase();
                                
                                return (
                                    <div key={msg.id} className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm ${isLast ? 'border-slate-200 dark:border-slate-700' : 'border-transparent opacity-90'}`}>
                                        <div className="p-4 flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">{initial}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <ContactPill contact={msg.from} onCompose={handleComposeTo} />
                                                        <span className="text-xs text-slate-400">&lt;{getSafeContactEmail(msg.from)}&gt;</span>
                                                    </div>
                                                    <span className="text-xs text-slate-400">{new Date(msg.timestamp).toLocaleString()}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                                    Para: <ContactPill contact={msg.to?.[0]} onCompose={handleComposeTo} />
                                                </div>
                                                <div className="relative w-full text-sm text-slate-700 dark:text-slate-300"><SafeEmailFrame htmlContent={msg.body} showImages={showImages} /></div>
                                                
                                                {/* ATTACHMENTS: RENDERED AS TILES AT THE BOTTOM OF THE MESSAGE BODY */}
                                                {msg.attachments.length > 0 && (
                                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Adjuntos ({msg.attachments.length})</h4>
                                                        <div className="flex flex-wrap gap-4">
                                                            {msg.attachments.map(att => (
                                                                <EmailAttachmentTile 
                                                                    key={att.id} 
                                                                    attachment={att} 
                                                                    nylasConfig={currentAccount?.nylasConfig} 
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-up">
                            <div 
                                onClick={() => { 
                                    setComposeMode('reply'); 
                                    setComposeData({ 
                                        to: getReplyToAddress(activeThread.latestMessage, currentAccount?.email),
                                        subject: `Re: ${activeThread.latestMessage.subject}`, 
                                        body: activeThread.latestMessage.body 
                                    }); 
                                }} 
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 cursor-text hover:border-indigo-400 transition-colors bg-slate-50 dark:bg-slate-900/50"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><span className="material-symbols-outlined text-lg">reply</span></div>
                                <span className="text-sm">Responder...</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/30 text-slate-400">
                        <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-4"><span className="material-symbols-outlined text-4xl opacity-50">mark_email_unread</span></div>
                        <p className="text-sm font-medium">Selecciona una conversación para leer</p>
                    </div>
                )}
            </div>
            {composeMode && <ComposeEmailModal mode={composeMode} initialData={composeData} isOpen={!!composeMode} onClose={() => setComposeMode(null)} onSend={handleSendEmail} defaultSignature={currentSignature}/>}
        </div>
    );
};

export default EmailsPage;
