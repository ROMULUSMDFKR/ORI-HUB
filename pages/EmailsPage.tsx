
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

const EmailListItem: React.FC<{ email: Email; isSelected: boolean; onSelect: () => void }> = ({ email, isSelected, onSelect }) => {
    const isUnread = email.status === 'unread';
    return (
        <li onClick={onSelect} className={`p-4 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${isSelected ? 'bg-indigo-100 dark:bg-indigo-500/10' : ''}`}>
            <div className="flex justify-between items-start">
                <p className={`text-sm font-semibold ${isUnread ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{email.from.name}</p>
                <p className={`text-xs ${isUnread ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>{new Date(email.timestamp).toLocaleDateString()}</p>
            </div>
            <p className={`text-sm mt-1 truncate ${isUnread ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{email.subject}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{email.body}</p>
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
                        <div className="flex-1 flex items-center border border-slate-300 dark:border-slate-600 rounded-lg px-3">
                            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="destinatario@ejemplo.com" className="flex-1 !border-none !ring-0 !shadow-none !p-0" />
                            <button onClick={() => setShowCcBcc(!showCcBcc)} className="ml-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold">Cc/Cco</button>
                        </div>
                    </div>
                    {showCcBcc && (
                        <>
                            <div className="flex items-center">
                                <label className="w-16 text-sm font-medium text-slate-500 dark:text-slate-400">Cc</label>
                                <input type="email" value={cc} onChange={(e) => setCc(e.target.value)} className="flex-1" />
                            </div>
                             <div className="flex items-center">
                                <label className="w-16 text-sm font-medium text-slate-500 dark:text-slate-400">Cco</label>
                                <input type="email" value={bcc} onChange={(e) => setBcc(e.target.value)} className="flex-1" />
                            </div>
                        </>
                    )}
                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto" className="w-full" />
                    <div
                        ref={bodyRef}
                        contentEditable
                        onInput={e => setBody(e.currentTarget.innerHTML)}
                        className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-lg overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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

                <div className="flex justify-between items-center p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <span className="material-symbols-outlined">attach_file</span>
                    </button>
                    <button onClick={handleSend} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                        Enviar
                        <span className="material-symbols-outlined !text-base">send</span>
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
                bcc: []
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
                bcc: []
            }
        ];

        try {
            const addedEmails: Email[] = [];
            for (const mock of mocks) {
                const res = await api.addDoc('emails', mock);
                addedEmails.push(res);
            }
            
            // IMPORTANT: Force update local state to see changes immediately without relying on useCollection re-fetch
            setAllEmailsState(prev => prev ? [...prev, ...addedEmails] : addedEmails);
            
            alert(`Sincronización simulada completada para ${selectedAccountEmail}.`);
        } catch (error) {
            console.error("Sync error:", error);
            alert("Error al sincronizar correos.");
        } finally {
            setIsSyncing(false);
        }
    };

    const loading = emailsLoading || accountsLoading;

    const renderContent = () => {
        if (loading && !allEmailsState) return <div className="flex-1 flex justify-center items-center"><Spinner /></div>;
        return (
            <>
                <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold capitalize text-slate-800 dark:text-slate-200">{FOLDER_CONFIG.find(f=>f.id === selectedFolder)?.name} ({filteredEmails.length})</h2>
                    </div>
                    <ul className="overflow-y-auto flex-1">
                        {filteredEmails.map(email => (
                            <EmailListItem key={email.id} email={email} isSelected={selectedEmailId === email.id} onSelect={() => setSelectedEmailId(email.id)} />
                        ))}
                         {filteredEmails.length === 0 && (
                            <li className="text-center text-sm text-slate-500 dark:text-slate-400 p-8">No hay correos en esta carpeta. Haz clic en el botón de sincronizar.</li>
                        )}
                    </ul>
                </div>

                <div className="w-2/3 flex flex-col bg-white dark:bg-slate-800">
                    {selectedEmail ? (
                        <>
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{selectedEmail.subject}</h3>
                                <div className="flex items-start mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    <span className="material-symbols-outlined text-lg mr-2 mt-0.5">person</span>
                                    <div>
                                        <p>De: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedEmail.from.name}</span> &lt;{selectedEmail.from.email}&gt;</p>
                                        <p>Para: {selectedEmail.to.map(t => t.name).join(', ')}</p>
                                        {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                                            <p>Cc: {selectedEmail.cc.map(t => t.name).join(', ')}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div 
                                className="flex-1 p-6 overflow-y-auto text-sm leading-relaxed text-slate-800 dark:text-slate-200 prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: selectedEmail.body.replace(/\n/g, '<br />') }}
                            />
                            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                                    <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">Archivos Adjuntos ({selectedEmail.attachments.length})</h4>
                                    <div className="space-y-2">{selectedEmail.attachments.map(att => ( <a key={att.id} href={att.url} download={att.name} className="flex items-center gap-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"><span className="material-symbols-outlined text-slate-500 dark:text-slate-400">attach_file</span><div className="flex-1"><p className="text-sm font-medium text-slate-800 dark:text-slate-200">{att.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(att.size)}</p></div><span className="material-symbols-outlined text-slate-500 dark:text-slate-400">download</span></a>))}</div>
                                </div>
                            )}
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
                                <button onClick={() => handleOpenCompose('reply', selectedEmail)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center"><span className="material-symbols-outlined mr-2 text-base">reply</span>Responder</button>
                                <button onClick={() => handleOpenCompose('forward', selectedEmail)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center"><span className="material-symbols-outlined mr-2 text-base">forward</span>Reenviar</button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
                           {filteredEmails.length > 0 ? 'Selecciona un correo para leerlo' : 'No hay correos en esta carpeta'}
                        </div>
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="w-64 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                <div className="p-4"><button onClick={() => handleOpenCompose('new')} className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-sm hover:opacity-90 transition-colors"><span className="material-symbols-outlined mr-2">edit</span>Redactar</button></div>
                
                <div className="px-4 py-2 border-y border-slate-200 dark:border-slate-700 flex items-end gap-2">
                    <div className="flex-1">
                        <CustomSelect
                            label="Cuenta"
                            options={userAccounts.map(acc => ({ value: acc.email, name: acc.email }))}
                            value={selectedAccountEmail || ''}
                            onChange={(val) => setSelectedAccountEmail(val)}
                            placeholder="Seleccionar..."
                        />
                    </div>
                    <button 
                        onClick={handleSimulateSync}
                        disabled={isSyncing} 
                        className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 mb-[2px]"
                        title="Sincronizar ahora"
                    >
                        <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                    </button>
                </div>

                <nav className="flex-1 px-2 py-2">
                    {FOLDER_CONFIG.map(folder => (
                        <button key={folder.id} onClick={() => setSelectedFolder(folder.id)} className={`w-full flex items-center p-3 rounded-lg text-left transition-colors duration-200 ${selectedFolder === folder.id ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                            <span className="material-symbols-outlined w-6 h-6 mr-3">{folder.icon}</span>
                            <span>{folder.name}</span>
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
