
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Email, Attachment, ConnectedEmailAccount } from '../types';
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
        const email = emailStr.trim();
        if (!email) return null;
        return { name: email.split('@')[0], email };
    }).filter(Boolean) as { name: string; email: string; }[];
};

const formatDateSmart = (isoDate: string) => {
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

const SafeEmailFrame: React.FC<{ htmlContent: string }> = ({ htmlContent }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                let safeContent = htmlContent || '';
                // Simple heuristic: if no HTML tags, wrap line breaks
                if (!/<[a-z][\s\S]*>/i.test(safeContent)) {
                    safeContent = safeContent.replace(/\r\n/g, '<br/>').replace(/\n/g, '<br/>');
                }
                doc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #334155; font-size: 14px; line-height: 1.6; overflow-wrap: break-word; } a { color: #4f46e5; } img { max-width: 100%; height: auto; } blockquote { margin-left: 0; padding-left: 12px; border-left: 3px solid #cbd5e1; color: #64748b; }</style><base target="_blank"></head>
                    <body>${safeContent}</body>
                    </html>
                `);
                doc.close();
            }
        }
    }, [htmlContent]);
    return <iframe ref={iframeRef} title="Email Content" className="w-full h-full border-none bg-transparent" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" />;
};


const EmailListItem: React.FC<{ email: Email; isSelected: boolean; onSelect: () => void; onToggleStar: (e: React.MouseEvent) => void; onArchive: (e: React.MouseEvent) => void; }> = ({ email, isSelected, onSelect, onToggleStar, onArchive }) => {
    const isUnread = email.status === 'unread';
    
    let displayContact = email.folder === 'sent' ? `Para: ${getSafeContactName(email.to[0] || email.to)}` : getSafeContactName(email.from);
    const displaySnippet = email.snippet || (email.body ? email.body.replace(/<[^>]*>?/gm, '').substring(0, 80) + '...' : '');

    return (
        <div 
            onClick={onSelect} 
            className={`group flex items-start gap-3 p-3 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 relative ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
        >
             {/* Checkbox / Avatar Area */}
             <div className="flex flex-col items-center gap-2 pt-1">
                <button onClick={onToggleStar} className={`text-slate-300 hover:text-amber-400 transition-colors ${email.isStarred ? 'text-amber-400' : ''}`}>
                    <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: `'FILL' ${email.isStarred ? 1 : 0}`}}>star</span>
                </button>
             </div>
             
             <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-baseline mb-0.5">
                     <h4 className={`text-sm truncate ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                         {displayContact}
                     </h4>
                     <span className={`text-xs whitespace-nowrap ml-2 ${isUnread ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>
                         {formatDateSmart(email.timestamp)}
                     </span>
                 </div>
                 
                 <p className={`text-xs truncate mb-1 ${isUnread ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                     {email.subject || '(Sin asunto)'}
                 </p>
                 <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                     {displaySnippet}
                 </p>

                 <div className="flex items-center gap-2 mt-2">
                    {email.attachments && email.attachments.length > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500">
                            <span className="material-symbols-outlined !text-[12px] mr-1">attach_file</span> {email.attachments.length}
                        </span>
                    )}
                    {email.tags && email.tags.map(tag => (
                        <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded border ${TAG_COLORS[tag] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {tag}
                        </span>
                    ))}
                 </div>
             </div>

             {/* Hover Actions (Desktop) */}
             <div className="absolute right-2 top-2 hidden group-hover:flex bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600 rounded-lg p-1">
                 <button onClick={onArchive} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" title="Archivar">
                     <span className="material-symbols-outlined text-lg">archive</span>
                 </button>
                 <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Eliminar">
                     <span className="material-symbols-outlined text-lg">delete</span>
                 </button>
             </div>
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
}

const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({ mode, initialData, isOpen, onClose, onSend }) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTo(Array.isArray(initialData.to) ? initialData.to.map((r:any) => getSafeContactEmail(r)).join(', ') : '');
            setSubject(initialData.subject || '');
            setBody(initialData.body || '');
            if(bodyRef.current) bodyRef.current.innerHTML = initialData.body || '';
            setAttachments([]);
        }
    }, [isOpen, initialData]);

    const handleSend = () => {
        if (!to) return alert('Falta destinatario');
        onSend({ to, subject, body, attachments });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[80vh] animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">{mode === 'new' ? 'Nuevo Mensaje' : mode === 'reply' ? 'Responder' : 'Reenviar'}</h3>
                    <button onClick={onClose}><span className="material-symbols-outlined text-slate-400 hover:text-slate-600">close</span></button>
                </div>
                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    <input className="w-full border-b border-slate-200 dark:border-slate-700 bg-transparent py-2 outline-none text-sm" placeholder="Para" value={to} onChange={e => setTo(e.target.value)} />
                    <input className="w-full border-b border-slate-200 dark:border-slate-700 bg-transparent py-2 outline-none text-sm font-medium" placeholder="Asunto" value={subject} onChange={e => setSubject(e.target.value)} />
                    <div 
                        className="w-full min-h-[200px] outline-none text-sm text-slate-700 dark:text-slate-300" 
                        contentEditable 
                        ref={bodyRef}
                        onInput={e => setBody(e.currentTarget.innerHTML)}
                    />
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                             {attachments.map(f => <span key={f.name} className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1">{f.name} <button onClick={() => setAttachments(prev => prev.filter(x => x !== f))} className="hover:text-red-500">&times;</button></span>)}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
                    <div className="flex gap-2">
                        <button onClick={() => fileRef.current?.click()} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><span className="material-symbols-outlined">attach_file</span></button>
                        <input type="file" multiple ref={fileRef} className="hidden" onChange={e => e.target.files && setAttachments([...attachments, ...Array.from(e.target.files)])} />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Descartar</button>
                        <button onClick={handleSend} className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-colors">Enviar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

const EmailsPage: React.FC = () => {
    const { data: allAccounts, loading: accountsLoading } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();

    // State
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
    
    // Threading State
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null); // Now selecting THREADS
    const [searchQuery, setSearchQuery] = useState('');
    
    // Data State
    const [nylasEmails, setNylasEmails] = useState<Email[]>([]);
    const [isNylasLoading, setIsNylasLoading] = useState(false);
    const [nylasError, setNylasError] = useState<string | null>(null);
    
    // Compose State
    const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
    const [composeData, setComposeData] = useState<Partial<Email>>({});
    
    // Attachment Preview
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
    
    // Tagging
    const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);

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
            let query = 'limit=100';
            if (selectedFolder === 'sent') query += '&in=sent';
            else if (selectedFolder === 'archived') query += '&in=archive';
            // else query += '&in=inbox'; // Default for inbox

            const response = await fetch(`https://api.us.nylas.com/v3/grants/${cleanGrant}/messages?${query}`, {
                headers: { 'Authorization': `Bearer ${cleanKey}`, 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Error connecting to Nylas');
            
            const data = await response.json();
            
            // Map response
            const mapped: Email[] = (data.data || []).map((msg: any) => ({
                id: msg.id,
                threadId: msg.thread_id || msg.subject, // Fallback grouping
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
    // Group emails by threadId (or subject if missing)
    const groupedThreads = useMemo(() => {
        const threads: Record<string, Email[]> = {};
        
        // 1. Filter first
        const filtered = nylasEmails.filter(e => {
            if (selectedFolder === 'archived') return e.isArchived;
            if (selectedFolder !== 'archived' && e.isArchived) return false; // Don't show archived in inbox
            
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return e.subject.toLowerCase().includes(q) || getSafeContactName(e.from).toLowerCase().includes(q);
            }
            return true;
        });

        // 2. Group
        filtered.forEach(email => {
            const key = email.threadId || email.subject; // Grouping key
            if (!threads[key]) threads[key] = [];
            threads[key].push(email);
        });

        // 3. Sort threads by most recent email
        return Object.entries(threads)
            .map(([id, msgs]) => ({
                id,
                messages: msgs.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), // Oldest first inside thread
                latestMessage: msgs[msgs.length - 1]
            }))
            .sort((a, b) => new Date(b.latestMessage.timestamp).getTime() - new Date(a.latestMessage.timestamp).getTime()); // Newest thread top
    }, [nylasEmails, selectedFolder, searchQuery]);

    // Currently active thread data
    const activeThread = useMemo(() => {
        if (!selectedThreadId) return null;
        return groupedThreads.find(t => t.id === selectedThreadId);
    }, [selectedThreadId, groupedThreads]);


    // --- ACTIONS ---
    const handleSendEmail = async (data: any) => {
        if (!currentAccount || !currentUser) return;
        
        // Construct payload for Nylas v3
        const payload = {
            subject: data.subject,
            body: data.body,
            to: stringToRecipients(data.to),
            cc: stringToRecipients(data.cc || ''),
            bcc: stringToRecipients(data.bcc || '')
        };
        
        try {
            if (currentAccount.provider === 'nylas' && currentAccount.nylasConfig) {
                 const { grantId, apiKey } = currentAccount.nylasConfig;
                 const res = await fetch(`https://api.us.nylas.com/v3/grants/${grantId.trim()}/messages/send`, {
                     method: 'POST',
                     headers: { 'Authorization': `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
                     body: JSON.stringify(payload)
                 });
                 if (!res.ok) throw new Error('Error sending via Nylas');
            } else {
                // Mock send for non-connected accounts
                await api.addDoc('emails', { ...payload, from: {name: currentUser.name, email: currentAccount.email}, folder: 'sent', timestamp: new Date().toISOString(), status: 'read' });
            }
            showToast('success', 'Correo enviado exitosamente.');
            setComposeMode(null);
        } catch (e) {
            console.error(e);
            showToast('error', 'No se pudo enviar el correo.');
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
            (email.threadId === threadId || email.subject === threadId) ? { ...email, isArchived: true } : email
        ));
        if (selectedThreadId === threadId) setSelectedThreadId(null);
        showToast('success', 'Conversación archivada');
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
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            
            {/* 1. NAVIGATION SIDEBAR (Compact) */}
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
                            {/* Count Mock */}
                            {folder.id === 'inbox' && groupedThreads.length > 0 && (
                                <span className="text-xs font-bold">{groupedThreads.filter(t => t.messages.some(m => m.status === 'unread')).length || ''}</span>
                            )}
                        </button>
                    ))}
                    
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Etiquetas</p>
                        {Object.keys(TAG_COLORS).map(tag => (
                            <button key={tag} className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
                                <span className={`w-2 h-2 rounded-full ${TAG_COLORS[tag].split(' ')[0].replace('bg-', 'bg-')}`}></span>
                                {tag}
                            </button>
                        ))}
                    </div>
                </nav>
                
                {/* Account Selector */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <CustomSelect 
                        options={userAccounts.map(acc => ({ value: acc.id, name: acc.email }))}
                        value={selectedAccountId || ''}
                        onChange={setSelectedAccountId}
                        placeholder="Cuenta..."
                        buttonClassName="w-full text-xs py-2 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300"
                    />
                </div>
            </div>

            {/* 2. THREAD LIST (Middle) */}
            <div className="w-80 lg:w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800">
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
                    <button onClick={() => fetchEmails()} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><span className="material-symbols-outlined text-lg">refresh</span></button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {isNylasLoading ? (
                        <div className="py-12 flex justify-center"><Spinner /></div>
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
                                    <li 
                                        key={thread.id}
                                        onClick={() => setSelectedThreadId(thread.id)}
                                        className={`p-3 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700 group relative ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="flex justify-between mb-1">
                                            <span className={`text-sm truncate max-w-[70%] ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                {getSafeContactName(selectedFolder === 'sent' ? msg.to[0] : msg.from)}
                                                {thread.messages.length > 1 && <span className="text-xs text-slate-400 font-normal ml-1">({thread.messages.length})</span>}
                                            </span>
                                            <span className={`text-[10px] ${isUnread ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                                                {formatDateSmart(msg.timestamp)}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate mb-1 ${isUnread ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>{msg.subject}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">{msg.snippet}</p>
                                        
                                        {/* Hover Actions */}
                                        <div className="absolute right-2 top-8 hidden group-hover:flex bg-white dark:bg-slate-800 shadow-md rounded-lg border border-slate-200 dark:border-slate-600">
                                            <button onClick={(e) => archiveThread(thread.id, e)} className="p-1.5 hover:text-indigo-600 text-slate-400"><span className="material-symbols-outlined text-sm">archive</span></button>
                                            <button onClick={(e) => toggleThreadStar(thread.id, e)} className={`p-1.5 hover:text-amber-500 ${msg.isStarred ? 'text-amber-500' : 'text-slate-400'}`}><span className="material-symbols-outlined text-sm" style={{fontVariationSettings: `'FILL' ${msg.isStarred ? 1 : 0}`}}>star</span></button>
                                            <button onClick={(e) => { e.stopPropagation(); markThreadReadStatus(thread.id, isUnread ? 'read' : 'unread'); }} className="p-1.5 hover:text-blue-600 text-slate-400"><span className="material-symbols-outlined text-sm">{isUnread ? 'drafts' : 'mark_email_unread'}</span></button>
                                        </div>
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
                        {/* Thread Header / Toolbar */}
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
                                <button onClick={() => setIsTagMenuOpen(!isTagMenuOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded relative">
                                    <span className="material-symbols-outlined">label</span>
                                    {isTagMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-slate-200 dark:border-slate-700 z-50 py-1">
                                            {Object.keys(TAG_COLORS).map(tag => (
                                                <button key={tag} onClick={() => addTagToThread(tag)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">{tag}</button>
                                            ))}
                                        </div>
                                    )}
                                </button>
                                <button onClick={() => toggleThreadStar(activeThread.id, {} as any)} className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded ${activeThread.latestMessage.isStarred ? 'text-amber-500' : ''}`}>
                                    <span className="material-symbols-outlined" style={{fontVariationSettings: `'FILL' ${activeThread.latestMessage.isStarred ? 1 : 0}`}}>star</span>
                                </button>
                                <button onClick={() => markThreadReadStatus(activeThread.id, 'unread')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Marcar no leído">
                                    <span className="material-symbols-outlined">mark_email_unread</span>
                                </button>
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <button onClick={() => archiveThread(activeThread.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Archivar">
                                    <span className="material-symbols-outlined">archive</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages Stream */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                            {activeThread.messages.map((msg, index) => {
                                const isLast = index === activeThread.messages.length - 1;
                                const isExpanded = isLast; // Auto-expand latest
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
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{contactName} <span className="font-normal text-slate-500 text-xs">&lt;{getSafeContactEmail(msg.from)}&gt;</span></h4>
                                                    <span className="text-xs text-slate-400">{new Date(msg.timestamp).toLocaleString()}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mb-3">Para: {getSafeContactName(msg.to[0])}</div>
                                                
                                                {/* Body - using iframe for safe HTML rendering */}
                                                <div className="relative min-h-[100px] text-sm text-slate-700 dark:text-slate-300">
                                                    <SafeEmailFrame htmlContent={msg.body} />
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
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 cursor-text hover:border-indigo-400 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
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
                />
            )}
            <AttachmentModal isOpen={!!previewAttachment} onClose={() => setPreviewAttachment(null)} attachment={previewAttachment} />
        </div>
    );
};

export default EmailsPage;
