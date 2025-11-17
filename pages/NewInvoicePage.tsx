import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Invoice, InvoiceStatus, SalesOrder, Company, InvoiceItem } from '../types';
import { useCollection } from '../hooks/useCollection';
import { TAX_RATE } from '../constants';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';

const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
      {children}
    </div>
);

const NewInvoicePage: React.FC = () => {
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<Partial<Invoice>>({
        status: InvoiceStatus.Borrador,
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        paidAmount: 0,
    });
    const [selectedSO, setSelectedSO] = useState<string>('');
    
    const { data: salesOrders, loading: soLoading } = useCollection<SalesOrder>('salesOrders');
    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    
    const unbilledSalesOrders = useMemo(() => {
        // In a real app, you'd check if an SO already has an invoice.
        return salesOrders?.filter(so => so.status === 'Entregada' || so.status === 'Facturada');
    }, [salesOrders]);

    useEffect(() => {
        if (selectedSO && unbilledSalesOrders) {
            const so = unbilledSalesOrders.find(o => o.id === selectedSO);
            if (so) {
                const invoiceItems: InvoiceItem[] = so.items.map(item => ({
                    productId: item.productId,
                    productName: 'Producto no encontrado', // Placeholder, needs to be fetched
                    qty: item.qty,
                    unit: item.unit,
                    unitPrice: item.unitPrice,
                    subtotal: item.subtotal,
                }));
                setInvoice(prev => ({
                    ...prev,
                    salesOrderId: so.id,
                    companyId: so.companyId,
                    items: invoiceItems,
                }));
            }
        }
    }, [selectedSO, unbilledSalesOrders]);

    useEffect(() => {
        const subtotal = invoice.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0;
        const tax = subtotal * TAX_RATE;
        const total = subtotal + tax;
        setInvoice(prev => ({ ...prev, subtotal, tax, total }));
    }, [invoice.items]);

    const handleSave = () => {
        if (!invoice.companyId || !invoice.items?.length) {
            alert('Por favor, selecciona una orden de venta y asegúrate de que tenga productos.');
            return;
        }
        const newInvoice: Invoice = {
            id: `F-2024-${Math.floor(Math.random() * 1000)}`,
            createdAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            ...invoice
        } as Invoice;
        console.log("Saving new invoice:", newInvoice);
        alert(`Factura ${newInvoice.id} creada (simulación).`);
        navigate('/billing');
    };

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);

    const companyName = useMemo(() => {
        if (!invoice.companyId || !companies) return '...';
        return companies.find(c => c.id === invoice.companyId)?.shortName || 'N/A';
    }, [invoice.companyId, companies]);
    
    const soOptions = (unbilledSalesOrders || []).map(so => ({ value: so.id, name: `${so.id} - ${companiesMap.get(so.companyId)}`}));


    if (soLoading || cLoading) return <div className="flex justify-center py-12"><Spinner/></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Factura</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/billing')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">Guardar Factura</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <FormBlock title="Información de la Factura">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <CustomSelect
                                label="Crear desde Orden de Venta"
                                options={soOptions}
                                value={selectedSO}
                                onChange={setSelectedSO}
                                placeholder="Seleccionar Orden de Venta..."
                            />
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cliente</label>
                                <input type="text" value={companyName} disabled className="mt-1 w-full bg-slate-100 dark:bg-slate-700 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Emisión</label>
                                <input type="date" value={invoice.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]} onChange={e => setInvoice(p => ({...p, createdAt: e.target.value}))} className="mt-1 w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Vencimiento</label>
                                <input type="date" value={invoice.dueDate?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} onChange={e => setInvoice(p => ({...p, dueDate: e.target.value}))} className="mt-1 w-full" />
                            </div>
                        </div>
                    </FormBlock>
                    <FormBlock title="Productos">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Producto</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cant.</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">P. Unit.</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subtotal</th></tr></thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {invoice.items?.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200">{item.productName}</td>
                                        <td className="px-6 py-4 text-sm text-right text-slate-800 dark:text-slate-200">{item.qty} {item.unit}</td>
                                        <td className="px-6 py-4 text-sm text-right text-slate-800 dark:text-slate-200">${item.unitPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        <td className="px-6 py-4 text-sm text-right text-slate-800 dark:text-slate-200">${item.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </FormBlock>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <FormBlock title="Resumen">
                        <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                            <div className="flex justify-between"><span>Subtotal:</span><span className="font-semibold text-slate-800 dark:text-slate-200">${invoice.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between"><span>IVA ({(TAX_RATE * 100).toFixed(0)}%):</span><span className="font-semibold text-slate-800 dark:text-slate-200">${invoice.tax?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 text-slate-800 dark:text-slate-200"><span>Total:</span><span>${invoice.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        </div>
                    </FormBlock>
                    <FormBlock title="Notas">
                         <textarea value={invoice.notes || ''} onChange={e => setInvoice(p => ({...p, notes: e.target.value}))} rows={4} placeholder="Términos de pago, instrucciones especiales, etc." />
                    </FormBlock>
                </div>
            </div>
        </div>
    )
}

export default NewInvoicePage;