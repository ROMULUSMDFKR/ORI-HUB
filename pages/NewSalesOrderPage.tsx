import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
// FIX: Imported 'QuoteStatus' to use in status comparison.
import { Company, Quote, Product, ProductLot, SalesOrder, SalesOrderStatus, QuoteItem, QuoteStatus } from '../types';
import { api } from '../data/mockData';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';

// Reusable UI Components
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

const InputGroup: React.FC<{ label: string; children: React.ReactNode; error?: string }> = ({ label, children, error }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        {children}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
);


const NewSalesOrderPage: React.FC = () => {
    const navigate = useNavigate();

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
    
    const loading = cLoading || qLoading || pLoading;

    const companyQuotes = useMemo(() => {
        if (!quotes || !salesOrder.companyId) return [];
        // FIX: Used the correct enum member 'QuoteStatus.AprobadaPorCliente' instead of the string 'Aprobada'.
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

    const handleProductChange = async (index: number, productId: string) => {
        const newItems = [...(salesOrder.items || [])];
        newItems[index] = { ...newItems[index], productId, lotId: '' }; // Reset lot
        setSalesOrder(prev => ({...prev, items: newItems as QuoteItem[]}));
        
        if (productId) {
            const lots = await api.getLotsForProduct(productId);
            setAvailableLots(prev => ({ ...prev, [productId]: lots }));
        }
    };
    
    const handleLotChange = (index: number, lotId: string) => {
        const newItems = [...(salesOrder.items || [])];
        const item = newItems[index];
        const productLots = availableLots[item.productId] || [];
        const selectedLot = productLots.find(l => l.id === lotId);
        
        item.lotId = lotId;
        item.unitPrice = selectedLot?.pricing.min || 0;
        item.subtotal = item.qty * item.unitPrice;

        setSalesOrder(prev => ({...prev, items: newItems as QuoteItem[]}));
    };

    const updateItemField = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...(salesOrder.items || [])];
        const item = { ...newItems[index], [field]: value };
        
        if (field === 'qty' || field === 'unitPrice') {
             item.subtotal = (item.qty || 0) * (item.unitPrice || 0);
        }

        newItems[index] = item;
        setSalesOrder(prev => ({...prev, items: newItems as QuoteItem[]}));
    };

    const addItem = () => {
        const newItem: Partial<QuoteItem> = { id: `item-${Date.now()}`, qty: 0, unit: 'ton', unitPrice: 0, subtotal: 0 };
        setSalesOrder(prev => ({...prev, items: [...(prev.items || []), newItem as QuoteItem]}));
    };

    const removeItem = (index: number) => {
        const newItems = (salesOrder.items || []).filter((_, i) => i !== index);
        setSalesOrder(prev => ({...prev, items: newItems}));
    };

    useEffect(() => {
        const total = salesOrder.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0;
        setSalesOrder(prev => ({...prev, total }));
    }, [salesOrder.items]);

    const handleSave = () => {
        if (!salesOrder.companyId || !salesOrder.items?.length) {
            alert("Por favor, selecciona un cliente y añade al menos un producto.");
            return;
        }

        const newSO: SalesOrder = {
            id: `SO-2024-${Math.floor(Math.random() * 900) + 100}`,
            createdAt: new Date().toISOString(),
            ...salesOrder,
        } as SalesOrder;

        console.log("Saving new Sales Order:", newSO);
        alert(`Orden de Venta ${newSO.id} creada (simulación).`);
        navigate('/hubs/sales-orders');
    };
    
    const companyOptions = (companies || []).map(c => ({ value: c.id, name: c.shortName || c.name }));
    const quoteOptions = companyQuotes.map(q => ({ value: q.id, name: `${q.id} (Total: $${q.totals.grandTotal.toLocaleString()})`}));
    const productOptions = (products || []).map(p => ({ value: p.id, name: p.name }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Orden de Venta</h2>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/hubs/sales-orders')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">Guardar Orden</button>
                </div>
            </div>

            {loading ? <div className="flex justify-center items-center h-64"><Spinner /></div> :
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard title="Información General">
                        <FormRow>
                            <CustomSelect label="Cliente *" options={companyOptions} value={salesOrder.companyId || ''} onChange={handleCompanyChange} placeholder="Seleccionar Cliente..."/>
                            <CustomSelect label="Basado en Cotización (Opcional)" options={quoteOptions} value={selectedQuoteId} onChange={handleQuoteChange} placeholder="Seleccionar Cotización..."/>
                        </FormRow>
                    </SectionCard>
                    <SectionCard title="Productos">
                        <div className="space-y-4">
                           {(salesOrder.items || []).map((item, index) => {
                               const lotOptions = (availableLots[item.productId] || []).map(l => ({ value: l.id, name: l.code }));
                               return (
                                <div key={item.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 relative bg-slate-50 dark:bg-slate-800/50">
                                     <button type="button" onClick={() => removeItem(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button>
                                     <FormRow>
                                        <CustomSelect label="Producto" options={productOptions} value={item.productId} onChange={val => handleProductChange(index, val)} placeholder="Seleccionar..."/>
                                        <CustomSelect label="Lote" options={lotOptions} value={item.lotId} onChange={val => handleLotChange(index, val)} placeholder="Seleccionar Lote..."/>
                                    </FormRow>
                                    <FormRow>
                                         <InputGroup label="Cantidad">
                                             <input type="number" value={item.qty} onChange={e => updateItemField(index, 'qty', parseFloat(e.target.value))} disabled={!!selectedQuoteId} />
                                         </InputGroup>
                                          <InputGroup label="Precio Unitario">
                                             <input type="number" value={item.unitPrice} onChange={e => updateItemField(index, 'unitPrice', parseFloat(e.target.value))} disabled={!!selectedQuoteId}/>
                                         </InputGroup>
                                          <InputGroup label="Subtotal">
                                             <input type="text" value={`$${item.subtotal.toLocaleString()}`} disabled className="bg-slate-100 dark:bg-slate-700"/>
                                         </InputGroup>
                                    </FormRow>
                                </div>
                           )})}
                        </div>
                        {!selectedQuoteId && (
                             <button type="button" onClick={addItem} className="text-sm font-semibold text-indigo-600 flex items-center mt-4">
                                <span className="material-symbols-outlined mr-1">add_circle</span> Añadir Producto
                            </button>
                        )}
                    </SectionCard>
                </div>
                <div className="lg:col-span-1 space-y-6">
                     <SectionCard title="Resumen">
                        <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                             <div className="flex justify-between text-lg font-bold pt-2 mt-2 text-slate-800 dark:text-slate-200">
                                <span>Total:</span>
                                <span>${salesOrder.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            </div>
            }
        </div>
    );
};

export default NewSalesOrderPage;
