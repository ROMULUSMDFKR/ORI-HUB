
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Company, CompanyPipelineStage, ActivityLog, Note, User, Address, Contact } from '../types';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import Spinner from '../components/ui/Spinner';
import { APPROVAL_CRITERIA_OPTIONS, COMMUNICATION_CHANNELS, EQUIPMENT_OPTIONS, FORMALITY_OPTIONS, INCOTERM_OPTIONS, PAYMENT_TERM_OPTIONS, PREFERRED_DAYS_OPTIONS, PRESENTATION_OPTIONS, PURCHASE_FREQUENCY_OPTIONS, PURCHASE_TYPE_OPTIONS, QUOTE_FORMAT_OPTIONS, REQUIRED_DOCS_OPTIONS, SLA_OPTIONS, TONE_OPTIONS, ACCESS_RESTRICTIONS_OPTIONS } from '../constants';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import UserSelector from '../components/ui/UserSelector';

type Tab = 'General' | 'Perfil' | 'Actividad' | 'Notas';

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

const ActivityFeed: React.FC<{ activities: ActivityLog[], usersMap: Map<string, User> }> = ({ activities, usersMap }) => {
    const iconMap: Record<ActivityLog['type'], string> = {
        'Llamada': 'call',
        'Email': 'email',
        'Reunión': 'groups',
        'Nota': 'note',
        'Vista de Perfil': 'visibility',
        'Análisis IA': 'auto_awesome',
        'Cambio de Estado': 'change_circle',
        'Sistema': 'dns'
    };
    
    return (
        <FormBlock title="Actividad Reciente">
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    {activities.map((activity, activityIdx) => (
                        <li key={activity.id}>
                            <div className="relative pb-8">
                                {activityIdx !== activities.length - 1 ? (
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-8 ring-white dark:ring-slate-800">
                                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 !text-base">{iconMap[activity.type]}</span>
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                        <div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {activity.description} por <span className="font-medium text-slate-900 dark:text-slate-200">{usersMap.get(activity.userId)?.name}</span>
                                            </p>
                                        </div>
                                        <div className="text-right text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
                                            <time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleDateString()}</time>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </FormBlock>
    );
};

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

const EditClientPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('General');
    const { data: initialCompany, loading: cLoading, error } = useDoc<Company>('companies', id || '');
    const { data: allNotes, loading: nLoading } = useCollection<Note>('notes');
    const { data: allActivities, loading: aLoading } = useCollection<ActivityLog>('activities');
    const { data: users, loading: uLoading } = useCollection<User>('users');
    const { showToast } = useToast();
    const { user: currentUser } = useAuth(); 

    const [editedCompany, setEditedCompany] = useState<Company | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [newDeliveryAddress, setNewDeliveryAddress] = useState<Address>({ label: '', street: '', city: '', state: '', zip: '' });

    useEffect(() => {
        if(initialCompany) {
            // Initialize missing nested objects to prevent errors with controlled inputs
            const initializedCompany = {
                ...initialCompany,
                // Initialize primaryContact
                primaryContact: initialCompany.primaryContact || { id: '', name: '', email: '', phone: '', role: 'Contacto Principal', ownerId: currentUser?.id || '' } as Contact,
                // Initialize secondaryContact
                secondaryContact: initialCompany.secondaryContact || { id: '', name: '', email: '', phone: '', role: 'Contacto Secundario', ownerId: currentUser?.id || '' } as Contact,
                // Initialize additionalOwnerIds
                additionalOwnerIds: initialCompany.additionalOwnerIds || [],
                
                deliveryAddresses: initialCompany.deliveryAddresses || [],
                fiscalAddress: initialCompany.fiscalAddress || { street: '', city: '', state: '', zip: '' },
                profile: {
                    communication: initialCompany.profile?.communication || {
                        channel: [], days: [], time: '', isAvailable: true, tone: 'Formal', formality: 'Profesional', sla: '24 horas', quoteFormat: 'PDF'
                    },
                    decisionMap: initialCompany.profile?.decisionMap || [],
                    purchaseProcess: initialCompany.profile?.purchaseProcess || {
                        requiresOC: false, requiresSupplierRegistry: false, isTender: false, requiredDocs: [], approvalCriteria: [], paymentTerm: 'Contado', budget: 0, purchaseType: 'Puntual'
                    },
                    useCase: initialCompany.profile?.useCase || {
                        application: '', productsOfInterest: [], presentation: [], frequency: 'Mensual', monthlyConsumption: 0
                    },
                    logistics: initialCompany.profile?.logistics || {
                        deliveryPoints: '', downloadWindow: '', equipmentOnSite: [], accessRestrictions: [], incoterm: 'EXW', freightResponsible: 'Nosotros'
                    },
                    triggers: initialCompany.profile?.triggers || {
                        restockPoint: '', maxDeliveryTime: 0
                    }
                }
            };
            
            // Ensure array fields are arrays (for migration from string -> array)
            if (typeof initializedCompany.profile.communication.channel === 'string') {
                 initializedCompany.profile.communication.channel = [initializedCompany.profile.communication.channel];
            } else if (!initializedCompany.profile.communication.channel) {
                 initializedCompany.profile.communication.channel = [];
            }
            
            if (typeof initializedCompany.profile.useCase.presentation === 'string') {
                 initializedCompany.profile.useCase.presentation = [initializedCompany.profile.useCase.presentation];
            } else if (!initializedCompany.profile.useCase.presentation) {
                 initializedCompany.profile.useCase.presentation = [];
            }
            
            if (!initializedCompany.profile.logistics.equipmentOnSite) {
                 initializedCompany.profile.logistics.equipmentOnSite = [];
            }
             if (!initializedCompany.profile.logistics.accessRestrictions) {
                 initializedCompany.profile.logistics.accessRestrictions = [];
            }

            if (!initializedCompany.profile.communication.days) {
                initializedCompany.profile.communication.days = [];
            }
            
            if (!initializedCompany.profile.purchaseProcess.budgetUnit) {
                initializedCompany.profile.purchaseProcess.budgetUnit = 'Tonelada';
            }

            setEditedCompany(initializedCompany);
        }
    }, [initialCompany, currentUser]);

    useEffect(() => {
        if(allNotes && id) {
            setNotes(allNotes.filter(n => n.companyId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
    }, [allNotes, id]);

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);
    
    const activities = useMemo(() => {
        if (!allActivities || !id) return [];
        return allActivities.filter(a => a.companyId === id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allActivities, id]);

    // Deep set helper to safely update nested properties and create intermediate objects if missing
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
        setEditedCompany(prev => {
            if (!prev) return null;
            const path = field.split('.');
            if (path.length === 1) {
                return { ...prev, [field]: value };
            }
            // Use the recursive helper to update nested state properly
            const newState = setNestedState({ ...prev }, path, value);
            return newState;
        });
    }, []);

    const handleToggleAdditionalOwner = (userId: string) => {
        setEditedCompany(prev => {
            if (!prev) return null;
            const currentOwners = prev.additionalOwnerIds || [];
            const newOwners = currentOwners.includes(userId) 
                ? currentOwners.filter(id => id !== userId) 
                : [...currentOwners, userId];
            return { ...prev, additionalOwnerIds: newOwners };
        });
    };

    const handleAddDeliveryAddress = () => {
        if(!newDeliveryAddress.street || !newDeliveryAddress.city || !newDeliveryAddress.state) {
            showToast('warning', 'Calle, Ciudad y Estado son obligatorios para la dirección.');
            return;
        }
        setEditedCompany(prev => {
            if (!prev) return null;
            const updatedAddresses = [...(prev.deliveryAddresses || []), { ...newDeliveryAddress, id: `addr-${Date.now()}` }];
            return { ...prev, deliveryAddresses: updatedAddresses };
        });
        setNewDeliveryAddress({ label: '', street: '', city: '', state: '', zip: '' });
        showToast('success', 'Dirección agregada.');
    };

    const handleRemoveDeliveryAddress = (index: number) => {
        setEditedCompany(prev => {
            if (!prev) return null;
            const updatedAddresses = (prev.deliveryAddresses || []).filter((_, i) => i !== index);
            return { ...prev, deliveryAddresses: updatedAddresses };
        });
    };

    const openMap = (addr: Address) => {
        const query = `${addr.street}, ${addr.city}, ${addr.state}, ${addr.zip}`;
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    };

    const handleNoteAdded = async (note: Note) => {
        try {
            await api.addDoc('notes', note);
            setNotes(prev => [note, ...prev]);
            showToast('success', 'Nota guardada.');
        } catch (err) {
            console.error(err);
            showToast('error', 'Error al guardar nota.');
        }
    };

    const handleSave = async () => {
        if (editedCompany && id) {
            try {
                await api.updateDoc('companies', id, editedCompany);
                
                // Log Activity
                const log: Omit<ActivityLog, 'id'> = {
                    companyId: id,
                    type: 'Sistema',
                    description: 'Perfil de empresa actualizado manualmente.',
                    userId: currentUser?.id || 'system',
                    createdAt: new Date().toISOString()
                };
                await api.addDoc('activities', log);

                showToast('success', "Cambios guardados correctamente.");
                navigate(`/crm/clients/${id}`);
            } catch (error) {
                console.error("Error saving company:", error);
                showToast('error', "Error al guardar cambios.");
            }
        }
    };

    const loading = cLoading || nLoading || aLoading || uLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !editedCompany) return <div className="text-center p-12">Empresa no encontrada</div>;

    const incotermOptions = INCOTERM_OPTIONS.map(code => ({
        value: code,
        name: `${code} - ${INCOTERM_DESCRIPTIONS[code] || ''}`
    }));
    
    // Handle compatibility for multiple emails/phones in the edit form
    const primaryEmail = editedCompany.primaryContact?.emails && editedCompany.primaryContact.emails.length > 0 
        ? editedCompany.primaryContact.emails[0] 
        : editedCompany.primaryContact?.email || '';
        
    const primaryPhone = editedCompany.primaryContact?.phones && editedCompany.primaryContact.phones.length > 0 
        ? editedCompany.primaryContact.phones[0] 
        : editedCompany.primaryContact?.phone || '';
        
    // Secondary Contact details
    const secondaryEmail = editedCompany.secondaryContact?.emails && editedCompany.secondaryContact.emails.length > 0
        ? editedCompany.secondaryContact.emails[0]
        : editedCompany.secondaryContact?.email || '';

    const secondaryPhone = editedCompany.secondaryContact?.phones && editedCompany.secondaryContact.phones.length > 0
        ? editedCompany.secondaryContact.phones[0]
        : editedCompany.secondaryContact?.phone || '';
    
    const unitOptions = ['Tonelada', 'Litro', 'Unidad', 'Kilogramo'];

    const renderGeneralTab = () => (
        <div className="space-y-6">
            <FormBlock title="Información General">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Nombre / Razón Social" value={editedCompany.name} onChange={(val) => handleChange('name', val)} required />
                    <Input label="Nombre corto (alias)" value={editedCompany.shortName || ''} onChange={(val) => handleChange('shortName', val)} />
                    <Input label="RFC" value={editedCompany.rfc || ''} onChange={(val) => handleChange('rfc', val)} />
                    <Select label="Industria" value={editedCompany.industry || ''} onChange={(val) => handleChange('industry', val)} options={['Industrial', 'Agricultura', 'Transporte', 'Construcción']} />
                    <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Responsable Principal</label>
                         <CustomSelect 
                            options={(users || []).map(u => ({ value: u.id, name: u.name }))} 
                            value={editedCompany.ownerId || ''} 
                            onChange={(val) => handleChange('ownerId', val)} 
                        />
                    </div>
                    
                    <div>
                        <UserSelector 
                            label="Colaboradores (Responsables Adicionales)"
                            users={users || []}
                            selectedUserIds={editedCompany.additionalOwnerIds || []}
                            onToggleUser={handleToggleAdditionalOwner}
                        />
                    </div>

                    <Select label="Prioridad" value={editedCompany.priority || ''} onChange={(val) => handleChange('priority', val)} options={['Alta', 'Media', 'Baja']} />
                    <Select label="Etapa del Cliente" value={editedCompany.stage || ''} onChange={(val) => handleChange('stage', val)} options={Object.values(CompanyPipelineStage)} />
                    <Input label="Sitio Web" value={editedCompany.website || ''} onChange={(val) => handleChange('website', val)} />
                </div>
            </FormBlock>

            <FormBlock title="Dirección Fiscal">
                <p className="text-xs text-slate-500 mb-4">Dirección registrada ante el SAT.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input label="Calle y Número" value={editedCompany.fiscalAddress?.street || ''} onChange={(val) => handleChange('fiscalAddress.street', val)} placeholder="Av. Reforma 123, Col. Centro" />
                    </div>
                    <Input label="Ciudad / Municipio" value={editedCompany.fiscalAddress?.city || ''} onChange={(val) => handleChange('fiscalAddress.city', val)} placeholder="Ciudad de México" />
                    <Input label="Estado" value={editedCompany.fiscalAddress?.state || ''} onChange={(val) => handleChange('fiscalAddress.state', val)} placeholder="CDMX" />
                    <Input label="Código Postal" value={editedCompany.fiscalAddress?.zip || ''} onChange={(val) => handleChange('fiscalAddress.zip', val)} placeholder="06000" />
                </div>
            </FormBlock>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormBlock title="Contacto Principal (Edición Rápida)">
                     <p className="text-xs text-slate-500 mb-4">
                        Para añadir múltiples correos o teléfonos, utiliza el botón "Editar / Sincronizar" en la página de detalle del cliente.
                    </p>
                    <div className="space-y-4">
                        <Input label="Nombre" value={editedCompany.primaryContact?.name || ''} onChange={(val) => handleChange('primaryContact.name', val)} />
                        <Input 
                            label="Email (Principal)" 
                            value={primaryEmail} 
                            onChange={(val) => {
                                // Update legacy email AND the first item of the array
                                handleChange('primaryContact.email', val);
                                const newEmails = [...(editedCompany.primaryContact?.emails || [])];
                                newEmails[0] = val;
                                handleChange('primaryContact.emails', newEmails);
                            }} 
                            type="email"
                        />
                        <Input 
                            label="Teléfono (Principal)" 
                            value={primaryPhone} 
                            onChange={(val) => {
                                // Update legacy phone AND the first item of the array
                                handleChange('primaryContact.phone', val);
                                const newPhones = [...(editedCompany.primaryContact?.phones || [])];
                                newPhones[0] = val;
                                handleChange('primaryContact.phones', newPhones);
                            }} 
                            type="tel"
                        />
                    </div>
                </FormBlock>

                <FormBlock title="Contacto Secundario">
                     <p className="text-xs text-slate-500 mb-4">
                        Punto de contacto alternativo.
                    </p>
                    <div className="space-y-4">
                        <Input label="Nombre" value={editedCompany.secondaryContact?.name || ''} onChange={(val) => handleChange('secondaryContact.name', val)} />
                        <Input 
                            label="Email" 
                            value={secondaryEmail} 
                            onChange={(val) => {
                                handleChange('secondaryContact.email', val);
                                const newEmails = [...(editedCompany.secondaryContact?.emails || [])];
                                newEmails[0] = val;
                                handleChange('secondaryContact.emails', newEmails);
                            }} 
                            type="email"
                        />
                        <Input 
                            label="Teléfono" 
                            value={secondaryPhone} 
                            onChange={(val) => {
                                handleChange('secondaryContact.phone', val);
                                const newPhones = [...(editedCompany.secondaryContact?.phones || [])];
                                newPhones[0] = val;
                                handleChange('secondaryContact.phones', newPhones);
                            }} 
                            type="tel"
                        />
                    </div>
                </FormBlock>
            </div>
        </div>
    );
    
    const renderProfileTab = () => (
         <div className="space-y-6">
            
            <FormBlock title="Logística y Direcciones de Entrega">
                 <Section title="Direcciones de Entrega">
                    <div className="col-span-2 space-y-4">
                         {/* List Existing Delivery Addresses */}
                        {editedCompany.deliveryAddresses && editedCompany.deliveryAddresses.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {editedCompany.deliveryAddresses.map((addr, index) => (
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
                        selectedValues={editedCompany.profile?.communication?.channel || []}
                        onChange={(newValues) => handleChange('profile.communication.channel', newValues)}
                    />
                    <Input label="Horario Preferido" value={editedCompany.profile?.communication?.time || ''} onChange={(val) => handleChange('profile.communication.time', val)} />
                    <MultiSelectPills 
                        label="Días Preferidos"
                        options={PREFERRED_DAYS_OPTIONS}
                        selectedValues={editedCompany.profile?.communication?.days || []}
                        onChange={(newValues) => handleChange('profile.communication.days', newValues)}
                    />
                    <Toggle label="Disponibilidad de contacto" enabled={editedCompany.profile?.communication?.isAvailable ?? false} onToggle={(val) => handleChange('profile.communication.isAvailable', val)} />
                </Section>
                 <Section title="Tono y Formalidad">
                    <Select label="Idioma/Tono" value={editedCompany.profile?.communication?.tone || ''} onChange={(val) => handleChange('profile.communication.tone', val)} options={TONE_OPTIONS} />
                    <Select label="Formalidad" value={editedCompany.profile?.communication?.formality || ''} onChange={(val) => handleChange('profile.communication.formality', val)} options={FORMALITY_OPTIONS} />
                    <Select label="Tiempo de Respuesta (SLA)" value={editedCompany.profile?.communication?.sla || ''} onChange={(val) => handleChange('profile.communication.sla', val)} options={SLA_OPTIONS} />
                    <Select label="Formato Cotización" value={editedCompany.profile?.communication?.quoteFormat || ''} onChange={(val) => handleChange('profile.communication.quoteFormat', val)} options={QUOTE_FORMAT_OPTIONS} />
                </Section>
            </FormBlock>

            <FormBlock title="Proceso de Compra">
                <Section title="Requisitos">
                    <Toggle label="Requiere OC" enabled={editedCompany.profile?.purchaseProcess?.requiresOC ?? false} onToggle={(val) => handleChange('profile.purchaseProcess.requiresOC', val)} />
                    <Toggle label="Registro Proveedor" enabled={editedCompany.profile?.purchaseProcess?.requiresSupplierRegistry ?? false} onToggle={(val) => handleChange('profile.purchaseProcess.requiresSupplierRegistry', val)} />
                    <Toggle label="Licitación" enabled={editedCompany.profile?.purchaseProcess?.isTender ?? false} onToggle={(val) => handleChange('profile.purchaseProcess.isTender', val)} />
                </Section>
                 <Section title="Detalles del Proceso">
                    <Select label="Término de Pago" value={editedCompany.profile?.purchaseProcess?.paymentTerm || ''} onChange={(val) => handleChange('profile.purchaseProcess.paymentTerm', val)} options={PAYMENT_TERM_OPTIONS} />
                    
                    {/* Updated Budget Section with Unit */}
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Presupuesto Estimado</label>
                        <div className="flex gap-2">
                            <div className="flex-grow">
                                <input 
                                    type="number" 
                                    value={editedCompany.profile?.purchaseProcess?.budget || 0} 
                                    onChange={(e) => handleChange('profile.purchaseProcess.budget', e.target.value)} 
                                    className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" 
                                />
                            </div>
                            <div className="w-1/3 min-w-[120px]">
                                <CustomSelect 
                                    options={unitOptions.map(u => ({ value: u, name: u }))} 
                                    value={editedCompany.profile?.purchaseProcess?.budgetUnit || 'Tonelada'} 
                                    onChange={(val) => handleChange('profile.purchaseProcess.budgetUnit', val)}
                                />
                            </div>
                        </div>
                    </div>

                    <Select label="Tipo de Compra" value={editedCompany.profile?.purchaseProcess?.purchaseType || ''} onChange={(val) => handleChange('profile.purchaseProcess.purchaseType', val)} options={PURCHASE_TYPE_OPTIONS} />
                </Section>
            </FormBlock>

            <FormBlock title="Caso de uso y Especificaciones">
                 <Section title="">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Aplicación</label>
                        <textarea 
                            value={editedCompany.profile?.useCase?.application || ''} 
                            onChange={(e) => handleChange('profile.useCase.application', e.target.value)} 
                            rows={3} 
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                        />
                    </div>
                    <MultiSelectPills 
                        label="Presentación"
                        options={PRESENTATION_OPTIONS}
                        selectedValues={editedCompany.profile?.useCase?.presentation || []}
                        onChange={(newValues) => handleChange('profile.useCase.presentation', newValues)}
                    />
                    <Select label="Frecuencia de Compra" value={editedCompany.profile?.useCase?.frequency || ''} onChange={(val) => handleChange('profile.useCase.frequency', val)} options={PURCHASE_FREQUENCY_OPTIONS} />
                    <Input label="Consumo Mensual Estimado" value={editedCompany.profile?.useCase?.monthlyConsumption || 0} onChange={(val) => handleChange('profile.useCase.monthlyConsumption', val)} type="number" />
                </Section>
            </FormBlock>
            
             <FormBlock title="Logística Operativa">
                 <Section title="">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Punto(s) de Entrega (Notas Generales)</label>
                        <textarea 
                            value={editedCompany.profile?.logistics?.deliveryPoints || ''} 
                            onChange={(e) => handleChange('profile.logistics.deliveryPoints', e.target.value)} 
                            rows={2} 
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                            placeholder="Notas adicionales sobre puntos de entrega..."
                        />
                    </div>
                    <Input label="Ventana de Descarga" value={editedCompany.profile?.logistics?.downloadWindow || ''} onChange={(val) => handleChange('profile.logistics.downloadWindow', val)} tooltip="Horarios permitidos para recepción de mercancía." />
                    
                    <MultiSelectPills 
                        label="Restricciones de Acceso" 
                        options={ACCESS_RESTRICTIONS_OPTIONS}
                        selectedValues={editedCompany.profile?.logistics?.accessRestrictions || []} 
                        onChange={(newValues) => handleChange('profile.logistics.accessRestrictions', newValues)}
                    />

                    <MultiSelectPills 
                        label="Equipo en Sitio" 
                        options={EQUIPMENT_OPTIONS}
                        selectedValues={editedCompany.profile?.logistics?.equipmentOnSite || []} 
                        onChange={(newValues) => handleChange('profile.logistics.equipmentOnSite', newValues)}
                    />
                    
                     {/* Incoterm with dynamic description tooltip */}
                     <div>
                        <div className="flex items-center mb-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Incoterm</label>
                            <div className="group relative ml-2">
                                <span className="material-symbols-outlined text-slate-400 text-sm cursor-help">info</span>
                                {editedCompany.profile?.logistics?.incoterm && INCOTERM_DESCRIPTIONS[editedCompany.profile.logistics.incoterm] && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded shadow-lg w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                        {INCOTERM_DESCRIPTIONS[editedCompany.profile.logistics.incoterm]}
                                    </div>
                                )}
                            </div>
                        </div>
                        <CustomSelect 
                            value={editedCompany.profile?.logistics?.incoterm || ''} 
                            onChange={(val) => handleChange('profile.logistics.incoterm', val)} 
                            options={incotermOptions} 
                        />
                    </div>

                    <Select label="Responsable del Flete" value={editedCompany.profile?.logistics?.freightResponsible || ''} onChange={(val) => handleChange('profile.logistics.freightResponsible', val)} options={['Nosotros', 'Cliente']} />
                </Section>
            </FormBlock>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Editar Cliente: {editedCompany.name}</h2>
                <div className="flex gap-2">
                    <button onClick={() => navigate(`/crm/clients/${id}`)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {['General', 'Perfil', 'Actividad', 'Notas'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as Tab)}
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
                {activeTab === 'Actividad' && <ActivityFeed activities={activities} usersMap={usersMap} />}
                {activeTab === 'Notas' && <NotesSection entityId={id || ''} entityType="company" notes={notes} onNoteAdded={handleNoteAdded} />}
            </div>
        </div>
    );
};

export default EditClientPage;
