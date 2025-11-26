import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Invoice, InvoiceStatus, Company } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import FilterButton from '../../components/ui/FilterButton';

// KPI Card following "App Icon Pattern"
const PendingKpiCard: React.FC<{ title: string; value: string; icon: string; color: string; subtext?: string }> = ({ title, value, icon, color, subtext }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    }[color] || "bg-slate-100 text-slate-600";

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 transition-all hover:shadow-md">
            <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
                {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
            </div>
        </div>
    );
};

const PendingPaymentsPage: React.FC = () => {
    const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>('invoices');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);

    const { pendingInvoices, totalPending, totalOverdue, avgDSO, filteredData } = useMemo(() => {
        if (!invoices) return { pendingInvoices: [], totalPending: 0, totalOverdue: 0, avgDSO: 0, filteredData: [] };
        
        const pending = invoices.filter(inv => 
            inv.status === InvoiceStatus.Enviada || 
            inv.status === InvoiceStatus.PagadaParcialmente || 
            inv.status === InvoiceStatus.Vencida
        );

        let totalPendingCalc = 0;
        let totalOverdueCalc = 0;
        let totalReceivables = 0;
        let totalSales = 0;

        const now = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);

        invoices.forEach(inv => {
            const balance = inv.total - inv.paidAmount;
            if (pending.some(p => p.id === inv.id)) {
                totalPendingCalc += balance;
            }

            if (inv.status === InvoiceStatus.Vencida || (new Date(inv.dueDate) < now && inv.status !== InvoiceStatus.Pagada && inv.status !== InvoiceStatus.Cancelada)) {
                totalOverdueCalc += balance;
            }

            if (new Date(inv.createdAt) > ninetyDaysAgo) {
                totalSales += inv.total;
                if (balance > 0) {
                    totalReceivables += balance;
                }
            }
        });
        
        const dso = totalSales > 0 ? (totalReceivables / totalSales) * 90 : 0;
        
        // Filter Logic
        let filtered = pending;
        if (filterStatus === 'overdue') {
             filtered = filtered.filter(inv => inv.status === InvoiceStatus.Vencida || new Date(inv.dueDate) < now);
        } else if (filterStatus === 'upcoming') {
             filtered = filtered.filter(inv => new Date(inv.dueDate) >= now);
        }

        if (searchTerm) {
             filtered = filtered.filter(inv => 
                inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                companiesMap.get(inv.companyId)?.toLowerCase().includes(searchTerm.toLowerCase())
             );
        }

        return { 
            pendingInvoices: pending, 
            totalPending: totalPendingCalc, 
            totalOverdue: totalOverdueCalc, 
            avgDSO: Math.round(dso),
            filteredData: filtered.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) // Sort by Due Date
        };
    }, [invoices, filterStatus, searchTerm, companiesMap]);

    const getStatusColor = (status: InvoiceStatus, dueDate: string) => {
        if (new Date(dueDate) < new Date()) return 'red';
        switch (status) {
            case InvoiceStatus.Pagada: return 'green';
            case InvoiceStatus.Enviada: return 'blue';
            case InvoiceStatus.PagadaParcialmente: return 'yellow';
            case InvoiceStatus.Vencida: return 'red';
            default: return 'gray';
        }
    };
    
    const columns = [
        { 
            header: 'Factura', 
            accessor: (inv: Invoice) => (
                <Link to={`/billing/${inv.id}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                    {inv.id}
                </Link>
            )
        },
        { header: 'Cliente', accessor: (inv: Invoice) => <span className="font-medium text-slate-700 dark:text-slate-300">{companiesMap.get(inv.companyId) || 'N/A'}</span> },
        { 
            header: 'Vencimiento', 
            accessor: (inv: Invoice) => {
                const isOverdue = new Date(inv.dueDate) < new Date();
                return (
                    <div className="flex flex-col">
                         <span className={`font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                            {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                        {isOverdue && <span className="text-[10px] text-red-500 font-bold uppercase">Vencida</span>}
                    </div>
                );
            }
        },
        { header: 'Total', accessor: (inv: Invoice) => `$${(inv.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`, className: 'text-right text-slate-500' },
        { header: 'Saldo', accessor: (inv: Invoice) => <span className="font-bold text-slate-800 dark:text-slate-200">{`$${((inv.total || 0) - (inv.paidAmount || 0)).toLocaleString('en-US', {minimumFractionDigits: 2})}`}</span>, className: 'text-right' },
        { header: 'Estado', accessor: (inv: Invoice) => <Badge text={new Date(inv.dueDate) < new Date() ? 'Vencida' : inv.status} color={getStatusColor(inv.status, inv.dueDate)} /> },
    ];
    
    const filterOptions = [
        { value: 'all', label: 'Todas' },
        { value: 'overdue', label: 'Vencidas' },
        { value: 'upcoming', label: 'Por Vencer' },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona las cuentas por cobrar y el flujo de efectivo entrante.</p>
            </div>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PendingKpiCard title="Total Pendiente" value={`$${(totalPending/1000).toFixed(1)}k`} icon="hourglass_top" color="amber" subtext="Flujo esperado" />
                <PendingKpiCard title="Total Vencido" value={`$${(totalOverdue/1000).toFixed(1)}k`} icon="warning" color="rose" subtext="Requiere acción" />
                <PendingKpiCard title="Días Promedio Cobro (DSO)" value={`${avgDSO} días`} icon="timer" color="indigo" />
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
                        placeholder="Buscar cliente o factura..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                </div>
                
                <FilterButton 
                    label="Filtrar por" 
                    options={filterOptions} 
                    selectedValue={filterStatus} 
                    onSelect={setFilterStatus} 
                />
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {invoicesLoading || companiesLoading ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : filteredData.length > 0 ? (
                    <Table columns={columns} data={filteredData} />
                ) : (
                     <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
                            <span className="material-symbols-outlined text-4xl text-slate-400">check_circle</span>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Todo al día</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">No se encontraron pagos pendientes con los filtros actuales.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingPaymentsPage;