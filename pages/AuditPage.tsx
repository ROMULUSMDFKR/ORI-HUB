import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { AuditLog, User } from '../types';
import { MOCK_USERS } from '../data/mockData';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';

const AuditPage: React.FC = () => {
    const { data: auditLogs, loading, error } = useCollection<AuditLog>('auditLogs');

    const [userFilter, setUserFilter] = useState<string>('all');
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [dateFromFilter, setDateFromFilter] = useState<string>('');
    const [dateToFilter, setDateToFilter] = useState<string>('');

    const entityTypes = useMemo(() => {
        if (!auditLogs) return [];
        return [...new Set(auditLogs.map(log => log.entity))];
    }, [auditLogs]);

    const filteredLogs = useMemo(() => {
        if (!auditLogs) return [];
        let result = auditLogs;

        if (userFilter !== 'all') {
            result = result.filter(log => log.by === userFilter);
        }
        if (entityFilter !== 'all') {
            result = result.filter(log => log.entity === entityFilter);
        }
        if (dateFromFilter) {
            const fromDate = new Date(dateFromFilter);
            result = result.filter(log => new Date(log.at) >= fromDate);
        }
        if (dateToFilter) {
            const toDate = new Date(dateToFilter);
            toDate.setHours(23, 59, 59, 999); // Include the whole day
            result = result.filter(log => new Date(log.at) <= toDate);
        }
        
        // Sort by most recent
        return result.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    }, [auditLogs, userFilter, entityFilter, dateFromFilter, dateToFilter]);

    const handleClearFilters = () => {
        setUserFilter('all');
        setEntityFilter('all');
        setDateFromFilter('');
        setDateToFilter('');
    };

    const getEntityLink = (entity: string, entityId: string): string => {
        switch(entity.toLowerCase()) {
            case 'prospecto':
                return `/crm/prospects/${entityId}`;
            case 'cliente':
                return `/crm/clients/${entityId}`;
            case 'producto':
                return `/products/${entityId}`;
            default:
                return '#';
        }
    }

    const columns = [
        {
            header: 'Fecha y Hora',
            accessor: (log: AuditLog) => new Date(log.at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
        },
        {
            header: 'Usuario',
            accessor: (log: AuditLog) => {
                const user = MOCK_USERS[log.by];
                return user ? (
                    <div className="flex items-center">
                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                        <span className="font-medium">{user.name}</span>
                    </div>
                ) : log.by;
            }
        },
        {
            header: 'Acción',
            accessor: (log: AuditLog) => (
                <div>
                    <p className="font-medium text-text-main">{log.action}</p>
                    <p className="text-xs text-text-secondary">
                        en <Link to={getEntityLink(log.entity, log.entityId)} className="text-primary hover:underline">{log.entity} ({log.entityId})</Link>
                    </p>
                </div>
            )
        },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar la auditoría.</p>;
        if (!filteredLogs || filteredLogs.length === 0) {
            return (
                <EmptyState
                    icon="history"
                    title="No se encontraron registros"
                    message="Ajusta los filtros o realiza acciones en el sistema para generar nuevos registros."
                    actionText="Limpiar Filtros"
                    onAction={handleClearFilters}
                />
            );
        }
        return <Table columns={columns} data={filteredLogs} />;
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-main">Auditoría del Sistema</h2>
                <p className="text-sm text-text-secondary mt-1">Rastrea todos los cambios y acciones importantes realizadas en la plataforma.</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Usuario:</label>
                    <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="bg-white text-gray-900 text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary">
                        <option value="all">Todos</option>
                        {Object.values(MOCK_USERS).map((user: User) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Entidad:</label>
                    <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="bg-white text-gray-900 text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary">
                        <option value="all">Todas</option>
                        {entityTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Desde:</label>
                    <input type="date" value={dateFromFilter} onChange={e => setDateFromFilter(e.target.value)} className="bg-white text-gray-900 text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"/>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Hasta:</label>
                    <input type="date" value={dateToFilter} onChange={e => setDateToFilter(e.target.value)} className="bg-white text-gray-900 text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"/>
                </div>
                <button onClick={handleClearFilters} className="text-sm text-primary hover:underline">Limpiar Filtros</button>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default AuditPage;
