import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Contact, Company, Note, ActivityLog } from '../types';
import Spinner from '../components/ui/Spinner';
import { MOCK_USERS } from '../data/mockData';

// --- Reusable UI Components ---

const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white p-6 rounded-lg shadow-sm ${className}`}>
        <h3 className="text-lg font-semibold border-b pb-3 mb-4 text-text-main">{title}</h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-gray-100 last:border-b-0">
        <dt className="font-medium text-text-secondary">{label}</dt>
        <dd className="col-span-2 text-text-main font-semibold text-right">{value}</dd>
    </div>
);

const NoteCard: React.FC<{ note: Note }> = ({ note }) => {
    const user = MOCK_USERS[note.userId];
    return (
        <div className="bg-light-bg p-4 rounded-lg">
            <p className="text-sm text-text-main whitespace-pre-wrap">{note.text}</p>
            <div className="flex items-center text-xs text-text-secondary mt-2">
                {user && <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full mr-2" />}
                <span>{user?.name} &bull; {new Date(note.createdAt).toLocaleString()}</span>
            </div>
        </div>
    );
};


const NotesSection: React.FC<{ contactId: string }> = ({ contactId }) => {
    const { data: allNotes } = useCollection<Note>('notes');
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        if (allNotes) {
            const contactNotes = allNotes
                .filter(n => n.contactId === contactId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotes(contactNotes);
        }
    }, [allNotes, contactId]);

    const handleAddNote = () => {
        if (newNote.trim() === '') return;
        const note: Note = {
            id: `note-${Date.now()}`,
            contactId: contactId,
            text: newNote,
            userId: 'natalia', // Assuming current user is Natalia
            createdAt: new Date().toISOString(),
        };
        setNotes([note, ...notes]);
        setNewNote('');
    };

    return (
        <InfoCard title="Notas">
            <div className="space-y-4">
                <div>
                    <textarea
                        rows={3}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-container-bg text-text-main"
                        placeholder="Escribe una nueva nota..."
                    />
                    <div className="text-right mt-2">
                        <button onClick={handleAddNote} className="bg-primary text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-primary-dark">
                            Agregar Nota
                        </button>
                    </div>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {notes.length > 0 ? notes.map(note => (
                       <NoteCard key={note.id} note={note} />
                    )) : <p className="text-sm text-gray-500 text-center py-4">No hay notas para este contacto.</p>}
                </div>
            </div>
        </InfoCard>
    );
};

const ActivityFeed: React.FC<{ activities: ActivityLog[] }> = ({ activities }) => {
    // FIX: Corrected iconMap to align with ActivityLog['type'] and prevent type errors.
    const iconMap: Record<ActivityLog['type'], string> = {
        'Llamada': 'call',
        'Email': 'email',
        'Reunión': 'groups',
        'Nota': 'note',
        'Vista de Perfil': 'visibility',
        'Análisis IA': 'auto_awesome',
        'Cambio de Estado': 'change_circle',
        'Sistema': 'dns'
    };
    
    if (!activities.length) {
        return (
            <InfoCard title="Actividad Reciente">
                <p className="text-sm text-gray-500 text-center py-4">No hay actividades registradas.</p>
            </InfoCard>
        );
    }
    
    return (
        <InfoCard title="Actividad Reciente">
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    {activities.map((activity, activityIdx) => (
                        <li key={activity.id}>
                            <div className="relative pb-8">
                                {activityIdx !== activities.length - 1 ? (
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span className="h-8 w-8 rounded-full bg-light-bg flex items-center justify-center ring-8 ring-white">
                                            <span className="material-symbols-outlined text-text-secondary">{iconMap[activity.type]}</span>
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                {activity.description} por <span className="font-medium text-gray-900">{MOCK_USERS[activity.userId]?.name}</span>
                                            </p>
                                        </div>
                                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                            <time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleDateString()}</time>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </InfoCard>
    );
};

const ContactDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: contact, loading, error } = useDoc<Contact>('contacts', id || '');
    const { data: companies } = useCollection<Company>('companies');
    const { data: allActivities } = useCollection<ActivityLog>('activities');
    
    const activities = useMemo(() => {
        if (!allActivities || !id) return [];
        return allActivities
            .filter(a => a.contactId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allActivities, id]);

    const company = useMemo(() => {
        if (!contact || !companies) return null;
        return companies.find(c => c.id === contact.companyId);
    }, [contact, companies]);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !contact) return <div className="text-center p-12">Contacto no encontrado</div>;

    const owner = MOCK_USERS[contact.ownerId];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-6xl text-gray-300 bg-gray-100 p-4 rounded-full">person</span>
                        <h2 className="text-2xl font-bold mt-4">{contact.name}</h2>
                        <p className="text-text-secondary">{contact.role}</p>
                        {company && (
                             <Link to={`/crm/clients/${company.id}`} className="text-primary hover:underline mt-1">{company.shortName}</Link>
                        )}
                    </div>
                     <div className="pt-4 mt-4 border-t space-y-2">
                         <button className="w-full text-center bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-dark transition-colors">
                            Editar Contacto
                        </button>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Información de Contacto</h3>
                    <div className="space-y-1">
                        <InfoRow label="Email" value={contact.email ? <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a> : 'N/A'} />
                        <InfoRow label="Teléfono" value={contact.phone || 'N/A'} />
                        <InfoRow label="Responsable" value={owner?.name || 'N/A'} />
                    </div>
                </div>
            </div>

            {/* Right Content */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                 <ActivityFeed activities={activities} />
                 <NotesSection contactId={contact.id} />
            </div>
        </div>
    );
};

export default ContactDetailPage;