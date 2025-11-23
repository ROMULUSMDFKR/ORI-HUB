import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Contact, Company } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

const CrmContactsListPage: React.FC = () => {
    const { data: initialContacts, loading: contactsLoading, error } = useCollection<Contact>('contacts');
    const [contacts, setContacts] = useState<Contact[] | null>(null);
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { showToast } = useToast();
    const navigate = useNavigate();

    const columns = [
        { header: 'Nombre', accessor: (contact: Contact) => <span className="font-medium">{contact.name}</span> },
        { header: 'Cargo', accessor: (contact: Contact) => contact.role || '-' },
        { header: 'Email', accessor: (contact: Contact) => <a href={`mailto:${contact.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{contact.email}</a> || '-' },
        { header: 'Teléfono', accessor: (contact: Contact) => contact.phone || '-' },
        { 
            header: 'Cliente', 
            accessor: (contact: Contact) => {
                const client = companies?.find(c => c.id === contact.companyId);
                return client ? client.shortName : 'N/A';
            }
        },
    ];
    
    React.useEffect(() => {
        if(initialContacts) {
            setContacts(initialContacts);
        }
    }, [initialContacts]);

    // Sync missing primary contacts from Companies to Contacts collection
    useEffect(() => {
        const syncPrimaryContacts = async () => {
            if (!companies || !initialContacts) return;

            let syncedCount = 0;
            const existingContactMap = new Map<string, boolean>();

            // Helper key generator to detect existence
            const getKey = (companyId: string, email: string, name: string) => {
                if (email) return `${companyId}:${email.toLowerCase()}`;
                return `${companyId}:${name.toLowerCase()}`;
            };

            // Build map of existing contacts
            initialContacts.forEach(c => {
                if (c.companyId) {
                    existingContactMap.set(getKey(c.companyId, c.email || '', c.name), true);
                    // Also index just by email if available to be safer
                    if (c.email) existingContactMap.set(`email:${c.email.toLowerCase()}`, true);
                }
            });

            const promises: Promise<any>[] = [];

            for (const comp of companies) {
                if (comp.primaryContact && comp.primaryContact.name) {
                    const pc = comp.primaryContact;
                    const key = getKey(comp.id, pc.email || '', pc.name);
                    const emailKey = pc.email ? `email:${pc.email.toLowerCase()}` : null;

                    const exists = existingContactMap.has(key) || (emailKey && existingContactMap.has(emailKey));

                    if (!exists) {
                        const newContact: Contact = {
                            id: `contact-sync-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            name: pc.name,
                            email: pc.email || '',
                            phone: pc.phone || '',
                            role: pc.role || 'Contacto Principal',
                            emails: pc.emails || (pc.email ? [pc.email] : []),
                            phones: pc.phones || (pc.phone ? [pc.phone] : []),
                            companyId: comp.id,
                            ownerId: comp.ownerId || 'user-1',
                        };
                        
                        promises.push(api.addDoc('contacts', newContact));
                        syncedCount++;
                        
                        // Update map to prevent dupes if multiple similar exist in this loop
                        existingContactMap.set(key, true);
                    }
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                showToast('info', `Se sincronizaron ${syncedCount} contactos principales faltantes.`);
                // We rely on useCollection to update the list automatically via listener
            }
        };

        // Slight delay to ensure initial load is stable
        const timer = setTimeout(syncPrimaryContacts, 1000);
        return () => clearTimeout(timer);

    }, [companies, initialContacts, showToast]);

    const loading = contactsLoading || companiesLoading;

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar los contactos.</p>;
        if (!contacts || contacts.length === 0) {
            return (
                <EmptyState
                    icon="contacts"
                    title="No hay contactos"
                    message="Añade personas de contacto para mantener tu red de clientes organizada."
                    actionText="Crear Contacto"
                    onAction={() => navigate('/crm/contacts/new')}
                />
            );
        }
        return <Table columns={columns} data={contacts} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* Title removed to clean up header area */}
                <div></div> {/* Spacer */}
                <Link to="/crm/contacts/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Contacto
                </Link>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default CrmContactsListPage;