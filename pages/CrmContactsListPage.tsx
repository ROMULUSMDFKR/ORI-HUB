import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
// FIX: Imported Company type for correct data fetching.
import { Contact, Company } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Drawer from '../components/ui/Drawer';
import CustomSelect from '../components/ui/CustomSelect';

const NewContactDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (contact: Partial<Contact>) => void;
    companies: Company[] | null;
}> = ({ isOpen, onClose, onSave, companies }) => {
    const [contact, setContact] = useState<Partial<Contact>>({});

    const handleSave = () => {
        if (contact.name && contact.email) {
            onSave(contact);
            setContact({});
            onClose();
        } else {
            alert('Nombre y Email son requeridos.');
        }
    };
    
    const companyOptions = (companies || []).map(c => ({ value: c.id, name: c.shortName || c.name }));

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Nuevo Contacto">
            <div className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label><input type="text" onChange={e => setContact(c => ({...c, name: e.target.value}))} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label><input type="email" onChange={e => setContact(c => ({...c, email: e.target.value}))} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label><input type="tel" onChange={e => setContact(c => ({...c, phone: e.target.value}))} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cargo</label><input type="text" onChange={e => setContact(c => ({...c, role: e.target.value}))} /></div>
                <CustomSelect label="Empresa" options={companyOptions} value={contact.companyId || ''} onChange={val => setContact(c => ({...c, companyId: val}))} placeholder="Seleccionar..."/>
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700"><button onClick={onClose} className="bg-slate-200 dark:bg-slate-700 py-2 px-4 rounded-lg">Cancelar</button><button onClick={handleSave} className="bg-indigo-600 text-white py-2 px-4 rounded-lg">Guardar</button></div>
            </div>
        </Drawer>
    );
}

const CrmContactsListPage: React.FC = () => {
    const { data: initialContacts, loading, error } = useCollection<Contact>('contacts');
    const [contacts, setContacts] = useState<Contact[] | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    // FIX: Fetch from 'companies' collection with the correct 'Company' type.
    const { data: companies } = useCollection<Company>('companies');

    const columns = [
        { header: 'Nombre', accessor: (contact: Contact) => <span className="font-medium">{contact.name}</span> },
        { header: 'Cargo', accessor: (contact: Contact) => contact.role || '-' },
        { header: 'Email', accessor: (contact: Contact) => <a href={`mailto:${contact.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{contact.email}</a> || '-' },
        { header: 'Teléfono', accessor: (contact: Contact) => contact.phone || '-' },
        { 
            header: 'Cliente', 
            accessor: (contact: Contact) => {
                // FIX: Used 'companyId' instead of 'clientId' to match the Contact type.
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
                    onAction={() => setIsDrawerOpen(true)}
                />
            );
        }
        return <Table columns={columns} data={contacts} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* Title removed */}
                <div></div> {/* Spacer */}
                <button onClick={() => setIsDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Contacto
                </button>
            </div>
            
            {renderContent()}
            <NewContactDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                companies={companies}
                onSave={(newContact) => {
                    const fullContact: Contact = {
                        id: `contact-${Date.now()}`,
                        ownerId: 'user-1',
                        ...newContact
                    } as Contact;
                    setContacts(prev => [...(prev || []), fullContact]);
                }}
            />
        </div>
    );
};

export default CrmContactsListPage;