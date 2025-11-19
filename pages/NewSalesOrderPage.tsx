
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Company, Quote, Product, ProductLot, SalesOrder, SalesOrderStatus, QuoteItem, QuoteStatus } from '../types';
import { api } from '../api/firebaseApi';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import { useToast } from '../hooks/useToast';

// Moved outside
const SectionCard: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const FormRow: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 items-start ${className}`}>
        {children}
    </div>
);

const NewSalesOrderPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    const { data: quotes, loading: qLoading } = useCollection<Quote>('quotes');
    const { data: products, loading: pLoading } = useCollection<Product>('products');

    const initialState = {
        status: SalesOrderStatus.Pendiente,
        items: [],
        total: 0,
        deliveries: [],
    };

    const [salesOrder, setSalesOrder] = useState<Partial<SalesOrder>>(initialState);
    const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
    const [availableLots, setAvailableLots] = useState<{ [key: string]: ProductLot[] }>({});
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
            const total = selectedQuote.items.reduce((sum, item) => sum + item.subtotal, 0);
            setSalesOrder(prev => ({
                ...prev,
                quoteId: selectedQuote.id,
                items: selectedQuote.items,
                total: total
            }));
        } else {
             setSalesOrder(prev => ({...prev, quoteId: '', items: [], total: 0}));
        }
    };
    
    const handleSave = async () => {
        if(!salesOrder.companyId || !salesOrder.items || salesOrder.items.length === 0) {
            showToast('warning', "Completa la información de cliente y asegúrate de tener productos.");
            return;
        }

        setIsSaving(true);
        const newSalesOrder: Omit<SalesOrder, 'id'> = {
            ...salesOrder,
            createdAt: new Date().toISOString(),
        } as Omit<SalesOrder, 'id'>;

        try {
            await api.addDoc('salesOrders', newSalesOrder);
            showToast('success', 'Orden de Venta guardada exitosamente.');
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
    const quoteOptions = companyQuotes.map(q => ({value: q.id, name: `${q.folio} - Total: $${q.totals.grandTotal.toLocaleString()}`}));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Orden de Venta</h1>
                <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                    {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                    Guardar Orden de Venta
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard title="Cliente y Cotización">
                        <FormRow>
                            <CustomSelect label="Cliente" options={companyOptions} value={salesOrder.companyId || ''} onChange={handleCompanyChange} placeholder="Seleccionar cliente..."/>
                            <CustomSelect label="Cotización Aprobada" options={quoteOptions} value={selectedQuoteId} onChange={handleQuoteChange} placeholder="Opcional: Cargar desde cotización..."/>
                        </FormRow>
                    </SectionCard>
                     <SectionCard title="Productos">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {salesOrder.items && salesOrder.items.length > 0
                                ? `${salesOrder.items.length} producto(s) cargado(s) desde la cotización.`
                                : 'Selecciona una cotización aprobada para cargar los productos automáticamente.'}
                        </p>
                    </SectionCard>
                </div>
                <div className="lg:col-span-1">
                    <SectionCard title="Resumen">
                         <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                            <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 text-slate-800 dark:text-slate-200"><span>Total:</span><span>${salesOrder.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};

export default NewSalesOrderPage;
