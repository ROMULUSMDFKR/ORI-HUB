
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Company, Quote, Product, ProductLot, SalesOrder, SalesOrderStatus, QuoteItem, QuoteStatus } from '../types';
import { api } from '../api/firebaseApi';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import { useToast } from '../hooks/useToast';

// --- Reusable Components Outside ---
const SectionCard: React.FC<{ title: string; children: React.ReactNode; icon?: string }> = ({ title, children, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
             {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const NewSalesOrderPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    const { data: quotes, loading: qLoading } = useCollection<Quote>('quotes');
    const { data: products, loading: pLoading } = useCollection<Product>('products');

    const initialState: Partial<SalesOrder> = {
        status: SalesOrderStatus.Pendiente,
        items: [],
        total: 0,
        deliveries: [],
        currency: 'MXN',
        taxRate: 16,
        customerPo: '',
        requestedDeliveryDate: '',
        paymentMethod: 'Transferencia',
        shippingMethod: 'Terrestre'
    };

    const [salesOrder, setSalesOrder] = useState<Partial<SalesOrder>>(initialState);
    const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    
    const loading = cLoading || qLoading || pLoading;

    const companyQuotes = useMemo(() => {
        if (!quotes || !salesOrder.companyId) return [];
        return quotes.filter(q => q.companyId === salesOrder.companyId && q.status === QuoteStatus.AprobadaPorCliente);
    }, [quotes, salesOrder.companyId]);

    const handleCompanyChange = (companyId: string) => {
        setSalesOrder(prev => ({
            ...initialState,
            companyId,
        }));
        setSelectedQuoteId('');
    };
    
    const handleQuoteChange = (quoteId: string) => {
        setSelectedQuoteId(quoteId);
        const selectedQuote = quotes?.find(q => q.id === quoteId);
        if (selectedQuote) {
            // Determine tax rate from quote. If missing (old records), default to 16. If present (e.g. 0), use it.
            const taxRate = selectedQuote.taxRate !== undefined ? selectedQuote.taxRate : 16;
            
            // Recalculate total based on Quote items + Tax
            const subtotal = selectedQuote.items.reduce((sum, item) => sum + item.subtotal, 0);
            const taxAmount = subtotal * (taxRate / 100);
            const total = subtotal + taxAmount;

            setSalesOrder(prev => ({
                ...prev,
                quoteId: selectedQuote.id,
                items: selectedQuote.items,
                total: total,
                currency: selectedQuote.currency, // Inherit currency from quote
                taxRate: taxRate // Inherit tax rate
            }));
        } else {
             setSalesOrder(prev => ({...prev, quoteId: '', items: [], total: 0}));
        }
    };
    
    const handleFieldChange = (field: keyof SalesOrder, value: any) => {
        setSalesOrder(prev => ({ ...prev, [field]: value }));
    };

    // Update total when tax rate changes manually
    useEffect(() => {
        if (salesOrder.items) {
            const subtotal = salesOrder.items.reduce((sum, item) => sum + item.subtotal, 0);
            const rate = salesOrder.taxRate !== undefined ? salesOrder.taxRate : 16;
            const total = subtotal * (1 + rate / 100);
            if (total !== salesOrder.total) {
                setSalesOrder(prev => ({ ...prev, total }));
            }
        }
    }, [salesOrder.taxRate, salesOrder.items]);

    const handleSave = async () => {
        if(!salesOrder.companyId || !salesOrder.items || salesOrder.items.length === 0) {
            showToast('warning', "Completa la información de cliente y asegúrate de tener productos.");
            return;
        }

        setIsSaving(true);

        // --- Generate Smart Folio (OV) ---
        let companyName = 'CLI';
        if (companies) {
            const company = companies.find(c => c.id === salesOrder.companyId);
            companyName = company?.shortName || company?.name || 'CLI';
        }
        
        // Clean name: remove spaces, take first 4 chars, uppercase
        const codeName = companyName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digit random
        
        // Prefix OV to distinguish from Quotes
        const folio = `OV-${codeName}-${dateStr}-${randomSuffix}`;

        const newSalesOrder: Omit<SalesOrder, 'id'> = {
            ...salesOrder,
            folio: folio,
            createdAt: new Date().toISOString(),
        } as Omit<SalesOrder, 'id'>;

        try {
            await api.addDoc('salesOrders', newSalesOrder);
            showToast('success', `Orden de Venta ${folio} guardada exitosamente.`);
            navigate('/hubs/sales-orders');
        } catch (error) {
            console.error("Error saving sales order:", error);
            showToast('error', 'Error al guardar la orden de venta.');
        } finally {
            setIsSaving(false);
        }
    }

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    
    const companyOptions = (companies || []).map(c => ({value: c.id, name: c.shortName || c.name}));
    const quoteOptions = companyQuotes.map(q => ({value: q.id, name: `${q.folio} - Total: $${q.totals.grandTotal.toLocaleString()} ${q.currency}`}));
    const paymentMethods = [
        { value: 'Transferencia', name: 'Transferencia Electrónica' },
        { value: 'Cheque', name: 'Cheque' },
        { value: 'Efectivo', name: 'Efectivo' },
        { value: 'Crédito', name: 'Crédito' },
    ];
    const shippingMethods = [
        { value: 'Terrestre', name: 'Terrestre' },
        { value: 'Aéreo', name: 'Aéreo' },
        { value: 'Marítimo', name: 'Marítimo' },
        { value: 'Recolección', name: 'Recolección en Planta' },
    ];

    const subtotal = salesOrder.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Orden de Venta</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/hubs/sales-orders')} disabled={isSaving} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Orden
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Data */}
                    <SectionCard title="Datos del Pedido" icon="receipt_long">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomSelect 
                                label="Cliente *" 
                                options={companyOptions} 
                                value={salesOrder.companyId || ''} 
                                onChange={handleCompanyChange} 
                                placeholder="Seleccionar cliente..."
                                enableSearch
                            />
                            <CustomSelect 
                                label="Cotización Aprobada (Opcional)" 
                                options={quoteOptions} 
                                value={selectedQuoteId} 
                                onChange={handleQuoteChange} 
                                placeholder="Cargar desde cotización..."
                            />
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Orden de Compra (Cliente)</label>
                                <input 
                                    type="text" 
                                    value={salesOrder.customerPo || ''} 
                                    onChange={(e) => handleFieldChange('customerPo', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ej: PO-998877"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Entrega Solicitada</label>
                                <input 
                                    type="date" 
                                    value={salesOrder.requestedDeliveryDate || ''} 
                                    onChange={(e) => handleFieldChange('requestedDeliveryDate', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </SectionCard>
                    
                    {/* Product Details */}
                    <SectionCard title="Detalle de Productos" icon="inventory_2">
                        {salesOrder.items && salesOrder.items.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-left text-slate-500 dark:text-slate-400">
                                        <tr>
                                            <th className="p-3 rounded-l-lg">Producto</th>
                                            <th className="p-3 text-right w-24">Cant.</th>
                                            <th className="p-3 w-24">Unidad</th>
                                            <th className="p-3 text-right w-32">P. Unit</th>
                                            <th className="p-3 text-right w-32 rounded-r-lg">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {salesOrder.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                                    {item.productName || 'Producto'}
                                                </td>
                                                <td className="p-3 text-right text-slate-600 dark:text-slate-300">{item.qty}</td>
                                                <td className="p-3 text-slate-600 dark:text-slate-300">{item.unit}</td>
                                                <td className="p-3 text-right text-slate-600 dark:text-slate-300">${item.unitPrice.toLocaleString()}</td>
                                                <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">
                                                    ${item.subtotal.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">post_add</span>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Selecciona una cotización aprobada para cargar los productos automáticamente.
                                </p>
                            </div>
                        )}
                    </SectionCard>
                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div className="lg:col-span-1 space-y-6">
                    <SectionCard title="Condiciones y Resumen" icon="request_quote">
                         <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moneda</label>
                                    <select 
                                        value={salesOrder.currency || 'MXN'}
                                        onChange={(e) => handleFieldChange('currency', e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none"
                                    >
                                        <option value="MXN">MXN</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IVA (%)</label>
                                    <input 
                                        type="number" 
                                        value={salesOrder.taxRate}
                                        onChange={(e) => handleFieldChange('taxRate', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none"
                                    />
                                </div>
                            </div>

                            <CustomSelect 
                                label="Método de Pago" 
                                options={paymentMethods} 
                                value={salesOrder.paymentMethod || 'Transferencia'} 
                                onChange={val => handleFieldChange('paymentMethod', val)} 
                            />
                            
                            <CustomSelect 
                                label="Método de Envío" 
                                options={shippingMethods} 
                                value={salesOrder.shippingMethod || 'Terrestre'} 
                                onChange={val => handleFieldChange('shippingMethod', val)} 
                            />

                            <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Subtotal</span>
                                    <span>${subtotal.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Impuestos</span>
                                    <span>${(subtotal * ((salesOrder.taxRate || 0) / 100)).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-indigo-600 dark:text-indigo-400 pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <span>Total</span>
                                    <span>${(salesOrder.total || 0).toLocaleString(undefined, {maximumFractionDigits: 2})} {salesOrder.currency}</span>
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};

export default NewSalesOrderPage;
