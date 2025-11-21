
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Quote, QuoteStatus, Note, ActivityLog, User, Company, Prospect, Product, ProductLot, InternalCompany, QuoteHandling, Unit, Attachment, Currency } from '../types';
import { QUOTES_PIPELINE_COLUMNS } from '../constants';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { convertQuantityToKg } from '../utils/calculations';

// --- Constants & Types ---
const LOCKED_STAGES: QuoteStatus[] = [
    QuoteStatus.ListaParaEnviar,
    QuoteStatus.EnviadaAlCliente,
    QuoteStatus.EnNegociacion,
    QuoteStatus.AprobadaPorCliente,
    QuoteStatus.Rechazada
];

const TAX_RATE = 0.16;

// --- Reusable Components (same as NewQuotePage for consistency) ---
const SectionCard: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: string }> = ({ title, children, className = '', icon }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">{children}</div>
    </div>
);

const CollapsibleCard: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; icon?: string }> = ({ title, children, defaultOpen = false, icon }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 mb-4">
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    {icon && <span className="material-symbols-outlined text-slate-500">{icon}</span>}
                    <h3 className="text-md font-bold">{title}</h3>
                </div>
                <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>
            {isOpen && (
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 animate-fadeIn">
                    <div className="space-y-4">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};


const InputGroup: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
    <div className={className}>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
        {children}
    </div>
);

const Switch: React.FC<{ enabled: boolean; onToggle: (enabled: boolean) => void; label?: string }> = ({ enabled, onToggle, label }) => (
    <div className="flex items-center cursor-pointer" onClick={() => onToggle(!enabled)}>
        <button
            type="button"
            className={`${enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex items-center h-5 rounded-full w-9 transition-colors flex-shrink-0 focus:outline-none`}
        >
            <span className={`${enabled ? 'translate-x-4' : 'translate-x-1'} inline-block w-3 h-3 transform bg-white rounded-full transition-transform`} />
        </button>
        {label && <span className="ml-3 text-sm text-slate-700 dark:text-slate-300 select-none">{label}</span>}
    </div>
);


const QuoteDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialQuote, loading: qLoading, error } = useDoc<Quote>('quotes', id || '');
    const { data: allNotes } = useCollection<Note>('notes');
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();

    // --- Collections for editing ---
    const { data: internalCompanies } = useCollection<InternalCompany>('internalCompanies');
    const { data: companies } = useCollection<Company>('companies');
    const { data: prospects } = useCollection<Prospect>('prospects');
    const { data: products } = useCollection<Product>('products');
    const { data: users } = useCollection<User>('users');
    const { data: freightRules } = useCollection<any>('freightPricing');

    // --- State (Mirrors NewQuotePage) ---
    const [quote, setQuote] = useState<Quote | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [availableLots, setAvailableLots] = useState<{[key: string]: ProductLot[]}>({});

    // Individual states for easier form handling (hydration needed)
    const [quoteProducts, setQuoteProducts] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [freights, setFreights] = useState<any[]>([]);
    const [handling, setHandling] = useState<QuoteHandling[]>([]);
    const [additionalItems, setAdditionalItems] = useState<any[]>([]);
    const [deliverySchedule, setDeliverySchedule] = useState<any[]>([]);
    
    const [freightEnabled, setFreightEnabled] = useState(false);
    const [insuranceEnabled, setInsuranceEnabled] = useState(false);
    const [insuranceCost, setInsuranceCost] = useState(0);
    const [storageEnabled, setStorageEnabled] = useState(false);
    const [storage, setStorage] = useState({ period: 1, unit: 'mes' as any, cost: 0, enabled: false, costPerTon: 0 });
    const [deliveryInfoEnabled, setDeliveryInfoEnabled] = useState(false);
    
    const [currency, setCurrency] = useState<Currency>('MXN');
    const [exchangeRate, setExchangeRate] = useState({ official: 0, commission: 0.3 });
    const [purchaseOrder, setPurchaseOrder] = useState<Attachment | undefined>(undefined);
    const [isUploadingPO, setIsUploadingPO] = useState(false);
    const [applyVat, setApplyVat] = useState(true); // Add VAT state
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Load and Hydrate Quote ---
    useEffect(() => {
        if (initialQuote) {
            setQuote(initialQuote);
            
            // Hydrate Edit States with Safety Checks (|| [])
            const items = initialQuote.items || [];
            setQuoteProducts(items.map(i => ({
                ...i,
                id: i.id,
                productId: i.productId,
                lotId: i.lotId,
                quantity: i.qty,
                unit: i.unit,
                unitPrice: i.unitPrice,
                minPrice: i.unitPrice // Fallback
            })));

            setCommissions(initialQuote.commissions || []);
            setFreights(initialQuote.freight || []);
            setHandling(initialQuote.handling || []);
            setAdditionalItems(initialQuote.otherItems || []);
            setDeliverySchedule(initialQuote.deliveries || []);
            
            setFreightEnabled((initialQuote.freight || []).length > 0);
            setDeliveryInfoEnabled((initialQuote.deliveries || []).length > 0);
            
            if (initialQuote.insurance) {
                setInsuranceEnabled(initialQuote.insurance.enabled);
                setInsuranceCost(initialQuote.insurance.costPerTon);
            }
            if (initialQuote.storage) {
                setStorageEnabled(initialQuote.storage.enabled);
                setStorage({ ...initialQuote.storage, cost: initialQuote.storage.costPerTon });
            }
            
            setCurrency(initialQuote.currency || 'MXN');

            if (initialQuote.exchangeRate) {
                setExchangeRate({ 
                    official: initialQuote.exchangeRate.official, 
                    commission: initialQuote.exchangeRate.commission !== undefined ? initialQuote.exchangeRate.commission : 0.3 
                });
            } else {
                // If no stored rate (legacy quotes), fetch current
                fetchExchangeRate();
            }
            
            // Initialize applyVat based on taxRate
            if (initialQuote.taxRate !== undefined) {
                setApplyVat(initialQuote.taxRate > 0);
            }

            setPurchaseOrder(initialQuote.purchaseOrderAttachment);

             // Load available lots for existing items safely
             if (items.length > 0) {
                 items.forEach(async (item) => {
                     if (item.productId) {
                         try {
                            const lots = await api.getLotsForProduct(item.productId);
                            setAvailableLots(prev => ({ ...prev, [item.productId]: lots }));
                         } catch (e) {
                             console.warn('Could not fetch lots for product', item.productId);
                         }
                     }
                 });
             }
        }
    }, [initialQuote]);

    // --- Derived State ---
    const isLocked = useMemo(() => {
        if (!quote) return true;
        return LOCKED_STAGES.includes(quote.status);
    }, [quote]);

    const recipientName = useMemo(() => {
        if (!quote) return '';
        if (quote.companyId) {
            return companies?.find(c => c.id === quote.companyId)?.shortName || companies?.find(c => c.id === quote.companyId)?.name || 'Empresa desconocida';
        }
        return prospects?.find(p => p.id === quote.prospectId)?.name || 'Prospecto desconocido';
    }, [quote, companies, prospects]);

    const standardInputClasses = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed";

    // --- Handlers (Duplicated logic from NewQuotePage for full edit power) ---

    const handleFieldChange = (field: string, value: any) => {
        if (!quote) return;
        setQuote(prev => {
             if(!prev) return null;
             // Nested updates if needed, simple for now
             return { ...prev, [field]: value };
        });
    };

    // Products Logic
    const handleProductChange = async (index: number, productId: string) => {
        const newProducts = [...quoteProducts];
        newProducts[index].productId = productId;
        newProducts[index].lotId = '';
        setQuoteProducts(newProducts);
        
        if (productId) {
            const lots = await api.getLotsForProduct(productId);
            setAvailableLots(prev => ({ ...prev, [productId]: lots }));
        }
    };
    
    const handleLotChange = (index: number, lotId: string) => {
        const newProducts = [...quoteProducts];
        const product = newProducts[index];
        const lots = availableLots[product.productId] || [];
        const selectedLot = lots.find(l => l.id === lotId);
        newProducts[index].lotId = lotId;
        // Optionally update price here if lot has specific price
        setQuoteProducts(newProducts);
    };

    const updateProductField = (index: number, field: string, value: any) => {
        const newProducts = [...quoteProducts];
        newProducts[index][field] = value;
        setQuoteProducts(newProducts);
    };

    const addQuoteProduct = () => {
        setQuoteProducts([...quoteProducts, { id: Date.now(), productId: '', lotId: '', quantity: 0, unit: 'ton', minPrice: 0, unitPrice: 0 }]);
    };
    
    const removeProduct = (index: number) => {
        setQuoteProducts(quoteProducts.filter((_, i) => i !== index));
    };

    // Commissions
    const addCommission = () => setCommissions([...commissions, { id: Date.now(), salespersonId: '', type: 'fijo_ton', value: 0 }]);
    const updateCommission = (idx: number, f: string, v: any) => { const n = [...commissions]; n[idx][f] = v; setCommissions(n); };
    const removeCommission = (idx: number) => setCommissions(commissions.filter((_, i) => i !== idx));

    // Logistics
    const addFreight = () => setFreights([...freights, {id: Date.now(), origin: '', destination: '', cost: 0}]);
    const updateFreight = (idx: number, f: string, v: any) => { const n = [...freights]; n[idx][f] = v; setFreights(n); };
    const removeFreight = (idx: number) => setFreights(freights.filter((_, i) => i !== idx));

    const addDeliveryScheduleItem = () => setDeliverySchedule([...deliverySchedule, {id: Date.now(), address: '', zip: '', qty: 0, date: ''}]);
    const updateDeliverySchedule = (idx: number, f: string, v: any) => { const n = [...deliverySchedule]; n[idx][f] = v; setDeliverySchedule(n); };
    const removeDeliverySchedule = (idx: number) => setDeliverySchedule(deliverySchedule.filter((_, i) => i !== idx));

    const addHandling = () => setHandling([...handling, { id: String(Date.now()), type: 'Ninguna', costPerTon: 0 }]);
    const updateHandling = (idx: number, f: string, v: any) => { const n = [...handling]; (n[idx] as any)[f] = v; setHandling(n); };
    const removeHandling = (idx: number) => setHandling(handling.filter((_, i) => i !== idx));

    const addAdditionalItem = () => setAdditionalItems([...additionalItems, {id: Date.now(), name: '', quantity: 1, unitPrice: 0}]);
    const updateAdditionalItem = (idx: number, f: string, v: any) => { const n = [...additionalItems]; n[idx][f] = v; setAdditionalItems(n); };
    const removeAdditionalItem = (idx: number) => setAdditionalItems(additionalItems.filter((_, i) => i !== idx));
    
    const handleCalculateFreight = () => {
         if (quoteProducts.length === 0) { showToast('warning', "Añade productos."); return; }
         const totalWeightKg = quoteProducts.reduce((sum, p) => sum + convertQuantityToKg(Number(p.quantity), p.unit as Unit), 0);
         const estimatedCost = totalWeightKg * 1.5; 
         setFreightEnabled(true);
         setFreights([{ id: Date.now(), origin: 'Almacén', destination: 'Cliente', cost: estimatedCost }]);
         showToast('success', `Flete estimado: $${estimatedCost.toFixed(2)}`);
    };
    
    const fetchExchangeRate = async () => {
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();
            const rate = data.rates.MXN;
            if (rate) {
                setExchangeRate(prev => ({ ...prev, official: rate }));
                // Only show toast if explicitly called by user button, not on auto-load
            }
        } catch (error) {
            console.error('Error fetching exchange rate', error);
        }
    };
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploadingPO(true);
        try {
            const url = await api.uploadFile(file, 'purchaseOrders');
            setPurchaseOrder({
                id: `po-${Date.now()}`,
                name: file.name,
                size: file.size,
                url: url
            });
            showToast('success', 'Orden de compra adjuntada.');
        } catch (error) {
            console.error("Upload error:", error);
            showToast('error', 'Error al subir el archivo.');
        } finally {
            setIsUploadingPO(false);
        }
    };

    const setValidityDays = (days: number) => {
        if (!quote) return;
        handleFieldChange('validity', days); // Just update the number of days
    };


    // --- Re-calculation Logic (Same as NewQuote) ---
    const totals = useMemo(() => {
        const productsTotal = quoteProducts.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const commissionsTotal = commissions.reduce((acc, c) => acc + c.value, 0);
        const totalWeight = quoteProducts.reduce((sum, p) => sum + convertQuantityToKg(Number(p.quantity), p.unit as Unit) / 1000, 0);
        
        const handlingTotal = handling.reduce((acc, h) => acc + (h.costPerTon * totalWeight), 0);
        const freightTotal = freightEnabled ? freights.reduce((acc, f) => acc + f.cost, 0) : 0;
        const insuranceTotal = insuranceEnabled ? (insuranceCost * totalWeight) : 0;
        const storageTotal = storageEnabled ? (storage.cost * totalWeight) : 0;
        const otherTotal = additionalItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        
        const subtotal = productsTotal + commissionsTotal + handlingTotal + freightTotal + insuranceTotal + storageTotal + otherTotal;
        const tax = applyVat ? subtotal * 0.16 : 0;
        const grandTotal = subtotal + tax;

        return { products: productsTotal, commissions: commissionsTotal, handling: handlingTotal, freight: freightTotal, insurance: insuranceTotal, storage: storageTotal, other: otherTotal, subtotal, tax, grandTotal };
    }, [quoteProducts, commissions, handling, freightEnabled, freights, insuranceEnabled, insuranceCost, storageEnabled, storage, additionalItems, applyVat]);


    const handleSave = async () => {
        if (!quote || !id) return;
        
        // Reconstruct the Quote object from all the state pieces
        const updatedQuote: Quote = {
            ...quote,
            validity: quote.validity,
            issuingCompanyId: quote.issuingCompanyId,
            salespersonId: quote.salespersonId,
            currency: currency, // Use the selected currency
            exchangeRate: {
                ...quote.exchangeRate,
                official: exchangeRate.official,
                commission: exchangeRate.commission,
                final: exchangeRate.official + (exchangeRate.official * (exchangeRate.commission/100))
            },
            items: quoteProducts.map(p => ({
                id: String(p.id),
                productId: p.productId,
                lotId: p.lotId,
                qty: p.quantity,
                unit: p.unit,
                unitPrice: p.unitPrice,
                subtotal: p.quantity * p.unitPrice
            })),
            deliveries: deliverySchedule,
            commissions: commissions,
            freight: freights,
            handling: handling,
            insurance: { enabled: insuranceEnabled, costPerTon: insuranceCost },
            storage: { enabled: storageEnabled, period: storage.period, unit: storage.unit, costPerTon: storage.cost },
            otherItems: additionalItems,
            purchaseOrderAttachment: purchaseOrder,
            taxRate: applyVat ? 16 : 0, // Save the actual tax rate used
            totals: {
                products: totals.products,
                commissions: totals.commissions,
                handling: totals.handling,
                freight: totals.freight,
                insurance: totals.insurance,
                storage: totals.storage,
                other: totals.other,
                subtotal: totals.subtotal,
                tax: totals.tax,
                grandTotal: totals.grandTotal
            },
            notes: quote.notes // Make sure notes field is bound correctly in UI
        };

        try {
            await api.updateDoc('quotes', id, updatedQuote);
            showToast('success', 'Cotización actualizada completamente.');
            setQuote(updatedQuote);
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving quote:", error);
            showToast('error', 'Error al guardar.');
        }
    };

    const handleStatusChange = async (newStatus: QuoteStatus) => {
         if (!quote || !id || newStatus === quote.status) return;
         try {
             await api.updateDoc('quotes', id, { status: newStatus });
             const log: Omit<ActivityLog, 'id'> = { quoteId: id, type: 'Cambio de Estado', description: `Estado cambiado de "${quote.status}" a "${newStatus}"`, userId: currentUser?.id || '', createdAt: new Date().toISOString() };
             await api.addDoc('activities', log);
             
             setQuote(prev => prev ? ({ ...prev, status: newStatus }) : null);
             showToast('success', 'Estado actualizado.');
         } catch(e) {
             showToast('error', 'Error al actualizar estado.');
         }
    };

    const handleNoteAdded = (note: Note) => {
        // Optimistic update handled by useCollection
    };

    const quoteNotes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes
            .filter(n => n.quoteId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    if (qLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !quote) return <div className="text-center p-12">Cotización no encontrada</div>;

    const statusOptions = QUOTES_PIPELINE_COLUMNS.map(c => ({ value: c.stage, name: c.stage }));
    
    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                        {quote.folio}
                        {isLocked && <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full flex items-center"><span className="material-symbols-outlined text-xs mr-1">lock</span> Solo Lectura</span>}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Para: <Link to={quote.companyId ? `/crm/clients/${quote.companyId}` : `/hubs/prospects/${quote.prospectId}`} className="text-indigo-600 hover:underline font-semibold">{recipientName}</Link></p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-48">
                        <CustomSelect options={statusOptions} value={quote.status} onChange={val => handleStatusChange(val as QuoteStatus)} />
                    </div>
                    {!isEditing && !isLocked && (
                        <button onClick={() => setIsEditing(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">edit</span> Editar
                        </button>
                    )}
                    {isEditing && (
                        <>
                            <button onClick={() => { setIsEditing(false); /* Reset state logic would go here if implemented fully */ }} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                            <button onClick={handleSave} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-700">Guardar Cambios</button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN: MAIN FORM & NOTES */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* 1. General Info */}
                    <SectionCard title="Información General">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <InputGroup label="Empresa Emisora">
                                 {isEditing ? (
                                    <CustomSelect options={(internalCompanies || []).map(c => ({value: c.id, name: c.name}))} value={quote.issuingCompanyId} onChange={val => handleFieldChange('issuingCompanyId', val)} />
                                 ) : (
                                     <p className="text-sm text-slate-800 dark:text-slate-200">{(internalCompanies || []).find(c => c.id === quote.issuingCompanyId)?.name || quote.issuingCompanyId}</p>
                                 )}
                             </InputGroup>
                             <InputGroup label="Vencimiento">
                                 {isEditing ? (
                                     <div className="flex flex-col gap-2">
                                         <input type="number" value={quote.validity} onChange={e => handleFieldChange('validity', parseInt(e.target.value))} className={standardInputClasses} placeholder="Días" />
                                         <div className="flex gap-2">
                                            {[15, 30, 60].map(d => (
                                                <button 
                                                    key={d} 
                                                    type="button" 
                                                    onClick={() => setValidityDays(d)} 
                                                    className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-600 transition-colors"
                                                >
                                                    +{d} días
                                                </button>
                                            ))}
                                        </div>
                                     </div>
                                 ) : <p className="text-sm text-slate-800 dark:text-slate-200">{quote.validity} días</p>}
                             </InputGroup>
                             <InputGroup label="Vendedor">
                                 {isEditing ? (
                                     <CustomSelect options={(users || []).map(u => ({value: u.id, name: u.name}))} value={quote.salespersonId} onChange={val => handleFieldChange('salespersonId', val)} />
                                 ) : <p className="text-sm text-slate-800 dark:text-slate-200">{(users || []).find(u => u.id === quote.salespersonId)?.name || 'N/A'}</p>}
                             </InputGroup>
                             <InputGroup label="Configuración de Divisa">
                                 {isEditing ? (
                                    <div className="space-y-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <div className="grid grid-cols-1 gap-3">
                                            <InputGroup label="Moneda">
                                                <CustomSelect
                                                    options={[{value: 'MXN', name: 'Pesos Mexicanos (MXN)'}, {value: 'USD', name: 'Dólares (USD)'}]}
                                                    value={currency}
                                                    onChange={(val) => setCurrency(val as Currency)}
                                                />
                                            </InputGroup>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">TC Oficial</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        value={exchangeRate.official} 
                                                        onChange={e => setExchangeRate(r => ({...r, official: parseFloat(e.target.value)}))} 
                                                        className={standardInputClasses} 
                                                    />
                                                    <button 
                                                        onClick={() => { fetchExchangeRate(); showToast('success', 'TC actualizado'); }} 
                                                        className="p-2 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-200" 
                                                        title="Obtener TC del día"
                                                    >
                                                        <span className="material-symbols-outlined !text-lg">sync</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Comisión (%)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    value={exchangeRate.commission} 
                                                    onChange={e => setExchangeRate(r => ({...r, commission: parseFloat(e.target.value)}))} 
                                                    className={standardInputClasses} 
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                            <span className="text-xs font-bold text-slate-500 uppercase">TC Final Aplicable</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                                ${(exchangeRate.official * (1 + exchangeRate.commission / 100)).toFixed(4)}
                                            </span>
                                        </div>
                                    </div>
                                 ) : (
                                    <div className="space-y-1">
                                         <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                            ${quote.exchangeRate.final.toFixed(4)} MXN
                                         </p>
                                         <p className="text-xs text-slate-500">
                                            (Oficial: ${quote.exchangeRate.official.toFixed(4)} + {quote.exchangeRate.commission}%)
                                         </p>
                                    </div>
                                 )}
                             </InputGroup>
                         </div>
                         
                         {/* Purchase Order Upload Section */}
                         <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                             <InputGroup label="Orden de Compra del Cliente">
                                 {isEditing ? (
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileUpload} 
                                            className="hidden" 
                                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingPO}
                                            className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 text-sm flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined !text-lg">upload_file</span>
                                            {purchaseOrder ? 'Reemplazar Archivo' : 'Subir Archivo'}
                                        </button>
                                        {isUploadingPO && <span className="text-xs text-slate-500 animate-pulse">Subiendo...</span>}
                                    </div>
                                 ) : null}
                                 
                                 {purchaseOrder ? (
                                     <div className="mt-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-lg text-sm border border-indigo-100 dark:border-indigo-800 w-fit">
                                         <span className="material-symbols-outlined !text-base">description</span>
                                         <a href={purchaseOrder.url} target="_blank" rel="noopener noreferrer" className="hover:underline font-medium truncate max-w-[200px]">{purchaseOrder.name}</a>
                                         {isEditing && <button onClick={() => setPurchaseOrder(undefined)} className="hover:text-red-500 ml-2"><span className="material-symbols-outlined !text-sm">close</span></button>}
                                     </div>
                                 ) : (!isEditing && <p className="text-sm text-slate-500 italic mt-1">No se ha adjuntado Orden de Compra.</p>)}
                             </InputGroup>
                         </div>
                    </SectionCard>

                    {/* 2. Products (Editable in Edit Mode) */}
                    <SectionCard title="Productos y Precios" icon="inventory_2">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-left text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="p-2">Producto</th>
                                        <th className="p-2">Cant.</th>
                                        <th className="p-2">Unidad</th>
                                        <th className="p-2">P. Unit.</th>
                                        <th className="p-2 text-right">Subtotal</th>
                                        {isEditing && <th className="p-2"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {quoteProducts.map((item, idx) => (
                                        <tr key={item.id || idx}>
                                            <td className="p-2">
                                                {isEditing ? (
                                                     <CustomSelect options={(products || []).map(p => ({value: p.id, name: p.name}))} value={item.productId} onChange={val => handleProductChange(idx, val)} />
                                                ) : <span className="font-medium">{(products || []).find(p => p.id === item.productId)?.name || 'Desconocido'}</span>}
                                            </td>
                                            <td className="p-2 w-24">
                                                {isEditing ? (
                                                    <input type="number" value={item.quantity} onChange={e => updateProductField(idx, 'quantity', parseFloat(e.target.value))} className={standardInputClasses} />
                                                ) : item.quantity}
                                            </td>
                                             <td className="p-2 w-24">
                                                {isEditing ? (
                                                    <CustomSelect options={[{value: 'ton', name: 'ton'}, {value: 'kg', name: 'kg'}, {value: 'L', name: 'L'}]} value={item.unit} onChange={val => updateProductField(idx, 'unit', val)} />
                                                ) : item.unit}
                                            </td>
                                            <td className="p-2 w-32">
                                                 {isEditing ? (
                                                    <input type="number" value={item.unitPrice} onChange={e => updateProductField(idx, 'unitPrice', parseFloat(e.target.value))} className={standardInputClasses} />
                                                ) : `$${item.unitPrice.toLocaleString()}`}
                                            </td>
                                            <td className="p-2 text-right font-bold">${(item.quantity * item.unitPrice).toLocaleString()}</td>
                                            {isEditing && (
                                                <td className="p-2 text-center">
                                                    <button onClick={() => removeProduct(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><span className="material-symbols-outlined text-sm">close</span></button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {isEditing && (
                                <button type="button" onClick={addQuoteProduct} className="mt-3 text-sm font-semibold text-indigo-600 flex items-center gap-1"><span className="material-symbols-outlined text-sm">add</span> Añadir Producto</button>
                            )}
                        </div>
                    </SectionCard>

                    {/* 3. Logistics & Extras (Full Editing Capability) */}
                    {isEditing ? (
                         <>
                            <CollapsibleCard title="Logística y Entregas" icon="local_shipping" defaultOpen={false}>
                                <div className="flex items-center justify-between mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                    <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Habilitar Logística</span>
                                    <Switch enabled={deliveryInfoEnabled} onToggle={setDeliveryInfoEnabled} />
                                </div>
                                {deliveryInfoEnabled && (
                                    <div className="space-y-4">
                                        {deliverySchedule.map((item, index) => (
                                            <div key={item.id} className="p-3 border rounded-lg relative bg-white dark:bg-slate-700">
                                                <button type="button" onClick={() => removeDeliverySchedule(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-sm">close</span></button>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="text" value={item.address} onChange={e => updateDeliverySchedule(index, 'address', e.target.value)} className={standardInputClasses} placeholder="Dirección"/>
                                                    <input type="date" value={item.date} onChange={e => updateDeliverySchedule(index, 'date', e.target.value)} className={standardInputClasses} />
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addDeliveryScheduleItem} className="text-sm font-semibold text-indigo-600 flex items-center gap-1"><span className="material-symbols-outlined text-sm">add</span> Añadir Destino</button>
                                    </div>
                                )}
                            </CollapsibleCard>

                            <CollapsibleCard title="Costos Logísticos" icon="paid" defaultOpen={false}>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><h4 className="text-sm font-bold">Fletes</h4><button onClick={addFreight} className="text-xs font-bold text-indigo-600">+ Añadir</button></div>
                                    {freights.map((item, idx) => (
                                        <div key={item.id} className="flex gap-2 items-center">
                                            <input className={standardInputClasses} value={item.origin} onChange={e=>updateFreight(idx,'origin',e.target.value)} placeholder="Origen"/>
                                            <input className={standardInputClasses} value={item.destination} onChange={e=>updateFreight(idx,'destination',e.target.value)} placeholder="Destino"/>
                                            <input type="number" className={standardInputClasses} value={item.cost} onChange={e=>updateFreight(idx,'cost',parseFloat(e.target.value))}/>
                                            <button onClick={()=>removeFreight(idx)} className="text-red-500"><span className="material-symbols-outlined">close</span></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={handleCalculateFreight} className="text-xs font-bold text-white bg-indigo-600 px-3 py-2 rounded-lg">Calcular Automático</button>
                                </div>
                            </CollapsibleCard>
                         </>
                    ) : (
                        <SectionCard title="Logística y Costos Adicionales" icon="local_shipping">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Fletes ({(quote.freight || []).length}):</span> <span>${quote.totals.freight.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Maniobras:</span> <span>${quote.totals.handling.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Seguro:</span> <span>${quote.totals.insurance.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Almacenaje:</span> <span>${quote.totals.storage.toLocaleString()}</span></div>
                            </div>
                        </SectionCard>
                    )}

                    {/* 4. Notes & Terms (Explicitly in Left Column) */}
                    <SectionCard title="Notas y Términos" icon="description">
                         {isEditing ? (
                             <textarea rows={6} value={quote.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} className={standardInputClasses} placeholder="Notas visibles en el PDF..." />
                         ) : (
                             <div className="prose prose-sm max-w-none text-slate-600 dark:text-slate-300">
                                 <p className="whitespace-pre-wrap">{quote.notes || 'Sin notas adicionales.'}</p>
                             </div>
                         )}
                         {/* Internal Notes System */}
                         {!isEditing && <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <NotesSection entityId={quote.id} entityType="quote" notes={quoteNotes} onNoteAdded={handleNoteAdded} />
                         </div>}
                    </SectionCard>
                </div>

                {/* RIGHT COLUMN: STICKY SUMMARY */}
                <div className="lg:col-span-1 space-y-6">
                     <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden sticky top-6">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-4 border-b border-indigo-700 pb-2">Resumen Financiero</h3>
                            <div className="space-y-2 text-sm text-indigo-100">
                                <div className="flex justify-between"><span>Productos</span> <span>${totals.products.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Servicios/Logística</span> <span>${(totals.freight + totals.handling + totals.insurance + totals.storage).toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Otros/Comisiones</span> <span>${(totals.commissions + totals.other).toLocaleString()}</span></div>
                                <div className="border-t border-indigo-700 my-2 pt-2 flex justify-between font-bold text-white"><span>Subtotal</span> <span>${totals.subtotal.toLocaleString()}</span></div>
                                
                                <div className="flex justify-between text-xs items-center">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <span>IVA (16%)</span>
                                            <label className="flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={applyVat} 
                                                    onChange={e => setApplyVat(e.target.checked)} 
                                                    className="rounded bg-indigo-800 border-indigo-600 text-indigo-400 focus:ring-indigo-400 h-4 w-4" 
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <span>IVA ({quote.taxRate}%)</span>
                                    )}
                                    <span>${totals.tax.toLocaleString()}</span>
                                </div>

                                <div className="pt-4 mt-2 border-t-2 border-indigo-500 flex justify-between items-end">
                                    <span className="text-lg font-medium">Total</span>
                                    <span className="text-3xl font-bold tracking-tight">${totals.grandTotal.toLocaleString()}</span>
                                </div>
                                <p className="text-right text-xs text-indigo-300 mt-1">{currency}</p>
                            </div>
                            
                            {/* Action Buttons in Sticky Bar */}
                            <div className="mt-6 grid grid-cols-1 gap-3">
                                <button className="w-full bg-transparent border border-white/30 text-white font-semibold py-2 rounded-lg shadow-sm hover:bg-white/10 transition-colors flex justify-center items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span> Descargar PDF
                                </button>
                                
                                {quote.status === QuoteStatus.ListaParaEnviar && (
                                    <button className="w-full bg-white text-indigo-900 font-bold py-2 rounded-lg shadow hover:bg-gray-100 transition-colors flex justify-center items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">send</span> Enviar por Correo
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full opacity-20 blur-2xl"></div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteDetailPage;
