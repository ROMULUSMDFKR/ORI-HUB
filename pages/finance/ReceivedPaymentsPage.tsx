import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Invoice, InvoiceStatus, Company } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';

const ReceivedPaymentsPage: React.FC = () => {
    const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>('invoices');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);

    const paidInvoices = useMemo(() => {
        if (!invoices) return [];
        return invoices
            .filter(inv => inv.status === InvoiceStatus.Pagada || inv.status === InvoiceStatus.PagadaParcialmente)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Approximating payment date with creation date
    }, [invoices]);
    
    const columns = [
        { header: 'Factura', accessor: (inv: Invoice) => <Link to={`/billing/${inv.id}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{inv.id}</Link> },
        { header: 'Cliente', accessor: (inv: Invoice) => companiesMap.get(inv.companyId) || 'N/A' },
        { 
            header: 'Fecha de Pago', 
            accessor: (inv: Invoice) => new Date(inv.createdAt).toLocaleDateString() // Approximation
        },
        { 
            header: 'Monto Pagado', 
            accessor: (inv: Invoice) => `$${inv.paidAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}`, 
            className: 'text-right font-semibold' 
        },
        { 
            header: 'Método de Pago', 
            accessor: (inv: Invoice) => 'Transferencia' // Mocked value
        },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Historial de Pagos Recibidos</h1>

            {invoicesLoading || companiesLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <Table columns={columns} data={paidInvoices} />
            )}
        </div>
    );
};

export default ReceivedPaymentsPage;