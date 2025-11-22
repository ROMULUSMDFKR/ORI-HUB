
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Company, CompanyPipelineStage, Priority, User, Address, Contact } from '../types';
import CustomSelect from '../components/ui/CustomSelect';
import { useCollection } from '../hooks/useCollection';
import DuplicateChecker from '../components/ui/DuplicateChecker';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';
import { 
    COMMUNICATION_CHANNELS, 
    FORMALITY_OPTIONS, 
    INCOTERM_OPTIONS, 
    PAYMENT_TERM_OPTIONS, 
    PREFERRED_DAYS_OPTIONS, 
    PRESENTATION_OPTIONS, 
    PURCHASE_FREQUENCY_OPTIONS, 
    PURCHASE_TYPE_OPTIONS, 
    QUOTE_FORMAT_OPTIONS, 
    SLA_OPTIONS, 
    TONE_OPTIONS, 
    ACCESS_RESTRICTIONS_OPTIONS,
    EQUIPMENT_OPTIONS
} from '../constants';

// Initial state with full nested structure to ensure dropdowns work immediately
const initialClientState: Partial<Company> = {
    name: '',
    shortName: '',
    rfc: '',
    industry: '',
    ownerId: '',
    createdById: '',
    stage: CompanyPipelineStage.Onboarding,
    priority: Priority.Media,
    isActive: true,
    productsOfInterest: [],
    deliveryAddresses: [],
    fiscalAddress: { street: '', city: '', state: '', zip: '' },
    primaryContact: { 
        id: '', 
        name: '', 
        email: '', 
        phone: '', 
        role: '', 
        ownerId: '' 
    } as Contact,
    profile: {
        communication: {
            channel: [],
            days: [],
            time: '',
            isAvailable: true,
            tone: 'Formal',
            formality: 'Profesional',
            sla: '24 horas',
            quoteFormat: 'PDF'
        },
        decisionMap: [],
        purchaseProcess: {
            requiresOC: false,
            requiresSupplierRegistry: false,
            isTender: false,
            requiredDocs: [],
            approvalCriteria: [],
            paymentTerm: 'Contado',
            budget: 0,
            budgetUnit: 'Tonelada',
            purchaseType: 'Puntual'
        },
        useCase: {
            application: '',
            productsOfInterest: [],
            presentation: [],
            frequency: 'Mensual',
            monthlyConsumption: 0
        },
        logistics: {
            deliveryPoints: '',
            downloadWindow: '',
            equipmentOnSite: [],
            accessRestrictions: [],
            incoterm: 'EXW',
            freightResponsible: 'Nosotros'
        },
        triggers: {
            restockPoint: '',
            maxDeliveryTime: 0
        }
    }
};

const INCOTERM_DESCRIPTIONS: Record<string, string> = {
    'EXW': 'Ex Works: El vendedor entrega en su fábrica. El comprador asume todos los costos y riesgos.',
    'FCA': 'Free Carrier: El vendedor entrega al transportista en un punto acordado.',
    'CPT': 'Carriage Paid To: El vendedor paga el transporte hasta el destino. El riesgo se transfiere al entregar al transportista.',
    'CIP': 'Carriage and Insurance Paid To: Similar a CPT, pero el vendedor también paga el seguro.',
    'DAP': 'Delivered at Place: El vendedor entrega en el lugar de destino, listo para descargar.',
    'DPU': 'Delivered at Place Unloaded: El vendedor entrega y descarga la mercancía en el destino.',
    'DDP': 'Delivered Duty Paid: El vendedor asume todos los costos y riesgos, incluidos los impuestos, hasta la entrega.'
};

// --- REUSABLE UI COMPONENTS (Moved OUTSIDE the main component) ---

const FormBlock: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">{title}</h3>
        <div className="space-y-6">{children}</div>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-6 first:border-t-0 first:pt-0">
        {title && <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">{title}</h4>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </div>
);

const Input: React.FC<{ label: string; value: string | number; onChange: (val: any) => void; type?: string, required?: boolean, tooltip?: string, placeholder?: string }> = ({ label, value, onChange, type = 'text', required=false, tooltip, placeholder }) => (
    <div>
        <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
            {tooltip && (
                <div className="group relative ml-2">
                    <span className="material-symbols-outlined text-slate-400 text-sm cursor-help">info</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded shadow-lg w-48 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        {tooltip}
                    </div>
                </div>
            )}
        </label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" 
        />
    </div>
);

