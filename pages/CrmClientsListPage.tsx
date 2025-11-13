

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
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Clientes</h2>
                <Link to="/crm/clients/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Cliente
                </Link>
            </div>

            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">
                    search
                </span>
                <input
                    id="client-search"
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="w-80 pl-10 pr-4"
                />
            </div>
            
            {renderContent()}
        </div>
    );
};

export default CrmClientsListPage;