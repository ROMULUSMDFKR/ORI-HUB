
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Quote, QuoteStatus, QuoteItem, Company, Prospect, Product, User, Currency, Unit, ProductLot, QuoteCommission, QuoteHandling, Contact, Attachment } from '../types';
import { api } from '../api/firebaseApi';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import { UNITS } from '../constants';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import ToggleSwitch from '../components/ui/ToggleSwitch';

const SectionCard: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: string }> = ({ title, children, className = '', icon }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const NewQuotePage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    // Data fetching
    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    const { data: prospects, loading: pLoading } = useCollection<Prospect>('prospects');
    const { data: products, loading: prLoading } = useCollection<Product>('products');
    const { data: users, loading: uLoading } = useCollection<User>('users');
    const { data: lotsData, loading: lLoading } = useCollection<ProductLot>('lots');
    const { data: contacts, loading: contactsLoading } = useCollection<Contact>('contacts');

    // State
    const [recipientType, setRecipientType] = useState<'company' | 'prospect'>('company');
    const [recipientId, setRecipientId] = useState('');
    const [contactId, setContactId] = useState(''); 
    const [salespersonId, setSalespersonId] = useState('');
    const [approverId, setApproverId] = useState('');
    
    const [currency, setCurrency] = useState<Currency>('MXN');
    const [exchangeRate, setExchangeRate] = useState(0); 
    const [items, setItems] = useState<QuoteItem[]>([]);
    const [notes, setNotes] = useState('');
    const [taxRate, setTaxRate] = useState(16);
    const [isSaving, setIsSaving] = useState(false);

    // Logistics & Services
    const [freightRate, setFreightRate] = useState(0);
    const [handlingItems, setHandlingItems] = useState<QuoteHandling[]>([]);
    const [insuranceEnabled, setInsuranceEnabled] = useState(false);
    const [insuranceCostPerUnit, setInsuranceCostPerUnit] = useState(0);
    const [storageEnabled, setStorageEnabled] = useState(false);
    const [storageCostPerUnit, setStorageCostPerUnit] = useState(0);
    const [storageDays, setStorageDays] = useState(30);
    
    // Commissions
    const [commissionItems, setCommissionItems] = useState<QuoteCommission[]>([]);

    // Deliveries
    const [deliveries, setDeliveries] = useState<{ date: string; qty: number; address: string; unit: Unit }[]>([]);
    const [newDelivery, setNewDelivery] = useState<{ date: string; qty: number; address: string; unit: Unit; isManualAddress: boolean }>({ date: '', qty: 0, address: '', unit: 'ton', isManualAddress: false });

    // Purchase Order File
    const [poFile, setPoFile] = useState<File | null>(null);

    useEffect(() => {
        if (user && !salespersonId) {
            setSalespersonId(user.id);
        }
    }, [user, salespersonId]);
    
    useEffect(() => {
        if (items.length > 0 && !newDelivery.qty) {
             setNewDelivery(prev => ({ ...prev, unit: items[0].unit }));
        }
    }, [items]);
    
    // Initial Fetch for Exchange Rate
    useEffect(() => {
        const fetchInitialRate = async () => {
             try {
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                const data = await response.json();
                setExchangeRate(data.rates.MXN);
            } catch (e) {
                console.error(e);
                setExchangeRate(20.50); // Fallback
            }
        };
        fetchInitialRate();
    }, []);

    const loading = cLoading || pLoading || prLoading || uLoading || lLoading || contactsLoading;

    // Options
    const companyOptions = (companies || []).map(c => ({ value: c.id, name: c.shortName || c.name }));
    const prospectOptions = (prospects || []).map(p => ({ value: p.id, name: p.name }));
    
    const availableContacts = useMemo(() => {
        if (recipientType === 'company' && recipientId && contacts) {
            return contacts
                .filter(c => c.companyId === recipientId)
                .map(c => ({ value: c.id, name: `${c.name} (${c.role})` }));
        }
        return [];
    }, [recipientId, recipientType, contacts]);
    
    const clientAddresses = useMemo(() => {
         if (recipientType === 'company' && recipientId && companies) {
             const comp = companies.find(c => c.id === recipientId);
             const addresses = [...(comp?.deliveryAddresses || [])];
             if (comp?.fiscalAddress && comp.fiscalAddress.street) {
                 addresses.unshift({ 
                     ...comp.fiscalAddress, 
                     label: 'Domicilio Fiscal' 
                 });
             }
             return addresses;
         }
         return [];
    }, [recipientId, recipientType, companies]);

    const userOptions = (users || []).map(u => ({ value: u.id, name: u.name }));
    const productOptions = (products || []).map(p => ({ value: p.id, name: `${p.name} (${p.sku})` }));
    const unitOptions = UNITS.map(u => ({ value: u, name: u }));
    
    const commissionTypeOptions = [
        { value: 'percentage', name: '% Porcentaje del Valor' },
        { value: 'fixed', name: '$ Monto Fijo Total' },
        { value: 'per_ton', name: '$ Por Tonelada' },
        { value: 'per_kg', name: '$ Por Kilogramo' },
        { value: 'per_liter', name: '$ Por Litro' },
        { value: 'per_unit', name: '$ Por Unidad' },
    ];
    
    const maneuverTypeOptions = [
        { value: 'Carga', name: 'Carga' },
        { value: 'Descarga', name: 'Descarga' },
        { value: 'Carga y Descarga', name: 'Carga y Descarga' },
        { value: 'Maniobra Especial', name: 'Maniobra Especial' },
    ];

    // Calculations
    const totals = useMemo(() => {
        const productSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        
        let totalTons = 0;
        let totalKg = 0;
        let totalLiters = 0;
        let totalUnits = 0;
        let totalQuantityGeneric = 0; 

        items.forEach(item => {
            totalQuantityGeneric += item.qty;
            if (item.unit === 'ton') {
                totalTons += item.qty;
                totalKg += item.qty * 1000;
                totalLiters += item.qty * 1000; 
            } else if (item.unit === 'kg') {
                totalTons += item.qty / 1000;
                totalKg += item.qty;
                totalLiters += item.qty; 
            } else if (item.unit === 'L') {
                totalTons += item.qty / 1000; 
                totalKg += item.qty; 
                totalLiters += item.qty;
            } else {
                totalUnits += item.qty;
            }
        });
        
        const weightMultiplier = totalTons > 0 ? totalTons : totalQuantityGeneric;

        let commissionTotal = 0;
        commissionItems.forEach(comm => {
            switch(comm.type) {
                case 'percentage':
                    commissionTotal += productSubtotal * (comm.value / 100);
                    break;
                case 'fixed':
                    commissionTotal += comm.value;
                    break;
                case 'per_ton':
                    commissionTotal += totalTons * comm.value;
                    break;
                case 'per_kg':
                    commissionTotal += totalKg * comm.value;
                    break;
                case 'per_liter':
                    commissionTotal += totalLiters * comm.value;
                    break;
                case 'per_unit':
                    commissionTotal += totalUnits * comm.value;
                    break;
            }
        });

        const freightTotal = freightRate * weightMultiplier;
        const handlingTotal = handlingItems.reduce((sum, h) => sum + (h.costPerUnit * weightMultiplier), 0);
        const insuranceTotal = insuranceEnabled ? (insuranceCostPerUnit * weightMultiplier) : 0;
        const storageTotal = storageEnabled ? (storageCostPerUnit * weightMultiplier) : 0;

        const logisticsTotal = freightTotal + handlingTotal + insuranceTotal + storageTotal;
        
        const subtotal = productSubtotal + commissionTotal + logisticsTotal;
        
        const taxableBase = productSubtotal + freightTotal;
        const tax = taxableBase * (taxRate / 100);
        
        const grandTotal = subtotal + tax;
        
        return {
            products: productSubtotal,
            commissions: commissionTotal,
            freight: freightTotal,
            handling: handlingTotal,
            insurance: insuranceTotal,
            storage: storageTotal,
            other: 0,
            subtotal,
            tax,
            grandTotal,
            taxableBase,
            totalQuotedQty: totalQuantityGeneric
        };
    }, [items, taxRate, commissionItems, freightRate, handlingItems, insuranceEnabled, insuranceCostPerUnit, storageEnabled, storageCostPerUnit, storageDays]);


    // Validation Stats for Delivery
    const deliveryStats = useMemo(() => {
        const totalScheduledQty = deliveries.reduce((sum, d) => sum + d.qty, 0);
        const remainingQty = totals.totalQuotedQty - totalScheduledQty;
        const progress = totals.totalQuotedQty > 0 ? Math.min((totalScheduledQty / totals.totalQuotedQty) * 100, 100) : 0;
        const primaryUnit = items.length > 0 ? items[0].unit : 'unidades';
        
        let statusColor = 'bg-yellow-500';
        let statusText = `Faltan ${remainingQty.toLocaleString()} ${primaryUnit}`;

        if (remainingQty === 0) {
            statusColor = 'bg-green-500';
            statusText = 'Completo';
        } else if (remainingQty < 0) {
            statusColor = 'bg-red-500';
            statusText = `Excedido por ${Math.abs(remainingQty).toLocaleString()} ${primaryUnit}`;
        }

        return { totalScheduledQty, remainingQty, progress, statusColor, statusText, primaryUnit };
    }, [totals.totalQuotedQty, deliveries, items]);


    // Handlers
    const handleAddItem = () => {
        const newItem: QuoteItem = {
            id: `item-${Date.now()}`,
            productId: '',
            lotId: '',
            qty: 0, 
            unit: 'ton',
            unitPrice: 0,
            subtotal: 0,
            productName: '',
            minPrice: 0
        };
        setItems([...items, newItem]);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleItemChange = (id: string, field: keyof QuoteItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            
            const updatedItem = { ...item, [field]: value };
            
            if (field === 'productId') {
                const product = products?.find(p => p.id === value);
                if (product) {
                    updatedItem.productName = product.name;
                    updatedItem.unit = product.unitDefault;
                    updatedItem.unitPrice = product.pricing?.min || 0;
                    updatedItem.minPrice = product.pricing?.min || 0;
                    updatedItem.lotId = '';
                }
            }

            if (field === 'qty' || field === 'unitPrice' || field === 'productId') {
                const q = field === 'qty' ? value : updatedItem.qty;
                const p = field === 'unitPrice' ? value : updatedItem.unitPrice;
                updatedItem.subtotal = (q || 0) * (p || 0);
            }
            
            return updatedItem;
        }));
    };

    // Handling Handlers
    const handleAddHandling = () => {
        setHandlingItems([...handlingItems, { id: `h-${Date.now()}`, description: 'Carga', costPerUnit: 0 }]);
    };
    const handleRemoveHandling = (id: string) => {
        setHandlingItems(handlingItems.filter(h => h.id !== id));
    };
    const handleHandlingChange = (id: string, field: keyof QuoteHandling, value: any) => {
        setHandlingItems(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
    };

    // Commission Handlers
    const handleAddCommission = () => {
        setCommissionItems([...commissionItems, { id: `c-${Date.now()}`, salespersonId: salespersonId, type: 'percentage', value: 0 }]);
    };
    const handleRemoveCommission = (id: string) => {
        setCommissionItems(commissionItems.filter(c => c.id !== id));
    };
    const handleCommissionChange = (id: string, field: keyof QuoteCommission, value: any) => {
        setCommissionItems(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };
    
    const handleFetchDOF = async () => {
        try {
            showToast('info', 'Consultando API de tipo de cambio...');
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            if (!response.ok) throw new Error("Error en la respuesta de la API");
            const data = await response.json();
            const rate = data.rates.MXN;
            
            setExchangeRate(rate);
            showToast('success', `Tipo de cambio actualizado: $${rate.toFixed(4)} MXN`);
        } catch (error) {
            console.error("Error fetching exchange rate:", error);
            showToast('error', 'No se pudo obtener el tipo de cambio. Usando valor manual.');
        }
    };
    
    const handlePOFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPoFile(e.target.files[0]);
        }
    };

    // HELPER: Sanitize Payload for Firestore (Remove undefined)
    const sanitizePayload = (obj: any): any => {
        if (Array.isArray(obj)) {
            return obj.map(v => sanitizePayload(v));
        } else if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).reduce((acc, key) => {
                const value = obj[key];
                if (value !== undefined) {
                    acc[key] = sanitizePayload(value);
                }
                return acc;
            }, {} as any);
        }
        return obj;
    };

    const handleSave = async (targetStatus: QuoteStatus, action: 'save' | 'duplicate') => {
        if (!recipientId) {
            showToast('warning', 'Debes seleccionar un cliente o prospecto.');
            return;
        }
        if (items.length === 0) {
            showToast('warning', 'Debes agregar al menos un producto.');
            return;
        }

        setIsSaving(true);
        
        const prefix = 'COT';
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        const folio = `${prefix}-${datePart}-${randomPart}`;
        
        let attachmentData: Attachment | undefined = undefined;
        
        try {
            // Upload PO if exists
            if (poFile) {
                const url = await api.uploadFile(poFile, `quotes/${folio}`);
                attachmentData = {
                    id: `att-${Date.now()}`,
                    name: poFile.name,
                    size: poFile.size,
                    url: url
                };
            }

            const newQuote: Omit<Quote, 'id'> = {
                folio,
                issuingCompanyId: 'internal-1', 
                companyId: recipientType === 'company' ? recipientId : undefined,
                prospectId: recipientType === 'prospect' ? recipientId : undefined,
                contactId: contactId || undefined,
                salespersonId,
                createdById: user?.id,
                approverId: approverId || undefined,
                status: targetStatus,
                createdAt: new Date().toISOString(),
                validity: 30,
                currency,
                exchangeRate: { official: exchangeRate, commission: 0, final: exchangeRate },
                items,
                taxRate,
                totals,
                notes,
                commissions: commissionItems,
                freight: [{ id: `fr-${Date.now()}`, rate: freightRate }],
                handling: handlingItems,
                insurance: { enabled: insuranceEnabled, costPerUnit: insuranceCostPerUnit },
                storage: { enabled: storageEnabled, period: storageDays, costPerUnit: storageCostPerUnit },
                deliveries: deliveries.map((d, i) => ({ id: i, date: d.date, qty: d.qty, address: d.address, unit: d.unit, zip: '' })),
                purchaseOrderAttachment: attachmentData,
                changeLog: []
            };
            
            const cleanQuote = sanitizePayload(newQuote);

            await api.addDoc('quotes', cleanQuote);
            
            if (action === 'duplicate') {
                 showToast('success', `Cotización ${folio} guardada. Formulario listo para la siguiente copia.`);
                 // Reset file input as it can't be reused easily
                 setPoFile(null);
            } else {
                 showToast('success', `Cotización ${folio} guardada exitosamente.`);
                 navigate('/hubs/quotes');
            }

        } catch (error) {
            console.error("Error creating quote:", error);
            showToast('error', 'Error al guardar la cotización.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleClearForm = () => {
        if (confirm('¿Estás seguro de borrar todo el formulario? Se perderán los datos no guardados.')) {
             setItems([]);
             setRecipientId('');
             setNotes('');
             setDeliveries([]);
             setHandlingItems([]);
             setCommissionItems([]);
             setFreightRate(0);
             setInsuranceEnabled(false);
             setStorageEnabled(false);
             setPoFile(null);
             showToast('info', 'Formulario limpiado.');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Cotización</h1>
                <div className="flex gap-2 items-center">
                    <button 
                        onClick={handleClearForm}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                        title="Borrar Todo"
                    >
                         <span className="material-symbols-outlined">delete_sweep</span>
                    </button>
                    <button 
                        onClick={() => handleSave(QuoteStatus.Borrador, 'save')} 
                        disabled={isSaving} 
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
                    >
                        Guardar Borrador
                    </button>
                    <button 
                        onClick={() => handleSave(QuoteStatus.Borrador, 'duplicate')} 
                        disabled={isSaving} 
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
                    >
                        Duplicar
                    </button>
                    <button 
                        onClick={() => handleSave(QuoteStatus.ListaParaEnviar, 'save')} 
                        disabled={isSaving} 
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar en General
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard title="Información del Cliente" className="relative z-50" icon="person">
                        <div className="flex gap-4 mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                            <button 
                                onClick={() => { setRecipientType('company'); setRecipientId(''); setContactId(''); }}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${recipientType === 'company' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400'}`}
                            >
                                Cliente Existente
                            </button>
                            <button 
                                onClick={() => { setRecipientType('prospect'); setRecipientId(''); setContactId(''); }}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${recipientType === 'prospect' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400'}`}
                            >
                                Prospecto
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-1">
                                <CustomSelect 
                                    label={recipientType === 'company' ? 'Cliente *' : 'Prospecto *'} 
                                    options={recipientType === 'company' ? companyOptions : prospectOptions} 
                                    value={recipientId} 
                                    onChange={(val) => { setRecipientId(val); setContactId(''); }} 
                                    placeholder="Seleccionar..."
                                    enableSearch
                                />
                            </div>
                            
                            {recipientType === 'company' && (
                                <div className="md:col-span-1">
                                    <CustomSelect
                                        label="Atención a (Contacto)"
                                        options={[{ value: '', name: 'General / Sin contacto' }, ...availableContacts]}
                                        value={contactId}
                                        onChange={setContactId}
                                        placeholder="Seleccionar contacto..."
                                    />
                                </div>
                            )}

                            {/* Creador (Readonly) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Creado por</label>
                                <input 
                                    type="text" 
                                    value={user?.name || 'Usuario'} 
                                    disabled 
                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-500 cursor-not-allowed"
                                />
                            </div>

                            {/* Responsable/Approver */}
                            <CustomSelect 
                                label="Vendedor / Responsable" 
                                options={userOptions} 
                                value={salespersonId} 
                                onChange={setSalespersonId} 
                            />
                            
                             <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CustomSelect
                                    label="Requiere Aprobación de"
                                    options={[{ value: '', name: 'Nadie (Auto-aprobación)' }, ...userOptions]}
                                    value={approverId}
                                    onChange={setApproverId}
                                />
                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moneda</label>
                                        <select 
                                            value={currency} 
                                            onChange={(e) => setCurrency(e.target.value as Currency)}
                                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[42px]"
                                        >
                                            <option value="MXN">MXN</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">T.C. (Actual)</label>
                                        <div className="flex gap-1">
                                            <input 
                                                type="number"
                                                value={exchangeRate}
                                                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm h-[42px]"
                                            />
                                            <button 
                                                onClick={() => handleFetchDOF()}
                                                className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 hover:bg-indigo-100 transition-colors h-[42px]"
                                                title="Obtener TC Actual"
                                            >
                                                <span className="material-symbols-outlined text-lg">currency_exchange</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Product Section */}
                    <SectionCard title="Productos" className="relative z-40" icon="inventory_2">
                        <div>
                            <table className="w-full text-sm mb-4">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-left text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="p-2 rounded-l-lg">Producto</th>
                                        <th className="p-2 w-32">Lote (Opcional)</th>
                                        <th className="p-2 w-24 text-right">Cant.</th>
                                        <th className="p-2 w-32">Unidad</th>
                                        <th className="p-2 w-32 text-right">P. Unit</th>
                                        <th className="p-2 w-32 text-right">Total</th>
                                        <th className="p-2 w-10 rounded-r-lg"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {items.map((item) => {
                                        const productLots = lotsData?.filter(l => l.productId === item.productId) || [];
                                        const lotOptions = [{ value: '', name: 'Cualquiera' }, ...productLots.map(l => ({ value: l.id, name: `${l.code} (${l.initialQty})` }))];
                                        
                                        return (
                                            <tr key={item.id}>
                                                <td className="p-2">
                                                    <CustomSelect 
                                                        options={productOptions} 
                                                        value={item.productId} 
                                                        onChange={(val) => handleItemChange(item.id, 'productId', val)} 
                                                        placeholder="Seleccionar..."
                                                        buttonClassName="w-full bg-transparent text-sm focus:outline-none text-left"
                                                        enableSearch
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <CustomSelect 
                                                        options={lotOptions} 
                                                        value={item.lotId || ''} 
                                                        onChange={(val) => handleItemChange(item.id, 'lotId', val)} 
                                                        buttonClassName="w-full bg-transparent text-sm focus:outline-none"
                                                        placeholder="Lote..."
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input 
                                                        type="number" 
                                                        value={item.qty === 0 ? '' : item.qty} 
                                                        onChange={(e) => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)} 
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-right"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                     <CustomSelect 
                                                        options={unitOptions} 
                                                        value={item.unit} 
                                                        onChange={(val) => handleItemChange(item.id, 'unit', val as Unit)} 
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input 
                                                        type="number" 
                                                        value={item.unitPrice === 0 ? '' : item.unitPrice} 
                                                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} 
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-right"
                                                        placeholder="0.00"
                                                    />
                                                    {item.minPrice ? (
                                                        <div className="text-[10px] text-slate-400 text-right mt-0.5">
                                                            Mín: ${item.minPrice}
                                                        </div>
                                                    ) : null}
                                                </td>
                                                <td className="p-2 text-right font-medium text-slate-800 dark:text-slate-200">
                                                    ${(item.subtotal || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-500">
                                                        <span className="material-symbols-outlined text-lg">close</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <button onClick={handleAddItem} className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline">
                                <span className="material-symbols-outlined text-base">add_circle</span> Agregar Producto
                            </button>
                        </div>
                    </SectionCard>
                    
                    {/* LOGISTICS SECTION */}
                    <SectionCard title="Costos Logísticos y Servicios" className="relative z-20" icon="local_shipping">
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tarifa Flete ({currency}) (s/IVA)</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" value={freightRate} onChange={(e) => setFreightRate(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2" />
                                    <span className="text-sm text-slate-500 w-24 text-right">Total: ${(totals.freight || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Maniobras ({currency}) (s/IVA)</label>
                                {handlingItems.map(h => (
                                    <div key={h.id} className="flex gap-2 mb-2 items-center">
                                        <div className="flex-grow">
                                            <CustomSelect 
                                                options={maneuverTypeOptions}
                                                value={h.description}
                                                onChange={(val) => handleHandlingChange(h.id, 'description', val)}
                                                placeholder="Tipo de Maniobra"
                                                buttonClassName="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-left"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <input 
                                                type="number" 
                                                value={h.costPerUnit} 
                                                onChange={(e) => handleHandlingChange(h.id, 'costPerUnit', parseFloat(e.target.value) || 0)} 
                                                placeholder="Costo/Unit"
                                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <button onClick={() => handleRemoveHandling(h.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><span className="material-symbols-outlined">delete</span></button>
                                    </div>
                                ))}
                                <button onClick={handleAddHandling} className="text-sm text-indigo-600 font-semibold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-base">add</span> Agregar Maniobra
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Incluir Seguro</label>
                                        <ToggleSwitch enabled={insuranceEnabled} onToggle={() => setInsuranceEnabled(!insuranceEnabled)} />
                                    </div>
                                    {insuranceEnabled && (
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Costo ({currency})</label>
                                            <input type="number" value={insuranceCostPerUnit} onChange={(e) => setInsuranceCostPerUnit(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 text-sm" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Incluir Almacenaje</label>
                                        <ToggleSwitch enabled={storageEnabled} onToggle={() => setStorageEnabled(!storageEnabled)} />
                                    </div>
                                    {storageEnabled && (
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-xs text-slate-500 mb-1">Costo ({currency})</label>
                                                <input type="number" value={storageCostPerUnit} onChange={(e) => setStorageCostPerUnit(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 text-sm" />
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-xs text-slate-500 mb-1">Días</label>
                                                <input type="number" value={storageDays} onChange={(e) => setStorageDays(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 text-sm" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                    
                    {/* COMMISSION SECTION (Moved Left) */}
                    <SectionCard title="Comisiones (s/IVA)" className="relative z-30" icon="monetization_on">
                        <div className="space-y-3">
                             <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 mb-1 uppercase">
                                <div className="col-span-4">Beneficiario</div>
                                <div className="col-span-3">Tipo</div>
                                <div className="col-span-3">Valor</div>
                                <div className="col-span-2"></div>
                             </div>
                             {commissionItems.map(item => (
                                 <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                     <div className="col-span-4">
                                         <CustomSelect 
                                            options={userOptions} 
                                            value={item.salespersonId} 
                                            onChange={(val) => handleCommissionChange(item.id, 'salespersonId', val)}
                                            placeholder="Vendedor..."
                                         />
                                     </div>
                                     <div className="col-span-3">
                                          <CustomSelect 
                                            options={commissionTypeOptions} 
                                            value={item.type} 
                                            onChange={(val) => handleCommissionChange(item.id, 'type', val)} 
                                         />
                                     </div>
                                     <div className="col-span-3 relative">
                                          <input 
                                            type="number" 
                                            value={item.value} 
                                            onChange={(e) => handleCommissionChange(item.id, 'value', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-2"
                                         />
                                         <span className="absolute right-2 top-2.5 text-slate-400 text-xs pointer-events-none">
                                             {item.type === 'percentage' ? '%' : '$'}
                                         </span>
                                     </div>
                                     <div className="col-span-2 text-center">
                                         <button onClick={() => handleRemoveCommission(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><span className="material-symbols-outlined">delete</span></button>
                                     </div>
                                 </div>
                             ))}
                             <button onClick={handleAddCommission} className="text-sm text-indigo-600 font-semibold flex items-center gap-1 mt-2">
                                <span className="material-symbols-outlined text-base">add</span> Agregar Comisión
                            </button>
                             <p className="text-xs text-slate-500 mt-2 text-right">
                                Total Comisiones: <strong>${(totals.commissions || 0).toLocaleString()}</strong>
                            </p>
                        </div>
                    </SectionCard>

                     {/* DELIVERY SCHEDULE SECTION */}
                    <SectionCard title="Esquema de Entregas" className="relative z-10" icon="event_note">
                        
                        {/* Volume Progress Bar */}
                         <div className="mb-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Validación de Volumen</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${deliveryStats.statusColor} text-white`}>
                                    {deliveryStats.statusText}
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5">
                                <div 
                                    className={`h-2.5 rounded-full transition-all duration-500 ${deliveryStats.remainingQty < 0 ? 'bg-red-500' : 'bg-indigo-600'}`}
                                    style={{ width: `${deliveryStats.progress}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-right text-slate-400 mt-1">
                                Programado: {(deliveryStats.totalScheduledQty || 0).toLocaleString()} / Cotizado: {(deliveryStats.totalQuotedQty || 0).toLocaleString()} {deliveryStats.primaryUnit}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {deliveries.map((d, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-200 dark:border-slate-600 text-sm">
                                    <span className="font-semibold w-24">{d.date}</span>
                                    <span className="font-bold w-16 text-right">{d.qty}</span>
                                    <span className="w-16 text-slate-500">{d.unit}</span>
                                    <span className="flex-1 truncate text-slate-600 dark:text-slate-400">{d.address}</span>
                                    <button onClick={() => setDeliveries(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">&times;</button>
                                </div>
                            ))}
                            <div className="grid grid-cols-12 gap-2 mt-2">
                                <input type="date" className="col-span-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm" value={newDelivery.date} onChange={e => setNewDelivery({...newDelivery, date: e.target.value})} />
                                <input type="number" placeholder="Cant." className="col-span-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm" value={newDelivery.qty || ''} onChange={e => setNewDelivery({...newDelivery, qty: parseFloat(e.target.value)})} />
                                <div className="col-span-2">
                                    <CustomSelect 
                                        options={unitOptions} 
                                        value={newDelivery.unit} 
                                        onChange={(val) => setNewDelivery({...newDelivery, unit: val as Unit})} 
                                        buttonClassName="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm h-[34px] flex items-center justify-between"
                                    />
                                </div>
                                
                                <div className="col-span-4">
                                    {!newDelivery.isManualAddress && clientAddresses.length > 0 ? (
                                        <select 
                                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm h-[34px]"
                                            value={newDelivery.address}
                                            onChange={(e) => {
                                                if(e.target.value === 'MANUAL_ENTRY') {
                                                    setNewDelivery(prev => ({ ...prev, isManualAddress: true, address: '' }));
                                                } else {
                                                    setNewDelivery(prev => ({ ...prev, address: e.target.value }));
                                                }
                                            }}
                                        >
                                            <option value="">Seleccionar dirección...</option>
                                            {clientAddresses.map((addr, i) => (
                                                <option key={i} value={`${addr.street}, ${addr.city}`}>
                                                    {addr.label ? `${addr.label} - ` : ''}{addr.street}, {addr.city}
                                                </option>
                                            ))}
                                            <option value="MANUAL_ENTRY">Otra / Nueva (Escribir manual)</option>
                                        </select>
                                    ) : (
                                        <div className="flex gap-1">
                                            <input 
                                                type="text" 
                                                placeholder="Dirección de entrega..." 
                                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm" 
                                                value={newDelivery.address} 
                                                onChange={e => setNewDelivery({...newDelivery, address: e.target.value})} 
                                            />
                                            {clientAddresses.length > 0 && (
                                                <button 
                                                    onClick={() => setNewDelivery(prev => ({...prev, isManualAddress: false, address: ''}))}
                                                    className="text-slate-400 hover:text-indigo-600"
                                                    title="Volver a lista"
                                                >
                                                    <span className="material-symbols-outlined !text-lg">list</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button onClick={() => { 
                                    if(newDelivery.date && newDelivery.qty) { 
                                        setDeliveries([...deliveries, newDelivery]); 
                                        // Don't clear inputs completely to allow rapid entry
                                        // setNewDelivery({...newDelivery, qty: 0, address: ''}); 
                                    } 
                                }} className="col-span-1 bg-indigo-600 text-white rounded flex items-center justify-center shadow-sm hover:bg-indigo-700">
                                    <span className="material-symbols-outlined text-sm">add</span>
                                </button>
                            </div>
                        </div>
                    </SectionCard>

                    {/* NOTES SECTION - Moved to left bottom */}
                    <SectionCard title="Notas Adicionales" icon="description">
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Términos de pago, tiempos de entrega, etc..."
                        />
                    </SectionCard>
                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div className="lg:col-span-1 space-y-6">
                     {/* Purchase Order Upload Card */}
                     <SectionCard title="Documento Orden de Compra" icon="upload_file">
                         <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <input 
                                type="file" 
                                id="po-upload" 
                                className="hidden" 
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setPoFile(e.target.files[0]);
                                    }
                                }}
                            />
                            <label htmlFor="po-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">cloud_upload</span>
                                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                    {poFile ? poFile.name : 'Subir OC (PDF o Imagen)'}
                                </span>
                                <span className="text-xs text-slate-400 mt-1">Clic para seleccionar</span>
                            </label>
                         </div>
                         {poFile && (
                             <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                                 <span>{(poFile.size / 1024).toFixed(1)} KB</span>
                                 <button onClick={() => setPoFile(null)} className="text-red-500 hover:underline">Quitar</button>
                             </div>
                         )}
                     </SectionCard>

                    {/* Financial Summary */}
                    <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden sticky top-6">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-4 border-b border-indigo-700 pb-2">Resumen Financiero</h3>
                            
                            <div className="space-y-2 text-sm text-indigo-100">
                                <div className="flex justify-between"><span>Subtotal Productos</span> <span>${(totals.products || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                                <div className="flex justify-between"><span>Comisiones (s/IVA)</span> <span>${(totals.commissions || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                                
                                {/* Logistics Breakdown */}
                                {(totals.freight || 0) > 0 && <div className="flex justify-between text-xs opacity-90"><span>+ Flete</span> <span>${(totals.freight || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>}
                                {(totals.handling || 0) > 0 && <div className="flex justify-between text-xs opacity-90"><span>+ Maniobras (s/IVA)</span> <span>${(totals.handling || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>}
                                {(totals.insurance || 0) > 0 && <div className="flex justify-between text-xs opacity-90"><span>+ Seguro (s/IVA)</span> <span>${(totals.insurance || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>}
                                {(totals.storage || 0) > 0 && <div className="flex justify-between text-xs opacity-90"><span>+ Almacenaje (s/IVA)</span> <span>${(totals.storage || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>}

                                <div className="flex justify-between font-bold border-t border-indigo-700/50 pt-2 mt-1">
                                    <span>Base Imponible</span>
                                    <span>${(totals.subtotal || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>

                                {/* Tax Breakdown */}
                                <div className="my-2 pt-2 border-t border-indigo-700/30">
                                     <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-xs">Aplicar IVA (16%)</span>
                                        <ToggleSwitch enabled={taxRate === 16} onToggle={() => setTaxRate(taxRate === 16 ? 0 : 16)} />
                                    </div>
                                    {taxRate > 0 && (
                                        <>
                                            <div className="flex justify-between text-xs opacity-80">
                                                <span>IVA Productos</span>
                                                <span>${((totals.products || 0) * 0.16).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                            </div>
                                            {(totals.freight || 0) > 0 && (
                                                <div className="flex justify-between text-xs opacity-80">
                                                    <span>IVA Flete</span>
                                                    <span>${((totals.freight || 0) * 0.16).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div className="flex justify-between text-xs font-bold mt-1">
                                        <span>Total Impuestos</span>
                                        <span>${(totals.tax || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                    </div>
                                </div>
                                
                                <p className="text-[10px] opacity-70 text-right">*Maniobras, Seguros, Almacenaje y Comisiones exentas de IVA</p>
                                
                                {/* Total */}
                                <div className="pt-4 mt-2 border-t-2 border-indigo-600 flex justify-between items-end">
                                    <span className="text-lg font-medium opacity-80">Total</span>
                                    <span className="text-3xl font-bold tracking-tight">${(totals.grandTotal || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>
                                <p className="text-right text-xs text-indigo-300 mt-1">{currency}</p>
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
