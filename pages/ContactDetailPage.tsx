import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Contact, Company, Note, ActivityLog } from '../types';
import Spinner from '../components/ui/Spinner';
import { MOCK_USERS } from '../data/mockData';
import NotesSection from '../components/shared/NotesSection';

// --- Reusable UI Components ---

const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
        <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="col-span-2 text-slate-800 dark:text-slate-200 font-semibold text-right">{value}</dd>
    </div>
);

const ActivityFeed: React.FC<{ activities: ActivityLog[] }> = ({ activities }) => {
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
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No hay actividades registradas.</p>
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
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-8 ring-white dark:ring-slate-800">
                                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">{iconMap[activity.type]}</span>
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                        <div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {activity.description} por <span className="font-medium text-slate-900 dark:text-slate-200">{MOCK_USERS[activity.userId]?.name}</span>
                                            </p>
                                        </div>
                                        <div className="text-right text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
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
    const { data: allNotes } = useCollection<Note>('notes');
    
    const activities = useMemo(() => {
        if (!allActivities || !id) return [];
        return allActivities
            .filter(a => a.contactId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allActivities, id]);

    const notes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes
            .filter(n => n.contactId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    const handleNoteAdded = (note: Note) => {
        if (allNotes) {
            (allNotes as Note[]).unshift(note);
        }
    };

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
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-700 p-4 rounded-full">person</span>
                        <h2 className="text-2xl font-bold mt-4 text-slate-800 dark:text-slate-200">{contact.name}</h2>
                        <p className="text-slate-500 dark:text-slate-400">{contact.role}</p>
                        {company && (
                             <Link to={`/crm/clients/${company.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline mt-1">{company.shortName}</Link>
                        )}
                    </div>
                     <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                         <button className="w-full text-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                            Editar Contacto
                        </button>
                    </div>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Información de Contacto</h3>
                    <div className="space-y-1">
                        <InfoRow label="Email" value={contact.email ? <a href={`mailto:${contact.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{contact.email}</a> : 'N/A'} />
                        <InfoRow label="Teléfono" value={contact.phone || 'N/A'} />
                        <InfoRow label="Responsable" value={owner?.name || 'N/A'} />
                    </div>
                </div>
            </div>

            {/* Right Content */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                 <ActivityFeed activities={activities} />
                 <NotesSection 
                    entityId={contact.id}
                    entityType="contact"
                    notes={notes}
                    onNoteAdded={handleNoteAdded}
                 />
            </div>
        </div>
    );
};

export default ContactDetailPage;
