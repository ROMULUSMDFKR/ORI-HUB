
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Email, Attachment, ConnectedEmailAccount, SignatureTemplate } from '../types';
import Spinner from '../components/ui/Spinner';
import { emailFooterHtml } from '../components/emails/EmailFooter';
import CustomSelect from '../components/ui/CustomSelect';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'archived';
type ComposeMode = 'new' | 'reply' | 'forward';

// UI CONFIG
const FOLDER_CONFIG: { id: EmailFolder; name: string; icon: string }[] = [
    { id: 'inbox', name: 'Recibidos', icon: 'inbox' },
    { id: 'sent', name: 'Enviados', icon: 'send' },
    { id: 'drafts', name: 'Borradores', icon: 'drafts' },
    { id: 'archived', name: 'Archivados', icon: 'archive' },
];

const TAG_COLORS: Record<string, string> = {
    'Importante': 'bg-red-100 text-red-700 border-red-200',
    'Trabajo': 'bg-blue-100 text-blue-700 border-blue-200',
    'Personal': 'bg-green-100 text-green-700 border-green-200',
    'Pendiente': 'bg-amber-100 text-amber-700 border-amber-200',
    'Facturación': 'bg-purple-100 text-purple-700 border-purple-200',
};

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
        <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-500">{isImage ? 'image' : 'description'}</span>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-md">{attachment.name}</h3>
                        <span className="text-xs text-slate-500">({formatBytes(attachment.size)})</span>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-black/50 min-h-[300px]">
                    {isImage ? <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-full object-contain rounded shadow-lg" /> : <div className="text-center"><span className="material-symbols-outlined text-6xl text-slate-400 mb-4">insert_drive_file</span><p className="text-slate-500 dark:text-slate-400 mb-6">Vista previa no disponible.</p></div>}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-white dark:bg-slate-800">
                    <a href={attachment.url} download={attachment.name} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"><span className="material-symbols-outlined">download</span> Descargar</a>
                </div>
            </div>
        </div>
    );
};

const SafeEmailFrame: React.FC<{ htmlContent: string; showImages: boolean }> = ({ htmlContent, showImages }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                let safeContent = htmlContent || '';

                // Handle Images
                if (!showImages) {
                    // Replace src with data-src to block loading
                    safeContent = safeContent.replace(/<img([^>]*?)src=["']([^"']*)["']([^>]*?)>/gi, '<div style="padding:10px; background:#f1f5f9; border:1px dashed #cbd5e1; color:#64748b; font-size:12px; text-align:center;">[Imagen bloqueada por seguridad]</div>');
                    // Also block background images in styles
                    safeContent = safeContent.replace(/background-image:[^;]+;/gi, 'background-image: none !important;');
                    safeContent = safeContent.replace(/background:[^;]+url\([^)]+\)[^;]*;/gi, 'background: none !important;');
                }

                // Ensure links open in new tab
                if (!safeContent.includes('<base target="_blank">')) {
                     safeContent = `<base target="_blank">${safeContent}`;
                }

                // Styling injection
                const style = `
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #334155; font-size: 14px; line-height: 1.6; overflow-wrap: break-word; } 
                        a { color: #4f46e5; text-decoration: none; } 
                        a:hover { text-decoration: underline; }
                        img { max-width: 100%; height: auto; } 
                        blockquote { margin-left: 0; padding-left: 12px; border-left: 3px solid #cbd5e1; color: #64748b; }
                        /* Scrollbar styling */
                        ::-webkit-scrollbar { width: 6px; height: 6px; }
                        ::-webkit-scrollbar-track { background: transparent; }
                        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                        @media (prefers-color-scheme: dark) {
                             body { color: #cbd5e1; }
                             blockquote { border-left-color: #475569; color: #94a3b8; }
                        }
                    </style>
                `;

                doc.write(`<!DOCTYPE html><html><head>${style}</head><body>${safeContent}</body></html>`);
                doc.close();
            }
        }
    }, [htmlContent, showImages]);

    return <iframe ref={iframeRef} title="Email Content" className="w-full h-full border-none bg-transparent min-h-[300px]" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" />;
};


