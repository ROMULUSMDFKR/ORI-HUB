import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Invoice, Company, InvoiceStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { TAX_RATE } from '../constants';

const InvoiceDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: invoice, loading: invoiceLoading } = useDoc<Invoice>('invoices', id || '');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');

    const company = React.useMemo(() => {
        if (!invoice || !companies) return null;
        return companies.find(c => c.id === invoice.companyId);
    }, [invoice, companies]);

    if (invoiceLoading || companiesLoading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!invoice) {
        return <div className="text-center p-12">Factura no encontrada.</div>;
    }

    const getStatusColor = (status: InvoiceStatus) => {
        switch (status) {
            case InvoiceStatus.Pagada: return 'green';
            case InvoiceStatus.Enviada: return 'blue';
            case InvoiceStatus.PagadaParcialmente: return 'yellow';
            case InvoiceStatus.Vencida: return 'red';
            default: return 'gray';
        }
    };
    
    const balance = invoice.total - invoice.paidAmount;

    return (
        <div className="max-w-4xl mx-auto bg-surface p-8 rounded-xl shadow-sm border">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Factura {invoice.id}</h1>
                    <p className="text-on-surface-secondary">Orden de Venta: <Link to={`/sales-orders/${invoice.salesOrderId}`} className="text-accent hover:underline">{invoice.salesOrderId}</Link></p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <Badge text={invoice.status} color={getStatusColor(invoice.status)} />
                </div>
            </div>

            {/* Client and Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 text-sm">
                <div>
                    <p className="font-semibold text-on-surface-secondary">CLIENTE</p>
                    <p className="font-bold text-on-surface text-base">{company?.shortName || 'N/A'}</p>
                    <p>{company?.name}</p>
                    <p>{company?.rfc}</p>
                </div>
                <div>
                    <p className="font-semibold text-on-surface-secondary">FECHA DE EMISIÓN</p>
                    <p className="font-medium text-on-surface">{new Date(invoice.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div>
                    <p className="font-semibold text-on-surface-secondary">FECHA DE VENCIMIENTO</p>
                    <p className="font-medium text-on-surface">{new Date(invoice.dueDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-sm mb-8">
                <thead className="bg-background">
                    <tr>
                        <th className="p-3 text-left font-semibold text-on-surface-secondary">Descripción</th>
                        <th className="p-3 text-right font-semibold text-on-surface-secondary">Cantidad</th>
                        <th className="p-3 text-right font-semibold text-on-surface-secondary">Precio Unit.</th>
                        <th className="p-3 text-right font-semibold text-on-surface-secondary">Importe</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {invoice.items.map((item, index) => (
                        <tr key={index}>
                            <td className="p-3 font-medium">{item.productName}</td>
                            <td className="p-3 text-right">{item.qty} {item.unit}</td>
                            <td className="p-3 text-right">${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right font-medium">${item.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {/* Totals */}
            <div className="flex justify-end mb-8">
                <div className="w-full max-w-xs space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal:</span><span>${invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>IVA ({(TAX_RATE * 100).toFixed(0)}%):</span><span>${invoice.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total:</span><span>${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>Pagado:</span><span>-${invoice.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t text-accent"><span>Saldo:</span><span>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
                {invoice.notes && <p className="text-xs text-on-surface-secondary italic text-center sm:text-left">Notas: {invoice.notes}</p>}
                <div className="flex gap-2 flex-wrap justify-center">
                    <button className="bg-surface border border-border text-on-surface font-semibold py-2 px-3 rounded-lg text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">download</span>Descargar PDF</button>
                    <button className="bg-surface border border-border text-on-surface font-semibold py-2 px-3 rounded-lg text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">mail</span>Enviar por Correo</button>
                    {balance > 0 && <button className="bg-primary text-on-primary font-semibold py-2 px-3 rounded-lg text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">payments</span>Registrar Pago</button>}
                    {invoice.status !== InvoiceStatus.Cancelada && <button className="bg-red-100 border border-red-200 text-red-700 font-semibold py-2 px-3 rounded-lg text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">cancel</span>Cancelar Factura</button>}
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetailPage;