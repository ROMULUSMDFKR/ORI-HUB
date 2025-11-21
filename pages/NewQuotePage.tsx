
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Company, Prospect, Product, ProductLot, User, Unit, InternalCompany, QuoteHandling, Quote, QuoteStatus, Attachment, Currency } from '../types';
import { api } from '../api/firebaseApi';
import CustomSelect from '../components/ui/CustomSelect';
import { convertQuantityToKg } from '../utils/calculations';
import { useToast } from '../hooks/useToast';

// --- Improved UI Components ---

const CollapsibleCard: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; icon?: string }> = ({ title, children, defaultOpen = false, icon }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200">
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

const QuoteSectionCard: React.FC<{ title: string; children: React.ReactNode; icon?: string; className?: string }> = ({ title, children, icon, className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-5">
            {children}
        </div>
    </div>
);

const FormRow: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 items-start ${className}`}>
        {children}
    </div>
);

const InputGroup: React.FC<{ label: string; children: React.ReactNode; error?: string; className?: string }> = ({ label, children, error, className = '' }) => (
    <div className={className}>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
        {children}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
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


// --- Main Page Component ---

const NewQuotePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    // Data fetching
    const { data: internalCompanies } = useCollection<InternalCompany>('internalCompanies');
    const { data: companies } = useCollection<Company>('companies');
    const { data: prospects } = useCollection<Prospect>('prospects');
    const { data: products } = useCollection<Product>('products');
    const { data: users } = useCollection<User>('users');
    const { data: freightRules } = useCollection<any>('freightPricing');

    // Form State
    const [attendingCompany, setAttendingCompany] = useState('');
    const [recipientType, setRecipientType] = useState<'client' | 'prospect'>('client');
    const [selectedRecipient, setSelectedRecipient] = useState('');
    const [selectedContact, setSelectedContact] = useState('');
    const [validityDate, setValidityDate] = useState<string>('');
    
    const [quoteProducts, setQuoteProducts] = useState<any[]>([]);
    const [availableLots, setAvailableLots] = useState<{[key: string]: ProductLot[]}>({});

    const [deliveryInfoEnabled, setDeliveryInfoEnabled] = useState(false);
    const [deliverySchedule, setDeliverySchedule] = useState<any[]>([]);

    const [commissions, setCommissions] = useState<any[]>([]);
    
    const [handling, setHandling] = useState<QuoteHandling[]>([]);
    
    const [freightEnabled, setFreightEnabled] = useState(false);
    const [freights, setFreights] = useState<any[]>([]);
    
    const [insuranceEnabled, setInsuranceEnabled] = useState(false);
    const [insuranceCost, setInsuranceCost] = useState(0);

    const [storageEnabled, setStorageEnabled] = useState(false);
    const [storage, setStorage] = useState({ period: 1, unit: 'mes' as any, cost: 0, enabled: false, costPerTon: 0 });

    const [additionalItems, setAdditionalItems] = useState<any[]>([]);
    
    const [internalNotes, setInternalNotes] = useState('');
    const [terms, setTerms] = useState('');

    const [approver, setApprover] = useState('');
    const [responsible, setResponsible] = useState('');
    
    const [currency, setCurrency] = useState<Currency>('MXN');
    const [exchangeRate, setExchangeRate] = useState({ official: 20.0, commission: 0.3 });
    const [applyVat, setApplyVat] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    
    // File Upload State
    const [purchaseOrder, setPurchaseOrder] = useState<Attachment | undefined>(undefined);
    const [isUploadingPO, setIsUploadingPO] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Exchange Rate on Mount
    useEffect(() => {
        fetchExchangeRate();
    }, []);

    // Dynamic handlers
    const addQuoteProduct = () => {
        setQuoteProducts([...quoteProducts, { id: Date.now(), productId: '', lotId: '', quantity: 0, unit: 'ton', minPrice: 0, unitPrice: 0 }]);
    };
    
    const handleProductChange = async (index: number, productId: string) => {
        const newProducts = [...quoteProducts];
        newProducts[index].productId = productId;
        newProducts[index].lotId = '';
        setQuoteProducts(newProducts);
        
        if (productId) {
            const lots = await api.getLotsForProduct(productId);
            const activeLots = lots.filter(l => l.stock.some((s: { qty: number; }) => s.qty > 0));
            setAvailableLots(prev => ({ ...prev, [productId]: activeLots }));
        }
    };
    
    const handleLotChange = (index: number, lotId: string) => {
        const newProducts = [...quoteProducts];
        const product = newProducts[index];
        const lots = availableLots[product.productId] || [];
        const selectedLot = lots.find(l => l.id === lotId);
        newProducts[index].lotId = lotId;
        newProducts[index].minPrice = selectedLot?.pricing.min || 0;
        newProducts[index].unitPrice = selectedLot?.pricing.min || 0; // Default unit price to min
        setQuoteProducts(newProducts);
    };

    const updateProductField = (index: number, field: string, value: any) => {
        const newProducts = [...quoteProducts];
        newProducts[index][field] = value;
        setQuoteProducts(newProducts);
    };

    const removeProduct = (index: number) => {
        setQuoteProducts(quoteProducts.filter((_, i) => i !== index));
    };
    
    // --- Commissions Handlers ---
    const addCommission = () => {
        setCommissions([...commissions, { id: Date.now(), salespersonId: '', type: 'fijo_ton', value: 0 }]);
    };
    
    const updateCommission = (index: number, field: string, value: any) => {
        const newComms = [...commissions];
        newComms[index][field] = value;
        setCommissions(newComms);
    };

    const removeCommission = (index: number) => {
        setCommissions(commissions.filter((_, i) => i !== index));
    };

    // --- Logistics Handlers ---
    const addFreight = () => {
        setFreights([...freights, {id: Date.now(), origin: '', destination: '', cost: 0}]);
    };

    const updateFreight = (index: number, field: string, value: any) => {
        const newFreights = [...freights];
        newFreights[index][field] = value;
        setFreights(newFreights);
    };
    
    const removeFreight = (index: number) => {
        setFreights(freights.filter((_, i) => i !== index));
    };
    
    const addDeliveryScheduleItem = () => {
        setDeliverySchedule([...deliverySchedule, {id: Date.now(), address: '', zip: '', qty: 0, date: ''}]);
    }
    
    const updateDeliverySchedule = (index: number, field: string, value: any) => {
        const newSchedule = [...deliverySchedule];
        newSchedule[index][field] = value;
        setDeliverySchedule(newSchedule);
    };

    const removeDeliverySchedule = (index: number) => {
        setDeliverySchedule(deliverySchedule.filter((_, i) => i !== index));
    };
    
    const addAdditionalItem = () => {
        setAdditionalItems([...additionalItems, {id: Date.now(), name: '', quantity: 1, unitPrice: 0}]);
    };

    const updateAdditionalItem = (index: number, field: string, value: any) => {
        const newItems = [...additionalItems];
        newItems[index][field] = value;
        setAdditionalItems(newItems);
    };

    const removeAdditionalItem = (index: number) => {
        setAdditionalItems(additionalItems.filter((_, i) => i !== index));
    };
    
    const addHandling = () => {
        setHandling([...handling, { id: String(Date.now()), type: 'Ninguna', costPerTon: 0 }]);
    };
    
    const updateHandling = (index: number, field: keyof QuoteHandling, value: any) => {
        const newHandling = [...handling];
        (newHandling[index] as any)[field] = value;
        setHandling(newHandling);
    };
    
    const removeHandling = (index: number) => {
        setHandling(handling.filter((_, i) => i !== index));
    };

    const setValidityDays = (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        setValidityDate(date.toISOString().split('T')[0]);
    };
    
    const fetchExchangeRate = async () => {
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();
            const rate = data.rates.MXN;
            if (rate) {
                setExchangeRate(prev => ({ ...prev, official: rate }));
                // Use silent update on mount, explicit toast on manual click
            }
        } catch (error) {
            console.error("Error fetching exchange rate:", error);
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

    const handleCalculateFreight = () => {
        if (quoteProducts.length === 0) {
            showToast('warning', "Añade productos a la cotización primero.");
            return;
        }
        
        if (deliverySchedule.length === 0) {
            showToast('warning', "Añade al menos un destino en 'Logística de Entrega' para calcular.");
            setDeliveryInfoEnabled(true);
            return;
        }
    
        const totalWeightKg = quoteProducts.reduce((sum, p) => {
            return sum + convertQuantityToKg(Number(p.quantity), p.unit as Unit);
        }, 0);
    
        const origin = 'Almacén Principal (Veracruz)'; 
        const destination = deliverySchedule[0].address; 
    
        if (!destination) {
            showToast('warning', "La dirección de entrega está vacía.");
            return;
        }
    
        const matchingRule = (freightRules || []).find((rule: any) => 
            totalWeightKg >= rule.minWeightKg &&
            totalWeightKg <= rule.maxWeightKg
        );
    
        if (!matchingRule) {
            const estimatedCost = totalWeightKg * 1.5; 
            setFreightEnabled(true);
            const newFreight = { id: Date.now(), origin: origin, destination: destination, cost: estimatedCost };
            setFreights([newFreight]);
            showToast('success', `Flete estimado (sin regla exacta): $${estimatedCost.toFixed(2)}`);
            return;
        }
    
        let cost = 0;
        if (matchingRule.flatRate > 0) {
            cost = matchingRule.flatRate;
        } else if (matchingRule.pricePerKg > 0) {
            cost = totalWeightKg * matchingRule.pricePerKg;
        }
    
        setFreightEnabled(true);
        const newFreight = { id: Date.now(), origin: origin, destination: destination, cost: cost };
        setFreights([newFreight]);
        showToast('success', `Flete calculado y añadido: $${cost.toFixed(2)}`);
    };
    
    // --- Calculations ---
    const totals = useMemo(() => {
        const productsTotal = quoteProducts.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const commissionsTotal = commissions.reduce((acc, c) => acc + c.value, 0); 
        const totalWeight = quoteProducts.reduce((sum, p) => sum + convertQuantityToKg(Number(p.quantity), p.unit as Unit) / 1000, 0); // in tons
        
        const handlingTotal = handling.reduce((acc, h) => acc + (h.costPerTon * totalWeight), 0); 
        const freightTotal = freightEnabled ? freights.reduce((acc, f) => acc + f.cost, 0) : 0;
        const insuranceTotal = insuranceEnabled ? (insuranceCost * totalWeight) : 0;
        const storageTotal = storageEnabled ? (storage.cost * totalWeight) : 0;
        const otherTotal = additionalItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        
        const subtotal = productsTotal + commissionsTotal + handlingTotal + freightTotal + insuranceTotal + storageTotal + otherTotal;
        const tax = applyVat ? subtotal * 0.16 : 0;
        const grandTotal = subtotal + tax;

        return { productsTotal, commissionsTotal, handlingTotal, freightTotal, insuranceTotal, storageTotal, otherTotal, subtotal, tax, grandTotal };
    }, [quoteProducts, commissions, handling, freightEnabled, freights, insuranceEnabled, insuranceCost, storageEnabled, storage, additionalItems, applyVat]);


    const handleSaveQuote = async () => {
        if (!selectedRecipient) {
            showToast('error', 'Por favor selecciona un cliente o prospecto.');
            return;
        }
        if (quoteProducts.length === 0) {
            showToast('error', 'Debe haber al menos un producto en la cotización.');
            return;
        }

        setIsSaving(true);
        
        // --- Generate Smart Folio ---
        let recipientName = '';
        if (recipientType === 'client' && companies) {
            const company = companies.find(c => c.id === selectedRecipient);
            recipientName = company?.shortName || company?.name || 'CLI';
        } else if (prospects) {
            const prospect = prospects.find(p => p.id === selectedRecipient);
            recipientName = prospect?.name || 'PRO';
        }
        
        // Clean name: remove spaces, take first 4 chars, uppercase
        const codeName = recipientName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
        
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digit random
        
        const folio = `${codeName}-${dateStr}-${randomSuffix}`;


        const quoteData: Omit<Quote, 'id'> = {
            folio: folio,
            issuingCompanyId: attendingCompany,
            [recipientType === 'client' ? 'companyId' : 'prospectId']: selectedRecipient,
            contactId: selectedContact,
            salespersonId: responsible,
            approverId: approver,
            status: QuoteStatus.Borrador,
            createdAt: new Date().toISOString(),
            validity: validityDate ? Math.ceil((new Date(validityDate).getTime() - Date.now()) / (1000 * 3600 * 24)) : 30,
            currency: currency,
            exchangeRate: {
                official: exchangeRate.official,
                commission: exchangeRate.commission,
                final: exchangeRate.official + exchangeRate.commission
            },
            items: quoteProducts.map(p => ({
                id: `item-${p.id}`,
                productId: p.productId,
                lotId: p.lotId,
                qty: p.quantity,
                unit: p.unit,
                unitPrice: p.unitPrice,
                subtotal: p.quantity * p.unitPrice
            })),
            deliveries: deliverySchedule.map(d => ({
                id: `del-${d.id}`,
                address: d.address,
                zip: d.zip,
                qty: d.qty,
                date: d.date
            })),
            commissions: commissions.map(c => ({
                id: `comm-${c.id}`,
                salespersonId: c.salespersonId,
                type: c.type,
                value: c.value
            })),
            handling: handling,
            freight: freights.map(f => ({ id: String(f.id), origin: f.origin, destination: f.destination, cost: f.cost })),
            insurance: { enabled: insuranceEnabled, costPerTon: insuranceCost },
            storage: { enabled: storageEnabled, period: storage.period, unit: storage.unit, costPerTon: storage.cost },
            otherItems: additionalItems.map(i => ({ id: String(i.id), name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
            
            purchaseOrderAttachment: purchaseOrder,

            taxRate: applyVat ? 16 : 0,
            totals: {
                products: totals.productsTotal,
                commissions: totals.commissionsTotal,
                handling: totals.handlingTotal,
                freight: totals.freightTotal,
                insurance: totals.insuranceTotal,
                storage: totals.storageTotal,
                other: totals.otherTotal,
                subtotal: totals.subtotal,
                tax: totals.tax,
                grandTotal: totals.grandTotal
            },
            notes: internalNotes,
            changeLog: []
        };

        try {
            await api.addDoc('quotes', quoteData);
            showToast('success', `Cotización ${folio} guardada exitosamente.`);
            navigate('/hubs/quotes');
        } catch (error) {
            console.error("Error saving quote:", error);
            showToast('error', 'Hubo un error al guardar la cotización.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const userOptions = (users || []).map(u => ({ value: u.id, name: u.name }));
    
    const activeInternalCompanies = (internalCompanies || []).filter(c => c.isActive);

    const standardInputClasses = "w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

    return (
        <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Cotización</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => navigate(-1)}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSaveQuote} 
                        disabled={isSaving}
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Cotización
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                
                {/* LEFT COLUMN (Main Form) */}
                <div className="xl:col-span-2 space-y-6">
                    
                    {/* Compact General Info */}
                    <QuoteSectionCard title="Información General" icon="feed">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputGroup label="Empresa que Atiende">
                                <CustomSelect 
                                    options={activeInternalCompanies.map(c => ({ value: c.id, name: c.name }))} 
                                    value={attendingCompany} 
                                    onChange={setAttendingCompany} 
                                    placeholder="Seleccionar..."
                                />
                            </InputGroup>
                            <InputGroup label="Tipo de Destinatario">
                                 <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg p-1 bg-slate-100 dark:bg-slate-900">
                                    <button type="button" onClick={() => setRecipientType('client')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${recipientType === 'client' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Cliente</button>
                                    <button type="button" onClick={() => setRecipientType('prospect')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${recipientType === 'prospect' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Prospecto</button>
                                </div>
                            </InputGroup>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <InputGroup label={`Seleccionar ${recipientType === 'client' ? 'Cliente' : 'Prospecto'}`}>
                                <CustomSelect options={(recipientType === 'client' ? companies : prospects)?.map(r => ({ value: r.id, name: r.name })) || []} value={selectedRecipient} onChange={setSelectedRecipient} placeholder="Seleccionar..."/>
                            </InputGroup>
                            <InputGroup label="Contacto">
                                <CustomSelect options={[{ value: 'contact-1', name: 'Roberto Ortega' }, { value: 'contact-2', name: 'Ana Méndez' }]} value={selectedContact} onChange={setSelectedContact} placeholder="Opcional"/>
                            </InputGroup>
                             <InputGroup label="Vencimiento">
                                <div className="flex flex-col gap-2">
                                    <input type="date" value={validityDate} onChange={e => setValidityDate(e.target.value)} className={standardInputClasses} />
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
                            </InputGroup>
                        </div>
                         
                         {/* Purchase Order Upload */}
                         <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                             <InputGroup label="Orden de Compra del Cliente (Opcional)">
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
                                    {purchaseOrder && (
                                        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full text-xs">
                                            <span className="material-symbols-outlined !text-sm">description</span>
                                            <span className="truncate max-w-[150px]">{purchaseOrder.name}</span>
                                            <button onClick={() => setPurchaseOrder(undefined)} className="hover:text-red-500 ml-1"><span className="material-symbols-outlined !text-sm">close</span></button>
                                        </div>
                                    )}
                                </div>
                             </InputGroup>
                         </div>
                    </QuoteSectionCard>

                    {/* MOVED: Responsables and Finance Config */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <QuoteSectionCard title="Responsables" icon="group">
                            <div className="space-y-4">
                                <InputGroup label="Vendedor">
                                    <CustomSelect options={userOptions} value={responsible} onChange={setResponsible} placeholder="Seleccionar..."/>
                                </InputGroup>
                                <InputGroup label="Aprobador">
                                     <CustomSelect options={userOptions} value={approver} onChange={setApprover} placeholder="Seleccionar..."/>
                                </InputGroup>
                            </div>
                        </QuoteSectionCard>

                        <QuoteSectionCard title="Configuración Financiera" icon="currency_exchange">
                             <div className="grid grid-cols-1 gap-3">
                                 <InputGroup label="Moneda">
                                     <CustomSelect
                                        options={[{value: 'MXN', name: 'Pesos Mexicanos (MXN)'}, {value: 'USD', name: 'Dólares (USD)'}]}
                                        value={currency}
                                        onChange={(val) => setCurrency(val as Currency)}
                                    />
                                 </InputGroup>
                             </div>
                             <div className="grid grid-cols-2 gap-3 mt-2">
                                 <InputGroup label="Tipo de Cambio Oficial">
                                    <div className="flex gap-2">
                                        <input type="number" step="0.01" value={exchangeRate.official} onChange={e => setExchangeRate(r => ({...r, official: parseFloat(e.target.value)}))} className={standardInputClasses} />
                                        <button onClick={fetchExchangeRate} className="p-2 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-200" title="Actualizar TC">
                                            <span className="material-symbols-outlined !text-lg">sync</span>
                                        </button>
                                    </div>
                                 </InputGroup>
                                 <InputGroup label="Comisión sobre TC (%)">
                                    <input type="number" step="0.1" value={exchangeRate.commission} onChange={e => setExchangeRate(r => ({...r, commission: parseFloat(e.target.value)}))} className={standardInputClasses} />
                                 </InputGroup>
                             </div>
                             <div className="flex justify-between items-center pt-2">
                                <span className="text-xs font-medium text-slate-500">TC Final:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">${(exchangeRate.official + (exchangeRate.official * (exchangeRate.commission/100))).toFixed(4)}</span>
                             </div>
                             
                             <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                 <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-600">
                                     <span className="material-symbols-outlined text-indigo-500 text-lg">currency_exchange</span>
                                     <div>
                                         <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Tipo de Cambio Oficial (Diario)</p>
                                         <p className="text-sm font-mono font-semibold">${exchangeRate.official.toFixed(4)} MXN</p>
                                     </div>
                                 </div>
                             </div>
                        </QuoteSectionCard>
                    </div>

                    {/* Products - The Core */}
                    <QuoteSectionCard title="Productos y Precios" icon="inventory_2">
                        {quoteProducts.length > 0 ? (
                            <div className="space-y-4">
                                {quoteProducts.map((p, index) => (
                                    <div key={p.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40 relative group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                                        <button type="button" onClick={() => removeProduct(index)} className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined">close</span></button>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-5">
                                                <InputGroup label="Producto">
                                                    <CustomSelect options={products?.filter(prod => prod.isActive).map(pr => ({ value: pr.id, name: pr.name })) || []} value={p.productId} onChange={val => handleProductChange(index, val)} placeholder="Seleccionar..."/>
                                                </InputGroup>
                                            </div>
                                            <div className="md:col-span-4">
                                                <InputGroup label="Lote (Opcional)">
                                                    <CustomSelect options={(availableLots[p.productId] || []).map(l => ({ value: l.id, name: `${l.code} (${l.stock.reduce((a, s) => a+s.qty, 0)})`}))} value={p.lotId} onChange={val => handleLotChange(index, val)} placeholder="Cualquiera"/>
                                                </InputGroup>
                                            </div>
                                            <div className="md:col-span-3">
                                                 <InputGroup label="Precio Mínimo">
                                                     <div className="py-2 px-3 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-mono text-right">
                                                        ${p.minPrice.toFixed(2)}
                                                     </div>
                                                 </InputGroup>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                             <InputGroup label="Cantidad">
                                                <input type="number" value={p.quantity} onChange={e => updateProductField(index, 'quantity', parseFloat(e.target.value))} className={standardInputClasses} />
                                             </InputGroup>
                                             <InputGroup label="Unidad">
                                                <CustomSelect options={[{value: 'ton', name: 'ton'}, {value: 'kg', name: 'kg'}, {value: 'L', name: 'L'}]} value={p.unit} onChange={val => updateProductField(index, 'unit', val)} />
                                             </InputGroup>
                                             <InputGroup label="Precio Unitario">
                                                <input type="number" value={p.unitPrice} onChange={e => updateProductField(index, 'unitPrice', parseFloat(e.target.value))} className={`${standardInputClasses} font-bold text-indigo-700 dark:text-indigo-400`} />
                                             </InputGroup>
                                             <div className="text-right self-end pb-1">
                                                 <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Subtotal</span>
                                                 <span className="text-lg font-bold text-slate-800 dark:text-slate-200">${(p.quantity * p.unitPrice).toLocaleString()}</span>
                                             </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                <p className="text-slate-500 dark:text-slate-400 mb-4">No hay productos en la cotización.</p>
                                <button type="button" onClick={addQuoteProduct} className="bg-indigo-50 text-indigo-700 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-100 transition-colors">
                                    + Añadir Primer Producto
                                </button>
                            </div>
                        )}
                        {quoteProducts.length > 0 && (
                            <button type="button" onClick={addQuoteProduct} className="w-full py-3 border-2 border-dashed border-indigo-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors mt-4 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">add_circle</span> Añadir Otro Producto
                            </button>
                        )}
                    </QuoteSectionCard>

                    {/* Secondary Info (Collapsible) */}
                    
                    <CollapsibleCard title="Logística y Entregas" icon="local_shipping" defaultOpen={false}>
                        <div className="flex items-center justify-between mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Habilitar Logística</span>
                                <span className="text-xs text-blue-600 dark:text-blue-400">Define destinos y fechas de entrega.</span>
                            </div>
                            <Switch enabled={deliveryInfoEnabled} onToggle={setDeliveryInfoEnabled} />
                        </div>
                        
                        {deliveryInfoEnabled && (
                            <div className="space-y-4">
                                {deliverySchedule.map((item, index) => (
                                    <div key={item.id} className="p-4 border rounded-lg relative bg-white dark:bg-slate-700">
                                        <button type="button" onClick={() => removeDeliverySchedule(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">close</span></button>
                                        <FormRow>
                                            <InputGroup label="Dirección / Destino">
                                                <input type="text" value={item.address} onChange={e => updateDeliverySchedule(index, 'address', e.target.value)} className={standardInputClasses} placeholder="Ciudad, Estado o Calle"/>
                                            </InputGroup>
                                            <InputGroup label="CP">
                                                <input type="text" value={item.zip} onChange={e => updateDeliverySchedule(index, 'zip', e.target.value)} className={standardInputClasses} />
                                            </InputGroup>
                                        </FormRow>
                                        <FormRow className="mt-4">
                                            <InputGroup label="Cantidad">
                                                <input type="number" value={item.qty} onChange={e => updateDeliverySchedule(index, 'qty', parseFloat(e.target.value))} className={standardInputClasses} />
                                            </InputGroup>
                                            <InputGroup label="Fecha Requerida">
                                                <input type="date" value={item.date} onChange={e => updateDeliverySchedule(index, 'date', e.target.value)} className={standardInputClasses} />
                                            </InputGroup>
                                        </FormRow>
                                    </div>
                                ))}
                                <button type="button" onClick={addDeliveryScheduleItem} className="text-sm font-semibold text-indigo-600 flex items-center mt-2">
                                    <span className="material-symbols-outlined mr-1">add_location_alt</span> Añadir Destino
                                </button>
                            </div>
                        )}
                    </CollapsibleCard>

                    <CollapsibleCard title="Costos Logísticos (Fletes y Maniobras)" icon="paid" defaultOpen={false}>
                         <div className="space-y-6">
                            {/* Fletes */}
                            <div className="p-4 border rounded-xl border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Fletes</h4>
                                    <Switch enabled={freightEnabled} onToggle={setFreightEnabled} />
                                </div>
                                {freightEnabled && (
                                    <>
                                        <div className="space-y-3 mb-3">
                                            {freights.map((item, index) => (
                                                <div key={item.id} className="flex gap-3 items-end bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">
                                                    <div className="flex-1">
                                                        <InputGroup label="Origen"><input type="text" value={item.origin} onChange={e => updateFreight(index, 'origin', e.target.value)} className={standardInputClasses} /></InputGroup>
                                                    </div>
                                                    <div className="flex-1">
                                                        <InputGroup label="Destino"><input type="text" value={item.destination} onChange={e => updateFreight(index, 'destination', e.target.value)} className={standardInputClasses} /></InputGroup>
                                                    </div>
                                                    <div className="w-32">
                                                        <InputGroup label="Costo"><input type="number" value={item.cost} onChange={e => updateFreight(index, 'cost', parseFloat(e.target.value))} className={standardInputClasses} /></InputGroup>
                                                    </div>
                                                    <button onClick={() => removeFreight(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-0.5"><span className="material-symbols-outlined">delete</span></button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-4">
                                            <button type="button" onClick={addFreight} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100">+ Manual</button>
                                            <button type="button" onClick={handleCalculateFreight} className="text-xs font-bold text-white bg-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-1"><span className="material-symbols-outlined text-sm">calculate</span> Calcular Automático</button>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {/* Maniobras, Seguros, Almacenaje (Compact Grid) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border rounded-xl border-slate-200 dark:border-slate-700">
                                     <div className="flex justify-between mb-2">
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Maniobras</h4>
                                        <button type="button" onClick={addHandling} className="text-xs font-bold text-indigo-600">+ Añadir</button>
                                     </div>
                                     <div className="space-y-2">
                                        {handling.map((item, index) => (
                                            <div key={item.id} className="flex gap-2 items-center">
                                                <div className="flex-1">
                                                    <CustomSelect options={[{value: 'Carga', name: 'Carga'}, {value: 'Descarga', name: 'Descarga'}, {value: 'Carga y Descarga', name: 'Carga y Descarga'}]} value={item.type} onChange={val => updateHandling(index, 'type', val)} buttonClassName={standardInputClasses + " py-1 min-h-[36px]"} />
                                                </div>
                                                <div className="w-24">
                                                    <input type="number" value={item.costPerTon} onChange={e => updateHandling(index, 'costPerTon', parseFloat(e.target.value))} className={standardInputClasses + " py-1"} placeholder="$/ton" />
                                                </div>
                                                <button onClick={() => removeHandling(index)} className="text-red-500"><span className="material-symbols-outlined text-base">close</span></button>
                                            </div>
                                        ))}
                                        {handling.length === 0 && <p className="text-xs text-slate-400 italic">Sin maniobras extras.</p>}
                                    </div>
                                </div>
                                
                                <div className="p-4 border rounded-xl border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Seguro</span>
                                        <Switch enabled={insuranceEnabled} onToggle={setInsuranceEnabled} />
                                    </div>
                                    {insuranceEnabled && <input type="number" value={insuranceCost} onChange={e => setInsuranceCost(parseFloat(e.target.value))} className={standardInputClasses} placeholder="Costo por Tonelada" />}
                                    
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Almacenaje</span>
                                        <Switch enabled={storageEnabled} onToggle={setStorageEnabled} />
                                    </div>
                                    {storageEnabled && <input type="number" value={storage.cost} onChange={e => setStorage(s => ({...s, cost: parseFloat(e.target.value)}))} className={standardInputClasses} placeholder="Costo por Tonelada" />}
                                </div>
                            </div>
                         </div>
                    </CollapsibleCard>

                    <CollapsibleCard title="Comisiones y Conceptos Adicionales" icon="percent" defaultOpen={false}>
                         <div className="space-y-6">
                            {/* Comisiones */}
                             <div>
                                <div className="flex justify-between items-center mb-2">
                                     <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Comisiones Vendedores</h4>
                                     <button type="button" onClick={addCommission} className="text-xs font-bold text-indigo-600">+ Añadir</button>
                                </div>
                                <div className="space-y-2">
                                    {commissions.map((comm, index) => (
                                        <div key={comm.id} className="flex gap-2 items-end bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">
                                            <div className="flex-1">
                                                <InputGroup label="Vendedor">
                                                    <CustomSelect options={userOptions} value={comm.salespersonId} onChange={val => updateCommission(index, 'salespersonId', val)} buttonClassName={standardInputClasses + " py-1 min-h-[36px]"} />
                                                </InputGroup>
                                            </div>
                                            <div className="w-32">
                                                <InputGroup label="Valor">
                                                    <input type="number" value={comm.value} onChange={e => updateCommission(index, 'value', parseFloat(e.target.value))} className={standardInputClasses + " py-1"} />
                                                </InputGroup>
                                            </div>
                                            <button onClick={() => removeCommission(index)} className="p-2 text-red-500"><span className="material-symbols-outlined">delete</span></button>
                                        </div>
                                    ))}
                                    {commissions.length === 0 && <p className="text-xs text-slate-400 italic">Sin comisiones asignadas.</p>}
                                </div>
                            </div>
                            
                            {/* Conceptos Adicionales */}
                             <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                     <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Extras / Varios</h4>
                                     <button type="button" onClick={addAdditionalItem} className="text-xs font-bold text-indigo-600">+ Añadir</button>
                                </div>
                                <div className="space-y-2">
                                    {additionalItems.map((item, index) => (
                                        <div key={item.id} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">
                                            <input type="text" value={item.name} onChange={e => updateAdditionalItem(index, 'name', e.target.value)} className={standardInputClasses + " flex-1 py-1"} placeholder="Concepto (ej. Tarimas)" />
                                            <input type="number" value={item.quantity} onChange={e => updateAdditionalItem(index, 'quantity', parseFloat(e.target.value))} className="w-16 py-1 px-2 border rounded-lg text-sm" placeholder="Cant." />
                                            <input type="number" value={item.unitPrice} onChange={e => updateAdditionalItem(index, 'unitPrice', parseFloat(e.target.value))} className="w-24 py-1 px-2 border rounded-lg text-sm" placeholder="$ Unit." />
                                            <button onClick={() => removeAdditionalItem(index)} className="text-red-500 p-1"><span className="material-symbols-outlined">close</span></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         </div>
                    </CollapsibleCard>

                     <QuoteSectionCard title="Notas y Términos" icon="description">
                         <div className="space-y-4">
                             <InputGroup label="Notas Internas (Privado)">
                                <textarea rows={2} value={internalNotes} onChange={e => setInternalNotes(e.target.value)} className={standardInputClasses} placeholder="Solo visible para el equipo..." />
                            </InputGroup>
                            <InputGroup label="Términos y Condiciones (Visible en PDF)">
                                <textarea rows={4} value={terms} onChange={e => setTerms(e.target.value)} className={standardInputClasses} placeholder="Vigencia, condiciones de pago, etc..." />
                            </InputGroup>
                        </div>
                    </QuoteSectionCard>

                </div>
                
                {/* RIGHT COLUMN (Sticky Sidebar) */}
                <div className="xl:col-span-1 space-y-6 xl:sticky xl:top-6">
                    
                    {/* Financial Summary Card - The most important one */}
                    <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-4 border-b border-indigo-700 pb-2">Resumen Financiero</h3>
                            
                            <div className="space-y-2 text-sm">
                                {/* Products */}
                                <div className="flex justify-between text-indigo-200">
                                    <span>Productos</span>
                                    <span>${totals.productsTotal.toLocaleString()}</span>
                                </div>

                                {/* Freights */}
                                {totals.freightTotal > 0 && (
                                    <div className="flex justify-between text-indigo-200">
                                        <span>Fletes</span>
                                        <span>${totals.freightTotal.toLocaleString()}</span>
                                    </div>
                                )}

                                {/* Handling */}
                                {totals.handlingTotal > 0 && (
                                    <div className="flex justify-between text-indigo-200">
                                        <span>Maniobras</span>
                                        <span>${totals.handlingTotal.toLocaleString()}</span>
                                    </div>
                                )}

                                {/* Insurance */}
                                {totals.insuranceTotal > 0 && (
                                    <div className="flex justify-between text-indigo-200">
                                        <span>Seguro</span>
                                        <span>${totals.insuranceTotal.toLocaleString()}</span>
                                    </div>
                                )}
                                
                                {/* Storage */}
                                {totals.storageTotal > 0 && (
                                    <div className="flex justify-between text-indigo-200">
                                        <span>Almacenaje</span>
                                        <span>${totals.storageTotal.toLocaleString()}</span>
                                    </div>
                                )}
                                
                                {/* Commissions */}
                                {totals.commissionsTotal > 0 && (
                                    <div className="flex justify-between text-indigo-200">
                                        <span>Comisiones</span>
                                        <span>${totals.commissionsTotal.toLocaleString()}</span>
                                    </div>
                                )}

                                {/* Additional Items */}
                                {totals.otherTotal > 0 && (
                                    <div className="flex justify-between text-indigo-200">
                                        <span>Conceptos Extra</span>
                                        <span>${totals.otherTotal.toLocaleString()}</span>
                                    </div>
                                )}
                                
                                {/* Subtotal */}
                                <div className="border-t border-indigo-700 my-2 pt-2">
                                    <div className="flex justify-between font-semibold"><span>Subtotal</span><span>${totals.subtotal.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-indigo-300 text-xs items-center mt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <span>IVA (16%)</span>
                                            <input 
                                                type="checkbox" 
                                                checked={applyVat} 
                                                onChange={e => setApplyVat(e.target.checked)} 
                                                className="rounded bg-indigo-800 border-indigo-600 text-indigo-400 focus:ring-indigo-400" 
                                            />
                                        </label>
                                        <span>${totals.tax.toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                {/* Total */}
                                <div className="pt-4 mt-2 border-t-2 border-indigo-600">
                                    <div className="flex justify-between items-end">
                                        <span className="text-lg font-medium opacity-80">Total</span>
                                        <span className="text-3xl font-bold tracking-tight">${totals.grandTotal.toLocaleString()}</span>
                                    </div>
                                    <p className="text-right text-xs text-indigo-300 mt-1">{currency}</p>
                                </div>
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full opacity-20 blur-2xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewQuotePage;
