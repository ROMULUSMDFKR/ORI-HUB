
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Invoice, InvoiceStatus, Company } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import FilterButton from '../../components/ui/FilterButton';

// KPI Card following "App Icon Pattern"
const ReceivedKpiCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
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

const ReceivedPaymentsPage: React.FC = () => {
    const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>('invoices');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState('all');

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);

    const { paidInvoices, totalMonth, totalYear, totalAllTime } = useMemo(() => {
        if (!invoices) return { paidInvoices: [], totalMonth: 0, totalYear: 0, totalAllTime: 0 };
        
        const paid = invoices.filter(inv => inv.status === InvoiceStatus.Pagada || inv.status === InvoiceStatus.PagadaParcialmente);
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let tMonth = 0;
        let tYear = 0;
        let tAll = 0;

        paid.forEach(inv => {
            const amount = inv.paidAmount || 0;
            const date = new Date(inv.createdAt); // Approximation for payment date
            
            tAll += amount;
            if (date.getFullYear() === currentYear) {
                tYear += amount;
                if (date.getMonth() === currentMonth) {
                    tMonth += amount;
                }
            }
        });

        // Filter logic
        let filtered = paid;
        if (searchTerm) {
            filtered = filtered.filter(inv => 
                inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                companiesMap.get(inv.companyId)?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (timeFilter === 'this_month') {
             filtered = filtered.filter(inv => new Date(inv.createdAt).getMonth() === currentMonth && new Date(inv.createdAt).getFullYear() === currentYear);
        } else if (timeFilter === 'this_year') {
             filtered = filtered.filter(inv => new Date(inv.createdAt).getFullYear() === currentYear);
        }

        return {
            paidInvoices: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            totalMonth: tMonth,
            totalYear: tYear,
            totalAllTime: tAll
        };
    }, [invoices, searchTerm, timeFilter, companiesMap]);
    
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
            header: 'Fecha de Pago', 
            accessor: (inv: Invoice) => <span className="text-slate-500 dark:text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</span> // Approx
        },
        { 
            header: 'Monto Pagado', 
            accessor: (inv: Invoice) => <span className="font-bold text-slate-800 dark:text-slate-200">{`$${(inv.paidAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`}</span>, 
            className: 'text-right' 
        },
        { 
            header: 'Método', 
            accessor: (inv: Invoice) => <Badge text="Transferencia" color="gray" /> // Mock
        },
    ];
    
    const timeOptions = [
        { value: 'all', label: 'Histórico Completo' },
        { value: 'this_month', label: 'Este Mes' },
        { value: 'this_year', label: 'Este Año' },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pagos Recibidos</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Historial de ingresos y cobros realizados con éxito.</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <ReceivedKpiCard title="Ingresos (Mes)" value={`$${(totalMonth/1000).toFixed(1)}k`} icon="calendar_month" color="emerald" />
                <ReceivedKpiCard title="Ingresos (Año)" value={`$${(totalYear/1000).toFixed(1)}k`} icon="calendar_today" color="blue" />
                <ReceivedKpiCard title="Total Histórico" value={`$${(totalAllTime/1000).toFixed(1)}k`} icon="account_balance" color="indigo" />
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
                    label="Periodo"
                    options={timeOptions}
                    selectedValue={timeFilter}
                    onSelect={setTimeFilter}
                />
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {invoicesLoading || companiesLoading ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : paidInvoices.length > 0 ? (
                    <Table columns={columns} data={paidInvoices} />
                ) : (
                     <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
                            <span className="material-symbols-outlined text-4xl text-slate-400">savings</span>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay pagos registrados</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Los pagos confirmados aparecerán aquí.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReceivedPaymentsPage;
