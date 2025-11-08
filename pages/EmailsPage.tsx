import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Email } from '../types';
import Spinner from '../components/ui/Spinner';
import { MOCK_USERS } from '../data/mockData';

type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'trash';

const FOLDER_CONFIG: { id: EmailFolder; name: string; icon: string }[] = [
    { id: 'inbox', name: 'Recibidos', icon: 'inbox' },
    { id: 'sent', name: 'Enviados', icon: 'send' },
    { id: 'drafts', name: 'Borradores', icon: 'drafts' },
    { id: 'trash', name: 'Papelera', icon: 'delete' },
];

const EmailListItem: React.FC<{ email: Email; isSelected: boolean; onSelect: () => void }> = ({ email, isSelected, onSelect }) => {
    const isUnread = email.status === 'unread';
    return (
        <li onClick={onSelect} className={`p-4 border-b border-border cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-primary/10' : ''}`}>
            <div className="flex justify-between items-start">
                <p className={`text-sm font-semibold ${isUnread ? 'text-on-surface' : 'text-on-surface-secondary'}`}>{email.from.name}</p>
                <p className={`text-xs ${isUnread ? 'text-on-surface font-semibold' : 'text-on-surface-secondary'}`}>{new Date(email.timestamp).toLocaleDateString()}</p>
            </div>
            <p className={`text-sm mt-1 truncate ${isUnread ? 'text-on-surface' : 'text-on-surface-secondary'}`}>{email.subject}</p>
            <p className="text-xs text-on-surface-secondary mt-1 truncate">{email.body}</p>
        </li>
    );
};

const EmailsPage: React.FC = () => {
    const { data: emails, loading } = useCollection<Email>('emails');
    const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

    const filteredEmails = useMemo(() => {
        if (!emails) return [];
        return emails.filter(email => email.folder === selectedFolder).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [emails, selectedFolder]);

    const selectedEmail = useMemo(() => {
        if (!selectedEmailId || !emails) return null;
        return emails.find(e => e.id === selectedEmailId);
    }, [selectedEmailId, emails]);

    // Select the first email by default
    React.useEffect(() => {
        if (filteredEmails.length > 0) {
            // Check if the currently selected email is still in the filtered list
            const isSelectedEmailVisible = filteredEmails.some(e => e.id === selectedEmailId);
            if (!isSelectedEmailVisible) {
                setSelectedEmailId(filteredEmails[0].id);
            }
        } else {
            setSelectedEmailId(null);
        }
    }, [filteredEmails, selectedEmailId]);

    const renderContent = () => {
        if (loading) return <div className="flex-1 flex justify-center items-center"><Spinner /></div>;
        return (
            <>
                {/* Email List */}
                <div className="w-1/3 border-r border-border flex flex-col">
                    <div className="p-4 border-b border-border">
                        <h2 className="text-lg font-semibold capitalize">{FOLDER_CONFIG.find(f=>f.id === selectedFolder)?.name} ({filteredEmails.length})</h2>
                    </div>
                    <ul className="overflow-y-auto flex-1">
                        {filteredEmails.map(email => (
                            <EmailListItem
                                key={email.id}
                                email={email}
                                isSelected={selectedEmailId === email.id}
                                onSelect={() => setSelectedEmailId(email.id)}
                            />
                        ))}
                    </ul>
                </div>

                {/* Email Detail */}
                <div className="w-2/3 flex flex-col bg-surface">
                    {selectedEmail ? (
                        <>
                            <div className="p-4 border-b border-border">
                                <h3 className="text-xl font-bold">{selectedEmail.subject}</h3>
                                <div className="flex items-center mt-2 text-sm text-on-surface-secondary">
                                    <span className="material-symbols-outlined text-lg mr-2">person</span>
                                    <div>
                                        <p>De: <span className="font-semibold text-on-surface">{selectedEmail.from.name}</span> &lt;{selectedEmail.from.email}&gt;</p>
                                        <p>Para: {selectedEmail.to.map(t => t.name).join(', ')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-6 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
                                {selectedEmail.body}
                            </div>
                            <div className="p-4 border-t border-border bg-gray-50">
                                <button className="bg-surface border border-border text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 mr-2 flex items-center">
                                     <span className="material-symbols-outlined mr-2 text-base">reply</span>
                                    Responder
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                           {filteredEmails.length > 0 ? 'Selecciona un correo para leerlo' : 'No hay correos en esta carpeta'}
                        </div>
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-surface rounded-lg shadow-sm border border-border">
            {/* Folder List */}
            <div className="w-64 border-r border-border flex flex-col bg-background">
                <div className="p-4">
                    <button className="w-full bg-primary text-on-surface font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-sm hover:opacity-90 transition-colors">
                        <span className="material-symbols-outlined mr-2">edit</span>
                        Redactar
                    </button>
                </div>
                <nav className="flex-1 px-2 py-2">
                    {FOLDER_CONFIG.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => setSelectedFolder(folder.id)}
                            className={`w-full flex items-center p-3 rounded-lg text-left transition-colors duration-200 ${selectedFolder === folder.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-gray-100 text-on-surface'}`}
                        >
                            <span className="material-symbols-outlined w-6 h-6 mr-3">{folder.icon}</span>
                            <span>{folder.name}</span>
                        </button>
                    ))}
                </nav>
            </div>
            {renderContent()}
        </div>
    );
};

export default EmailsPage;