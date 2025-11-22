
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Quote, QuoteStatus, Company, Prospect, User, QuoteItem, SalesOrder, SalesOrderStatus, CommissionType, ProductLot, QuoteCommission, QuoteHandling, Contact, Unit, Attachment, Commission, CommissionStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';
import { UNITS } from '../constants';
import Badge from '../components/ui/Badge';
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

const QuoteDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const { data: initialQuote, loading: qLoading } = useDoc<Quote>('quotes', id || '');
    const { data: companies } = useCollection<Company>('companies');
    const { data: prospects } = useCollection<Prospect>('prospects');
    const { data: users } = useCollection<User>('users');
    const { data: products } = useCollection<any>('products');
    const { data: lotsData, loading: lLoading } = useCollection<ProductLot>('lots');
    const { data: contacts } = useCollection<Contact>('contacts');

    const [quote, setQuote] = useState<Quote | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // --- Extended Edit State ---
    const [taxRate, setTaxRate] = useState(16);
    const [exchangeRate, setExchangeRate] = useState(20.50);
    const [currency, setCurrency] = useState<any>('MXN'); // Added currency state for edit mode
    
    // Contact
    const [contactId, setContactId] = useState('');

    // Logistics State
    const [freightRate, setFreightRate] = useState(0);
    
    const [handlingItems, setHandlingItems] = useState<QuoteHandling[]>([]);
    
    const [insuranceEnabled, setInsuranceEnabled] = useState(false);
    const [insuranceCostPerUnit, setInsuranceCostPerUnit] = useState(0);
    const [storageEnabled, setStorageEnabled] = useState(false);
    const [storageCostPerUnit, setStorageCostPerUnit] = useState(0);
    const [storageDays, setStorageDays] = useState(30);

    // Commission State
    const [commissionItems, setCommissionItems] = useState<QuoteCommission[]>([]);
    
    // Approval State
    const [approverId, setApproverId] = useState('');

    // Deliveries State
    const [deliveries, setDeliveries] = useState<{ date: string; qty: number; address: string; unit: Unit }[]>([]);
    const [newDelivery, setNewDelivery] = useState<{ date: string; qty: number; address: string; unit: Unit; isManualAddress: boolean }>({ date: '', qty: 0, address: '', unit: 'ton', isManualAddress: false });

    // Upload State
    const [isUploadingPO, setIsUploadingPO] = useState(false);


    useEffect(() => {
        if (initialQuote) {
            setQuote(initialQuote);
            
            // Initialize Edit States from Quote Data
            setTaxRate(initialQuote.taxRate !== undefined ? initialQuote.taxRate : 16);
            setExchangeRate(initialQuote.exchangeRate?.official || 20.50);
            setCurrency(initialQuote.currency); // Load currency
            setContactId(initialQuote.contactId || '');
            setApproverId(initialQuote.approverId || '');
            
            // Logistics
            setFreightRate(initialQuote.freight?.[0]?.rate || 0);
            
            setHandlingItems(initialQuote.handling || []);
            
            setInsuranceEnabled(initialQuote.insurance?.enabled || false);
            setInsuranceCostPerUnit(initialQuote.insurance?.costPerUnit || 0);
            setStorageEnabled(initialQuote.storage?.enabled || false);
            setStorageCostPerUnit(initialQuote.storage?.costPerUnit || 0);
            setStorageDays(initialQuote.storage?.period || 30);

            // Commissions
            setCommissionItems(initialQuote.commissions || []);

            // Deliveries
            if (initialQuote.deliveries) {
                setDeliveries(initialQuote.deliveries.map(d => ({ date: d.date, qty: d.qty, address: d.address, unit: d.unit || 'ton' })));
            }
        }
    }, [initialQuote]);

    // Set default unit for new delivery when items change
    useEffect(() => {
        if (quote?.items && quote.items.length > 0 && !newDelivery.qty) {
             setNewDelivery(prev => ({ ...prev, unit: quote.items[0].unit }));
        }
    }, [quote?.items]);


    const recipient = useMemo(() => {
        if (!quote) return null;
        if (quote.companyId && companies) return companies.find(c => c.id === quote.companyId);
        if (quote.prospectId && prospects) return prospects.find(p => p.id === quote.prospectId);
        return null;
    }, [quote, companies, prospects]);
    
    const quoteContact = useMemo(() => {
        if (!quote || !contacts) return null;
        return contacts.find(c => c.id === quote.contactId);
    }, [quote, contacts]);

    // Filter contacts for edit mode
    const availableContacts = useMemo(() => {
        if (quote?.companyId && contacts) {
            return contacts
                .filter(c => c.companyId === quote.companyId)
                .map(c => ({ value: c.id, name: `${c.name} (${c.role})` }));
        }
        return [];
    }, [quote, contacts]);
    
    // Filter addresses based on selected company (use quote.companyId)
    const clientAddresses = useMemo(() => {
         if (quote?.companyId && companies) {
             const comp = companies.find(c => c.id === quote.companyId);
             const addresses = [...(comp?.deliveryAddresses || [])];
             if (comp?.fiscalAddress && comp.fiscalAddress.street) {
                 addresses.unshift({ ...comp.fiscalAddress, label: 'Domicilio Fiscal' });
             }
             return addresses;
         }
         return [];
    }, [quote?.companyId, companies]);

    const salesperson = useMemo(() => {
        return users?.find(u => u.id === quote?.salespersonId);
    }, [users, quote]);

    const creator = useMemo(() => {
        return users?.find(u => u.id === quote?.createdById);
    }, [users, quote]);
    
    const approver = useMemo(() => {
        return users?.find(u => u.id === quote?.approverId);
    }, [users, quote]);

    // Computed Totals (Reactive to Edit State)
    const totals = useMemo(() => {
        if (!quote) return { subtotal: 0, tax: 0, grandTotal: 0, products: 0, commissions: 0, freight: 0, handling: 0, insurance: 0, storage: 0 };
        
        const productSubtotal = quote.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        
        // Calculate total quantity stats
        let totalTons = 0;
        let totalKg = 0;
        let totalLiters = 0;
        let totalUnits = 0;
        let totalQuantityGeneric = 0; 

        quote.items.forEach(item => {
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

        // Recalculate Commission
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

        // Recalculate Logistics
        const freightTotal = freightRate * weightMultiplier;
        const handlingTotal = handlingItems.reduce((sum, h) => sum + (h.costPerUnit * weightMultiplier), 0);
        const insuranceTotal = insuranceEnabled ? (insuranceCostPerUnit * weightMultiplier) : 0;
        const storageTotal = storageEnabled ? (storageCostPerUnit * weightMultiplier) : 0; 

        const logisticsTotal = freightTotal + handlingTotal + insuranceTotal + storageTotal;
        const subtotal = productSubtotal + commissionTotal + logisticsTotal;
        
        // Tax Calculation: 
        // Base Imponible = Products + Freight. Commissions and Handling exempt based on user request.
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
            subtotal, 
            tax, 
            grandTotal 
        };
    }, [quote, taxRate, commissionItems, freightRate, handlingItems, insuranceEnabled, insuranceCostPerUnit, storageEnabled, storageCostPerUnit]);

    const handleStatusChange = (newStatus: QuoteStatus) => {
        if (quote) setQuote({ ...quote, status: newStatus });
    };

    const handleItemChange = (id: string, field: keyof QuoteItem, value: any) => {
        if (!quote) return;
        const newItems = quote.items.map(item => {
            if (item.id !== id) return item;
            const updatedItem = { ...item, [field]: value };
            
            // Auto-fill price
            if (field === 'productId') {
                const product = products?.find((p: any) => p.id === value);
                if (product) {
                     updatedItem.productName = product.name;
                     updatedItem.unit = product.unitDefault;
                     updatedItem.unitPrice = product.pricing?.min || 0;
                     updatedItem.minPrice = product.pricing?.min || 0; // Store min price
                     updatedItem.lotId = '';
                }
            }

            if (field === 'qty' || field === 'unitPrice' || field === 'productId') {
                 const q = field === 'qty' ? value : updatedItem.qty;
                 const p = field === 'unitPrice' ? value : updatedItem.unitPrice;
                 updatedItem.subtotal = (q || 0) * (p || 0);
            }
            return updatedItem;
        });
        setQuote({ ...quote, items: newItems });
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
        setCommissionItems([...commissionItems, { id: `c-${Date.now()}`, salespersonId: quote?.salespersonId || '', type: 'percentage', value: 0 }]);
    };
    const handleRemoveCommission = (id: string) => {
        setCommissionItems(commissionItems.filter(c => c.id !== id));
    };
    const handleCommissionChange = (id: string, field: keyof QuoteCommission, value: any) => {
        setCommissionItems(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !quote || !id) return;
        const file = e.target.files[0];
        
        setIsUploadingPO(true);
        try {
            const url = await api.uploadFile(file, `quotes/${quote.folio}`);
            const attachment: Attachment = {
                id: `att-${Date.now()}`,
                name: file.name,
                size: file.size,
                url: url
            };
            
            await api.updateDoc('quotes', id, { purchaseOrderAttachment: attachment });
            setQuote(prev => prev ? ({ ...prev, purchaseOrderAttachment: attachment }) : null);
            showToast('success', 'Orden de Compra adjuntada correctamente.');
        } catch (error) {
            console.error("Error uploading PO:", error);
            showToast('error', 'Error al subir el documento.');
        } finally {
            setIsUploadingPO(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleFetchDOF = async (silent = false) => {
        try {
            if(!silent) showToast('info', 'Consultando API de tipo de cambio...');
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            if (!response.ok) throw new Error("Error en la respuesta de la API");
            const data = await response.json();
            const rate = data.rates.MXN;
            
            setExchangeRate(rate);
            if(!silent) showToast('success', `Tipo de cambio actualizado: $${rate.toFixed(4)} MXN`);
        } catch (error) {
            console.error("Error fetching exchange rate:", error);
            if(!silent) showToast('error', 'No se pudo obtener el tipo de cambio. Usando valor manual.');
        }
    };

    // Validation Stats for Delivery
    const deliveryStats = useMemo(() => {
        if(!quote) return { totalQuotedQty: 0, totalScheduledQty: 0, remainingQty: 0, progress: 0, statusColor: 'bg-gray-500', statusText: 'Calculando...', primaryUnit: '' };
        
        const totalQuotedQty = quote.items.reduce((sum, item) => sum + item.qty, 0);
        // Always use the 'deliveries' state which tracks both saved and editing deliveries
        const totalScheduledQty = deliveries.reduce((sum, d) => sum + d.qty, 0);
        const remainingQty = totalQuotedQty - totalScheduledQty;
        const progress = totalQuotedQty > 0 ? Math.min((totalScheduledQty / totalQuotedQty) * 100, 100) : 0;
        const primaryUnit = quote.items.length > 0 ? quote.items[0].unit : 'unidades';
        
        let statusColor = 'bg-yellow-500';
        let statusText = `Faltan ${remainingQty.toLocaleString()} ${primaryUnit}`;

        if (remainingQty === 0) {
            statusColor = 'bg-green-500';
            statusText = 'Completo';
        } else if (remainingQty < 0) {
            statusColor = 'bg-red-500';
            statusText = `Excedido por ${Math.abs(remainingQty).toLocaleString()} ${primaryUnit}`;
        }

        return { totalQuotedQty, totalScheduledQty, remainingQty, progress, statusColor, statusText, primaryUnit };
    }, [quote, deliveries]);

    const handleSave = async () => {
        if (!quote || !id) return;
        setIsSaving(true);
        
        const updatedQuote = {
            ...quote,
            contactId, // Actualizar el contacto
            approverId, // Actualizar aprobador
            taxRate,
            currency, // Actualizar moneda
            totals,
            exchangeRate: { ...quote.exchangeRate, official: exchangeRate }, // Actualizar TC
            commissions: commissionItems,
            freight: [{ id: quote.freight?.[0]?.id || `fr-${Date.now()}`, rate: freightRate }],
            handling: handlingItems,
            insurance: { enabled: insuranceEnabled, costPerUnit: insuranceCostPerUnit },
            storage: { enabled: storageEnabled, period: storageDays, costPerUnit: storageCostPerUnit },
            deliveries: deliveries.map((d, i) => ({ id: i, ...d, zip: '' })),
        };

        try {
            await api.updateDoc('quotes', id, updatedQuote);
            showToast('success', 'Cotización actualizada.');
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating quote:", error);
            showToast('error', 'Error al guardar los cambios.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleConvertToOrder = async () => {
        if (!quote || !id) return;
        
        if (!quote.companyId) {
            if (window.confirm('Esta cotización es para un prospecto. ¿Deseas convertir el prospecto a cliente primero?')) {
                navigate(`/hubs/prospects/${quote.prospectId}`);
                return;
            } else {
                return;
            }
        }

        const order: Omit<SalesOrder, 'id'> = {
            folio: `OV-${Date.now()}`,
            quoteId: id,
            companyId: quote.companyId,
            salespersonId: quote.salespersonId,
            status: SalesOrderStatus.Pendiente,
            items: quote.items,
            total: totals.grandTotal,
            createdAt: new Date().toISOString(),
            deliveries: [],
            currency: quote.currency,
            taxRate: taxRate
        };

        try {
            const newOrder = await api.addDoc('salesOrders', order);
            await api.updateDoc('quotes', id, { status: QuoteStatus.AprobadaPorCliente });
            
            // --- GENERATE COMMISSIONS ---
            if (quote.commissions && quote.commissions.length > 0) {
                const commissionPromises = quote.commissions.map(comm => {
                    // Calculate actual value for this commission
                    let amount = 0;
                    const productSubtotal = quote.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
                    
                    let totalTons = 0;
                    let totalKg = 0;
                    let totalLiters = 0;
                    let totalUnits = 0;

                    quote.items.forEach(item => {
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

                    switch(comm.type) {
                        case 'percentage': amount = productSubtotal * (comm.value / 100); break;
                        case 'fixed': amount = comm.value; break;
                        case 'per_ton': amount = totalTons * comm.value; break;
                        case 'per_kg': amount = totalKg * comm.value; break;
                        case 'per_liter': amount = totalLiters * comm.value; break;
                        case 'per_unit': amount = totalUnits * comm.value; break;
                    }

                    const commissionRecord: Omit<Commission, 'id'> = {
                        salespersonId: comm.salespersonId,
                        salesOrderId: newOrder.id,
                        amount: amount,
                        status: CommissionStatus.Pendiente,
                        createdAt: new Date().toISOString()
                    };
                    return api.addDoc('commissions', commissionRecord);
                });
                
                await Promise.all(commissionPromises);
                showToast('info', 'Comisiones registradas para esta orden.');
            }
            
            showToast('success', 'Orden de Venta creada exitosamente.');
            navigate(`/hubs/sales-orders/${newOrder.id}`);
        } catch (error) {
            console.error("Error converting to order:", error);
            showToast('error', 'Error al crear la orden de venta.');
        }
    };

    if (qLoading || !quote) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    const statusOptions = Object.values(QuoteStatus).map(s => ({ value: s, name: s }));
    const unitOptions = UNITS.map(u => ({ value: u, name: u }));
    const productOptions = (products || []).map((p: any) => ({ value: p.id, name: p.name }));
    const userOptions = (users || []).map(u => ({ value: u.id, name: u.name }));
    
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

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{quote.folio}</h1>
                        <Badge text={quote.status} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Para: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{(recipient as any)?.shortName || recipient?.name}</span>
                        {quoteContact && <span className="ml-2 text-slate-400">• Atención a: {quoteContact.name}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!isEditing ? (
                        <>
                             <div className="w-48">
                                <CustomSelect options={statusOptions} value={quote.status} onChange={val => handleStatusChange(val as QuoteStatus)} />
                            </div>
                            <button onClick={() => setIsEditing(true)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                                Editar
                            </button>
                            <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">
                                Guardar Estado
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => { setIsEditing(false); setQuote(initialQuote); setCurrency(initialQuote?.currency); }} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">
                                Cancelar
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-700 flex items-center gap-2">
                                {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                                Guardar Cambios
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-6">
                     
                     {/* General Info (Visible on Edit) */}
                     {isEditing && (
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                             <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">Datos Generales</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {quote.companyId && (
                                    <div>
                                        <CustomSelect
                                            label="Atención a (Contacto)"
                                            options={[{ value: '', name: 'General / Sin contacto' }, ...availableContacts]}
                                            value={contactId}
                                            onChange={setContactId}
                                            placeholder="Seleccionar contacto..."
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moneda</label>
                                        <select 
                                            value={currency} 
                                            onChange={(e) => setCurrency(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[42px]"
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
                                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm h-[42px]"
                                            />
                                            <button 
                                                onClick={() => handleFetchDOF(false)}
                                                className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 hover:bg-indigo-100 transition-colors h-[42px]"
                                                title="Obtener TC Actual"
                                            >
                                                <span className="material-symbols-outlined text-lg">currency_exchange</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Creado por</label>
                                    <input 
                                        type="text" 
                                        value={creator?.name || 'Usuario'} 
                                        disabled 
                                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                                 <div>
                                    <CustomSelect 
                                        label="Requiere Aprobación de" 
                                        options={[{value: '', name: 'Nadie (Auto-aprobación)'}, ...userOptions]} 
                                        value={approverId} 
                                        onChange={setApproverId} 
                                    />
                                </div>
                             </div>
                         </div>
                     )}
                     
                     {/* Products Table */}
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative z-50">
                        <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">inventory_2</span>
                            Productos
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-left text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="p-2">Producto</th>
                                        <th className="p-2 w-32">Lote (Opcional)</th>
                                        <th className="p-2 text-right w-24">Cant.</th>
                                        <th className="p-2 w-24">Unidad</th>
                                        <th className="p-2 text-right w-32">P. Unit</th>
                                        <th className="p-2 text-right w-32">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {quote.items.map((item, idx) => {
                                         const productLots = lotsData?.filter(l => l.productId === item.productId) || [];
                                         const lotOptions = [{ value: '', name: 'Cualquiera' }, ...productLots.map(l => ({ value: l.id, name: `${l.code} (${l.initialQty})` }))];
                                         const selectedLot = productLots.find(l => l.id === item.lotId);

                                         return (
                                            <tr key={item.id}>
                                                <td className="p-2">
                                                    {isEditing ? (
                                                         <CustomSelect 
                                                            options={productOptions} 
                                                            value={item.productId} 
                                                            onChange={(val) => handleItemChange(item.id, 'productId', val)} 
                                                            buttonClassName="w-full bg-transparent text-sm focus:outline-none text-left"
                                                        />
                                                    ) : (
                                                        <span className="font-medium">{item.productName || 'Producto'}</span>
                                                    )}
                                                </td>
                                                <td className="p-2">
                                                    {isEditing ? (
                                                         <CustomSelect 
                                                            options={lotOptions} 
                                                            value={item.lotId || ''} 
                                                            onChange={(val) => handleItemChange(item.id, 'lotId', val)} 
                                                            buttonClassName="w-full bg-transparent text-sm focus:outline-none"
                                                            placeholder="Lote..."
                                                        />
                                                    ) : (
                                                        <span className="text-slate-500">{selectedLot?.code || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {isEditing ? (
                                                        <input 
                                                            type="number" 
                                                            value={item.qty === 0 ? '' : item.qty} 
                                                            onChange={(e) => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)} 
                                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-right"
                                                        />
                                                    ) : item.qty}
                                                </td>
                                                <td className="p-2">
                                                    {isEditing ? (
                                                         <CustomSelect 
                                                            options={unitOptions} 
                                                            value={item.unit} 
                                                            onChange={(val) => handleItemChange(item.id, 'unit', val)} 
                                                        />
                                                    ) : item.unit}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {isEditing ? (
                                                        <input 
                                                            type="number" 
                                                            value={item.unitPrice === 0 ? '' : item.unitPrice} 
                                                            onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} 
                                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-right"
                                                        />
                                                    ) : `$${(item.unitPrice || 0).toLocaleString()}`}
                                                    {item.minPrice ? (
                                                        <div className="text-[10px] text-slate-400 text-right mt-0.5">
                                                            Mín: ${item.minPrice}
                                                        </div>
                                                    ) : null}
                                                </td>
                                                <td className="p-2 text-right font-bold">
                                                    ${(item.subtotal || 0).toLocaleString()}
                                                </td>
                                            </tr>
                                         )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                     {/* Logistics Section */}
                     <SectionCard title="Costos Logísticos y Servicios" className="relative z-40" icon="local_shipping">
                        {isEditing ? (
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
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
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Flete Total</p>
                                    <p className="font-semibold">${(totals.freight || 0).toLocaleString()}</p>
                                    <p className="text-xs text-slate-400 mt-1">(${(freightRate || 0).toLocaleString()} unit.)</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Maniobras</p>
                                    <p className="font-semibold">${(totals.handling || 0).toLocaleString()}</p>
                                    <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                                        {handlingItems.map(h => <p key={h.id}>{h.description}</p>)}
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Seguro</p>
                                    <p className="font-semibold">
                                        {insuranceEnabled 
                                            ? `$${(totals.insurance || 0).toLocaleString()}`
                                            : 'No incluido'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Almacenaje</p>
                                    <p className="font-semibold">
                                        {storageEnabled 
                                            ? `$${(totals.storage || 0).toLocaleString()}` 
                                            : 'No incluido'}
                                    </p>
                                    {storageEnabled && <p className="text-xs text-slate-400 mt-1">{storageDays} días</p>}
                                </div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Commission Card (Moved Left) */}
                    <SectionCard title="Comisiones (s/IVA)" className="relative z-30" icon="monetization_on">
                         {isEditing ? (
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
                                               buttonClassName="w-full text-xs p-2 border rounded"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                             <CustomSelect 
                                               options={commissionTypeOptions} 
                                               value={item.type} 
                                               onChange={(val) => handleCommissionChange(item.id, 'type', val)} 
                                               buttonClassName="w-full text-xs p-2 border rounded"
                                            />
                                        </div>
                                        <div className="col-span-3 relative">
                                             <input 
                                               type="number" 
                                               value={item.value} 
                                               onChange={(e) => handleCommissionChange(item.id, 'value', parseFloat(e.target.value) || 0)}
                                               className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg pl-2 pr-6 py-2 text-xs"
                                            />
                                            <span className="absolute right-2 top-2.5 text-slate-400 text-xs pointer-events-none">
                                                {item.type === 'percentage' ? '%' : '$'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <button onClick={() => handleRemoveCommission(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><span className="material-symbols-outlined text-sm">delete</span></button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={handleAddCommission} className="text-sm text-indigo-600 font-semibold flex items-center gap-1 mt-2">
                                   <span className="material-symbols-outlined text-base">add</span> Agregar Comisión
                               </button>
                            </div>
                         ) : (
                             <div className="text-sm space-y-2">
                                 {commissionItems.map((comm, idx) => (
                                     <div key={comm.id} className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1 last:border-0">
                                        <span>{users?.find(u=>u.id===comm.salespersonId)?.name || 'Vendedor'}</span>
                                        <span className="font-medium dark:text-slate-200">
                                            {comm.type === 'percentage' ? `${comm.value}%` : `$${comm.value} (${commissionTypeOptions.find(t=>t.value===comm.type)?.name})`}
                                        </span>
                                     </div>
                                 ))}
                                 <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                                     <span className="text-slate-500">Total Calculado:</span>
                                     <span className="font-bold text-indigo-600 dark:text-indigo-400">${(totals.commissions || 0).toLocaleString()}</span>
                                 </div>
                             </div>
                         )}
                    </SectionCard>

                     {/* DELIVERY SCHEDULE SECTION */}
                    <SectionCard title="Esquema de Entregas" className="relative z-10" icon="event_note">
                        {/* VALIDATION BAR - ALWAYS VISIBLE */}
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
                                    {isEditing && <button onClick={() => setDeliveries(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">&times;</button>}
                                </div>
                            ))}
                            {isEditing && (
                                <div className="grid grid-cols-12 gap-2 mt-2 border-t pt-3 border-slate-200 dark:border-slate-700">
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
                                            setNewDelivery({...newDelivery, qty: 0, address: ''}); 
                                        } 
                                    }} className="col-span-1 bg-indigo-600 text-white rounded flex items-center justify-center shadow-sm hover:bg-indigo-700">
                                        <span className="material-symbols-outlined text-sm">add</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    {/* Notes (Moved Left Bottom) */}
                    <SectionCard title="Notas Adicionales" icon="description">
                        {isEditing ? (
                            <textarea 
                                value={quote.notes || ''} 
                                onChange={(e) => setQuote({...quote, notes: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={4}
                            />
                        ) : (
                            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{quote.notes || 'Sin notas.'}</p>
                        )}
                    </SectionCard>
                </div>

                {/* Right Column - Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Detalles</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Fecha:</span>
                                <span className="font-medium dark:text-slate-200">{new Date(quote.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Vendedor:</span>
                                <span className="font-medium dark:text-slate-200">{salesperson?.name || 'N/A'}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-slate-500">Creado por:</span>
                                <span className="font-medium dark:text-slate-200">{creator?.name || 'Desconocido'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Aprobado por:</span>
                                <span className="font-medium dark:text-slate-200">{approver?.name || 'N/A'}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-slate-500">Validez:</span>
                                <span className="font-medium dark:text-slate-200">{quote.validity} días</span>
                            </div>
                        </div>
                    </div>
                    
                     {/* Purchase Order Upload Card */}
                     <SectionCard title="Documento Orden de Compra" icon="upload_file">
                         <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <input 
                                type="file" 
                                id="po-upload" 
                                className="hidden" 
                                accept="image/*,.pdf"
                                onChange={handleFileUpload}
                                disabled={isUploadingPO}
                            />
                            <label htmlFor="po-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                {isUploadingPO ? (
                                    <Spinner />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">cloud_upload</span>
                                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                            {quote.purchaseOrderAttachment ? 'Reemplazar Documento' : 'Subir OC (PDF o Imagen)'}
                                        </span>
                                    </>
                                )}
                            </label>
                         </div>
                         {quote.purchaseOrderAttachment && (
                             <div className="flex justify-between items-center mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 rounded-lg">
                                 <div className="flex items-center gap-2 overflow-hidden">
                                     <span className="material-symbols-outlined text-green-600">description</span>
                                     <div className="flex flex-col min-w-0">
                                         <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{quote.purchaseOrderAttachment.name}</span>
                                         <span className="text-xs text-slate-500">{(quote.purchaseOrderAttachment.size / 1024).toFixed(1)} KB</span>
                                     </div>
                                 </div>
                                 <a 
                                    href={quote.purchaseOrderAttachment.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-medium"
                                >
                                    Ver / Descargar
                                </a>
                             </div>
                         )}
                     </SectionCard>

                     {/* Financial Summary (Sticky) */}
                     <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden sticky top-6">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-4 border-b border-indigo-700 pb-2">Resumen Financiero</h3>
                            
                            <div className="space-y-2 text-sm text-indigo-100">
                                <div className="flex justify-between"><span>Subtotal Productos</span> <span>${(totals.products || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                                <div className="flex justify-between"><span>Comisiones</span> <span>${(totals.commissions || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                                
                                {(totals.freight || 0) > 0 && <div className="flex justify-between text-xs opacity-90"><span>+ Flete</span> <span>${(totals.freight || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>}
                                {(totals.handling || 0) > 0 && <div className="flex justify-between text-xs opacity-90"><span>+ Maniobras</span> <span>${(totals.handling || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>}
                                {(totals.insurance || 0) > 0 && <div className="flex justify-between text-xs opacity-90"><span>+ Seguro</span> <span>${(totals.insurance || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>}
                                {(totals.storage || 0) > 0 && <div className="flex justify-between text-xs opacity-90"><span>+ Almacenaje</span> <span>${(totals.storage || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>}

                                <div className="flex justify-between font-bold border-t border-indigo-700/50 pt-2 mt-1">
                                    <span>Base Imponible</span>
                                    <span>${(totals.subtotal || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>

                                {/* Tax Breakdown */}
                                <div className="my-2 pt-2 border-t border-indigo-700/30">
                                     <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-xs">Aplicar IVA (16%)</span>
                                        {isEditing ? (
                                             <ToggleSwitch enabled={taxRate === 16} onToggle={() => setTaxRate(taxRate === 16 ? 0 : 16)} />
                                        ) : (
                                            <span className="text-xs">{taxRate > 0 ? 'Sí' : 'No'}</span>
                                        )}
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

                                <div className="pt-4 mt-2 border-t-2 border-indigo-600 flex justify-between items-end">
                                    <span className="text-lg font-medium opacity-80">Total</span>
                                    <span className="text-3xl font-bold tracking-tight">${(totals.grandTotal || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>
                                <p className="text-right text-xs text-indigo-300 mt-1">{currency}</p>
                            </div>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full opacity-20 blur-2xl"></div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Acciones Rápidas</h4>
                         <button onClick={() => showToast('info', 'Generando PDF...')} className="w-full text-left flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 text-sm font-medium">
                            <span className="material-symbols-outlined mr-3 text-slate-400">picture_as_pdf</span>
                            Descargar PDF
                        </button>
                         <button onClick={() => showToast('info', 'Enviando correo...')} className="w-full text-left flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 text-sm font-medium">
                            <span className="material-symbols-outlined mr-3 text-slate-400">mail</span>
                            Enviar por Correo
                        </button>
                        <button onClick={handleConvertToOrder} className="w-full text-left flex items-center p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded text-green-700 dark:text-green-400 text-sm font-medium">
                            <span className="material-symbols-outlined mr-3">check_circle</span>
                            Convertir a Orden de Venta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteDetailPage;