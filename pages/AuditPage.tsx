import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { AuditLog, User } from '../types';
import { MOCK_USERS } from '../data/mockData';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import FilterButton from '../components/ui/FilterButton';

const DateFilterButton: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    return (
        <div className="relative">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 pointer-events-none h-[42px]">
                <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">calendar_today</span>
                <span className={value ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}>
                    {value ? new Date(value + 'T00:00:00').toLocaleDateString('es-MX') : label}
                </span>
            </div>
            <input
                type="date"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
        </div>
    );
};


const AuditPage: React.FC = () => {
    const { data: auditLogs, loading, error } = useCollection<AuditLog>('auditLogs');

    const [userFilter, setUserFilter] = useState<string>('all');
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [dateFromFilter, setDateFromFilter] = useState<string>('');
    const [dateToFilter, setDateToFilter] = useState<string>('');
    
    const uniqueUsers = useMemo(() => {
        const allUsers = Object.values(MOCK_USERS);
        const seen = new Set();
        return allUsers.filter(user => {
            const duplicate = seen.has(user.id);
            seen.add(user.id);
            return !duplicate;
        });
    }, []);

    const userOptions = useMemo(() => uniqueUsers.map((user: User) => ({ value: user.id, label: user.name })), [uniqueUsers]);

    const entityTypes = useMemo(() => {
        if (!auditLogs) return [];
        return [...new Set(auditLogs.map(log => log.entity))];
    }, [auditLogs]);
    
    const entityOptions = useMemo(() => entityTypes.map(type => ({ value: type, label: type })), [entityTypes]);

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
                    <p className="font-medium text-slate-800 dark:text-slate-200">{log.action}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        en <Link to={getEntityLink(log.entity, log.entityId)} className="text-indigo-600 dark:text-indigo-400 hover:underline">{log.entity} ({log.entityId})</Link>
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
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Auditoría del Sistema</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Rastrea todos los cambios y acciones importantes realizadas en la plataforma.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                <FilterButton label="Usuario" options={userOptions} selectedValue={userFilter} onSelect={setUserFilter} allLabel="Todos" />
                <FilterButton label="Entidad" options={entityOptions} selectedValue={entityFilter} onSelect={setEntityFilter} allLabel="Todas" />
                <DateFilterButton label="Desde" value={dateFromFilter} onChange={setDateFromFilter} />
                <DateFilterButton label="Hasta" value={dateToFilter} onChange={setDateToFilter} />
                <button onClick={handleClearFilters} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Limpiar Filtros</button>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default AuditPage;