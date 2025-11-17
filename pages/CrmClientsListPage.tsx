

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
// FIX: Replaced non-existent 'Client' type with 'Company'.
import { Company } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const CrmClientsListPage: React.FC = () => {
    // FIX: Switched to fetching 'companies' collection with 'Company' type.
    const { data: companies, loading, error } = useCollection<Company>('companies');
    const [filter, setFilter] = useState('');
    const navigate = useNavigate();

    const filteredClients = useMemo(() => {
        if (!companies) return [];
        // FIX: Updated filtering logic to use 'name' instead of 'legalName'.
        return companies.filter(client =>
            (client.name.toLowerCase().includes(filter.toLowerCase())) ||
            (client.shortName?.toLowerCase().includes(filter.toLowerCase()))
        );
    }, [companies, filter]);

    const columns = [
        {
            header: 'Nombre',
            // FIX: Corrected type to 'Company' and property to 'name'.
            accessor: (client: Company) => (
                <Link to={`/crm/clients/${client.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {client.shortName || client.name}
                </Link>
            )
        },
        { header: 'Industria', accessor: (client: Company) => client.industry || '-' },
        { header: 'Responsable', accessor: (client: Company) => client.ownerId },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar los clientes.</p>;
        if (!filteredClients || filteredClients.length === 0) {
            return (
                <EmptyState
                    icon="business"
                    title="No se encontraron clientes"
                    message="Comienza creando tu primer cliente para gestionar sus datos y actividades."
                    actionText="Crear Cliente"
                    onAction={() => navigate('/crm/clients/new')}
                />
            );
        }
        return <Table columns={columns} data={filteredClients} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center w-80 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500">
                    <span className="material-symbols-outlined px-3 text-slate-500 dark:text-slate-400 pointer-events-none">
                        search
                    </span>
                    <input
                        id="client-search"
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full bg-transparent pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none search-input-field"
                    />
                </div>
                <Link to="/crm/clients/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Cliente
                </Link>
            </div>

            {renderContent()}
        </div>
    );
};

export default CrmClientsListPage;