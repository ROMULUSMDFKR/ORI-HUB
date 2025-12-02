
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

// BUSINESS TAGS CONFIGURATION
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

// --- UTILS ---

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
        // Extract email if format is "Name <email>"
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

// --- SUB-COMPONENTS ---

const AttachmentModal: React.FC<{ isOpen: boolean; onClose: () => void; attachment: Attachment | null; }> = ({ isOpen, onClose, attachment }) => {
    if (!isOpen || !attachment) return null;
    const isImage = attachment.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-zoom-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-500">{isImage ? 'image' : 'description'}</span>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-md">{attachment.name}</h3>
                            <span className="text-xs text-slate-500">{formatBytes(attachment.size)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="flex-1 p-0 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-black/50 min-h-[300px]">
                    {isImage ? <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-full object-contain" /> : <div className="text-center py-12"><span className="material-symbols-outlined text-6xl text-slate-400 mb-4">insert_drive_file</span><p className="text-slate-500 dark:text-slate-400 mb-6">Vista previa no disponible.</p></div>}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-white dark:bg-slate-800">
                    <a href={attachment.url} download={attachment.name} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"><span className="material-symbols-outlined">download</span> Descargar</a>
                </div>
            </div>
        </div>
    );
};

// Advanced Email Frame that respects styles but blocks images securely until allowed
const SafeEmailFrame: React.FC<{ htmlContent: string; showImages: boolean }> = ({ htmlContent, showImages }) => {
    const [frameHeight, setFrameHeight] = useState('100px');
    
    // Process HTML to handle images
    const processedHtml = useMemo(() => {
        let content = htmlContent || '';
        
        // Basic cleanup but respecting styles
        if (!showImages) {
            // Replace src with data-src-blocked to prevent loading
            content = content.replace(/<img([^>]*?)src=["']([^"']*)["']([^>]*?)>/gi, (match, p1, src, p2) => {
                return `<img ${p1} data-src-blocked="${src}" src="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3e" style="opacity: 0.5; max-width: 100%; height: auto; border: 1px dashed #cbd5e1;" ${p2}>`;
            });
            // Block background images
            content = content.replace(/background-image:/gi, 'x-background-image:');
            content = content.replace(/background:/gi, 'x-background:');
        }

        // Ensure links open in new tab
        if (!content.includes('<base target="_blank">')) {
             content = `<base target="_blank">${content}`;
        }

        // Inject base styles for consistent rendering
        // UPDATED: Changed default body color to #0f172a (slate-900) for darker, sharper text
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
                        color: #0f172a; /* Very Dark Gray for high contrast */
                    }
                    img { max-width: 100%; height: auto; }
                    a { color: #4f46e5; }
                    blockquote { border-left: 3px solid #cbd5e1; padding-left: 12px; margin-left: 0; color: #64748b; }
                    p { margin-bottom: 1em; }
                    /* Dark mode support attempt */
                    @media (prefers-color-scheme: dark) {
                        body { color: #f8fafc; } /* Very Light Gray for dark mode */
                        blockquote { border-left-color: #475569; color: #94a3b8; }
                    }
                </style>
            </head>
            <body>
                ${content}
                <div id="end-of-content"></div>
                <script>
                    // Report height to parent
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

    // Listen for resize messages
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
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-scripts" // Scripts needed for resize observer
        />
    );
};


const EmailListItem: React.FC<{ email: Email; isSelected: boolean; onSelect: () => void; onToggleStar: (e: React.MouseEvent) => void; onArchive: (e: React.MouseEvent) => void; onDeleteTag: (tag: string, e: React.MouseEvent) => void; }> = ({ email, isSelected, onSelect, onToggleStar, onArchive, onDeleteTag }) => {
    const isUnread = email.status === 'unread';
    
    let displayContact = email.folder === 'sent' ? `Para: ${getSafeContactName(email.to?.[0])}` : getSafeContactName(email.from);
    const displaySnippet = email.snippet || (email.body ? email.body.replace(/<[^>]*>?/gm, '').substring(0, 90) + '...' : '');

    return (
        <div 
            onClick={onSelect} 
            className={`group flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 relative ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500 pl-3' : 'border-l-4 border-l-transparent pl-3'} ${isUnread ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/30 dark:bg-slate-900/30'}`}
        >
             <div className="flex flex-col items-center gap-3 pt-1">
                {/* Star Button */}
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
                     <h4 className={`text-sm truncate max-w-[70%] ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                         {displayContact}
                     </h4>
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

                 {/* Footer Tags & Attachments */}
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

             {/* Hover Actions (Desktop) */}
             <div className="absolute right-2 bottom-2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-600 rounded-lg p-1 z-10">
                 <button onClick={onArchive} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" title="Archivar">
                     <span className="material-symbols-outlined text-lg">archive</span>
                 </button>
             </div>
        </div>
    );
};

// Rich Text Editor Toolbar
const RichTextToolbar: React.FC<{ onCommand: (cmd: string, val?: string) => void }> = ({ onCommand }) => {
    return (
        <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
            <button onClick={() => onCommand('bold')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Negrita"><span className="material-symbols-outlined text-lg">format_bold</span></button>
            <button onClick={() => onCommand('italic')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Cursiva"><span className="material-symbols-outlined text-lg">format_italic</span></button>
            <button onClick={() => onCommand('underline')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Subrayado"><span className="material-symbols-outlined text-lg">format_underlined</span></button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
            <button onClick={() => onCommand('insertUnorderedList')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Lista con viñetas"><span className="material-symbols-outlined text-lg">format_list_bulleted</span></button>
            <button onClick={() => onCommand('insertOrderedList')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Lista numerada"><span className="material-symbols-outlined text-lg">format_list_numbered</span></button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
            <button onClick={() => onCommand('justifyLeft')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Alinear izquierda"><span className="material-symbols-outlined text-lg">format_align_left</span></button>
            <button onClick={() => onCommand('justifyCenter')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Centrar"><span className="material-symbols-outlined text-lg">format_align_center</span></button>
        </div>
    );
};

// Modal for composing
interface ComposeEmailModalProps {
    mode: ComposeMode;
    initialData: Partial<Email>;
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: any) => void;
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
    
    const [attachments, setAttachments] = useState<File[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTo(Array.isArray(initialData.to) ? initialData.to.map((r:any) => getSafeContactEmail(r)).join(', ') : '');
            setSubject(initialData.subject || '');
            
            // Body setup: include quote if reply
            let initialBody = initialData.body || '';
            if (mode === 'reply' || mode === 'forward') {
                initialBody = `<br><br><hr><blockquote>${initialData.body}</blockquote>`;
            }
            setBody(initialBody);
            
            if(bodyRef.current) {
                 bodyRef.current.innerHTML = initialBody;
            }
            
            setAttachments([]);
        }
    }, [isOpen, initialData, mode]);
    
    const handleExecCommand = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
    };

    const handleSend = () => {
        if (!to) return alert('Por favor, especifica al menos un destinatario.');
        
        let finalBody = bodyRef.current?.innerHTML || '';
        if (useSignature && defaultSignature) {
            finalBody += `<br><div class="signature-block">${defaultSignature}</div>`;
        }
        
        onSend({ to, cc, bcc, subject, body: finalBody, attachments });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-[90vh] animate-slide-in-up overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">{mode === 'new' ? 'edit_square' : 'reply'}</span>
                        {mode === 'new' ? 'Nuevo Mensaje' : mode === 'reply' ? 'Responder' : 'Reenviar'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><span className="material-symbols-outlined text-slate-500">close</span></button>
                </div>
                
                {/* Fields */}
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
                    
                    {/* Editor Area */}
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

                    {/* Attachments Display */}
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
                
                {/* Footer */}
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
                        <button onClick={handleSend} className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                            Enviar <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

const EmailsPage: React.FC = () => {
    const { data: allAccounts } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    const { data: signatureTemplates } = useCollection<SignatureTemplate>('signatureTemplates');
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();

    // State
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null); 
    const [searchQuery, setSearchQuery] = useState('');
    
    // Data State
    const [nylasEmails, setNylasEmails] = useState<Email[]>([]);
    const [isNylasLoading, setIsNylasLoading] = useState(false);
    const [nylasError, setNylasError] = useState<string | null>(null);
    
    // View Settings
    const [showImages, setShowImages] = useState(false);
    const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null); 

    // Compose State
    const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
    const [composeData, setComposeData] = useState<Partial<Email>>({});
    
    // Attachment Preview
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
    
    // Filter accounts
    const userAccounts = useMemo(() => {
        if (!allAccounts || !currentUser) return [];
        return allAccounts.filter(acc => acc.userId === currentUser.id);
    }, [allAccounts, currentUser]);

    // Default account selection
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


    // FETCH EMAILS
    const fetchEmails = useCallback(async () => {
        if (!currentAccount || !currentAccount.nylasConfig) return;
        
        setIsNylasLoading(true);
        setNylasError(null);
        
        try {
            const { grantId, apiKey } = currentAccount.nylasConfig;
            const cleanGrant = grantId.trim();
            const cleanKey = apiKey.trim();
            
            // Determine API query based on folder
            let query = 'limit=50';
            
            // NOTE: For real implementation, map these to Nylas query params or filters.
            // For now, we fetch messages and filter locally if API doesn't support exact folder mapping easily without 'in='
            // However, Nylas v3 often uses labels or folders endpoint. Assuming messages endpoint for simplicity.
            // Ideally: Use /v3/grants/{id}/threads for threading support natively.
            
            const response = await fetch(`https://api.us.nylas.com/v3/grants/${cleanGrant}/messages?${query}`, {
                headers: { 'Authorization': `Bearer ${cleanKey}`, 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error("Error de autenticación con Nylas (401). Verifica las credenciales.");
                throw new Error(`Error conectando con Nylas (${response.status})`);
            }
            
            const data = await response.json();
            
            // Map response to internal Email type
            const mapped: Email[] = (data.data || []).map((msg: any) => {
                const folders = msg.folders || [];
                let folder: EmailFolder = 'inbox';
                if (folders.some((f: string) => f.toLowerCase().includes('sent'))) folder = 'sent';
                if (folders.some((f: string) => f.toLowerCase().includes('draft'))) folder = 'drafts';
                if (folders.some((f: string) => f.toLowerCase().includes('trash'))) folder = 'trash';
                if (folders.some((f: string) => f.toLowerCase().includes('archive'))) folder = 'archived';

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
                    status: msg.unread ? 'unread' : 'read',
                    folder: folder, 
                    attachments: (msg.attachments || []).map((a: any) => ({ id: a.id, name: a.filename || 'File', size: a.size || 0, url: '#' })),
                    isStarred: msg.starred || false,
                    isArchived: false, 
                    tags: [] 
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

    // Re-fetch when account changes. Note: removed selectedFolder dependency to prevent constant refetching if we are filtering locally
    useEffect(() => {
        if (selectedAccountId) fetchEmails();
    }, [fetchEmails, selectedAccountId]);

    // --- THREADING & FILTER LOGIC ---
    const groupedThreads = useMemo(() => {
        const threads: Record<string, Email[]> = {};
        
        const filtered = nylasEmails.filter(e => {
            // 1. Archive Filter
            if (selectedFolder === 'archived') {
                if (!e.isArchived && e.folder !== 'archived') return false;
            } else if (selectedFolder === 'inbox') {
                if (e.isArchived || e.folder === 'archived' || e.folder === 'trash') return false; // Hide archived from inbox
                 if (e.folder !== 'inbox' && e.folder !== 'sent') return false; // Keep mainly inbox, allow sent if conversation
            } else {
                 if (e.folder !== selectedFolder) return false;
            }
            
            // 2. Search Filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!(e.subject.toLowerCase().includes(q) || getSafeContactName(e.from).toLowerCase().includes(q))) return false;
            }

            // 3. Tag Filter
            if (selectedTagFilter) {
                if (!e.tags || !e.tags.includes(selectedTagFilter)) return false;
            }

            return true;
        });

        filtered.forEach(email => {
            const key = email.threadId || email.subject; 
            if (!threads[key]) threads[key] = [];
            threads[key].push(email);
        });

        return Object.entries(threads)
            .map(([id, msgs]) => ({
                id,
                messages: msgs.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
                latestMessage: msgs[msgs.length - 1]
            }))
            .sort((a, b) => new Date(b.latestMessage.timestamp).getTime() - new Date(a.latestMessage.timestamp).getTime());
    }, [nylasEmails, selectedFolder, searchQuery, selectedTagFilter]);

    const activeThread = useMemo(() => {
        if (!selectedThreadId) return null;
        return groupedThreads.find(t => t.id === selectedThreadId);
    }, [selectedThreadId, groupedThreads]);

    // Reset image block when thread changes
    useEffect(() => {
        setShowImages(false);
    }, [selectedThreadId]);


    // --- ACTIONS ---
    const handleSendEmail = async (data: any) => {
        if (!currentAccount || !currentUser) return;
        
        const toRecipients = stringToRecipients(data.to);
        const ccRecipients = stringToRecipients(data.cc || '');
        const bccRecipients = stringToRecipients(data.bcc || '');

        const payload = {
            subject: data.subject,
            body: data.body,
            to: toRecipients,
            cc: ccRecipients.length > 0 ? ccRecipients : undefined,
            bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
        };
        
        try {
            if (currentAccount.provider === 'nylas' && currentAccount.nylasConfig) {
                 const { grantId, apiKey } = currentAccount.nylasConfig;
                 const res = await fetch(`https://api.us.nylas.com/v3/grants/${grantId.trim()}/messages/send`, {
                     method: 'POST',
                     headers: { 'Authorization': `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
                     body: JSON.stringify(payload)
                 });
                 
                 if (!res.ok) {
                     const err = await res.json();
                     throw new Error(err.message || 'Error enviando correo');
                 }
            } else {
                // Mock send
                await api.addDoc('emails', { ...payload, from: {name: currentUser.name, email: currentAccount.email}, folder: 'sent', timestamp: new Date().toISOString(), status: 'read' });
            }
            
            showToast('success', 'Correo enviado exitosamente.');
            setComposeMode(null);
            // Optionally refresh if viewing sent folder

        } catch (e: any) {
            console.error(e);
            showToast('error', `No se pudo enviar el correo: ${e.message}`);
        }
    };

    const toggleThreadStar = (threadId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNylasEmails(prev => prev.map(email => 
            (email.threadId === threadId || email.subject === threadId) ? { ...email, isStarred: !email.isStarred } : email
        ));
    };

    const archiveThread = (threadId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setNylasEmails(prev => prev.map(email => 
            (email.threadId === threadId || email.subject === threadId) ? { ...email, isArchived: true, folder: 'archived' } : email
        ));
        
        // If the currently selected thread is being archived, deselect it
        if (selectedThreadId === threadId) setSelectedThreadId(null);
        
        showToast('success', 'Conversación archivada');
    };
    
    const markThreadReadStatus = (threadId: string, status: 'read' | 'unread') => {
        setNylasEmails(prev => prev.map(email => 
             (email.threadId === threadId || email.subject === threadId) ? { ...email, status: status } : email
        ));
        showToast('info', `Marcado como ${status === 'read' ? 'leído' : 'no leído'}`);
    };
    
    const addTagToThread = (tag: string) => {
        if (!selectedThreadId) return;
        setNylasEmails(prev => prev.map(email => 
             (email.threadId === selectedThreadId || email.subject === selectedThreadId) 
             ? { ...email, tags: [...(new Set([...(email.tags || []), tag]))] } // Prevent duplicates
             : email
        ));
        setIsTagMenuOpen(false);
        showToast('success', `Etiqueta "${tag}" añadida`);
    };
    
    const deleteTagFromEmail = (emailId: string, tagToRemove: string) => {
         setNylasEmails(prev => prev.map(e => 
             e.id === emailId ? { ...e, tags: e.tags?.filter(t => t !== tagToRemove) } : e
         ));
         showToast('info', 'Etiqueta eliminada');
    }

    // Custom Dropdown for Accounts
    const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            
            {/* 1. SIDEBAR */}
            <div className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="p-4">
                    <button 
                        onClick={() => { setComposeMode('new'); setComposeData({}); }} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                    >
                        <span className="material-symbols-outlined">edit_square</span> Redactar
                    </button>
                </div>
                
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {FOLDER_CONFIG.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => { setSelectedFolder(folder.id); setSelectedThreadId(null); setSelectedTagFilter(null); }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFolder === folder.id && !selectedTagFilter ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-xl">{folder.icon}</span>
                                {folder.name}
                            </div>
                            {/* Unread Count (Mock for inbox) */}
                            {folder.id === 'inbox' && (
                                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-1.5 rounded-md">
                                    {nylasEmails.filter(e => e.status === 'unread' && e.folder === 'inbox' && !e.isArchived).length || ''}
                                </span>
                            )}
                        </button>
                    ))}
                    
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Etiquetas</p>
                        {Object.keys(BUSINESS_TAGS).map(tag => (
                            <button 
                                key={tag} 
                                onClick={() => { setSelectedTagFilter(tag); setSelectedThreadId(null); }}
                                className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm transition-colors rounded-lg ${selectedTagFilter === tag ? 'bg-white dark:bg-slate-800 font-semibold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                            >
                                <span className={`w-2.5 h-2.5 rounded-full ${BUSINESS_TAGS[tag].split(' ')[0].replace('bg-', 'bg-')}`}></span>
                                {tag}
                            </button>
                        ))}
                    </div>
                </nav>
                
                {/* Account Selector */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 relative">
                     <button 
                        onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                     >
                         <span className="truncate flex-1 text-left">{currentAccount?.email || 'Seleccionar cuenta'}</span>
                         <span className="material-symbols-outlined text-slate-400">unfold_more</span>
                     </button>

                     {isAccountDropdownOpen && (
                         <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                             {userAccounts.map(acc => (
                                 <button 
                                    key={acc.id}
                                    onClick={() => { setSelectedAccountId(acc.id); setIsAccountDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedAccountId === acc.id ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                                 >
                                     {acc.email}
                                 </button>
                             ))}
                             <Link to="/settings/email-accounts" className="block w-full text-left px-4 py-2 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50">
                                 Gestionar cuentas
                             </Link>
                         </div>
                     )}
                </div>
            </div>

            {/* 2. THREAD LIST (Middle) */}
            <div className="w-80 lg:w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800 transition-all">
                <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar..." 
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <button onClick={() => fetchEmails()} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Actualizar"><span className="material-symbols-outlined text-lg">refresh</span></button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isNylasLoading ? (
                        <div className="py-12 flex justify-center"><Spinner /></div>
                    ) : nylasError ? (
                         <div className="p-6 text-center">
                             <p className="text-red-500 text-sm mb-2">Error de conexión</p>
                             <p className="text-xs text-slate-400">{nylasError}</p>
                             <button onClick={() => fetchEmails()} className="mt-4 text-xs text-indigo-600 underline">Reintentar</button>
                         </div>
                    ) : groupedThreads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                            <p className="text-sm">No hay conversaciones</p>
                        </div>
                    ) : (
                        <ul>
                            {groupedThreads.map(thread => {
                                const msg = thread.latestMessage;
                                const isSelected = selectedThreadId === thread.id;
                                
                                return (
                                    <li key={thread.id}>
                                        <EmailListItem 
                                            email={msg}
                                            isSelected={isSelected}
                                            onSelect={() => setSelectedThreadId(thread.id)}
                                            onToggleStar={(e) => toggleThreadStar(thread.id, e)}
                                            onArchive={(e) => archiveThread(thread.id, e)}
                                            onDeleteTag={(tag, e) => { e.stopPropagation(); deleteTagFromEmail(msg.id, tag); }}
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* 3. READING PANE (Right) */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0 relative">
                {activeThread ? (
                    <>
                        {/* Thread Header */}
                        <div className="h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 bg-white dark:bg-slate-800 sticky top-0 z-10">
                            <div className="flex-1 min-w-0 mr-4">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate" title={activeThread.latestMessage.subject}>
                                    {activeThread.latestMessage.subject}
                                </h2>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {activeThread.latestMessage.tags?.map(t => (
                                        <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${BUSINESS_TAGS[t] || 'bg-slate-100 border-slate-200'}`}>
                                            {t}
                                            <button onClick={() => deleteTagFromEmail(activeThread.latestMessage.id, t)} className="hover:opacity-70"><span className="material-symbols-outlined !text-[10px]">close</span></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500">
                                <div className="relative">
                                    <button onClick={() => setIsTagMenuOpen(!isTagMenuOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Añadir Etiqueta">
                                        <span className="material-symbols-outlined">label</span>
                                    </button>
                                    {isTagMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-slate-200 dark:border-slate-700 z-50 py-1">
                                            {Object.keys(BUSINESS_TAGS).map(tag => (
                                                <button key={tag} onClick={() => addTagToThread(tag)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${BUSINESS_TAGS[tag].split(' ')[0].replace('bg-','bg-')}`}></span>
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={(e) => toggleThreadStar(activeThread.id, e)} className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded ${activeThread.latestMessage.isStarred ? 'text-amber-400' : ''}`} title="Destacar">
                                    <span className="material-symbols-outlined" style={{fontVariationSettings: `'FILL' ${activeThread.latestMessage.isStarred ? 1 : 0}`}}>star</span>
                                </button>
                                <button 
                                    onClick={() => markThreadReadStatus(activeThread.id, activeThread.latestMessage.status === 'read' ? 'unread' : 'read')} 
                                    className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded ${activeThread.latestMessage.status === 'unread' ? 'text-indigo-600' : ''}`} 
                                    title={activeThread.latestMessage.status === 'read' ? 'Marcar como no leído' : 'Marcar como leído'}
                                >
                                    <span className="material-symbols-outlined" style={{fontVariationSettings: `'FILL' ${activeThread.latestMessage.status === 'unread' ? 1 : 0}`}}>
                                        mark_email_unread
                                    </span>
                                </button>
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <button onClick={() => archiveThread(activeThread.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700" title="Archivar">
                                    <span className="material-symbols-outlined">archive</span>
                                </button>
                            </div>
                        </div>

                        {/* Image Warning Banner */}
                        {!showImages && activeThread.messages.some(m => m.body.includes('<img')) && (
                            <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-6 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                                    <span className="material-symbols-outlined !text-sm">image_not_supported</span>
                                    Las imágenes se han ocultado para proteger tu privacidad.
                                </div>
                                <button 
                                    onClick={() => setShowImages(true)}
                                    className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
                                >
                                    Mostrar imágenes
                                </button>
                            </div>
                        )}

                        {/* Messages Stream */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                            {activeThread.messages.map((msg, index) => {
                                const isLast = index === activeThread.messages.length - 1;
                                const contactName = getSafeContactName(msg.from);
                                const initial = contactName.charAt(0).toUpperCase();
                                
                                return (
                                    <div key={msg.id} className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm ${isLast ? 'border-slate-200 dark:border-slate-700' : 'border-transparent opacity-90'}`}>
                                        <div className="p-4 flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                {initial}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                        {contactName} <span className="font-normal text-slate-500 text-xs">&lt;{getSafeContactEmail(msg.from)}&gt;</span>
                                                    </h4>
                                                    <span className="text-xs text-slate-400">{new Date(msg.timestamp).toLocaleString()}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mb-3">Para: {getSafeContactName(msg.to[0])}</div>
                                                
                                                {/* Safe Iframe for HTML Email */}
                                                <div className="relative w-full text-sm text-slate-700 dark:text-slate-300">
                                                    <SafeEmailFrame htmlContent={msg.body} showImages={showImages} />
                                                </div>

                                                {/* Attachments */}
                                                {msg.attachments.length > 0 && (
                                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                                                        {msg.attachments.map(att => (
                                                            <button key={att.id} onClick={() => setPreviewAttachment(att)} className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-xs font-medium">
                                                                <span className="material-symbols-outlined text-sm text-slate-400">attachment</span>
                                                                <span className="max-w-[150px] truncate">{att.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Reply Box (Fixed at Bottom) */}
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-up">
                            <div 
                                onClick={() => { setComposeMode('reply'); setComposeData({ to: [activeThread.latestMessage.from], subject: `Re: ${activeThread.latestMessage.subject}` }); }}
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 cursor-text hover:border-indigo-400 transition-colors bg-slate-50 dark:bg-slate-900/50"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-lg">reply</span>
                                </div>
                                <span className="text-sm">Responder a {getSafeContactName(activeThread.latestMessage.from)}...</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/30 text-slate-400">
                        <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-4xl opacity-50">mark_email_unread</span>
                        </div>
                        <p className="text-sm font-medium">Selecciona una conversación para leer</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {composeMode && (
                <ComposeEmailModal 
                    mode={composeMode} 
                    initialData={composeData} 
                    isOpen={!!composeMode} 
                    onClose={() => setComposeMode(null)} 
                    onSend={handleSendEmail} 
                    defaultSignature={currentSignature}
                />
            )}
            <AttachmentModal isOpen={!!previewAttachment} onClose={() => setPreviewAttachment(null)} attachment={previewAttachment} />
        </div>
    );
};

export default EmailsPage;
