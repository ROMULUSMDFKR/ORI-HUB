
import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { AuditLog, User } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import FilterButton from '../components/ui/FilterButton';
import Drawer from '../components/ui/Drawer';
import Badge from '../components/ui/Badge';

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string; secondary?: string }> = ({ title, value, icon, color, secondary }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 flex-1">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
             <span className={`material-symbols-outlined text-2xl ${color.replace('bg-', 'text-')}`}>{icon}</span>
        </div>
        <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{title}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
            {secondary && <p className="text-xs text-slate-400 mt-0.5">{secondary}</p>}
        </div>
    </div>
);

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

const AuditDetailDrawer: React.FC<{ isOpen: boolean; onClose: () => void; log: AuditLog | null; user: User | undefined }> = ({ isOpen, onClose, log, user }) => {
    if (!log) return null;

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Detalle de Auditoría" size="lg">
            <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                     <div className={`p-3 rounded-full ${log.action.toLowerCase().includes('eliminar') || log.action.toLowerCase().includes('delete') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                         <span className="material-symbols-outlined text-xl">
                            {log.action.toLowerCase().includes('eliminar') || log.action.toLowerCase().includes('delete') ? 'delete' : 'edit_note'}
                         </span>
                     </div>
                     <div>
                         <p className="text-sm font-bold text-slate-500 uppercase">Acción</p>
                         <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{log.action}</p>
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuario</label>
                        <div className="flex items-center gap-2">
                             {user ? <img src={user.avatarUrl} className="w-6 h-6 rounded-full" alt=""/> : <span className="material-symbols-outlined text-slate-400">person</span>}
                             <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{user?.name || log.by}</span>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha y Hora</label>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{log.at.toDate().toLocaleString()}</span>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entidad Afectada</label>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{log.entity} ({log.entityId})</span>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección IP</label>
                        <span className="text-sm font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {log.ipAddress || '192.168.1.x (Simulado)'}
                        </span>
                     </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Detalles Técnicos / User Agent</label>
                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-400 break-all">
                        {log.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
                    </div>
                </div>

                {/* Simulated Diff View */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cambios Registrados (JSON Snapshot)</label>
                    <div className="p-3 bg-slate-900 text-green-400 rounded-lg font-mono text-xs overflow-x-auto">
                        <pre>{JSON.stringify({
                            action: log.action,
                            target: log.entity,
                            timestamp: log.at.toDate().toISOString(),
                            user_id: log.by,
                            status: 'success',
                            meta: {
                                ip: log.ipAddress || '127.0.0.1',
                                method: 'POST/PUT'
                            }
                        }, null, 2)}</pre>
                    </div>
                </div>
            </div>
        </Drawer>
    );
};

const AuditPage: React.FC = () => {
    const { data: auditLogs, loading: logsLoading, error: logsError } = useCollection<AuditLog>('auditLogs');
    const { data: users, loading: usersLoading, error: usersError } = useCollection<User>('users');

    const [userFilter, setUserFilter] = useState<string>('all');
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [dateFromFilter, setDateFromFilter] = useState<string>('');
    const [dateToFilter, setDateToFilter] = useState<string>('');
    
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);
    const userOptions = useMemo(() => (users || []).map((user: User) => ({ value: user.id, label: user.name })), [users]);

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
            result = result.filter(log => log.at.toDate() >= fromDate);
        }
        if (dateToFilter) {
            const toDate = new Date(dateToFilter);
            toDate.setHours(23, 59, 59, 999);
            result = result.filter(log => log.at.toDate() <= toDate);
        }
        
        return result.sort((a, b) => b.at.toDate().getTime() - a.at.toDate().getTime());

    }, [auditLogs, userFilter, entityFilter, dateFromFilter, dateToFilter]);

    // KPI Calculations
    const stats = useMemo(() => {
        const today = new Date();
        const todayLogs = filteredLogs.filter(l => l.at.toDate().getDate() === today.getDate() && l.at.toDate().getMonth() === today.getMonth());
        
        const criticalActions = ['Eliminar', 'Delete', 'Destroy', 'Baja'];
        const criticalCount = filteredLogs.filter(l => criticalActions.some(act => l.action.includes(act))).length;

        // Most active user
        const userCounts: Record<string, number> = {};
        filteredLogs.forEach(l => { userCounts[l.by] = (userCounts[l.by] || 0) + 1; });
        let topUser = '-';
        let maxCount = 0;
        Object.entries(userCounts).forEach(([uid, count]) => {
            if(count > maxCount) {
                maxCount = count;
                topUser = usersMap.get(uid)?.name || uid;
            }
        });

        return { todayCount: todayLogs.length, criticalCount, topUser };
    }, [filteredLogs, usersMap]);

    const handleClearFilters = () => {
        setUserFilter('all');
        setEntityFilter('all');
        setDateFromFilter('');
        setDateToFilter('');
    };

    const getEntityLink = (entity: string, entityId: string): string => {
        switch(entity.toLowerCase()) {
            case 'prospecto': return `/hubs/prospects/${entityId}`;
            case 'cliente': return `/crm/clients/${entityId}`;
            case 'producto': return `/products/${entityId}`;
            default: return '#';
        }
    }
    
    const getSeverityColor = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes('eliminar') || lower.includes('delete') || lower.includes('baja')) return 'red';
        if (lower.includes('editar') || lower.includes('update') || lower.includes('modificar')) return 'yellow';
        if (lower.includes('crear') || lower.includes('add') || lower.includes('alta')) return 'green';
        return 'gray';
    }

    const columns = [
        {
            header: 'Fecha y Hora',
            accessor: (log: AuditLog) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{log.at.toDate().toLocaleDateString('es-MX')}</span>
                    <span className="text-xs text-slate-500">{log.at.toDate().toLocaleTimeString('es-MX', { hour: '2-digit', minute:'2-digit' })}</span>
                </div>
            )
        },
        {
            header: 'Usuario',
            accessor: (log: AuditLog) => {
                const user = usersMap.get(log.by);
                return user ? (
                    <div className="flex items-center">
                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3 object-cover border border-slate-200 dark:border-slate-600" />
                        <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user.name}</p>
                            <p className="text-[10px] text-slate-500">{user.role}</p>
                        </div>
                    </div>
                ) : <span className="text-slate-500 italic">Usuario eliminado ({log.by})</span>;
            }
        },
        {
            header: 'Acción',
            accessor: (log: AuditLog) => <Badge text={log.action} color={getSeverityColor(log.action)} />
        },
        {
            header: 'Contexto',
            accessor: (log: AuditLog) => (
                <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{log.entity}</p>
                    <Link to={getEntityLink(log.entity, log.entityId)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-mono">
                        ID: {log.entityId.substring(0,8)}...
                    </Link>
                </div>
            )
        },
        {
            header: 'Detalles',
            accessor: (log: AuditLog) => (
                 <button 
                    onClick={() => { setSelectedLog(log); setIsDrawerOpen(true); }}
                    className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Ver inspección completa"
                >
                    <span className="material-symbols-outlined text-lg">visibility</span>
                </button>
            ),
            className: 'text-center'
        }
    ];
    
    const loading = logsLoading || usersLoading;
    const error = logsError || usersError;

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
             <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Auditoría del Sistema</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Rastrea cambios, accesos y acciones críticas para cumplimiento y seguridad.</p>
                </div>
                <button onClick={() => alert('Exportando CSV...')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-base">download</span>
                    Exportar Reporte
                </button>
            </div>

             {/* KPI Cards */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard title="Eventos Hoy" value={stats.todayCount} icon="today" color="bg-blue-500" />
                <KpiCard title="Acciones Críticas" value={stats.criticalCount} icon="warning" color="bg-red-500" secondary="Histórico total" />
                <KpiCard title="Usuario Más Activo" value={stats.topUser} icon="person_celebrate" color="bg-purple-500" />
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                <FilterButton label="Usuario" options={userOptions} selectedValue={userFilter} onSelect={setUserFilter} allLabel="Todos" />
                <FilterButton label="Entidad" options={entityOptions} selectedValue={entityFilter} onSelect={setEntityFilter} allLabel="Todas" />
                <DateFilterButton label="Desde" value={dateFromFilter} onChange={setDateFromFilter} />
                <DateFilterButton label="Hasta" value={dateToFilter} onChange={setDateToFilter} />
                <div className="flex-grow"></div>
                <button onClick={handleClearFilters} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Limpiar Filtros</button>
            </div>
            
            {renderContent()}

            <AuditDetailDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
                log={selectedLog} 
                user={selectedLog ? usersMap.get(selectedLog.by) : undefined} 
            />
        </div>
    );
};

export default AuditPage;
