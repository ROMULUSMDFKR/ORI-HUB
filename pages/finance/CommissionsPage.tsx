
import React, { useState, useMemo, useEffect } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { Commission, CommissionStatus, SalesOrder, User } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import FilterButton from '../../components/ui/FilterButton';

const KpiCard: React.FC<{ title: string; value: string; icon: string; }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">{value}</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-slate-500 dark:text-slate-400">{icon}</span>
        </div>
    </div>
);

const CommissionsPage: React.FC = () => {
    const { data: initialCommissions, loading: commissionsLoading } = useCollection<Commission>('commissions');
    const { data: salesOrders, loading: soLoading } = useCollection<SalesOrder>('salesOrders');
    const { data: users, loading: usersLoading } = useCollection<User>('users');

    const [commissions, setCommissions] = useState<Commission[] | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [salespersonFilter, setSalespersonFilter] = useState('all');

    useEffect(() => {
        if (initialCommissions) {
            setCommissions(initialCommissions);
        }
    }, [initialCommissions]);

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);
    const salesOrdersMap = useMemo(() => new Map(salesOrders?.map(so => [so.id, so.companyId])), [salesOrders]);

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
            const salespersonMatch = salespersonFilter === 'all' || c.salespersonId === salespersonFilter;
            return statusMatch && salespersonMatch;
        });
    }, [commissions, statusFilter, salespersonFilter]);

    const handleMarkAsPaid = (commissionId: string) => {
        setCommissions(prev => 
            prev!.map(c => 
                c.id === commissionId 
                ? { ...c, status: CommissionStatus.Pagada, paidAt: new Date().toISOString() } 
                : c
            )
        );
    };

    const salespersonOptions = useMemo(() => {
        if (!users) return [];
        const salesRoles: User['role'][] = ['Ventas', 'Admin'];
        return users
            .filter(u => salesRoles.includes(u.role))
            .map(u => ({ value: u.id, label: u.name }));
    }, [users]);
    
    const statusOptions = Object.values(CommissionStatus).map(s => ({ value: s, label: s }));

    const columns = [
        { header: 'Vendedor', accessor: (c: Commission) => usersMap.get(c.salespersonId) || 'N/A' },
        { header: 'Orden de Venta', accessor: (c: Commission) => c.salesOrderId },
        { header: 'Monto', accessor: (c: Commission) => `$${c.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}`, className: 'text-right font-semibold' },
        { header: 'Fecha Creación', accessor: (c: Commission) => new Date(c.createdAt).toLocaleDateString() },
        { header: 'Estado', accessor: (c: Commission) => <Badge text={c.status} color={c.status === CommissionStatus.Pagada ? 'green' : 'yellow'} /> },
        { 
            header: 'Acciones', 
            accessor: (c: Commission) => (
                c.status === CommissionStatus.Pendiente ? (
                    <button onClick={() => handleMarkAsPaid(c.id)} className="bg-indigo-600 text-white text-xs font-bold py-1 px-3 rounded-full hover:bg-indigo-700">
                        Marcar como Pagada
                    </button>
                ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">Pagada el {c.paidAt ? new Date(c.paidAt).toLocaleDateString() : ''}</span>
                )
            ),
            className: 'text-center'
        },
    ];

    const loading = commissionsLoading || soLoading || usersLoading;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Gestión de Comisiones</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KpiCard title="Total Pendiente por Pagar" value={`$${totalPending.toLocaleString('en-US', {minimumFractionDigits: 2})}`} icon="hourglass_top" />
                <KpiCard title="Pagado este Mes" value={`$${paidThisMonth.toLocaleString('en-US', {minimumFractionDigits: 2})}`} icon="paid" />
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                <FilterButton label="Vendedor" options={salespersonOptions} selectedValue={salespersonFilter} onSelect={setSalespersonFilter} />
                <FilterButton label="Estado" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
            </div>

            {loading || !commissions ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <Table columns={columns} data={filteredCommissions} />
            )}
        </div>
    );
};

export default CommissionsPage;
