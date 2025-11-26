
import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { AuditLog, User } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import FilterButton from '../components/ui/FilterButton';
import Badge from '../components/ui/Badge';

// --- Components ---

const AuditKpiCard: React.FC<{ title: string; value: string; subtext?: string; icon: string; color: string }> = ({ title, value, subtext, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 transition-all hover:shadow-md">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${color.replace('text-', 'bg-').replace('600', '100')} dark:bg-opacity-20`}>
            <span className={`material-symbols-outlined text-2xl ${color}`}>{icon}</span>
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

const DateFilterInput: React.FC<{ value: string; onChange: (val: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
    <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400 text-lg">calendar_today</span>
        </div>
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-10 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm w-full sm:w-auto cursor-pointer"
        />
    </div>
);

const AuditPage: React.FC = () => {
    const { data: auditLogs, loading: logsLoading, error: logsError } = useCollection<AuditLog>('auditLogs');
    const { data: users, loading: usersLoading, error: usersError } = useCollection<User>('users');

    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [userFilter, setUserFilter] = useState<string>('all');
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [dateFromFilter, setDateFromFilter] = useState<string>('');
    const [dateToFilter, setDateToFilter] = useState<string>('');
    
    // Data Maps
    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);
    const userOptions = useMemo(() => (users || []).map((user: User) => ({ value: user.id, label: user.name })), [users]);

    const entityTypes = useMemo(() => {
        if (!auditLogs) return [];
        return [...new Set(auditLogs.map(log => log.entity))].sort();
    }, [auditLogs]);
    
    const entityOptions = useMemo(() => entityTypes.map(type => ({ value: type, label: type })), [entityTypes]);

    // Filtering Logic
    const filteredLogs = useMemo(() => {
        if (!auditLogs) return [];
        let result = auditLogs;

        // 1. Search Term (Broad search)
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(log => 
                log.action.toLowerCase().includes(lowerTerm) ||
                log.entity.toLowerCase().includes(lowerTerm) ||
                log.entityId.toLowerCase().includes(lowerTerm) ||
                usersMap.get(log.by)?.name.toLowerCase().includes(lowerTerm)
            );
        }

        // 2. Specific Filters
        if (userFilter !== 'all') {
            result = result.filter(log => log.by === userFilter);
        }
        if (entityFilter !== 'all') {
            result = result.filter(log => log.entity === entityFilter);
        }
        if (dateFromFilter) {
            const fromDate = new Date(dateFromFilter);
            result = result.filter(log => log.at.toDate() >= fromDate);
        }
        if (dateToFilter) {
            const toDate = new Date(dateToFilter);
            toDate.setHours(23, 59, 59, 999);
            result = result.filter(log => log.at.toDate() <= toDate);
        }
        
        return result.sort((a, b) => b.at.toDate().getTime() - a.at.toDate().getTime());

    }, [auditLogs, searchTerm, userFilter, entityFilter, dateFromFilter, dateToFilter, usersMap]);

    // KPI Calculations based on Filtered Data
    const stats = useMemo(() => {
        const totalEvents = filteredLogs.length;
        
        // Most Active User
        const userCounts: Record<string, number> = {};
        filteredLogs.forEach(log => { userCounts[log.by] = (userCounts[log.by] || 0) + 1; });
        const topUserId = Object.keys(userCounts).reduce((a, b) => userCounts[a] > userCounts[b] ? a : b, '');
        const topUser = topUserId ? usersMap.get(topUserId) : null;

        // Top Action
        const actionCounts: Record<string, number> = {};
        filteredLogs.forEach(log => { actionCounts[log.action] = (actionCounts[log.action] || 0) + 1; });
        const topAction = Object.keys(actionCounts).reduce((a, b) => actionCounts[a] > actionCounts[b] ? a : b, 'N/A');

        return {
            totalEvents,
            activeUser: topUser ? topUser.name : 'N/A',
            activeUserCount: topUserId ? userCounts[topUserId] : 0,
            topAction
        };
    }, [filteredLogs, usersMap]);

    // Quick Date Handlers
    const setDateRange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setDateToFilter(end.toISOString().split('T')[0]);
        setDateFromFilter(start.toISOString().split('T')[0]);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setUserFilter('all');
        setEntityFilter('all');
        setDateFromFilter('');
        setDateToFilter('');
    };

    const getEntityLink = (entity: string, entityId: string): string => {
        switch(entity.toLowerCase()) {
            case 'prospects':
            case 'prospecto': return `/hubs/prospects/${entityId}`;
            case 'companies':
            case 'cliente': return `/crm/clients/${entityId}`;
            case 'products':
            case 'producto': return `/products/${entityId}`;
            case 'tasks':
            case 'tarea': return `/tasks/${entityId}`;
            default: return '#';
        }
    };

    const getActionColor = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes('crear') || lower.includes('add') || lower.includes('subir')) return 'green';
        if (lower.includes('actualizar') || lower.includes('edit') || lower.includes('cambio')) return 'blue';
        if (lower.includes('eliminar') || lower.includes('borrar')) return 'red';
        return 'gray';
    };

    const columns = [
        {
            header: 'Fecha y Hora',
            accessor: (log: AuditLog) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                        {log.at.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-slate-500">
                        {log.at.toDate().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            )
        },
        {
            header: 'Usuario',
            accessor: (log: AuditLog) => {
                const user = usersMap.get(log.by);
                return user ? (
                    <div className="flex items-center gap-3">
                        <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600 object-cover" />
                        <div className="flex flex-col">
                             <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{user.name}</span>
                             <span className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</span>
                        </div>
                    </div>
                ) : <span className="text-slate-500 italic">Sistema / Desconocido</span>;
            }
        },
        {
            header: 'Acción',
            accessor: (log: AuditLog) => <Badge text={log.action} color={getActionColor(log.action)} />
        },
        {
            header: 'Entidad Afectada',
            accessor: (log: AuditLog) => (
                <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{log.entity}</p>
                    <Link to={getEntityLink(log.entity, log.entityId)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-mono">
                        ID: {log.entityId.substring(0, 8)}...
                    </Link>
                </div>
            )
        },
    ];
    
    const loading = logsLoading || usersLoading;
    const error = logsError || usersError;

    if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
    if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg border border-red-200">Error al cargar los registros de auditoría.</div>;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-600">manage_search</span>
                        Registro de Auditoría
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Monitorea la actividad, seguridad y cambios en el sistema.</p>
                </div>
                <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button onClick={() => setDateRange(0)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors">Hoy</button>
                    <button onClick={() => setDateRange(7)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors border-l border-slate-200 dark:border-slate-700">7 Días</button>
                    <button onClick={() => setDateRange(30)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors border-l border-slate-200 dark:border-slate-700">30 Días</button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AuditKpiCard title="Eventos Registrados" value={stats.totalEvents.toLocaleString()} subtext="En el periodo seleccionado" icon="list_alt" color="text-blue-600" />
                <AuditKpiCard title="Usuario Más Activo" value={stats.activeUser} subtext={`${stats.activeUserCount} acciones realizadas`} icon="person_celebrate" color="text-emerald-600" />
                <AuditKpiCard title="Acción Frecuente" value={stats.topAction} subtext="Operación más común" icon="touch_app" color="text-amber-600" />
            </div>

            {/* Filters & Toolbar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 items-center justify-between">
                
                {/* Search */}
                <div className="relative w-full lg:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-slate-400 text-xl">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por ID, acción, usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-400"
                    />
                </div>

                {/* Dropdowns */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <FilterButton label="Usuario" options={userOptions} selectedValue={userFilter} onSelect={setUserFilter} allLabel="Todos" />
                    <FilterButton label="Entidad" options={entityOptions} selectedValue={entityFilter} onSelect={setEntityFilter} allLabel="Todas" />
                    
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                    
                    <DateFilterInput value={dateFromFilter} onChange={setDateFromFilter} placeholder="Desde" />
                    <span className="text-slate-400 hidden md:inline">→</span>
                    <DateFilterInput value={dateToFilter} onChange={setDateToFilter} placeholder="Hasta" />
                    
                    <button 
                        onClick={handleClearFilters}
                        className="ml-auto lg:ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                        title="Limpiar filtros"
                    >
                        <span className="material-symbols-outlined">filter_alt_off</span>
                    </button>
                </div>
            </div>
            
            {/* Content */}
            {!filteredLogs || filteredLogs.length === 0 ? (
                <EmptyState
                    icon="history_edu"
                    title="No se encontraron registros"
                    message="Intenta ajustar los filtros o el rango de fechas para ver resultados."
                    actionText="Limpiar Filtros"
                    onAction={handleClearFilters}
                />
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table columns={columns} data={filteredLogs} itemsPerPage={15} />
                </div>
            )}
        </div>
    );
};

export default AuditPage;
