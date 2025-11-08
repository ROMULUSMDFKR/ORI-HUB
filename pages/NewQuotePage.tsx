

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Company, Product, ProductLot, Quote, QuoteItem, QuotePipelineStage, Unit, Prospect } from '../types';
import { useCollection } from '../hooks/useCollection';
import { api } from '../data/mockData';
import { UNITS, TAX_RATE } from '../constants';
import { convertPrice } from '../utils/calculations';

type RecipientType = 'prospect' | 'company';

const initialQuoteState: Omit<Quote, 'id'> = {
  status: QuotePipelineStage.Borrador,
  currency: 'USD',
  items: [],
  fees: { handling: 0, insurance: 0, storage: 0, freight: 0 },
  commissions: { type: 'porcentaje', value: 0 },
  deliveries: [],
  totals: { base: 0, extras: 0, tax: 0, grandTotal: 0 },
};

// --- UI Components ---

const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-surface p-6 rounded-lg shadow-sm">
    <h3 className="text-lg font-semibold border-b pb-3 mb-4">{title}</h3>
    {children}
  </div>
);

const Combobox: React.FC<{ label: string; options: {id: string; name: string}[]; value: string; onChange: (value: string) => void; loading?: boolean; placeholder?: string; }> = 
({ label, options, value, onChange, loading, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            disabled={loading || !options.length}
        >
            <option value="">{loading ? 'Cargando...' : placeholder || `Seleccionar...`}</option>
            {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
        </select>
    </div>
);

const Input: React.FC<{ label: string; type?: string; value: string | number; onChange: (value: any) => void; }> = 
({ label, type = 'text', value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-border focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
    </div>
);

const FeeSwitch: React.FC<{ label: string; enabled: boolean; onToggle: () => void; value: number; onValueChange: (val: number) => void; }> =
({label, enabled, onToggle, value, onValueChange}) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center">
            <button type="button" onClick={onToggle} className={`${enabled ? 'bg-primary' : 'bg-gray-200'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
            </button>
            <span className="ml-3 text-sm font-medium">{label}</span>
        </div>
        {enabled && (
             <input
                type="number"
                value={value}
                onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
                className="w-32 text-right border-border rounded-md shadow-sm sm:text-sm"
                placeholder="Costo"
            />
        )}
    </div>
);

// --- Main Page Component ---

const NewQuotePage: React.FC = () => {
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Omit<Quote, 'id'>>(initialQuoteState);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [recipientType, setRecipientType] = useState<RecipientType | ''>('');

  const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
  const { data: prospects, loading: prospectsLoading } = useCollection<Prospect>('prospects');
  const { data: products, loading: productsLoading } = useCollection<Product>('products');
  const [lotsByProduct, setLotsByProduct] = useState<Record<string, {data: ProductLot[], loading: boolean}>>({});

  // --- Handlers ---
  const handleRecipientTypeChange = (type: RecipientType) => {
    setRecipientType(type);
    setQuote(prev => ({ ...prev, companyId: undefined, prospectId: undefined }));
  }

  const handleRecipientChange = (id: string) => {
    if (recipientType === 'company') {
        setQuote(prev => ({...prev, companyId: id, prospectId: undefined }));
    } else if (recipientType === 'prospect') {
        setQuote(prev => ({...prev, prospectId: id, companyId: undefined }));
    }
  }

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...quote.items];
    const currentItem = { ...newItems[index] };
    (currentItem[field] as any) = value;

    if (field === 'productId') {
        currentItem.lotId = ''; // Reset lot when product changes
        const selectedProduct = products?.find(p => p.id === value);
        if (selectedProduct) {
            currentItem.unit = selectedProduct.unitDefault;
            fetchLots(value);
        }
    }

    if (field === 'qty' || field === 'unitPrice') {
        currentItem.subtotal = (currentItem.qty || 0) * (currentItem.unitPrice || 0);
    }

    newItems[index] = currentItem;
    setQuote(prev => ({ ...prev, items: newItems }));
    validateItemPrice(index, currentItem);
  };

  const fetchLots = async (productId: string) => {
    if (!productId || lotsByProduct[productId]) return;
    setLotsByProduct(prev => ({...prev, [productId]: {data: [], loading: true}}));
    const lots = await api.getLotsForProduct(productId);
    setLotsByProduct(prev => ({...prev, [productId]: {data: lots, loading: false}}));
  };
  
  const addItem = () => {
    const newItem: QuoteItem = { productId: '', lotId: '', qty: 0, unit: 'ton', unitPrice: 0, subtotal: 0 };
    setQuote(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (index: number) => {
    setQuote(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    setItemErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[index];
        return newErrors;
    })
  };

  const handleFeeChange = (fee: keyof Quote['fees'], value: number) => {
      setQuote(prev => ({...prev, fees: {...prev.fees, [fee]: value}}));
  };

  const toggleFee = (fee: keyof Quote['fees']) => {
      const currentValue = quote.fees[fee] || 0;
      handleFeeChange(fee, currentValue > 0 ? 0 : 1); // Set to 1 as placeholder, user will change
  }

  // --- Validation ---
  const validateItemPrice = (index: number, item: QuoteItem) => {
    const product = products?.find(p => p.id === item.productId);
    const lot = lotsByProduct[item.productId]?.data.find(l => l.id === item.lotId);

    if (!product) return;

    const baseMinPrice = lot?.pricing.min ?? product.pricing.min;
    const priceUnit = product.unitDefault;

    // Convert min price to the unit selected in the line item
    const adjustedMinPrice = convertPrice(baseMinPrice, priceUnit, item.unit);

    if (item.unitPrice < adjustedMinPrice) {
        setItemErrors(prev => ({ ...prev, [index]: `El precio debe ser ≥ $${adjustedMinPrice.toFixed(2)}`}));
    } else {
        setItemErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[index];
            return newErrors;
        });
    }
  };

  // --- Calculations ---
  useEffect(() => {
    const base = quote.items.reduce((sum, item) => sum + item.subtotal, 0);
    const extras = (quote.fees.handling || 0) + (quote.fees.insurance || 0) + (quote.fees.storage || 0) + (quote.fees.freight || 0);
    const commissionCost = quote.commissions.type === 'fijo' 
        ? (quote.commissions.value || 0) 
        : base * ((quote.commissions.value || 0) / 100);
    const totalExtras = extras + commissionCost;
    
    const taxableBase = base + totalExtras;
    const tax = taxableBase * TAX_RATE;
    const grandTotal = taxableBase + tax;
    
    setQuote(prev => ({ ...prev, totals: { base, extras: totalExtras, tax, grandTotal }}));
  }, [quote.items, quote.fees, quote.commissions]);


  const isFormValid = useMemo(() => {
    const hasRecipient = !!quote.companyId || !!quote.prospectId;
    return hasRecipient && Object.keys(itemErrors).length === 0 && quote.items.length > 0 && quote.items.every(i => i.qty > 0 && i.productId)
  }, [itemErrors, quote]);

  const handleSubmit = () => {
      if (!isFormValid) {
          alert("Por favor completa la información y corrige los errores antes de guardar.");
          return;
      }
      const finalQuote: Quote = {
          id: `QT-${Date.now()}`,
          ...quote
      }
      console.log("Quote Submitted:", finalQuote);
      alert("Cotización guardada (ver consola).");
      navigate('/hubs/quotes');
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-on-surface">Nueva Cotización</h2>
            <div>
                <button type="button" className="bg-surface border border-border text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 mr-2">
                    Guardar Borrador
                </button>
                <button onClick={handleSubmit} disabled={!isFormValid} className="bg-primary text-on-primary font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                    Crear Cotización
                </button>
            </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            {/* --- Main Info --- */}
            <FormBlock title="Destinatario">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">¿Para quién es esta cotización?</label>
                        <div className="flex space-x-4">
                           <button type="button" onClick={() => handleRecipientTypeChange('prospect')} className={`px-4 py-2 rounded-md border ${recipientType === 'prospect' ? 'bg-primary text-on-primary border-primary' : 'bg-surface'}`}>Prospecto</button>
                           <button type="button" onClick={() => handleRecipientTypeChange('company')} className={`px-4 py-2 rounded-md border ${recipientType === 'company' ? 'bg-primary text-on-primary border-primary' : 'bg-surface'}`}>Empresa (Cliente)</button>
                        </div>
                    </div>
                    {recipientType && (
                        <Combobox 
                            label={recipientType === 'prospect' ? 'Seleccionar Prospecto' : 'Seleccionar Empresa'}
                            options={
                                recipientType === 'prospect' 
                                ? (prospects || []).map(p => ({id: p.id, name: p.name}))
                                : (companies || []).map(c => ({id: c.id, name: c.shortName || c.name}))
                            } 
                            value={recipientType === 'prospect' ? quote.prospectId || '' : quote.companyId || ''}
                            onChange={handleRecipientChange} 
                            loading={recipientType === 'prospect' ? prospectsLoading : companiesLoading} />
                    )}
                </div>
            </FormBlock>
            {/* --- Items Table --- */}
            <FormBlock title="Productos">
                 <div className="space-y-4">
                    {quote.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 p-3 bg-gray-50 rounded-md relative">
                           <div className="col-span-12 md:col-span-3">
                               <Combobox label="Producto" options={products || []} value={item.productId} onChange={val => handleItemChange(index, 'productId', val)} loading={productsLoading} />
                           </div>
                           <div className="col-span-6 md:col-span-2">
                                <Combobox label="Lote" options={(lotsByProduct[item.productId]?.data || []).map(lot => ({ id: lot.id, name: lot.code }))} value={item.lotId} onChange={val => handleItemChange(index, 'lotId', val)} loading={lotsByProduct[item.productId]?.loading}/>
                           </div>
                           <div className="col-span-6 md:col-span-2">
                               <Input label="Cantidad" type="number" value={item.qty} onChange={val => handleItemChange(index, 'qty', parseFloat(val))} />
                           </div>
                           <div className="col-span-6 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Unidad</label>
                                <select value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value as Unit)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                           </div>
                           <div className="col-span-6 md:col-span-3">
                                <Input label="Precio Unitario" type="number" value={item.unitPrice} onChange={val => handleItemChange(index, 'unitPrice', parseFloat(val))} />
                                {itemErrors[index] && <p className="text-red-500 text-xs mt-1">{itemErrors[index]}</p>}
                           </div>
                           <div className="absolute top-2 right-2">
                                <button type="button" onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-600 p-1 rounded-full">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                           </div>
                           <div className="col-span-12 text-right font-semibold">
                                Subtotal: ${item.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </div>
                        </div>
                    ))}
                    <button type="button" onClick={addItem} className="text-accent font-semibold text-sm flex items-center">
                        <span className="material-symbols-outlined mr-1">add_circle</span>
                        Agregar Producto
                    </button>
                 </div>
            </FormBlock>
        </div>
        <div className="lg:col-span-1 space-y-6">
             {/* --- Fees --- */}
            <FormBlock title="Costos Adicionales">
                <div className="space-y-4">
                    <FeeSwitch label="Maniobras" enabled={!!quote.fees.handling} onToggle={() => toggleFee('handling')} value={quote.fees.handling || 0} onValueChange={val => handleFeeChange('handling', val)} />
                    <FeeSwitch label="Seguro" enabled={!!quote.fees.insurance} onToggle={() => toggleFee('insurance')} value={quote.fees.insurance || 0} onValueChange={val => handleFeeChange('insurance', val)} />
                    <FeeSwitch label="Almacenaje" enabled={!!quote.fees.storage} onToggle={() => toggleFee('storage')} value={quote.fees.storage || 0} onValueChange={val => handleFeeChange('storage', val)} />
                    <FeeSwitch label="Flete" enabled={!!quote.fees.freight} onToggle={() => toggleFee('freight')} value={quote.fees.freight || 0} onValueChange={val => handleFeeChange('freight', val)} />
                </div>
            </FormBlock>
            {/* --- Totals --- */}
             <FormBlock title="Resumen">
                <div className="space-y-2">
                    <div className="flex justify-between"><span>Subtotal Base:</span><span>${quote.totals.base.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>Extras:</span><span>${quote.totals.extras.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2"><span>Subtotal:</span><span>${(quote.totals.base + quote.totals.extras).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>IVA (16%):</span><span>${quote.totals.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>Total:</span><span>${quote.totals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {quote.currency}</span></div>
                </div>
            </FormBlock>
        </div>
      </div>
    </div>
  );
};

export default NewQuotePage;