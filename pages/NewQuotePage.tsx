import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Company, Prospect, Product, ProductLot, User, Unit, CommissionType, ManeuverType, FreightPricingRule, QuoteHandling } from '../types';
import { MOCK_MY_COMPANIES } from '../data/mockData';
import { api } from '../data/mockData';
import CustomSelect from '../components/ui/CustomSelect';
import { convertQuantityToKg } from '../utils/calculations';

// --- Reusable UI Components ---

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
    const [storage, setStorage] = useState({ period: 1, unit: 'mes', cost: 0 });

    const [additionalItems, setAdditionalItems] = useState<any[]>([]);
    
    const [internalNotes, setInternalNotes] = useState('');
    const [terms, setTerms] = useState('');

    const [approver, setApprover] = useState('');
    const [responsible, setResponsible] = useState('');
    
    const [exchangeRate, setExchangeRate] = useState({ official: 20.0, commission: 0.3 });
    const [applyVat, setApplyVat] = useState(true);

    // Dynamic handlers
    const addQuoteProduct = () => {
        setQuoteProducts([...quoteProducts, { id: Date.now(), productId: '', lotId: '', quantity: 0, unit: 'ton', minPrice: 0 }]);
    };
    
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
        newProducts[index].minPrice = selectedLot?.pricing.min || 0;
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
            alert("Añade productos a la cotización primero.");
            return;
        }
        if (deliveryLocations.length === 0) {
            alert("Añade al menos una dirección de entrega personalizada.");
            setDeliveryInfoEnabled(true);
            return;
        }
    
        const totalWeightKg = quoteProducts.reduce((sum, p) => {
            return sum + convertQuantityToKg(Number(p.quantity), p.unit as Unit);
        }, 0);
    
        const origin = 'Almacén Principal (Veracruz)'; // Hardcoded as per prompt simulation
        const destination = deliveryLocations[0].city;
    
        if (!destination) {
            alert("La primera dirección de entrega debe tener una ciudad especificada.");
            return;
        }
    
        const matchingRule = (freightRules || []).find(rule => 
            rule.origin.toLowerCase() === origin.toLowerCase() &&
            rule.destination.toLowerCase() === destination.toLowerCase() &&
            totalWeightKg >= rule.minWeightKg &&
            totalWeightKg <= rule.maxWeightKg
        );
    
        if (!matchingRule) {
            alert(`No se encontró una regla de flete para la ruta ${origin} -> ${destination} con un peso de ${totalWeightKg.toLocaleString()} kg.`);
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
        alert(`Flete calculado y añadido: $${cost.toFixed(2)}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Cotización</h2>
                <button className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">
                    Guardar Cotización
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Tarjeta de Empresa y Cliente */}
                    <QuoteSectionCard title="Información General">
                        <FormRow>
                             <InputGroup label="Empresa que Atiende">
                                <CustomSelect options={MOCK_MY_COMPANIES.map(c => ({ value: c.id, name: c.name }))} value={attendingCompany} onChange={setAttendingCompany} placeholder="Seleccionar..."/>
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
                                <input type="date" value={validityDate} onChange={e => setValidityDate(e.target.value)} />
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
                                <div key={p.id} className="p-4 border rounded-lg space-y-3 relative">
                                    <button type="button" onClick={() => removeProduct(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button>
                                    <FormRow>
                                        <InputGroup label="Producto">
                                            <CustomSelect options={products?.map(pr => ({ value: pr.id, name: pr.name })) || []} value={p.productId} onChange={val => handleProductChange(index, val)} placeholder="Seleccionar..."/>
                                        </InputGroup>
                                        <InputGroup label="Lote">
                                            <CustomSelect options={(availableLots[p.productId] || []).map(l => ({ value: l.id, name: `${l.code} (${l.stock.reduce((a, s) => a+s.qty, 0)} disp.)`}))} value={p.lotId} onChange={val => handleLotChange(index, val)} placeholder="Seleccionar..."/>
                                        </InputGroup>
                                    </FormRow>
                                    <FormRow>
                                        <InputGroup label="Cantidad"><input type="number" value={p.quantity} onChange={e => updateProductField(index, 'quantity', e.target.value)} /></InputGroup>
                                        <InputGroup label="Unidad">
                                            <CustomSelect options={[{value: 'ton', name: 'ton'}, {value: 'kg', name: 'kg'}, {value: 'L', name: 'L'}]} value={p.unit} onChange={val => updateProductField(index, 'unit', val)} />
                                        </InputGroup>
                                        <InputGroup label="Precio Mín. Sugerido"><input type="text" value={`$${p.minPrice.toFixed(2)}`} disabled className="bg-slate-100"/></InputGroup>
                                        <InputGroup label="Precio Unitario"><input type="number" /></InputGroup>
                                    </FormRow>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addQuoteProduct} className="text-sm font-semibold text-indigo-600 flex items-center mt-4">
                            <span className="material-symbols-outlined mr-1">add_circle</span> Añadir Producto
                        </button>
                    </QuoteSectionCard>
                    
                    {/* Tarjeta de Información de Entrega */}
                    <QuoteSectionCard title="Información de Entrega">
                         <div className="flex items-center gap-4">
                            <Switch enabled={deliveryInfoEnabled} onToggle={setDeliveryInfoEnabled} />
                            <span className="text-sm font-medium">Usar dirección de entrega personalizada</span>
                         </div>
                         {deliveryInfoEnabled && deliveryLocations.map((loc, i) => (
                             <div key={loc.id} className="p-4 border rounded-lg space-y-3 mt-4">
                                <FormRow><InputGroup label="Nombre de quien recibe"><input type="text"/></InputGroup><InputGroup label="Email de contacto"><input type="email"/></InputGroup></FormRow>
                                <FormRow><InputGroup label="Calle y número"><input type="text"/></InputGroup><InputGroup label="Teléfono de contacto"><input type="tel"/></InputGroup></FormRow>
                                <FormRow><InputGroup label="Ciudad"><input type="text" onChange={e => { const newLocs = [...deliveryLocations]; newLocs[i].city = e.target.value; setDeliveryLocations(newLocs); }}/></InputGroup><InputGroup label="Estado"><input type="text"/></InputGroup><InputGroup label="Código Postal"><input type="text"/></InputGroup></FormRow>
                             </div>
                         ))}
                         {deliveryInfoEnabled && <button type="button" onClick={addDeliveryLocation} className="text-sm font-semibold text-indigo-600 flex items-center mt-2"><span className="material-symbols-outlined mr-1">add_circle</span>Añadir múltiples locaciones</button>}
                    </QuoteSectionCard>

                    {/* Tarjeta de Programación de Entrega */}
                    <QuoteSectionCard title="Programación de Entregas">
                        {deliverySchedule.map((item, i) =>(
                            <div key={item.id} className="p-4 border rounded-lg space-y-3 mt-4">
                                <FormRow>
                                    <InputGroup label="Dirección de Entrega"><CustomSelect options={[{value: 'main', name: 'Dirección Principal'}]} value={'main'} onChange={()=>{}} /></InputGroup>
                                    <InputGroup label="Código Postal"><input type="text" /></InputGroup>
                                </FormRow>
                                <FormRow>
                                     <InputGroup label="Toneladas"><input type="number" /></InputGroup>
                                     <InputGroup label="Fecha"><input type="date" /></InputGroup>
                                </FormRow>
                            </div>
                        ))}
                         <button type="button" onClick={addDeliveryScheduleItem} className="text-sm font-semibold text-indigo-600 flex items-center mt-2"><span className="material-symbols-outlined mr-1">add_circle</span>Añadir Entrega</button>
                    </QuoteSectionCard>

                     {/* Tarjeta de Comisiones */}
                    <QuoteSectionCard title="Comisiones">
                        {commissions.map((c, i) => (
                             <FormRow key={c.id} className="p-2 border-b last:border-b-0">
                                <InputGroup label="Vendedor"><CustomSelect options={[{value: 'abigail', name: 'Abigail'}, {value: 'david', name: 'David'}]} value={'abigail'} onChange={()=>{}} /></InputGroup>
                                <InputGroup label="Tipo"><CustomSelect options={[{value: 'porcentaje', name: '%'}, {value: 'tonelada', name: 'Por Tonelada'}, {value: 'litro', name: 'Por Litro'}]} value={'porcentaje'} onChange={()=>{}} /></InputGroup>
                                <InputGroup label="Valor"><input type="number" /></InputGroup>
                             </FormRow>
                        ))}
                         <button type="button" onClick={addCommission} className="text-sm font-semibold text-indigo-600 flex items-center mt-2"><span className="material-symbols-outlined mr-1">add_circle</span>Añadir Comisión</button>
                    </QuoteSectionCard>
                    
                    {/* Tarjeta de Maniobras */}
                     <QuoteSectionCard title="Maniobras">
                        {handling.map((h, index) => (
                            <div key={h.id} className="p-4 border rounded-lg space-y-3 relative bg-slate-50 dark:bg-slate-800/50">
                                <button type="button" onClick={() => removeHandling(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button>
                                <FormRow>
                                    <InputGroup label="Tipo de Maniobra">
                                        <CustomSelect 
                                            options={[
                                                {value: 'Ninguna', name: 'Ninguna'}, 
                                                {value: 'Carga', name: 'Carga'}, 
                                                {value: 'Descarga', name: 'Descarga'},
                                                {value: 'Carga y Descarga', name: 'Carga y Descarga'}
                                            ]} 
                                            value={h.type} 
                                            onChange={(val) => updateHandling(index, 'type', val as ManeuverType)} 
                                        />
                                    </InputGroup>
                                    <InputGroup label="Costo por ton/L">
                                        <input 
                                            type="number" 
                                            value={h.costPerTon} 
                                            onChange={e => updateHandling(index, 'costPerTon', Number(e.target.value))} 
                                        />
                                    </InputGroup>
                                </FormRow>
                            </div>
                        ))}
                        <button type="button" onClick={addHandling} className="text-sm font-semibold text-indigo-600 flex items-center mt-2"><span className="material-symbols-outlined mr-1">add_circle</span>Añadir Maniobra</button>
                    </QuoteSectionCard>

                    {/* Costos con Switch */}
                    <QuoteSectionCard title="Flete">
                        <div className="flex items-center gap-4 mb-4"><Switch enabled={freightEnabled} onToggle={setFreightEnabled} /><span className="text-sm font-medium">Activar costos de flete</span></div>
                        {freightEnabled && (
                            <>
                                <button type="button" onClick={handleCalculateFreight} className="w-full text-center bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900 mb-4">
                                    Calcular Flete Automáticamente
                                </button>
                                {freights.map(f => (
                                    <FormRow key={f.id} className="p-2 border-b last:border-b-0">
                                        <InputGroup label="Origen"><input type="text" value={f.origin} disabled /></InputGroup>
                                        <InputGroup label="Destino"><input type="text" value={f.destination} disabled /></InputGroup>
                                        <InputGroup label="Costo"><input type="number" value={f.cost} /></InputGroup>
                                    </FormRow>
                                ))}
                                <button type="button" onClick={addFreight} className="text-sm font-semibold text-indigo-600 flex items-center mt-2"><span className="material-symbols-outlined mr-1">add_circle</span>Añadir Ruta Manualmente</button>
                            </>
                        )}
                    </QuoteSectionCard>

                    <QuoteSectionCard title="Seguro">
                        <div className="flex items-center gap-4 mb-4"><Switch enabled={insuranceEnabled} onToggle={setInsuranceEnabled} /><span className="text-sm font-medium">Activar costo de seguro</span></div>
                        {insuranceEnabled && <InputGroup label="Costo por ton/L"><input type="number" value={insuranceCost} onChange={e=>setInsuranceCost(parseFloat(e.target.value))} /></InputGroup>}
                    </QuoteSectionCard>
                    
                    <QuoteSectionCard title="Almacenaje">
                        <div className="flex items-center gap-4 mb-4"><Switch enabled={storageEnabled} onToggle={setStorageEnabled} /><span className="text-sm font-medium">Activar costo de almacenaje</span></div>
                        {storageEnabled && (
                            <FormRow>
                                <InputGroup label="Periodo"><input type="number" value={storage.period} onChange={e => setStorage(s=>({...s, period: parseInt(e.target.value)}))} /></InputGroup>
                                <InputGroup label="Unidad"><CustomSelect options={[{value: 'dia', name: 'Día'}, {value: 'semana', name: 'Semana'}, {value: 'mes', name: 'Mes'}]} value={storage.unit} onChange={val => setStorage(s=>({...s, unit: val}))} /></InputGroup>
                                <InputGroup label="Costo por ton/L"><input type="number" value={storage.cost} onChange={e => setStorage(s=>({...s, cost: parseFloat(e.target.value)}))} /></InputGroup>
                            </FormRow>
                        )}
                    </QuoteSectionCard>

                    {/* Items Adicionales */}
                    <QuoteSectionCard title="Items Adicionales">
                        {additionalItems.map(item => (
                             <FormRow key={item.id} className="p-2 border-b last:border-b-0">
                                <InputGroup label="Nombre del Ítem"><input type="text"/></InputGroup>
                                <InputGroup label="Cantidad"><input type="number"/></InputGroup>
                                <InputGroup label="Precio Unitario"><input type="number"/></InputGroup>
                            </FormRow>
                        ))}
                        <button type="button" onClick={addAdditionalItem} className="text-sm font-semibold text-indigo-600 flex items-center mt-2"><span className="material-symbols-outlined mr-1">add_circle</span>Añadir Ítem</button>
                    </QuoteSectionCard>
                    
                     {/* Tarjeta de Información Adicional */}
                    <QuoteSectionCard title="Información Adicional">
                        <InputGroup label="Notas Internas (no visibles para el cliente)"><textarea rows={3} value={internalNotes} onChange={e => setInternalNotes(e.target.value)}/></InputGroup>
                        <InputGroup label="Términos y Condiciones"><textarea rows={5} value={terms} onChange={e => setTerms(e.target.value)}/></InputGroup>
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
                            <input type="number" step="0.01" value={exchangeRate.official} onChange={e => setExchangeRate(r => ({...r, official: parseFloat(e.target.value)}))}/>
                         </InputGroup>
                         <InputGroup label="Comisión sobre TC (%)">
                            <input type="number" step="0.1" value={exchangeRate.commission} onChange={e => setExchangeRate(r => ({...r, commission: parseFloat(e.target.value)}))}/>
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