const Select: React.FC<{ label: string; value: string; onChange: (val: any) => void; options: readonly string[]; tooltip?: string }> = ({ label, value, onChange, options, tooltip }) => (
    <div>
         <div className="flex items-center mb-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            {tooltip && (
                <div className="group relative ml-2">
                    <span className="material-symbols-outlined text-slate-400 text-sm cursor-help">info</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded shadow-lg w-48 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        {tooltip}
                    </div>
                </div>
            )}
        </div>
        <CustomSelect value={value} onChange={onChange} options={options.map(opt => ({ value: opt, name: opt }))} />
    </div>
);

const Toggle: React.FC<{ label: string; enabled: boolean; onToggle: (val: boolean) => void; }> = ({ label, enabled, onToggle }) => (
    <div className="flex items-center justify-between col-span-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <button type="button" onClick={() => onToggle(!enabled)} className={`${enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
            <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
        </button>
    </div>
);

const MultiSelectPills: React.FC<{
    label: string;
    options: readonly string[];
    selectedValues: string[];
    onChange: (newValues: string[]) => void;
}> = ({ label, options, selectedValues, onChange }) => {
    return (
        <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map(option => {
                    const isSelected = selectedValues.includes(option);
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => {
                                const newValues = isSelected 
                                    ? selectedValues.filter(v => v !== option) 
                                    : [...selectedValues, option];
                                onChange(newValues);
                            }}
                            className={`px-3 py-1 text-sm rounded-full transition-colors border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const NewClientPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    const [client, setClient] = useState<Partial<Company>>({ ...initialClientState });
    const [activeTab, setActiveTab] = useState<'General' | 'Perfil'>('General');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // State for new delivery address input
    const [newDeliveryAddress, setNewDeliveryAddress] = useState<Address>({ label: '', street: '', city: '', state: '', zip: '' });

    const { data: companies } = useCollection<Company>('companies');
    const { data: users } = useCollection<User>('users');
    
    // Helper to update deep nested state safely
    // FIXED: Correctly returns object structure instead of just value at leaf
    const setNestedState = (obj: any, path: string[], value: any): any => {
        const [head, ...tail] = path;
        if (tail.length === 0) {
            return { ...obj, [head]: value };
        }
        return {
            ...obj,
            [head]: setNestedState(obj[head] || {}, tail, value)
        };
    };

    const handleChange = useCallback((field: string, value: any) => {
        setClient(prev => {
            const path = field.split('.');
            if (path.length === 1) {
                if (field === 'name') setSearchTerm(value);
                return { ...prev, [field]: value };
            }
            // Use the recursive helper to update nested state properly
            const newState = setNestedState({ ...prev }, path, value);
            return newState;
        });
    }, []);
    
    const handleAddDeliveryAddress = () => {
        if(!newDeliveryAddress.street || !newDeliveryAddress.city || !newDeliveryAddress.state) {
            showToast('warning', 'Calle, Ciudad y Estado son obligatorios para la dirección.');
            return;
        }
        const updatedAddresses = [...(client.deliveryAddresses || []), { ...newDeliveryAddress, id: `addr-${Date.now()}` }];
        setClient(prev => ({ ...prev, deliveryAddresses: updatedAddresses }));
        setNewDeliveryAddress({ label: '', street: '', city: '', state: '', zip: '' });
        showToast('success', 'Dirección agregada a la lista.');
    };

    const handleRemoveDeliveryAddress = (index: number) => {
        const updatedAddresses = (client.deliveryAddresses || []).filter((_, i) => i !== index);
        setClient(prev => ({ ...prev, deliveryAddresses: updatedAddresses }));
    };

    const openMap = (addr: Address) => {
        const query = `${addr.street}, ${addr.city}, ${addr.state}, ${addr.zip}`;
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    };

    const handleSave = async () => {
        if (!client.name?.trim()) {
            showToast('warning', 'El nombre del cliente es obligatorio.');
            return;
        }

        setIsSaving(true);
        try {
            const newClientData = {
                ...client,
                createdAt: new Date().toISOString(),
                ownerId: client.ownerId || 'user-1', 
                createdById: 'user-1',
            } as Omit<Company, 'id'>;

            const docRef = await api.addDoc('companies', newClientData);

            // Automatically create the contact in the contacts collection
            if (client.primaryContact && client.primaryContact.name) {
                const contactData: Contact = {
                    id: `contact-${Date.now()}`,
                    name: client.primaryContact.name,
                    email: client.primaryContact.email || '',
                    phone: client.primaryContact.phone || '',
                    role: client.primaryContact.role || 'Contacto Principal', // Default role if empty
                    emails: client.primaryContact.email ? [client.primaryContact.email] : [],
                    phones: client.primaryContact.phone ? [client.primaryContact.phone] : [],
                    companyId: docRef.id, // Link to the newly created company
                    ownerId: newClientData.ownerId,
                };
                await api.addDoc('contacts', contactData);
            }

            showToast('success', 'Cliente creado exitosamente.');
            navigate(`/crm/clients/${docRef.id}`);
        } catch (error) {
            console.error("Error creating client:", error);
            showToast('error', 'Error al crear el cliente.');
        } finally {
            setIsSaving(false);
        }
    };

    const incotermOptions = INCOTERM_OPTIONS.map(code => ({
        value: code,
        name: `${code} - ${INCOTERM_DESCRIPTIONS[code] || ''}`
    }));

    const unitOptions = ['Tonelada', 'Litro', 'Unidad', 'Kilogramo'];

    const renderGeneralTab = () => (
        <div className="space-y-6">
            <FormBlock title="Información General">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                        <Input label="Nombre / Razón Social" value={client.name || ''} onChange={(val) => handleChange('name', val)} required />
                        <DuplicateChecker searchTerm={searchTerm} existingProspects={[]} existingCompanies={companies || []} />
                    </div>
                    <Input label="Nombre corto (alias)" value={client.shortName || ''} onChange={(val) => handleChange('shortName', val)} />
                    <Input label="RFC" value={client.rfc || ''} onChange={(val) => handleChange('rfc', val)} />
                    <Select label="Industria" value={client.industry || ''} onChange={(val) => handleChange('industry', val)} options={['Industrial', 'Agricultura', 'Transporte', 'Construcción']} />
                    
                    <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Responsable Principal</label>
                         <CustomSelect 
                            options={(users || []).map(u => ({ value: u.id, name: u.name }))} 
                            value={client.ownerId || ''} 
                            onChange={(val) => handleChange('ownerId', val)} 
                        />
                    </div>
                    
                    <Select label="Prioridad" value={client.priority || ''} onChange={(val) => handleChange('priority', val)} options={['Alta', 'Media', 'Baja']} />
                    <Select label="Etapa del Cliente" value={client.stage || ''} onChange={(val) => handleChange('stage', val)} options={Object.values(CompanyPipelineStage)} />
                    <Input label="Sitio Web" value={client.website || ''} onChange={(val) => handleChange('website', val)} />
                </div>
            </FormBlock>

            <FormBlock title="Dirección Fiscal">
                <p className="text-xs text-slate-500 mb-4">Dirección registrada ante el SAT.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input label="Calle y Número" value={client.fiscalAddress?.street || ''} onChange={(val) => handleChange('fiscalAddress.street', val)} placeholder="Av. Reforma 123, Col. Centro" />
                    </div>
                    <Input label="Ciudad / Municipio" value={client.fiscalAddress?.city || ''} onChange={(val) => handleChange('fiscalAddress.city', val)} placeholder="Ciudad de México" />
                    <Input label="Estado" value={client.fiscalAddress?.state || ''} onChange={(val) => handleChange('fiscalAddress.state', val)} placeholder="CDMX" />
                    <Input label="Código Postal" value={client.fiscalAddress?.zip || ''} onChange={(val) => handleChange('fiscalAddress.zip', val)} placeholder="06000" />
                </div>
            </FormBlock>
            
            <FormBlock title="Contacto Principal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Nombre" value={client.primaryContact?.name || ''} onChange={(val) => handleChange('primaryContact.name', val)} />
                    <Input label="Email" value={client.primaryContact?.email || ''} onChange={(val) => handleChange('primaryContact.email', val)} type="email"/>
                    <Input label="Teléfono" value={client.primaryContact?.phone || ''} onChange={(val) => handleChange('primaryContact.phone', val)} type="tel"/>
                </div>
            </FormBlock>
        </div>
    );
    
    const renderProfileTab = () => (
         <div className="space-y-6">
            <FormBlock title="Logística y Direcciones de Entrega">
                 <Section title="Direcciones de Entrega">
                    <div className="col-span-2 space-y-4">
                         {/* List Existing Delivery Addresses */}
                        {client.deliveryAddresses && client.deliveryAddresses.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {client.deliveryAddresses.map((addr, index) => (
                                    <div key={index} className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg">
                                        <div>
                                            {addr.label && <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded mb-1 inline-block">{addr.label}</span>}
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{addr.street}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{addr.city}, {addr.state} - {addr.zip}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openMap(addr)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Ver en Mapa">
                                                <span className="material-symbols-outlined">location_on</span>
                                            </button>
                                            <button onClick={() => handleRemoveDeliveryAddress(index)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No hay direcciones de entrega registradas.</p>
                        )}

                        {/* Add New Address Form */}
                        <div className="mt-6 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Agregar Nueva Dirección</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2">
                                    <Input label="Etiqueta (Opcional)" value={newDeliveryAddress.label || ''} onChange={(val) => setNewDeliveryAddress(p => ({...p, label: val}))} placeholder="Ej: Bodega Norte, Sucursal Centro" />
                                </div>
                                <div className="md:col-span-2">
                                    <Input label="Calle y Número" value={newDeliveryAddress.street} onChange={(val) => setNewDeliveryAddress(p => ({...p, street: val}))} />
                                </div>
                                <Input label="Ciudad" value={newDeliveryAddress.city} onChange={(val) => setNewDeliveryAddress(p => ({...p, city: val}))} />
                                <Input label="Estado" value={newDeliveryAddress.state} onChange={(val) => setNewDeliveryAddress(p => ({...p, state: val}))} />
                                <Input label="Código Postal" value={newDeliveryAddress.zip} onChange={(val) => setNewDeliveryAddress(p => ({...p, zip: val}))} />
                            </div>
                            <button 
                                onClick={handleAddDeliveryAddress}
                                className="mt-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 text-sm flex items-center"
                            >
                                <span className="material-symbols-outlined mr-1 text-base">add_location_alt</span> Agregar Dirección
                            </button>
                        </div>
                    </div>
                </Section>
            </FormBlock>

            <FormBlock title="Preferencias de Comunicación">
                <Section title="">
                    <MultiSelectPills 
                        label="Canal(es) Preferido(s)"
                        options={COMMUNICATION_CHANNELS}
                        selectedValues={client.profile?.communication?.channel || []}
                        onChange={(newValues) => handleChange('profile.communication.channel', newValues)}
                    />
                    <Input label="Horario Preferido" value={client.profile?.communication?.time || ''} onChange={(val) => handleChange('profile.communication.time', val)} />
                    <MultiSelectPills 
                        label="Días Preferidos"
                        options={PREFERRED_DAYS_OPTIONS}
                        selectedValues={client.profile?.communication?.days || []}
                        onChange={(newValues) => handleChange('profile.communication.days', newValues)}
                    />
                    <Toggle label="Disponibilidad de contacto" enabled={client.profile?.communication?.isAvailable ?? false} onToggle={(val) => handleChange('profile.communication.isAvailable', val)} />
                </Section>
                 <Section title="Tono y Formalidad">
                    <Select label="Idioma/Tono" value={client.profile?.communication?.tone || ''} onChange={(val) => handleChange('profile.communication.tone', val)} options={TONE_OPTIONS} />
                    <Select label="Formalidad" value={client.profile?.communication?.formality || ''} onChange={(val) => handleChange('profile.communication.formality', val)} options={FORMALITY_OPTIONS} />
                    <Select label="Tiempo de Respuesta (SLA)" value={client.profile?.communication?.sla || ''} onChange={(val) => handleChange('profile.communication.sla', val)} options={SLA_OPTIONS} />
                    <Select label="Formato Cotización" value={client.profile?.communication?.quoteFormat || ''} onChange={(val) => handleChange('profile.communication.quoteFormat', val)} options={QUOTE_FORMAT_OPTIONS} />
                </Section>
            </FormBlock>

            <FormBlock title="Proceso de Compra">
                <Section title="Requisitos">
                    <Toggle label="Requiere OC" enabled={client.profile?.purchaseProcess?.requiresOC ?? false} onToggle={(val) => handleChange('profile.purchaseProcess.requiresOC', val)} />
                    <Toggle label="Registro Proveedor" enabled={client.profile?.purchaseProcess?.requiresSupplierRegistry ?? false} onToggle={(val) => handleChange('profile.purchaseProcess.requiresSupplierRegistry', val)} />
                    <Toggle label="Licitación" enabled={client.profile?.purchaseProcess?.isTender ?? false} onToggle={(val) => handleChange('profile.purchaseProcess.isTender', val)} />
                </Section>
                 <Section title="Detalles del Proceso">
                    <Select label="Término de Pago" value={client.profile?.purchaseProcess?.paymentTerm || ''} onChange={(val) => handleChange('profile.purchaseProcess.paymentTerm', val)} options={PAYMENT_TERM_OPTIONS} />
                    
                    {/* Updated Budget Section with Unit */}
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Presupuesto Estimado</label>
                        <div className="flex gap-2">
                            <div className="flex-grow">
                                <input 
                                    type="number" 
                                    value={client.profile?.purchaseProcess?.budget || 0} 
                                    onChange={(e) => handleChange('profile.purchaseProcess.budget', e.target.value)} 
                                    className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" 
                                />
                            </div>
                            <div className="w-1/3 min-w-[120px]">
                                <CustomSelect 
                                    options={unitOptions.map(u => ({ value: u, name: u }))} 
                                    value={client.profile?.purchaseProcess?.budgetUnit || 'Tonelada'} 
                                    onChange={(val) => handleChange('profile.purchaseProcess.budgetUnit', val)}
                                />
                            </div>
                        </div>
                    </div>

                    <Select label="Tipo de Compra" value={client.profile?.purchaseProcess?.purchaseType || ''} onChange={(val) => handleChange('profile.purchaseProcess.purchaseType', val)} options={PURCHASE_TYPE_OPTIONS} />
                </Section>
            </FormBlock>

            <FormBlock title="Caso de uso y Especificaciones">
                 <Section title="">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Aplicación</label>
                        <textarea 
                            value={client.profile?.useCase?.application || ''} 
                            onChange={(e) => handleChange('profile.useCase.application', e.target.value)} 
                            rows={3} 
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                            placeholder="Descripción de cómo usan el producto..."
                        />
                    </div>
                    <MultiSelectPills 
                        label="Presentación"
                        options={PRESENTATION_OPTIONS}
                        selectedValues={client.profile?.useCase?.presentation || []}
                        onChange={(newValues) => handleChange('profile.useCase.presentation', newValues)}
                    />
                    <Select label="Frecuencia de Compra" value={client.profile?.useCase?.frequency || ''} onChange={(val) => handleChange('profile.useCase.frequency', val)} options={PURCHASE_FREQUENCY_OPTIONS} />
                    <Input label="Consumo Mensual Estimado" value={client.profile?.useCase?.monthlyConsumption || 0} onChange={(val) => handleChange('profile.useCase.monthlyConsumption', val)} type="number" />
                </Section>
            </FormBlock>
            
             <FormBlock title="Logística Operativa">
                 <Section title="">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Punto(s) de Entrega (Notas Generales)</label>
                        <textarea 
                            value={client.profile?.logistics?.deliveryPoints || ''} 
                            onChange={(e) => handleChange('profile.logistics.deliveryPoints', e.target.value)} 
                            rows={2} 
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                            placeholder="Notas adicionales sobre puntos de entrega..."
                        />
                    </div>
                    <Input label="Ventana de Descarga" value={client.profile?.logistics?.downloadWindow || ''} onChange={(val) => handleChange('profile.logistics.downloadWindow', val)} tooltip="Horarios permitidos para recepción de mercancía." />
                    
                    <MultiSelectPills 
                        label="Restricciones de Acceso" 
                        options={ACCESS_RESTRICTIONS_OPTIONS}
                        selectedValues={client.profile?.logistics?.accessRestrictions || []} 
                        onChange={(newValues) => handleChange('profile.logistics.accessRestrictions', newValues)}
                    />

                    <MultiSelectPills 
                        label="Equipo en Sitio" 
                        options={EQUIPMENT_OPTIONS}
                        selectedValues={client.profile?.logistics?.equipmentOnSite || []} 
                        onChange={(newValues) => handleChange('profile.logistics.equipmentOnSite', newValues)}
                    />
                    
                    {/* Incoterm with dynamic description tooltip */}
                     <div>
                        <div className="flex items-center mb-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Incoterm</label>
                            <div className="group relative ml-2">
                                <span className="material-symbols-outlined text-slate-400 text-sm cursor-help">info</span>
                                {client.profile?.logistics?.incoterm && INCOTERM_DESCRIPTIONS[client.profile.logistics.incoterm] && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded shadow-lg w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                        {INCOTERM_DESCRIPTIONS[client.profile.logistics.incoterm]}
                                    </div>
                                )}
                            </div>
                        </div>
                        <CustomSelect 
                            value={client.profile?.logistics?.incoterm || ''} 
                            onChange={(val) => handleChange('profile.logistics.incoterm', val)} 
                            options={incotermOptions} 
                        />
                    </div>

                    <Select label="Responsable del Flete" value={client.profile?.logistics?.freightResponsible || ''} onChange={(val) => handleChange('profile.logistics.freightResponsible', val)} options={['Nosotros', 'Cliente']} />
                </Section>
            </FormBlock>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Crear Nuevo Cliente</h2>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/crm/clients/list')} disabled={isSaving} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Cliente
                    </button>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {['General', 'Perfil'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as 'General' | 'Perfil')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base ${
                                activeTab === tab
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'General' && renderGeneralTab()}
                {activeTab === 'Perfil' && renderProfileTab()}
            </div>
        </div>
    );
};

export default NewClientPage;