const EmailListItem: React.FC<{ email: Email; isSelected: boolean; onSelect: () => void; onToggleStar: (e: React.MouseEvent) => void; onArchive: (e: React.MouseEvent) => void; }> = ({ email, isSelected, onSelect, onToggleStar, onArchive }) => {
    const isUnread = email.status === 'unread';
    
    let displayContact = email.folder === 'sent' ? `Para: ${getSafeContactName(email.to?.[0])}` : getSafeContactName(email.from);
    const displaySnippet = email.snippet || (email.body ? email.body.replace(/<[^>]*>?/gm, '').substring(0, 90) + '...' : '');

    return (
        <div 
            onClick={onSelect} 
            className={`group flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 relative ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500 pl-3' : 'border-l-4 border-l-transparent pl-3'}`}
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
                 <div className="flex items-center gap-2 mt-2.5">
                    {email.attachments && email.attachments.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500 font-medium">
                            <span className="material-symbols-outlined !text-[12px] mr-1">attach_file</span> {email.attachments.length}
                        </span>
                    )}
                    {email.tags && email.tags.map(tag => (
                        <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TAG_COLORS[tag] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {tag}
                        </span>
                    ))}
                 </div>
             </div>

             {/* Hover Actions (Desktop) - Absolute Positioning */}
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
        <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <button onClick={() => onCommand('bold')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Negrita"><span className="material-symbols-outlined text-lg">format_bold</span></button>
            <button onClick={() => onCommand('italic')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Cursiva"><span className="material-symbols-outlined text-lg">format_italic</span></button>
            <button onClick={() => onCommand('underline')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Subrayado"><span className="material-symbols-outlined text-lg">format_underlined</span></button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
            <button onClick={() => onCommand('insertUnorderedList')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Lista con viñetas"><span className="material-symbols-outlined text-lg">format_list_bulleted</span></button>
            <button onClick={() => onCommand('insertOrderedList')} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Lista numerada"><span className="material-symbols-outlined text-lg">format_list_numbered</span></button>
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
    
    // Append signature logic
    useEffect(() => {
        if (!isOpen || !bodyRef.current) return;
        
        const currentHTML = bodyRef.current.innerHTML;
        // Very basic signature toggle logic
        if (useSignature && defaultSignature) {
             if (!currentHTML.includes('signature-block')) {
                 // If signature not present, append it
                 // Ideally we check if it's already there, but simple append for now
             }
        }
    }, [useSignature, defaultSignature, isOpen]);

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
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col h-[85vh] animate-slide-in-up overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">{mode === 'new' ? 'Nuevo Mensaje' : mode === 'reply' ? 'Responder' : 'Reenviar'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><span className="material-symbols-outlined text-slate-400 hover:text-slate-600">close</span></button>
                </div>
                
                {/* Fields */}
                <div className="p-4 space-y-3 bg-white dark:bg-slate-800 flex-shrink-0">
                    <div className="relative">
                        <input 
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-transparent dark:text-white" 
                            placeholder="Para: (ej. cliente@empresa.com)" 
                            value={to} 
                            onChange={e => setTo(e.target.value)} 
                        />
                        <button onClick={() => setShowCc(!showCc)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-indigo-500 font-medium">CC/BCC</button>
                    </div>
                    
                    {showCc && (
                        <div className="grid grid-cols-2 gap-3 animate-fade-in">
                            <input className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-transparent dark:text-white" placeholder="CC:" value={cc} onChange={e => setCc(e.target.value)} />
                            <input className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-transparent dark:text-white" placeholder="BCC:" value={bcc} onChange={e => setBcc(e.target.value)} />
                        </div>
                    )}

                    <input 
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-transparent dark:text-white" 
                        placeholder="Asunto" 
                        value={subject} 
                        onChange={e => setSubject(e.target.value)} 
                    />
                </div>
                
                {/* Toolbar */}
                <RichTextToolbar onCommand={handleExecCommand} />

                {/* Editor */}
                <div className="flex-1 p-4 overflow-y-auto bg-white dark:bg-slate-800">
                    <div 
                        className="w-full h-full outline-none text-sm text-slate-700 dark:text-slate-300 prose max-w-none" 
                        contentEditable 
                        ref={bodyRef}
                    />
                </div>
                
                {/* Attachments Display */}
                {attachments.length > 0 && (
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
                            {attachments.map((f, i) => (
                                <span key={i} className="text-xs bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1 text-slate-600 dark:text-slate-300 shadow-sm">
                                    <span className="material-symbols-outlined text-xs">attach_file</span>
                                    {f.name} 
                                    <button onClick={() => setAttachments(prev => prev.filter(x => x !== f))} className="hover:text-red-500 ml-1">&times;</button>
                                </span>
                            ))}
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => fileRef.current?.click()} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Adjuntar Archivo"><span className="material-symbols-outlined">attach_file</span></button>
                        <input type="file" multiple ref={fileRef} className="hidden" onChange={e => e.target.files && setAttachments([...attachments, ...Array.from(e.target.files)])} />
                        
                        {defaultSignature && (
                            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                                <input type="checkbox" checked={useSignature} onChange={e => setUseSignature(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                Incluir firma
                            </label>
                        )}
                    </div>
                    
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors">Descartar</button>
                        <button onClick={handleSend} className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-2">
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
    const { data: allAccounts, loading: accountsLoading } = useCollection<ConnectedEmailAccount>('connectedAccounts');
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
        
        // Parse variables
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
            
            // Construct query
            let query = 'limit=50';
            if (selectedFolder === 'sent') query += '&in=sent';
            else if (selectedFolder === 'archived') query += '&in=archive';
            // inbox default

            const response = await fetch(`https://api.us.nylas.com/v3/grants/${cleanGrant}/messages?${query}`, {
                headers: { 'Authorization': `Bearer ${cleanKey}`, 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error("Error de autenticación con Nylas (401). Verifica las credenciales.");
                throw new Error(`Error conectando con Nylas (${response.status})`);
            }
            
            const data = await response.json();
            
            // Map response
            const mapped: Email[] = (data.data || []).map((msg: any) => ({
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
                folder: selectedFolder,
                attachments: (msg.attachments || []).map((a: any) => ({ id: a.id, name: a.filename || 'File', size: a.size || 0, url: '#' })),
                isStarred: msg.starred || false,
                isArchived: false, // Local state until refreshed
                tags: []
            }));
            
            setNylasEmails(mapped);
        } catch (e: any) {
            console.error(e);
            setNylasError(e.message);
        } finally {
            setIsNylasLoading(false);
        }
    }, [currentAccount, selectedFolder]);

    useEffect(() => {
        if (selectedAccountId) fetchEmails();
    }, [fetchEmails, selectedAccountId]);

    // --- THREADING LOGIC ---
    const groupedThreads = useMemo(() => {
        const threads: Record<string, Email[]> = {};
        
        const filtered = nylasEmails.filter(e => {
            if (selectedFolder === 'archived') return e.isArchived; // Show only archived
            if (e.isArchived) return false; // Hide archived in other folders
            
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return e.subject.toLowerCase().includes(q) || getSafeContactName(e.from).toLowerCase().includes(q);
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
    }, [nylasEmails, selectedFolder, searchQuery]);

    const activeThread = useMemo(() => {
        if (!selectedThreadId) return null;
        return groupedThreads.find(t => t.id === selectedThreadId);
    }, [selectedThreadId, groupedThreads]);


    // --- ACTIONS ---
    const handleSendEmail = async (data: any) => {
        if (!currentAccount || !currentUser) return;
        
        // Prepare Recipients
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
            // Optionally refresh 'sent' folder if active
            if (selectedFolder === 'sent') fetchEmails();

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
        // In real Nylas, call API to update star status
    };

    const archiveThread = (threadId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setNylasEmails(prev => prev.map(email => 
            (email.threadId === threadId || email.subject === threadId) ? { ...email, isArchived: true } : email
        ));
        if (selectedThreadId === threadId) setSelectedThreadId(null);
        showToast('success', 'Conversación archivada');
        // Call API to move to folder/archive
    };
    
    const markThreadReadStatus = (threadId: string, status: 'read' | 'unread') => {
        setNylasEmails(prev => prev.map(email => 
             (email.threadId === threadId || email.subject === threadId) ? { ...email, status } : email
        ));
    };
    
    const addTagToThread = (tag: string) => {
        if (!selectedThreadId) return;
        setNylasEmails(prev => prev.map(email => 
             (email.threadId === selectedThreadId || email.subject === selectedThreadId) 
             ? { ...email, tags: [...(email.tags || []), tag] } 
             : email
        ));
        setIsTagMenuOpen(false);
        showToast('success', 'Etiqueta añadida');
    };

    // Custom Dropdown for Accounts (Opens Upwards)
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
                            onClick={() => { setSelectedFolder(folder.id); setSelectedThreadId(null); }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFolder === folder.id ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-xl">{folder.icon}</span>
                                {folder.name}
                            </div>
                            {/* Unread Count (Mock) */}
                            {folder.id === 'inbox' && (
                                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-1.5 rounded-md">
                                    {groupedThreads.filter(t => t.messages.some(m => m.status === 'unread')).length || ''}
                                </span>
                            )}
                        </button>
                    ))}
                    
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Etiquetas</p>
                        {Object.keys(TAG_COLORS).map(tag => (
                            <button key={tag} className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
                                <span className={`w-2.5 h-2.5 rounded-full ${TAG_COLORS[tag].split(' ')[0].replace('bg-', 'bg-')}`}></span>
                                {tag}
                            </button>
                        ))}
                         <button className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-slate-500 hover:text-indigo-600 rounded-lg mt-2">
                             <span className="material-symbols-outlined text-lg">add</span> Añadir nueva
                         </button>
                    </div>
                </nav>
                
                {/* Account Selector (Custom Dropdown Upwards) */}
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
                                const isUnread = thread.messages.some(m => m.status === 'unread');
                                
                                return (
                                    <li key={thread.id}>
                                        <EmailListItem 
                                            email={msg}
                                            isSelected={isSelected}
                                            onSelect={() => setSelectedThreadId(thread.id)}
                                            onToggleStar={(e) => toggleThreadStar(thread.id, e)}
                                            onArchive={(e) => archiveThread(thread.id, e)}
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* 3. READING PANE (Right) */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
                {activeThread ? (
                    <>
                        {/* Thread Header */}
                        <div className="h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 bg-white dark:bg-slate-800 sticky top-0 z-10">
                            <div className="flex-1 min-w-0 mr-4">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate" title={activeThread.latestMessage.subject}>
                                    {activeThread.latestMessage.subject}
                                </h2>
                                <div className="flex gap-2 mt-1">
                                    {activeThread.latestMessage.tags?.map(t => (
                                        <span key={t} className={`text-[10px] px-1.5 rounded border ${TAG_COLORS[t]}`}>{t}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500">
                                <div className="relative">
                                    <button onClick={() => setIsTagMenuOpen(!isTagMenuOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Añadir etiqueta">
                                        <span className="material-symbols-outlined">label</span>
                                    </button>
                                    {isTagMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-slate-200 dark:border-slate-700 z-50 py-1">
                                            {Object.keys(TAG_COLORS).map(tag => (
                                                <button key={tag} onClick={() => addTagToThread(tag)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${TAG_COLORS[tag].split(' ')[0].replace('bg-','bg-')}`}></span>
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <button onClick={(e) => toggleThreadStar(activeThread.id, e)} className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded ${activeThread.latestMessage.isStarred ? 'text-amber-400' : ''}`} title="Destacar">
                                    <span className="material-symbols-outlined" style={{fontVariationSettings: `'FILL' ${activeThread.latestMessage.isStarred ? 1 : 0}`}}>star</span>
                                </button>
                                <button onClick={() => markThreadReadStatus(activeThread.id, 'unread')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Marcar como no leído">
                                    <span className="material-symbols-outlined">mark_email_unread</span>
                                </button>
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <button onClick={() => archiveThread(activeThread.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700" title="Archivar">
                                    <span className="material-symbols-outlined">archive</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages Stream */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                            {activeThread.messages.map((msg, index) => {
                                const isLast = index === activeThread.messages.length - 1;
                                const isExpanded = isLast; 
                                const contactName = getSafeContactName(msg.from);
                                const initial = contactName.charAt(0).toUpperCase();
                                
                                return (
                                    <div key={msg.id} className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm ${isExpanded ? 'border-slate-200 dark:border-slate-700' : 'border-transparent opacity-80'}`}>
                                        <div className="p-4 flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                {initial}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                        {contactName} <span className="font-normal text-slate-500 text-xs">&lt;{getSafeContactEmail(msg.from)}&gt;</span>
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-400">{new Date(msg.timestamp).toLocaleString()}</span>
                                                        {!showImages && msg.body.includes('<img') && (
                                                            <button onClick={() => setShowImages(true)} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 flex items-center gap-1" title="Mostrar imágenes bloqueadas">
                                                                <span className="material-symbols-outlined !text-[10px]">image</span> Mostrar img
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500 mb-3">Para: {getSafeContactName(msg.to[0])}</div>
                                                
                                                {/* Body - using iframe for safe HTML rendering */}
                                                <div className="relative min-h-[100px] text-sm text-slate-700 dark:text-slate-300">
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
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
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
