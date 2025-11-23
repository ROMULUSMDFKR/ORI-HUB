
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
    { id: 'inbox', name: 'Bandeja de Entrada', icon: 'inbox' },
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

const EmailListItem: React.FC<{ email: Email; isSelected: boolean; onSelect: () => void }> = ({ email, isSelected, onSelect }) => {
    const isUnread = email.status === 'unread';
    return (
        <li 
            onClick={onSelect} 
            className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-blue-50/80 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
        >
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2 overflow-hidden">
                    {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>}
                    <p className={`text-sm truncate ${isUnread ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                        {email.from.name || email.from.email}
                    </p>
                </div>
                <p className={`text-xs whitespace-nowrap ${isUnread ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-400'}`}>
                    {new Date(email.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
            </div>
            <p className={`text-sm mb-1 truncate ${isUnread ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                {email.subject || '(Sin asunto)'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 truncate line-clamp-1">
                {email.body.replace(/<[^>]*>?/gm, '')}
            </p>
            {email.attachments && email.attachments.length > 0 && (
                <div className="mt-2 flex items-center gap-1">
                     <span className="material-symbols-outlined text-xs text-slate-400">attachment</span>
                     <span className="text-xs text-slate-400">{email.attachments.length}</span>
                </div>
            )}
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
            setTo(initialData.to?.map(r => r.email).join(', ') || '');
            setCc(initialData.cc?.map(r => r.email).join(', ') || '');
            setBcc(initialData.bcc?.map(r => r.email).join(', ') || '');
            setSubject(initialData.subject || '');
            const newBody = initialData.body || '';
            setBody(newBody);
            if (bodyRef.current) {
                bodyRef.current.innerHTML = newBody;
            }
            setShowCcBcc(!!(initialData.cc || initialData.bcc));
            setAttachments([]); // Reset attachments when modal opens
        }
    }, [isOpen, initialData]);
    
    const titleMap: Record<ComposeMode, string> = {
        'new': 'Mensaje Nuevo',
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl m-4 w-full max-w-3xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700 animate-zoom-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{titleMap[mode]}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="space-y-2">
                        <div className="flex items-center border-b border-slate-200 dark:border-slate-700 py-1">
                            <label className="w-16 text-sm font-semibold text-slate-500">Para:</label>
                            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-1" autoFocus />
                            <button onClick={() => setShowCcBcc(!showCcBcc)} className="text-xs text-slate-400 hover:text-indigo-600 font-medium px-2">Cc/Cco</button>
                        </div>
                        
                        {showCcBcc && (
                            <>
                                <div className="flex items-center border-b border-slate-200 dark:border-slate-700 py-1 animate-fade-in">
                                    <label className="w-16 text-sm font-semibold text-slate-500">Cc:</label>
                                    <input type="email" value={cc} onChange={(e) => setCc(e.target.value)} className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-1" />
                                </div>
                                 <div className="flex items-center border-b border-slate-200 dark:border-slate-700 py-1 animate-fade-in">
                                    <label className="w-16 text-sm font-semibold text-slate-500">Cco:</label>
                                    <input type="email" value={bcc} onChange={(e) => setBcc(e.target.value)} className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-1" />
                                </div>
                            </>
                        )}
                        
                        <div className="flex items-center border-b border-slate-200 dark:border-slate-700 py-1">
                            <label className="w-16 text-sm font-semibold text-slate-500">Asunto:</label>
                            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium p-1" />
                        </div>
                    </div>

                    <div
                        ref={bodyRef}
                        contentEditable
                        onInput={e => setBody(e.currentTarget.innerHTML)}
                        className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-y-auto focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm leading-relaxed"
                    />

                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                             {attachments.map(file => (
                                <div key={file.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                                    <span className="material-symbols-outlined text-slate-500 text-sm">attachment</span>
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[150px] truncate">{file.name}</span>
                                    <span className="text-[10px] text-slate-400">({formatBytes(file.size)})</span>
                                    <button onClick={() => handleRemoveAttachment(file.name)} className="ml-1 text-slate-400 hover:text-red-500">
                                        <span className="material-symbols-outlined !text-sm">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-xl">
                    <div className="flex gap-2">
                        <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Adjuntar archivo">
                            <span className="material-symbols-outlined">attach_file</span>
                        </button>
                        <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Formato">
                            <span className="material-symbols-outlined">format_color_text</span>
                        </button>
                    </div>
                    <button onClick={handleSend} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-indigo-700 flex items-center gap-2 transition-transform active:scale-95">
                        Enviar
                        <span className="material-symbols-outlined !text-lg">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};


const EmailsPage: React.FC = () => {
    const { data: allEmails, loading: emailsLoading } = useCollection<Email>('emails');
    const { data: allAccounts, loading: accountsLoading } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    const [allEmailsState, setAllEmailsState] = useState<Email[] | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    
    const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
    const [composeInitialData, setComposeInitialData] = useState<Partial<Email>>({});
    
    const [selectedAccountEmail, setSelectedAccountEmail] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const { user: currentUser } = useAuth();
    const userSignature = (currentUser as any)?.signature || '';

    useEffect(() => {
        if (allEmails) {
            setAllEmailsState(allEmails);
        }
    }, [allEmails]);
    
    const userAccounts = useMemo(() => {
        if (!allAccounts || !currentUser) return [];
        return allAccounts.filter(acc => acc.userId === currentUser.id);
    }, [allAccounts, currentUser]);

    useEffect(() => {
        if (userAccounts.length > 0 && !selectedAccountEmail) {
            setSelectedAccountEmail(userAccounts[0].email);
        }
    }, [userAccounts, selectedAccountEmail]);
    
    const currentAccount = useMemo(() => 
        userAccounts.find(acc => acc.email === selectedAccountEmail), 
    [userAccounts, selectedAccountEmail]);

    // Robust filtering logic
    const filteredEmails = useMemo(() => {
        if (!allEmailsState || !selectedAccountEmail) return [];
        const selectedEmailLower = selectedAccountEmail.toLowerCase();

        return allEmailsState
            .filter(email => {
                if (email.folder !== selectedFolder) return false;

                if (selectedFolder === 'inbox') {
                    // Check TO, CC, BCC safely
                    const isInTo = Array.isArray(email.to) && email.to.some(r => r?.email?.toLowerCase() === selectedEmailLower);
                    const isInCc = Array.isArray(email.cc) && email.cc.some(r => r?.email?.toLowerCase() === selectedEmailLower);
                    const isInBcc = Array.isArray(email.bcc) && email.bcc.some(r => r?.email?.toLowerCase() === selectedEmailLower);
                    return isInTo || isInCc || isInBcc;
                }
                
                // For sent, drafts, trash
                return email.from?.email?.toLowerCase() === selectedEmailLower;
            })
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [allEmailsState, selectedFolder, selectedAccountEmail]);

    const selectedEmail = useMemo(() => {
        if (!selectedEmailId || !allEmailsState) return null;
        return allEmailsState.find(e => e.id === selectedEmailId);
    }, [selectedEmailId, allEmailsState]);

    useEffect(() => {
        if (filteredEmails.length > 0) {
            const isSelectedEmailVisible = filteredEmails.some(e => e.id === selectedEmailId);
            if (!isSelectedEmailVisible) {
                setSelectedEmailId(filteredEmails[0].id);
            }
        } else {
            setSelectedEmailId(null);
        }
    }, [filteredEmails, selectedEmailId]);
    
    const handleOpenCompose = (mode: ComposeMode, baseEmail?: Email) => {
        const fullSignatureAndFooter = `${userSignature}<br /><br />${emailFooterHtml}`;
        let data: Partial<Email> = { body: `<br /><br />${fullSignatureAndFooter}` };

        if (mode === 'reply' && baseEmail) {
            data = {
                to: [baseEmail.from],
                subject: `Re: ${baseEmail.subject}`,
                body: `<br /><br />${fullSignatureAndFooter}<br /><br /><div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px;">---- Mensaje Original ----<br />De: ${baseEmail.from.name} &lt;${baseEmail.from.email}&gt;<br />Enviado: ${new Date(baseEmail.timestamp).toLocaleString('es-ES')}<br />Asunto: ${baseEmail.subject}<br /><br />${baseEmail.body.replace(/\n/g, '<br />')}</div>`,
            };
        } else if (mode === 'forward' && baseEmail) {
            data = {
                to: [],
                subject: `Fwd: ${baseEmail.subject}`,
                body: `<br /><br />${fullSignatureAndFooter}<br /><br /><div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px;">---------- Mensaje reenviado ----------<br />De: ${baseEmail.from.name} &lt;${baseEmail.from.email}&gt;<br />Fecha: ${new Date(baseEmail.timestamp).toLocaleString('es-ES')}<br />Asunto: ${baseEmail.subject}<br />Para: ${baseEmail.to.map(t => t.email).join(', ')}<br /><br />${baseEmail.body.replace(/\n/g, '<br />')}</div>`,
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
        if (!selectedAccountEmail || !currentUser) return;
        
        const newAttachments: Attachment[] = emailData.attachments.map(file => ({
            id: `att-${Date.now()}-${file.name}`,
            name: file.name,
            size: file.size,
            url: '#'
        }));

        const newEmail: Omit<Email, 'id'> = {
            from: { name: currentUser.name, email: selectedAccountEmail },
            to: stringToRecipients(emailData.to),
            cc: stringToRecipients(emailData.cc || ''),
            bcc: stringToRecipients(emailData.bcc || ''),
            subject: emailData.subject,
            body: emailData.body,
            timestamp: new Date().toISOString(),
            status: 'read',
            folder: 'sent',
            attachments: newAttachments,
        };

        try {
            const addedEmail = await api.addDoc('emails', newEmail);
            setAllEmailsState(prev => (prev ? [...prev, addedEmail] : [addedEmail]));
            handleCloseCompose();
            setSelectedFolder('sent');
            setTimeout(() => setSelectedEmailId(addedEmail.id), 0);
        } catch (error) {
            console.error("Error sending email:", error);
            alert("Error al enviar el correo.");
        }
    };

    const handleSimulateSync = async () => {
        if (!selectedAccountEmail || !currentUser) {
            alert("Por favor selecciona una cuenta primero.");
            return;
        }
        setIsSyncing(true);

        // Generate Mock Data specifically for the SELECTED account
        const mocks: Omit<Email, 'id'>[] = [
            {
                from: { name: "Soporte Google", email: "support@google.com" },
                to: [{ name: currentUser.name, email: selectedAccountEmail }],
                subject: "Alerta de seguridad crítica (Simulacro)",
                body: `Este es un correo simulado para la cuenta ${selectedAccountEmail}. Se ha detectado un nuevo inicio de sesión.`,
                timestamp: new Date().toISOString(),
                status: 'unread',
                folder: 'inbox',
                cc: [],
                bcc: [],
                attachments: []
            },
            {
                from: { name: "Cliente Importante", email: "ceo@bigcorp.com" },
                to: [{ name: currentUser.name, email: selectedAccountEmail }],
                subject: "Propuesta Revisada",
                body: "Hola, he revisado la propuesta y tengo algunos comentarios. ¿Podemos agendar una llamada?",
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                status: 'read',
                folder: 'inbox',
                cc: [],
                bcc: [],
                attachments: []
            }
        ];

        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const addedEmails: Email[] = [];
            for (const mock of mocks) {
                const res = await api.addDoc('emails', mock);
                addedEmails.push(res);
            }
            setAllEmailsState(prev => prev ? [...prev, ...addedEmails] : addedEmails);
            // No alert, just update UI
        } catch (error) {
            console.error("Sync error:", error);
            alert("Error al sincronizar correos.");
        } finally {
            setIsSyncing(false);
        }
    };

    const loading = emailsLoading || accountsLoading;

    const renderContent = () => {
        if (loading && !allEmailsState) return <div className="flex-1 flex justify-center items-center bg-white dark:bg-slate-900"><Spinner /></div>;
        
        return (
            <div className="flex-1 flex h-full overflow-hidden">
                {/* Column 2: Email List */}
                <div className="w-80 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0">
                        <h2 className="text-lg font-bold capitalize text-slate-800 dark:text-slate-200">{FOLDER_CONFIG.find(f=>f.id === selectedFolder)?.name}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{filteredEmails.length} mensajes</p>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filteredEmails.length > 0 ? (
                            <ul>
                                {filteredEmails.map(email => (
                                    <EmailListItem key={email.id} email={email} isSelected={selectedEmailId === email.id} onSelect={() => setSelectedEmailId(email.id)} />
                                ))}
                            </ul>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
                                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                                <p className="text-sm">Bandeja vacía</p>
                                <button onClick={handleSimulateSync} disabled={isSyncing} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 flex items-center gap-2 transition-colors">
                                     <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                                     {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                                </button>
                             </div>
                        )}
                    </div>
                </div>

                {/* Column 3: Reading Pane */}
                <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 relative">
                    {selectedEmail ? (
                        <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto">
                             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-full flex flex-col">
                                {/* Header */}
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{selectedEmail.subject}</h3>
                                        <div className="flex gap-2">
                                            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="Archivar"><span className="material-symbols-outlined">archive</span></button>
                                            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="Eliminar"><span className="material-symbols-outlined">delete</span></button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                                                {selectedEmail.from.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedEmail.from.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">&lt;{selectedEmail.from.email}&gt;</p>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Para: {selectedEmail.to.map(t => t.name || t.email).join(', ')}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(selectedEmail.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Body */}
                                <div 
                                    className="flex-1 p-8 text-sm leading-7 text-slate-700 dark:text-slate-300 font-sans"
                                    dangerouslySetInnerHTML={{ __html: selectedEmail.body.replace(/\n/g, '<br />') }}
                                />

                                {/* Footer / Attachments */}
                                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl border-t border-slate-100 dark:border-slate-700">
                                    {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                        <div className="mb-6">
                                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Adjuntos ({selectedEmail.attachments.length})</h4>
                                            <div className="flex flex-wrap gap-3">
                                                {selectedEmail.attachments.map(att => (
                                                    <a key={att.id} href={att.url} download={att.name} className="flex items-center gap-3 p-2 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow group">
                                                        <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded flex items-center justify-center text-red-500">
                                                            <span className="material-symbols-outlined">description</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">{att.name}</p>
                                                            <p className="text-xs text-slate-400">{formatBytes(att.size)}</p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500 ml-2">download</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex gap-3">
                                        <button onClick={() => handleOpenCompose('reply', selectedEmail)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                            <span className="material-symbols-outlined text-lg">reply</span> Responder
                                        </button>
                                        <button onClick={() => handleOpenCompose('forward', selectedEmail)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                            <span className="material-symbols-outlined text-lg">forward</span> Reenviar
                                        </button>
                                    </div>
                                </div>
                             </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                             <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                                <span className="material-symbols-outlined text-5xl text-slate-300">mail_outline</span>
                             </div>
                             <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Selecciona un correo para leer</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh-80px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm mx-auto max-w-[1600px]">
            {/* Column 1: Navigation */}
            <div className="w-64 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
                <div className="p-4">
                    <button 
                        onClick={() => handleOpenCompose('new')} 
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all transform active:scale-95"
                    >
                        <span className="material-symbols-outlined">edit_square</span>
                        Redactar
                    </button>
                </div>
                
                <div className="px-4 mb-4">
                    <div className="mb-2">
                         <CustomSelect
                            options={userAccounts.map(acc => ({ value: acc.email, name: acc.email }))}
                            value={selectedAccountEmail || ''}
                            onChange={(val) => setSelectedAccountEmail(val)}
                            placeholder="Cuenta..."
                            buttonClassName="w-full text-xs py-2 px-2 border rounded bg-white dark:bg-slate-800 text-left"
                        />
                        {currentAccount && (
                            <div className="mt-2 flex items-center gap-2 pl-1">
                                <span className={`w-2 h-2 rounded-full ${currentAccount.status === 'Conectado' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {currentAccount.status === 'Conectado' ? 'Conectado' : 'Error de conexión'}
                                </span>
                                <button onClick={handleSimulateSync} disabled={isSyncing} className="ml-auto p-1 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" title="Sincronizar">
                                    <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin' : ''}`}>refresh</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
                    {FOLDER_CONFIG.map(folder => (
                        <button 
                            key={folder.id} 
                            onClick={() => setSelectedFolder(folder.id)} 
                            className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${selectedFolder === folder.id ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined">{folder.icon}</span>
                                <span>{folder.name}</span>
                            </div>
                            {folder.id === 'inbox' && (
                                <span className="text-xs bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-full font-bold">
                                    {allEmailsState?.filter(e => e.folder === 'inbox' && e.status === 'unread').length || 0}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>
            
            {renderContent()}

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
