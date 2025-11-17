import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Invoice, InvoiceStatus, Company } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

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

const PendingPaymentsPage: React.FC = () => {
    const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>('invoices');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);

    const { pendingInvoices, totalPending, totalOverdue, avgDSO } = useMemo(() => {
        if (!invoices) return { pendingInvoices: [], totalPending: 0, totalOverdue: 0, avgDSO: 0 };
        
        const pending = invoices.filter(inv => 
            inv.status === InvoiceStatus.Enviada || 
            inv.status === InvoiceStatus.PagadaParcialmente || 
            inv.status === InvoiceStatus.Vencida
        );

        let totalPending = 0;
        let totalOverdue = 0;
        let totalReceivables = 0;
        let totalSales = 0;

        const now = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);

        invoices.forEach(inv => {
            const balance = inv.total - inv.paidAmount;
            if (pending.some(p => p.id === inv.id)) {
                totalPending += balance;
            }

            if (inv.status === InvoiceStatus.Vencida || (new Date(inv.dueDate) < now && inv.status !== InvoiceStatus.Pagada && inv.status !== InvoiceStatus.Cancelada)) {
                totalOverdue += balance;
            }

            if (new Date(inv.createdAt) > ninetyDaysAgo) {
                totalSales += inv.total;
                if (balance > 0) {
                    totalReceivables += balance;
                }
            }
        });
        
        const dso = totalSales > 0 ? (totalReceivables / totalSales) * 90 : 0;

        return { 
            pendingInvoices: pending, 
            totalPending, 
            totalOverdue, 
            avgDSO: Math.round(dso) 
        };
    }, [invoices]);

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
        { 
            header: 'Vencimiento', 
            accessor: (inv: Invoice) => {
                const isOverdue = new Date(inv.dueDate) < new Date() && inv.status !== InvoiceStatus.Pagada;
                return <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>{new Date(inv.dueDate).toLocaleDateString()}</span>;
            }
        },
        { header: 'Total', accessor: (inv: Invoice) => `$${inv.total.toLocaleString('en-US', {minimumFractionDigits: 2})}`, className: 'text-right' },
        { header: 'Pagado', accessor: (inv: Invoice) => `$${inv.paidAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}`, className: 'text-right' },
        { header: 'Saldo', accessor: (inv: Invoice) => `$${(inv.total - inv.paidAmount).toLocaleString('en-US', {minimumFractionDigits: 2})}`, className: 'text-right font-semibold' },
        { header: 'Estado', accessor: (inv: Invoice) => <Badge text={inv.status} color={getStatusColor(inv.status)} /> },
    ];

    return (
        <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Total Pendiente" value={`$${(totalPending/1000).toFixed(1)}k`} icon="hourglass_top" />
                <KpiCard title="Total Vencido" value={`$${(totalOverdue/1000).toFixed(1)}k`} icon="error" className="bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" />
                <KpiCard title="Días Promedio de Cobro (DSO)" value={`${avgDSO} días`} icon="timer" />
            </div>

            {invoicesLoading || companiesLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <Table columns={columns} data={pendingInvoices} />
            )}
        </div>
    );
};

export default PendingPaymentsPage;
