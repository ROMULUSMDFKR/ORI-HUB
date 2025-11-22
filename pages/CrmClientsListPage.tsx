

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Company, User } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const CrmClientsListPage: React.FC = () => {
    const { data: companies, loading: companiesLoading, error } = useCollection<Company>('companies');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    
    const [filter, setFilter] = useState('');
    const navigate = useNavigate();

    // Create a map of user IDs to User objects for quick lookup
    const usersMap = useMemo(() => {
        if (!users) return new Map<string, User>();
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const filteredClients = useMemo(() => {
        if (!companies) return [];
        return companies.filter(client =>
            (client.name.toLowerCase().includes(filter.toLowerCase())) ||
            (client.shortName?.toLowerCase().includes(filter.toLowerCase()))
        );
    }, [companies, filter]);

    const columns = [
        {
            header: 'Nombre',
            accessor: (client: Company) => (
                <Link to={`/crm/clients/${client.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {client.shortName || client.name}
                </Link>
            )
        },
        { header: 'Industria', accessor: (client: Company) => client.industry || '-' },
        { 
            header: 'Responsable', 
            accessor: (client: Company) => {
                const user = usersMap.get(client.ownerId);
                if (!user) return <span className="text-slate-400">N/A</span>;
                return (
                    <div className="flex items-center gap-2">
                        <img 
                            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                            alt={user.name} 
                            className="w-6 h-6 rounded-full object-cover" 
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{user.name}</span>
                    </div>
                );
            }
        },
        {
            header: 'Acciones',
            accessor: (client: Company) => (
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => navigate(`/crm/clients/${client.id}/edit`)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Editar"
                    >
                        <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];

    const loading = companiesLoading || usersLoading;

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