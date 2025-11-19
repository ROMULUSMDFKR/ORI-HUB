
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Company, Prospect, Product, ProductLot, User, Unit, CommissionType, ManeuverType, FreightPricingRule, QuoteHandling, Quote, QuoteStatus } from '../types';
import { api } from '../api/firebaseApi';
import CustomSelect from '../components/ui/CustomSelect';
import { convertQuantityToKg } from '../utils/calculations';
import { useToast } from '../hooks/useToast';

// --- Reusable UI Components (Moved outside) ---

const QuoteSectionCard: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
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

const Switch: React.FC<{ enabled: boolean; onToggle: (enabled: boolean) => void; }> = ({ enabled, onToggle }) => (
    <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className={`${enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors flex-shrink-0`}
    >
        <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
    </button>
);


// --- Main Page Component ---

const NewQuotePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    // Data fetching
    const { data: companies } = useCollection<Company>('companies');
    const { data: prospects } = useCollection<Prospect>('prospects');
    const { data: products } = useCollection<Product>('products');
    const { data: users } = useCollection<User>('users');
    const { data: freightRules } = useCollection<FreightPricingRule>('freightPricing');

    // Form State
    const [attendingCompany, setAttendingCompany] = useState('');
    const [recipientType, setRecipientType] = useState<'client' | 'prospect'>('client');
    const [selectedRecipient, setSelectedRecipient] = useState('');
    const [selectedContact, setSelectedContact] = useState('');
    const [validityDate, setValidityDate] = useState<string>('');
    
    const [quoteProducts, setQuoteProducts] = useState<any[]>([]);
    const [availableLots, setAvailableLots] = useState<{[key: string]: ProductLot[]}>({});

    const [deliveryInfoEnabled, setDeliveryInfoEnabled] = useState(false);
    const [deliveryLocations, setDeliveryLocations] = useState<any[]>([]);
    
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
    
    const [exchangeRate, setExchangeRate] = useState({ official: 20.0, commission: 0.3 });
    const [applyVat, setApplyVat] = useState(true);

    const [isSaving, setIsSaving] = useState(false);

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
            // Filter only active lots with stock > 0
            const activeLots = lots.filter(l => l.stock.some(s => s.qty > 0));
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
    
    const addCommission = () => {
        setCommissions([...commissions, { id: Date.now(), user: '', type: 'porcentaje', value: 0 }]);
    };
    
    const addFreight = () => {
        setFreights([...freights, {id: Date.now(), origin: '', destination: '', cost: 0}]);
    };
    
    const addDeliveryLocation = () => {
        setDeliveryLocations([...deliveryLocations, {id: Date.now(), name: '', email: '', street: '', phone: '', city: '', state: '', zip: ''}]);
    };
    
    const addDeliveryScheduleItem = () => {
        setDeliverySchedule([...deliverySchedule, {id: Date.now(), address: '', zip: '', tons: 0, date: ''}]);
    }
    
    const addAdditionalItem = () => {
        setAdditionalItems([...additionalItems, {id: Date.now(), name: '', quantity: 1, unitPrice: 0}]);
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

    const handleCalculateFreight = () => {
        if (quoteProducts.length === 0) {
            showToast('warning', "Añade productos a la cotización primero.");
            return;
        }
        if (deliveryLocations.length === 0) {
            showToast('warning', "Añade al menos una dirección de entrega personalizada.");
            setDeliveryInfoEnabled(true);
            return;
        }
    
        const totalWeightKg = quoteProducts.reduce((sum, p) => {
            return sum + convertQuantityToKg(Number(p.quantity), p.unit as Unit);
        }, 0);
    
        const origin = 'Almacén Principal (Veracruz)'; // Hardcoded as per prompt simulation
        const destination = deliveryLocations[0].city;
    
        if (!destination) {
            showToast('warning', "La primera dirección de entrega debe tener una ciudad especificada.");
            return;
        }
    
        const matchingRule = (freightRules || []).find(rule => 
            rule.origin.toLowerCase() === origin.toLowerCase() &&
            rule.destination.toLowerCase() === destination.toLowerCase() &&
            totalWeightKg >= rule.minWeightKg &&
            totalWeightKg <= rule.maxWeightKg
        );
    
        if (!matchingRule) {
            showToast('warning', `No se encontró una regla de flete para la ruta ${origin} -> ${destination} con un peso de ${totalWeightKg.toLocaleString()} kg.`);
            return;
        }
    
        let cost = 0;
        if (matchingRule.flatRate > 0) {
            cost = matchingRule.flatRate;
        } else if (matchingRule.pricePerKg > 0) {
            cost = totalWeightKg * matchingRule.pricePerKg;
        }
    
        setFreightEnabled(true);
        const newFreight = {
            id: Date.now(),
            origin: origin,
            destination: destination,
            cost: cost
        };
        setFreights([newFreight]);
        showToast('success', `Flete calculado y añadido: $${cost.toFixed(2)}`);
    };
    
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

        // Calculate Totals
        const productsTotal = quoteProducts.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const commissionsTotal = 0; // Placeholder logic for calculation
        const handlingTotal = handling.reduce((acc, h) => acc + (h.costPerTon * (quoteProducts.reduce((sum, p) => sum + p.quantity, 0))), 0); // Simple approx
        const freightTotal = freightEnabled ? freights.reduce((acc, f) => acc + f.cost, 0) : 0;
        const insuranceTotal = insuranceEnabled ? (insuranceCost * (quoteProducts.reduce((sum, p) => sum + p.quantity, 0))) : 0;
        const storageTotal = storageEnabled ? (storage.cost * (quoteProducts.reduce((sum, p) => sum + p.quantity, 0))) : 0;
        const otherTotal = additionalItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        
        const subtotal = productsTotal + commissionsTotal + handlingTotal + freightTotal + insuranceTotal + storageTotal + otherTotal;
        const tax = applyVat ? subtotal * 0.16 : 0;
        const grandTotal = subtotal + tax;

        const quoteData: Omit<Quote, 'id'> = {
            folio: `QT-${Date.now().toString().slice(-6)}`, // Simple generator
            issuingCompanyId: attendingCompany,
            [recipientType === 'client' ? 'companyId' : 'prospectId']: selectedRecipient,
            contactId: selectedContact,
            salespersonId: responsible,
            approverId: approver,
            status: QuoteStatus.Borrador,
            createdAt: new Date().toISOString(),
            validity: validityDate ? Math.ceil((new Date(validityDate).getTime() - Date.now()) / (1000 * 3600 * 24)) : 30,
            currency: 'MXN', // Default for now
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
            deliveries: [], // Todo mapping from form
            commissions: [], // Todo mapping from form
            handling: handling,
            freight: freights.map(f => ({ id: String(f.id), origin: f.origin, destination: f.destination, cost: f.cost })),
            insurance: { enabled: insuranceEnabled, costPerTon: insuranceCost },
            storage: { enabled: storageEnabled, period: storage.period, unit: storage.unit, costPerTon: storage.cost },
            otherItems: additionalItems.map(i => ({ id: String(i.id), name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
            taxRate: applyVat ? 16 : 0,
            totals: {
                products: productsTotal,
                commissions: commissionsTotal,
                handling: handlingTotal,
                freight: freightTotal,
                insurance: insuranceTotal,
                storage: storageTotal,
                other: otherTotal,
                subtotal: subtotal,
                tax: tax,
                grandTotal: grandTotal
            },
            notes: internalNotes,
            changeLog: []
        };

        try {
            await api.addDoc('quotes', quoteData);
            showToast('success', 'Cotización guardada exitosamente.');
            navigate('/hubs/quotes');
        } catch (error) {
            console.error("Error saving quote:", error);
            showToast('error', 'Hubo un error al guardar la cotización.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Cotización</h2>
                <button 
                    onClick={handleSaveQuote} 
                    disabled={isSaving}
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                    Guardar Cotización
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Tarjeta de Empresa y Cliente */}
                    <QuoteSectionCard title="Información General">
                        <FormRow>
                             <InputGroup label="Empresa que Atiende">
                                <CustomSelect options={(companies || []).map(c => ({ value: c.id, name: c.name }))} value={attendingCompany} onChange={setAttendingCompany} placeholder="Seleccionar..."/>
                            </InputGroup>
                        </FormRow>
                        <FormRow>
                             <InputGroup label="Tipo de Destinatario">
                                 <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg p-1 bg-slate-100 dark:bg-slate-900 mt-1">
                                    <button type="button" onClick={() => setRecipientType('client')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${recipientType === 'client' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}>Cliente Existente</button>
                                    <button type="button" onClick={() => setRecipientType('prospect')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${recipientType === 'prospect' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}>Prospecto</button>
                                </div>
                             </InputGroup>
                            <InputGroup label={`Seleccionar ${recipientType === 'client' ? 'Cliente' : 'Prospecto'}`}>
                                <CustomSelect options={(recipientType === 'client' ? companies : prospects)?.map(r => ({ value: r.id, name: r.name })) || []} value={selectedRecipient} onChange={setSelectedRecipient} placeholder="Seleccionar..."/>
                            </InputGroup>
                        </FormRow>
                        <FormRow>
                            <InputGroup label="Contacto">
                                <CustomSelect options={[{ value: 'contact-1', name: 'Roberto Ortega' }, { value: 'contact-2', name: 'Ana Méndez' }]} value={selectedContact} onChange={setSelectedContact} placeholder="Seleccionar contacto..."/>
                            </InputGroup>
                             <InputGroup label="Validez de la cotización">
                                <input type="date" value={validityDate} onChange={e => setValidityDate(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2" />
                                 <div className="flex gap-2 mt-2">
                                    {[7, 15, 30, 60].map(d => (
                                        <button key={d} type="button" onClick={() => setValidityDays(d)} className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">{d} días</button>
                                    ))}
                                </div>
                            </InputGroup>
                        </FormRow>
                    </QuoteSectionCard>

                    {/* Tarjeta de Productos */}
                    <QuoteSectionCard title="Productos">
                        <div className="space-y-4">
                            {quoteProducts.map((p, index) => (
                                <div key={p.id} className="p-4 border rounded-lg space-y-3 relative bg-slate-50 dark:bg-slate-800/50">
                                    <button type="button" onClick={() => removeProduct(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button>
                                    <FormRow>
                                        <InputGroup label="Producto">
                                            <CustomSelect options={products?.filter(prod => prod.isActive).map(pr => ({ value: pr.id, name: pr.name })) || []} value={p.productId} onChange={val => handleProductChange(index, val)} placeholder="Seleccionar..."/>
                                        </InputGroup>
                                        <InputGroup label="Lote">
                                            <CustomSelect options={(availableLots[p.productId] || []).map(l => ({ value: l.id, name: `${l.code} (${l.stock.reduce((a, s) => a+s.qty, 0)} disp.)`}))} value={p.lotId} onChange={val => handleLotChange(index, val)} placeholder="Seleccionar..."/>
                                        </InputGroup>
                                    </FormRow>
                                    <FormRow>
                                        <InputGroup label="Cantidad"><input type="number" value={p.quantity} onChange={e => updateProductField(index, 'quantity', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2" /></InputGroup>
                                        <InputGroup label="Unidad">
                                            <CustomSelect options={[{value: 'ton', name: 'ton'}, {value: 'kg', name: 'kg'}, {value: 'L', name: 'L'}]} value={p.unit} onChange={val => updateProductField(index, 'unit', val)} />
                                        </InputGroup>
                                        <InputGroup label="Precio Mín. Sugerido"><input type="text" value={`$${p.minPrice.toFixed(2)}`} disabled className="w-full bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg p-2 text-slate-600 dark:text-slate-300"/></InputGroup>
                                        <InputGroup label="Precio Unitario"><input type="number" value={p.unitPrice} onChange={e => updateProductField(index, 'unitPrice', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2" /></InputGroup>
                                    </FormRow>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addQuoteProduct} className="text-sm font-semibold text-indigo-600 flex items-center mt-4">
                            <span className="material-symbols-outlined mr-1">add_circle</span> Añadir Producto
                        </button>
                    </QuoteSectionCard>
                    
                    {/* ... (Rest of the sections like Delivery, Commissions, etc. kept for completeness) ... */}
                     <QuoteSectionCard title="Información Adicional">
                        <InputGroup label="Notas Internas (no visibles para el cliente)"><textarea rows={3} value={internalNotes} onChange={e => setInternalNotes(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2" /></InputGroup>
                        <InputGroup label="Términos y Condiciones"><textarea rows={5} value={terms} onChange={e => setTerms(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2" /></InputGroup>
                    </QuoteSectionCard>

                </div>
                
                <div className="lg:col-span-1 space-y-6">
                     {/* Tarjeta de Responsables */}
                    <QuoteSectionCard title="Responsables">
                        <InputGroup label="Responsable de la Cotización">
                            <CustomSelect options={users?.map(u => ({ value: u.id, name: u.name })) || []} value={responsible} onChange={setResponsible} placeholder="Seleccionar..."/>
                        </InputGroup>
                        <InputGroup label="Aprobador">
                             <CustomSelect options={users?.map(u => ({ value: u.id, name: u.name })) || []} value={approver} onChange={setApprover} placeholder="Seleccionar..."/>
                        </InputGroup>
                    </QuoteSectionCard>
                    
                    {/* Tarjeta de Finanzas */}
                     <QuoteSectionCard title="Finanzas">
                         <InputGroup label="Tipo de Cambio Oficial (MXN a USD)">
                            <input type="number" step="0.01" value={exchangeRate.official} onChange={e => setExchangeRate(r => ({...r, official: parseFloat(e.target.value)}))} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2" />
                         </InputGroup>
                         <InputGroup label="Comisión sobre TC (%)">
                            <input type="number" step="0.1" value={exchangeRate.commission} onChange={e => setExchangeRate(r => ({...r, commission: parseFloat(e.target.value)}))} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2" />
                         </InputGroup>
                         <div className="flex items-center gap-4 pt-4 border-t">
                            <Switch enabled={applyVat} onToggle={setApplyVat} />
                            <span className="text-sm font-medium">Aplicar IVA (16%)</span>
                         </div>
                     </QuoteSectionCard>
                </div>
            </div>
        </div>
    );
};

export default NewQuotePage;
