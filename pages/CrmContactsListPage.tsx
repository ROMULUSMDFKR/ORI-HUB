
import React, { useState } from 'react';
import { useCollection } from '../hooks/useCollection';
// FIX: Imported Company type for correct data fetching.
import { Contact, Company } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const CrmContactsListPage: React.FC = () => {
    const { data: contacts, loading, error } = useCollection<Contact>('contacts');
    // FIX: Fetch from 'companies' collection with the correct 'Company' type.
    const { data: companies } = useCollection<Company>('companies');

    const columns = [
        { header: 'Nombre', accessor: (contact: Contact) => <span className="font-medium">{contact.name}</span> },
        { header: 'Cargo', accessor: (contact: Contact) => contact.role || '-' },
        { header: 'Email', accessor: (contact: Contact) => <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a> || '-' },
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
                    onAction={() => alert('Abrir drawer para nuevo contacto')}
                />
            );
        }
        return <Table columns={columns} data={contacts} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-text-main">Contactos</h2>
                <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Contacto
                </button>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default CrmContactsListPage;