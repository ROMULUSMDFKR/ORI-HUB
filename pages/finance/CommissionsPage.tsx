
import React, { useState, useMemo, useEffect } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { Commission, CommissionStatus, SalesOrder, User } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import FilterButton from '../../components/ui/FilterButton';

// KPI Card
const CommissionKpiCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    }[color] || "bg-slate-100 text-slate-600";

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
            </div>
        </div>
    );
};

const CommissionsPage: React.FC = () => {
    const { data: initialCommissions, loading: commissionsLoading } = useCollection<Commission>('commissions');
    const { data: users, loading: usersLoading } = useCollection<User>('users');

    const [commissions, setCommissions] = useState<Commission[] | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [salespersonSearch, setSalespersonSearch] = useState('');

    useEffect(() => {
        if (initialCommissions) {
            setCommissions(initialCommissions);
        }
    }, [initialCommissions]);

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);

    const { totalPending, paidThisMonth } = useMemo(() => {
        if (!commissions) return { totalPending: 0, paidThisMonth: 0 };
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const pending = commissions
            .filter(c => c.status === CommissionStatus.Pendiente)
            .reduce((sum, c) => sum + c.amount, 0);

        const paid = commissions
            .filter(c => 
                c.status === CommissionStatus.Pagada && 
                c.paidAt && 
                new Date(c.paidAt).getMonth() === currentMonth &&
                new Date(c.paidAt).getFullYear() === currentYear
            )
            .reduce((sum, c) => sum + c.amount, 0);

        return { totalPending: pending, paidThisMonth: paid };
    }, [commissions]);

    const filteredCommissions = useMemo(() => {
        if (!commissions) return [];
        return commissions.filter(c => {
            const statusMatch = statusFilter === 'all' || c.status === statusFilter;
            
            const salespersonName = usersMap.get(c.salespersonId) || '';
            const searchMatch = salespersonSearch 
                ? salespersonName.toLowerCase().includes(salespersonSearch.toLowerCase()) 
                : true;

            return statusMatch && searchMatch;
        }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [commissions, statusFilter, salespersonSearch, usersMap]);

    const handleMarkAsPaid = (commissionId: string) => {
        setCommissions(prev => 
            prev!.map(c => 
                c.id === commissionId 
                ? { ...c, status: CommissionStatus.Pagada, paidAt: new Date().toISOString() } 
                : c
            )
        );
        // In real app, trigger API update here
    };

    const statusOptions = Object.values(CommissionStatus).map(s => ({ value: s, label: s }));

    const columns = [
        { 
            header: 'Vendedor', 
            accessor: (c: Commission) => {
                const name = usersMap.get(c.salespersonId);
                return (
                    <div className="flex items-center gap-2">
                         <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                             {name ? name.substring(0,2).toUpperCase() : '??'}
                         </div>
                         <span className="font-medium text-slate-800 dark:text-slate-200">{name || 'N/A'}</span>
                    </div>
                )
            } 
        },
        { 
            header: 'Orden de Venta', 
            accessor: (c: Commission) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{c.salesOrderId}</span> 
        },
        { 
            header: 'Monto', 
            accessor: (c: Commission) => `$${(c.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`, 
            className: 'text-right font-bold text-slate-800 dark:text-slate-200' 
        },
        { header: 'Fecha Creación', accessor: (c: Commission) => <span className="text-sm text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span> },
        { header: 'Estado', accessor: (c: Commission) => <Badge text={c.status} color={c.status === CommissionStatus.Pagada ? 'green' : 'yellow'} /> },
        { 
            header: 'Acciones', 
            accessor: (c: Commission) => (
                c.status === CommissionStatus.Pendiente ? (
                    <button onClick={() => handleMarkAsPaid(c.id)} className="bg-indigo-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                        Pagar
                    </button>
                ) : (
                    <span className="text-xs text-slate-400 italic">
                        {c.paidAt ? `Pagado el ${new Date(c.paidAt).toLocaleDateString()}` : '-'}
                    </span>
                )
            ),
            className: 'text-center'
        },
    ];

    const loading = commissionsLoading || usersLoading;

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Comisiones</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona los pagos de incentivos a tu equipo de ventas.</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CommissionKpiCard title="Total Pendiente por Pagar" value={`$${totalPending.toLocaleString('en-US', {minimumFractionDigits: 2})}`} icon="hourglass_top" color="amber" />
                <CommissionKpiCard title="Pagado este Mes" value={`$${paidThisMonth.toLocaleString('en-US', {minimumFractionDigits: 2})}`} icon="paid" color="emerald" />
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                 {/* Input Safe Pattern */}
                <div className="relative w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar vendedor..."
                        value={salespersonSearch}
                        onChange={(e) => setSalespersonSearch(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                </div>
                
                <FilterButton label="Estado" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading || !commissions ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : filteredCommissions.length > 0 ? (
                    <Table columns={columns} data={filteredCommissions} />
                ) : (
                     <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
                            <span className="material-symbols-outlined text-4xl text-slate-400">money_off</span>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay comisiones</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">No se encontraron registros con los filtros actuales.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommissionsPage;
