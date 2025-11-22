
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Invoice, InvoiceStatus, Company } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';

const KpiCard: React.FC<{ title: string; value: string; icon: string; className?: string }> = ({ title, value, icon, className = 'bg-white dark:bg-slate-800' }) => (
    <div className={`p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">{value}</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-slate-500 dark:text-slate-400">{icon}</span>
        </div>
    </div>
);

const BillingPage: React.FC = () => {
    const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>('invoices');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const [statusFilter, setStatusFilter] = useState('all');

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);

    const { totalBilled, totalPending, totalOverdue } = useMemo(() => {
        if (!invoices) return { totalBilled: 0, totalPending: 0, totalOverdue: 0 };
        const now = new Date();
        return invoices.reduce((acc, inv) => {
            if (inv.status !== InvoiceStatus.Cancelada && inv.status !== InvoiceStatus.Borrador) {
                acc.totalBilled += inv.total;
            }
            if (inv.status === InvoiceStatus.Enviada || inv.status === InvoiceStatus.PagadaParcialmente || inv.status === InvoiceStatus.Vencida) {
                acc.totalPending += (inv.total - inv.paidAmount);
            }
            if (inv.status === InvoiceStatus.Vencida || (new Date(inv.dueDate) < now && inv.status !== InvoiceStatus.Pagada && inv.status !== InvoiceStatus.Cancelada)) {
                acc.totalOverdue += (inv.total - inv.paidAmount);
            }
            return acc;
        }, { totalBilled: 0, totalPending: 0, totalOverdue: 0 });
    }, [invoices]);
    
    const filteredInvoices = useMemo(() => {
        if (!invoices) return [];
        if (statusFilter === 'all') return invoices;
        return invoices.filter(inv => inv.status === statusFilter);
    }, [invoices, statusFilter]);

    const getStatusColor = (status: InvoiceStatus) => {
        switch (status) {
            case InvoiceStatus.Pagada: return 'green';
            case InvoiceStatus.Enviada: return 'blue';
            case InvoiceStatus.PagadaParcialmente: return 'yellow';
            case InvoiceStatus.Vencida: return 'red';
            default: return 'gray';
        }
    };

    const columns = [
        { header: 'Factura', accessor: (inv: Invoice) => <Link to={`/billing/${inv.id}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{inv.id}</Link> },
        { header: 'Cliente', accessor: (inv: Invoice) => companiesMap.get(inv.companyId) || 'N/A' },
        { header: 'Fecha Emisión', accessor: (inv: Invoice) => new Date(inv.createdAt).toLocaleDateString() },
        { header: 'Fecha Venc.', accessor: (inv: Invoice) => new Date(inv.dueDate).toLocaleDateString() },
        { header: 'Estado', accessor: (inv: Invoice) => <Badge text={inv.status} color={getStatusColor(inv.status)} /> },
        { header: 'Total', accessor: (inv: Invoice) => `$${(inv.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`, className: 'text-right font-semibold' },
    ];
    
    const statusOptions = Object.values(InvoiceStatus).map(s => ({ value: s, label: s }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    {/* Title is now in the main header */}
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona y monitorea el estado de tus facturas.</p>
                </div>
                <Link to="/billing/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Factura
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Total Facturado (ciclo)" value={`$${(totalBilled/1000).toFixed(1)}k`} icon="receipt_long" />
                <KpiCard title="Pendiente de Cobro" value={`$${(totalPending/1000).toFixed(1)}k`} icon="hourglass_top" />
                <KpiCard title="Facturas Vencidas" value={`$${(totalOverdue/1000).toFixed(1)}k`} icon="error" className="bg-red-5 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" />
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex items-center gap-4 border border-slate-200 dark:border-slate-700">
                 <FilterButton label="Estado" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
            </div>

            {invoicesLoading || companiesLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <Table columns={columns} data={filteredInvoices} />
            )}
        </div>
    );
};

export default BillingPage;
