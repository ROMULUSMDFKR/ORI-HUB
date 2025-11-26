
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Invoice, InvoiceStatus, Company } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';

// --- Components ---

// App Icon Pattern for KPIs
const BillingKpiCard: React.FC<{ title: string; value: string; icon: string; color: string; subtext?: string }> = ({ title, value, icon, color, subtext }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
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

const BillingPage: React.FC = () => {
    const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>('invoices');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    
    // State for filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState('this_month'); // Placeholder logic for UI

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
        
        let result = invoices;

        // Filter by Status
        if (statusFilter !== 'all') {
            result = result.filter(inv => inv.status === statusFilter);
        }

        // Filter by Search Term (ID or Client Name)
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(inv => {
                const clientName = companiesMap.get(inv.companyId)?.toLowerCase() || '';
                return inv.id.toLowerCase().includes(lowerTerm) || clientName.includes(lowerTerm);
            });
        }

        // Sort by date desc
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    }, [invoices, statusFilter, searchTerm, companiesMap]);

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
        { header: 'Emisión', accessor: (inv: Invoice) => <span className="text-slate-500 dark:text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</span> },
        { 
            header: 'Vencimiento', 
            accessor: (inv: Invoice) => {
                const isOverdue = new Date(inv.dueDate) < new Date() && inv.status !== InvoiceStatus.Pagada && inv.status !== InvoiceStatus.Cancelada;
                return <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-500 dark:text-slate-400'}>{new Date(inv.dueDate).toLocaleDateString()}</span>;
            }
        },
        { header: 'Estado', accessor: (inv: Invoice) => <Badge text={inv.status} color={getStatusColor(inv.status)} /> },
        { header: 'Total', accessor: (inv: Invoice) => `$${(inv.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`, className: 'text-right font-bold text-slate-800 dark:text-slate-200' },
        { 
            header: 'Acciones', 
            accessor: (inv: Invoice) => (
                <div className="flex justify-end">
                     <Link to={`/billing/${inv.id}`} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                        <span className="material-symbols-outlined text-xl">visibility</span>
                    </Link>
                </div>
            ),
            className: 'text-right'
        }
    ];
    
    const statusOptions = Object.values(InvoiceStatus).map(s => ({ value: s, label: s }));

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Facturación</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona tus facturas, cobros y estado financiero.</p>
                </div>
                <Link 
                    to="/billing/new" 
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 font-semibold"
                >
                    <span className="material-symbols-outlined">add_circle</span>
                    Nueva Factura
                </Link>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <BillingKpiCard title="Total Facturado (Ciclo)" value={`$${(totalBilled/1000).toFixed(1)}k`} icon="payments" color="indigo" />
                <BillingKpiCard title="Pendiente de Cobro" value={`$${(totalPending/1000).toFixed(1)}k`} icon="hourglass_top" color="amber" subtext="Facturas emitidas no pagadas" />
                <BillingKpiCard title="Vencido" value={`$${(totalOverdue/1000).toFixed(1)}k`} icon="warning" color="rose" subtext="Requiere atención inmediata" />
            </div>

            {/* Toolbar Section */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 justify-between items-center">
                {/* Search - Input Safe Pattern */}
                <div className="relative w-full lg:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por folio o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-shadow focus:shadow-md outline-none"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                        <button 
                            onClick={() => setDateRange('this_month')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateRange === 'this_month' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            Este Mes
                        </button>
                        <button 
                            onClick={() => setDateRange('last_month')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateRange === 'last_month' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            Mes Pasado
                        </button>
                        <button 
                            onClick={() => setDateRange('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateRange === 'all' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            Todo
                        </button>
                    </div>
                    <FilterButton label="Estado" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
                    <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Exportar CSV">
                        <span className="material-symbols-outlined">download</span>
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {invoicesLoading || companiesLoading ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : filteredInvoices.length > 0 ? (
                    <Table columns={columns} data={filteredInvoices} />
                ) : (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
                            <span className="material-symbols-outlined text-4xl text-slate-400">receipt_long</span>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No se encontraron facturas</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                            Intenta ajustar los filtros de búsqueda o crea una nueva factura.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BillingPage;
