
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Contact, Company, User, Note, ActivityLog } from '../types';
import Spinner from '../components/ui/Spinner';
import NotesSection from '../components/shared/NotesSection';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { usePhone } from '../contexts/PhoneContext';

const InfoCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">{title}</h3>
        <div className="space-y-3">{children}</div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 text-sm">
        <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="text-slate-800 dark:text-slate-200 font-medium text-right">{value}</dd>
    </div>
);

const ContactDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: contact, loading: contactLoading } = useDoc<Contact>('contacts', id || '');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: allNotes, loading: notesLoading } = useCollection<Note>('notes');
    
    const { makeCall } = usePhone();
    const { showToast } = useToast();
    
    const company = useMemo(() => companies?.find(c => c.id === contact?.companyId), [companies, contact]);
    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);
    const owner = useMemo(() => usersMap.get(contact?.ownerId || ''), [usersMap, contact]);

    const notes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes.filter(n => n.contactId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    const handleNoteAdded = async (note: Note) => {
        try {
            await api.addDoc('notes', note);
            showToast('success', 'Nota guardada');
        } catch (error) {
            console.error(error);
            showToast('error', 'Error al guardar nota');
        }
    };

    const loading = contactLoading || companiesLoading || usersLoading || notesLoading;

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
    if (!contact) return <div className="text-center py-12">Contacto no encontrado</div>;

    return (
        <div className="space-y-8">
             <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{contact.name}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{contact.role}</p>
                </div>
                {/* No edit page for contacts yet, handled via drawer usually */}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                     <InfoCard title="Información de Contacto">
                        <InfoRow label="Email" value={contact.email ? <a href={`mailto:${contact.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{contact.email}</a> : 'N/A'} />
                        <InfoRow 
                            label="Teléfono" 
                            value={
                                contact.phone ? (
                                    <button onClick={() => makeCall(contact.phone, contact.name)} className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 justify-end w-full">
                                        <span className="material-symbols-outlined text-sm">call</span>
                                        {contact.phone}
                                    </button>
                                ) : 'N/A'
                            } 
                        />
                        <InfoRow label="Responsable" value={owner?.name || 'N/A'} />
                        <InfoRow 
                            label="Empresa" 
                            value={
                                company ? (
                                    <Link to={`/crm/clients/${company.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                        {company.shortName || company.name}
                                    </Link>
                                ) : 'N/A'
                            } 
                        />
                    </InfoCard>
                    
                    {/* Additional phones/emails if any */}
                    {(contact.emails && contact.emails.length > 1 || contact.phones && contact.phones.length > 1) && (
                        <InfoCard title="Otros medios de contacto">
                            {contact.emails?.slice(1).map((email, idx) => (
                                <InfoRow key={`e-${idx}`} label={`Email ${idx + 2}`} value={<a href={`mailto:${email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{email}</a>} />
                            ))}
                             {contact.phones?.slice(1).map((phone, idx) => (
                                <InfoRow 
                                    key={`p-${idx}`}
                                    label={`Teléfono ${idx + 2}`} 
                                    value={
                                        <button onClick={() => makeCall(phone, contact.name)} className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 justify-end w-full">
                                            <span className="material-symbols-outlined text-sm">call</span>
                                            {phone}
                                        </button>
                                    } 
                                />
                            ))}
                        </InfoCard>
                    )}

                    <NotesSection 
                        entityId={id || ''}
                        entityType="contact"
                        notes={notes}
                        onNoteAdded={handleNoteAdded}
                    />
                </div>
                
                 {/* Right Column */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Placeholder for related entities or activity feed for contact specifically */}
                </div>
            </div>
        </div>
    );
};

export default ContactDetailPage;
