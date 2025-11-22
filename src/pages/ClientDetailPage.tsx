
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Company, Note, ActivityLog, Contact, SalesOrder, SalesOrderStatus, CompanyPipelineStage, Quote, Sample, QuoteStatus, SampleStatus, User, Address } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
import { COMPANIES_PIPELINE_COLUMNS } from '../constants';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import ContactDrawer from '../components/crm/ContactDrawer';

// --- Reusable UI Components ---

const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string, action?: React.ReactNode }> = ({ title, children, className, action }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            {action}
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
        <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="col-span-2 text-slate-800 dark:text-slate-200 font-semibold text-right">{value}</dd>
    </div>
);

const HubItem: React.FC<{ item: any, type: 'quote' | 'sales-order' | 'sample', onStatusChange: (itemId: string, newStatus: any, type: string) => void }> = ({ item, type, onStatusChange }) => {
    let title = '', link = '#', options: {value: string, name: string}[] = [];
    if (type === 'quote') { 
        title = item.folio; 
        link=`/hubs/quotes/${item.id}`; 
        options = Object.values(QuoteStatus).map(s => ({value: s as string, name: s as string})); 
    }
    if (type === 'sales-order') { 
        title = item.id; 
        link=`/hubs/sales-orders/${item.id}`; 
        options = Object.values(SalesOrderStatus).map(s => ({value: s as string, name: s as string})); 
    }
    if (type === 'sample') { 
        title = item.name; 
        link=`/hubs/samples/${item.id}`; 
        options = Object.values(SampleStatus).map(s => ({value: s as string, name: s as string})); 
    }

    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
            <Link to={link} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{title}</Link>
            <div className="w-36">
                <CustomSelect 
                    options={options} 
                    value={item.status} 
                    onChange={(newStatus) => onStatusChange(item.id, newStatus, type)}
                    buttonClassName="w-full text-xs font-medium rounded-md px-2 py-1 border-none focus:ring-0 appearance-none bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                    dropdownClassName="w-40"
                />
            </div>
        </div>
    )
};

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
        <InfoCard title="Historial de Actividad" className="h-full">
            {activities.length > 0 ? (
                 <ul className="space-y-0 relative">
                     <div className="absolute top-0 bottom-0 left-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                     {activities.map((activity, index) => {
                        const author = usersMap.get(activity.userId);
                        const isSystem = activity.userId === 'system';
                        return (
                            <li key={activity.id} className="relative pl-10 py-4 first:pt-0 last:pb-0">
                                <div className={`absolute left-0 top-4 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-800 ${isSystem ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <span className="material-symbols-outlined !text-sm">{iconMap[activity.type] || 'circle'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{activity.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        {isSystem ? 'Sistema' : author?.name || 'Usuario desconocido'} &bull; {new Date(activity.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </li>
                        )
                     })}
                 </ul>
            ) : (
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8">No hay actividades registradas para esta empresa.</p>
            )}
        </InfoCard>
    );
};

// New Component for Profile Read-Only View
const ProfileView: React.FC<{ company: Company }> = ({ company }) => {
    const { profile } = company;
    if (!profile) return <p className="text-slate-500 text-center py-8">No hay información de perfil disponible.</p>;

    const openMap = (addr: Address) => {
        const query = `${addr.street}, ${addr.city}, ${addr.state}, ${addr.zip}`;
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    };
    
    // Helper for array display
    const displayArray = (arr: string | string[] | undefined) => {
        if (Array.isArray(arr)) return arr.join(', ') || '-';
        return arr || '-';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Comunicación">
                <InfoRow label="Canal Preferido" value={displayArray(profile.communication?.channel)} />
                <InfoRow label="Horario" value={profile.communication?.time || '-'} />
                <InfoRow label="Días Preferidos" value={displayArray(profile.communication?.days)} />
                <InfoRow label="Tono" value={profile.communication?.tone || '-'} />
                <InfoRow label="Formalidad" value={profile.communication?.formality || '-'} />
                <InfoRow label="SLA" value={profile.communication?.sla || '-'} />
            </InfoCard>

            <InfoCard title="Logística y Entregas">
                 <div className="mb-4">
                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Direcciones de Entrega</h5>
                    {company.deliveryAddresses && company.deliveryAddresses.length > 0 ? (
                        <div className="space-y-2">
                            {company.deliveryAddresses.map((addr, index) => (
                                <div key={index} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600">
                                    <div className="flex justify-between items-start">
                                        <div className="text-sm">
                                            {addr.label && <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs block mb-0.5">{addr.label}</span>}
                                            <p className="text-slate-700 dark:text-slate-300">{addr.street}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{addr.city}, {addr.state} {addr.zip}</p>
                                        </div>
                                        <button 
                                            onClick={() => openMap(addr)} 
                                            className="text-red-500 hover:text-red-600 dark:hover:text-red-400 p-1"
                                            title="Ver en Mapa"
                                        >
                                            <span className="material-symbols-outlined text-lg">location_on</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 italic">Sin direcciones de entrega registradas.</p>
                    )}
                </div>

                <InfoRow label="Ventana Descarga" value={profile.logistics?.downloadWindow || '-'} />
                <InfoRow label="Restricciones" value={displayArray(profile.logistics?.accessRestrictions)} />
                <InfoRow label="Equipo en Sitio" value={displayArray(profile.logistics?.equipmentOnSite)} />
                <InfoRow label="Incoterm" value={profile.logistics?.incoterm || '-'} />
                <InfoRow label="Flete" value={profile.logistics?.freightResponsible || '-'} />
                 <div className="mt-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Puntos de Entrega (Notas)</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200 mt-1">{profile.logistics?.deliveryPoints || '-'}</p>
                </div>
            </InfoCard>

            <InfoCard title="Proceso de Compra">
                <InfoRow label="Requiere OC" value={profile.purchaseProcess?.requiresOC ? 'Sí' : 'No'} />
                <InfoRow label="Registro Proveedor" value={profile.purchaseProcess?.requiresSupplierRegistry ? 'Sí' : 'No'} />
                <InfoRow label="Licitación" value={profile.purchaseProcess?.isTender ? 'Sí' : 'No'} />
                <InfoRow label="Término de Pago" value={profile.purchaseProcess?.paymentTerm || '-'} />
                <InfoRow 
                    label="Presupuesto Estimado" 
                    value={
                        profile.purchaseProcess?.budget 
                        ? `${profile.purchaseProcess.budget.toLocaleString()} ${profile.purchaseProcess.budgetUnit ? `(${profile.purchaseProcess.budgetUnit})` : ''}`
                        : '-'
                    } 
                />
                <InfoRow label="Tipo Compra" value={profile.purchaseProcess?.purchaseType || '-'} />
            </InfoCard>

            <InfoCard title="Caso de Uso">
                <div className="mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Aplicación</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200 mt-1">{profile.useCase?.application || '-'}</p>
                </div>
                <InfoRow label="Presentación" value={displayArray(profile.useCase?.presentation)} />
                <InfoRow label="Frecuencia" value={profile.useCase?.frequency || '-'} />
                <InfoRow label="Consumo Mensual" value={profile.useCase?.monthlyConsumption ? `${profile.useCase.monthlyConsumption} tons` : '-'} />
            </InfoCard>
        </div>
    );
};

const ClientDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: company, loading: cLoading, error } = useDoc<Company>('companies', id || '');
    const { data: allNotes, loading: nLoading } = useCollection<Note>('notes');
    const { data: allActivities, loading: aLoading } = useCollection<ActivityLog>('activities');
    const { data: contacts, loading: contactsLoading } = useCollection<Contact>('contacts');
    const { data: quotes } = useCollection<Quote>('quotes');
    const { data: samples } = useCollection<Sample>('samples');
    const { data: salesOrders } = useCollection<SalesOrder>('salesOrders');
    const { data: users } = useCollection<User>('users');
    
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [currentStage, setCurrentStage] = useState<CompanyPipelineStage | undefined>();
    const [activeTab, setActiveTab] = useState<'Resumen' | 'Perfil Comercial' | 'Actividad'>('Resumen');
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();

    // Contact Drawer State
    const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);
    const [isEditingPrimary, setIsEditingPrimary] = useState(false);

    const loading = cLoading || nLoading || aLoading || contactsLoading;

    useEffect(() => {
        if (company) {
            setCurrentCompany(company);
            setCurrentStage(company.stage);
        }
    }, [company]);

    const companyNotes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes.filter(n => n.companyId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);
    
    const companyActivities = useMemo(() => {
        if (!allActivities || !id) return [];
        return allActivities.filter(a => a.companyId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allActivities, id]);

    const companyContacts = useMemo(() => contacts?.filter(c => c.companyId === id) || [], [contacts, id]);
    const companyQuotes = useMemo(() => quotes?.filter(q => q.companyId === id) || [], [quotes, id]);
    const companySamples = useMemo(() => samples?.filter(s => s.companyId === id) || [], [samples, id]);
    const companySalesOrders = useMemo(() => salesOrders?.filter(so => so.companyId === id) || [], [salesOrders, id]);
    // FIX: Añado un tipo explícito a useMemo para asegurar la inferencia correcta de tipos para `usersMap`.
    // Esto resuelve el error `Map<unknown, unknown>` y el error de acceso a `author.name`.
    const usersMap = useMemo(() => new Map<string, User>(users?.map(u => [u.id, u])), [users]);

    const owner = useMemo(() => usersMap.get(currentCompany?.ownerId || ''), [usersMap, currentCompany]);

    const handleNoteAdded = async (note: Note) => {
        try {
            await api.addDoc('notes', note);
            showToast('success', 'Nota guardada.');
        } catch(err) {
            console.error(err);
            showToast('error', 'Error al guardar nota.');
        }
    };

    const handleStatusChange = async () => {
        if (currentCompany && id && currentStage && currentStage !== currentCompany.stage) {
            try {
                await api.updateDoc('companies', id, { stage: currentStage });
                
                // Log activity
                const log: Omit<ActivityLog, 'id'> = {
                    companyId: id,
                    type: 'Cambio de Estado',
                    description: `Etapa cambiada de "${currentCompany.stage}" a "${currentStage}"`,
                    userId: currentUser?.id || 'system',
                    createdAt: new Date().toISOString()
                };
                await api.addDoc('activities', log);

                showToast('success', 'Etapa del cliente actualizada.');
                setCurrentCompany(prev => prev ? { ...prev, stage: currentStage } : null);
            } catch (error) {
                console.error("Error updating stage:", error);
                showToast('error', "Error al actualizar la etapa.");
            }
        }
    };
    
    const handleHubStatusChange = async (itemId: string, newStatus: any, type: string) => {
        try {
            let collection = '';
            if (type === 'quote') collection = 'quotes';
            if (type === 'sales-order') collection = 'salesOrders';
            if (type === 'sample') collection = 'samples';
            
            if (collection) {
                await api.updateDoc(collection, itemId, { status: newStatus });
                showToast('success', 'Estado actualizado.');
            }
        } catch(e) {
            console.error(e);
            showToast('error', 'Error al actualizar estado.');
        }
    }
    
    const openFiscalMap = () => {
        if (!currentCompany?.fiscalAddress) return;
        const { street, city, state, zip } = currentCompany.fiscalAddress;
        const query = `${street}, ${city}, ${state}, ${zip}`;
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    };

    // --- Contact Management Logic ---

    const handleOpenAddContact = () => {
        setEditingContact({ companyId: id, ownerId: currentUser?.id });
        setIsEditingPrimary(false);
        setIsContactDrawerOpen(true);
    };

    const handleOpenEditPrimary = () => {
        if (!currentCompany) return;
        const primary = currentCompany.primaryContact;
        setEditingContact({
            name: primary?.name || '',
            email: primary?.email || '',
            phone: primary?.phone || '',
            emails: primary?.emails || (primary?.email ? [primary.email] : []),
            phones: primary?.phones || (primary?.phone ? [primary.phone] : []),
            role: 'Contacto Principal', // Default role for primary
            companyId: id,
            ownerId: currentUser?.id
        });
        setIsEditingPrimary(true);
        setIsContactDrawerOpen(true);
    };

    const handleSaveContact = async (contactData: Contact) => {
        if (!id || !currentCompany) return;

        // Ensure no undefined values are passed to Firestore
        const safeContactData = {
            ...contactData,
            companyId: id,
            ownerId: contactData.ownerId || currentUser?.id || 'system',
            emails: contactData.emails || [],
            phones: contactData.phones || [],
            email: contactData.email || '',
            phone: contactData.phone || '',
        };

        try {
            if (isEditingPrimary) {
                // 1. Update Company Document - Primary Contact Embed
                // FIX: Aseguro que `updatedPrimary` sea un objeto `Contact` completo para cumplir con la firma del tipo.
                const updatedPrimary: Contact = {
                    // Empiezo con propiedades base para asegurar que todos los campos existan
                    ...(currentCompany.primaryContact || { id: `contact-${Date.now()}`, role: 'Contacto Principal' }),
                    ...safeContactData,
                };
                
                await api.updateDoc('companies', id, { primaryContact: updatedPrimary });
                setCurrentCompany(prev => prev ? { ...prev, primaryContact: updatedPrimary } : null);
                
                // 2. Sync with Contacts Collection
                const existingContact = contacts?.find(c => c.companyId === id && (c.email === safeContactData.email || (safeContactData.emails && c.emails && c.emails.some(e => safeContactData.emails?.includes(e)))));
                
                if (existingContact) {
                    await api.updateDoc('contacts', existingContact.id, {
                        ...safeContactData,
                        id: undefined // Don't overwrite Firestore ID
                    });
                } else {
                    await api.addDoc('contacts', safeContactData);
                }
                
                showToast('success', 'Contacto principal actualizado y sincronizado.');

            } else {
                // Adding a secondary contact directly to collection
                await api.addDoc('contacts', safeContactData);
                showToast('success', 'Contacto añadido.');
            }
            
            setIsContactDrawerOpen(false);

        } catch (error) {
            console.error("Error saving contact:", error);
            showToast('error', 'Error al guardar el contacto.');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !currentCompany) return <div className="text-center p-12">Empresa no encontrada</div>;

    const stageOptions = Object.values(CompanyPipelineStage).map(s => ({ value: s, name: s }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{currentCompany.name}</h1>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {currentCompany.industry && <span>{currentCompany.industry}</span>}
                        {currentCompany.website && (
                            <>
                                <span>•</span>
                                <a href={currentCompany.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{currentCompany.website.replace(/^https?:\/\//, '')}</a>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="w-full md:w-48">
                        <CustomSelect options={stageOptions} value={currentStage || ''} onChange={(val) => setCurrentStage(val as CompanyPipelineStage)} />
                    </div>
                    <button onClick={handleStatusChange} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">
                        Guardar
                    </button>
                    <Link to={`/crm/clients/${id}/edit`} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 h-[42px] flex items-center">
                        <span className="material-symbols-outlined mr-2 text-base">edit</span>
                        Editar
                    </Link>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {['Resumen', 'Perfil Comercial', 'Actividad'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
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
                {activeTab === 'Resumen' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* KPI Row */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Cotizaciones</p>
                                    <p className="text-2xl font-bold text-indigo-600">{companyQuotes.length}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Órdenes</p>
                                    <p className="text-2xl font-bold text-green-600">{companySalesOrders.length}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Muestras</p>
                                    <p className="text-2xl font-bold text-amber-500">{companySamples.length}</p>
                                </div>
                            </div>
                            
                            {/* Hubs Section */}
                            <div className="space-y-6">
                                <InfoCard title="Cotizaciones Recientes">
                                    {companyQuotes.length > 0 ? companyQuotes.slice(0,3).map(q => <HubItem key={q.id} item={q} type="quote" onStatusChange={handleHubStatusChange} />) : <p className="text-sm text-slate-400">Sin cotizaciones</p>}
                                </InfoCard>
                                <InfoCard title="Órdenes de Venta">
                                    {companySalesOrders.length > 0 ? companySalesOrders.slice(0,3).map(so => <HubItem key={so.id} item={so} type="sales-order" onStatusChange={handleHubStatusChange} />) : <p className="text-sm text-slate-400">Sin órdenes</p>}
                                </InfoCard>
                                <InfoCard title="Muestras">
                                    {companySamples.length > 0 ? companySamples.slice(0,3).map(s => <HubItem key={s.id} item={s} type="sample" onStatusChange={handleHubStatusChange} />) : <p className="text-sm text-slate-400">Sin muestras</p>}
                                </InfoCard>
                            </div>

                            <NotesSection 
                                entityId={id || ''}
                                entityType="company"
                                notes={companyNotes}
                                onNoteAdded={handleNoteAdded}
                            />
                        </div>

                        {/* Right Sidebar */}
                        <div className="lg:col-span-1 space-y-6">
                            <InfoCard 
                                title="Contacto Principal" 
                                action={
                                    <button onClick={handleOpenEditPrimary} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium">
                                        Editar / Sincronizar
                                    </button>
                                }
                            >
                                {currentCompany.primaryContact ? (
                                    <div className="space-y-2">
                                        <InfoRow label="Nombre" value={currentCompany.primaryContact.name || 'Sin nombre'} />
                                        
                                        {/* Display multiple emails */}
                                        <div className="flex justify-between items-start py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                                            <dt className="font-medium text-sm text-slate-500 dark:text-slate-400 mt-1">Emails</dt>
                                            <dd className="text-right flex flex-col gap-1 items-end">
                                                {currentCompany.primaryContact.emails && currentCompany.primaryContact.emails.length > 0 ? (
                                                    currentCompany.primaryContact.emails.map((e, i) => (
                                                        <a key={i} href={`mailto:${e}`} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{e}</a>
                                                    ))
                                                ) : (
                                                    currentCompany.primaryContact.email ? <a href={`mailto:${currentCompany.primaryContact.email}`} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{currentCompany.primaryContact.email}</a> : <span className="text-sm text-slate-400">-</span>
                                                )}
                                            </dd>
                                        </div>

                                        {/* Display multiple phones */}
                                        <div className="flex justify-between items-start py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                                            <dt className="font-medium text-sm text-slate-500 dark:text-slate-400 mt-1">Teléfonos</dt>
                                            <dd className="text-right flex flex-col gap-1 items-end">
                                                {currentCompany.primaryContact.phones && currentCompany.primaryContact.phones.length > 0 ? (
                                                    currentCompany.primaryContact.phones.map((p, i) => (
                                                        <span key={i} className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p}</span>
                                                    ))
                                                ) : (
                                                    currentCompany.primaryContact.phone ? <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{currentCompany.primaryContact.phone}</span> : <span className="text-sm text-slate-400">-</span>
                                                )}
                                            </dd>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No hay contacto principal asignado.</p>
                                )}
                            </InfoCard>

                            <InfoCard 
                                title="Personas de Contacto"
                                action={
                                    <button onClick={handleOpenAddContact} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined !text-sm">add</span> Agregar
                                    </button>
                                }
                            >
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                    {companyContacts.length > 0 ? companyContacts.map(contact => (
                                        <div key={contact.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600">
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{contact.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{contact.role}</p>
                                                <div className="flex gap-2 mt-1">
                                                    {contact.email && (
                                                        <a href={`mailto:${contact.email}`} className="text-indigo-400 hover:text-indigo-600" title={contact.email}>
                                                            <span className="material-symbols-outlined !text-sm">mail</span>
                                                        </a>
                                                    )}
                                                    {contact.phone && (
                                                         <a href={`tel:${contact.phone}`} className="text-green-500 hover:text-green-700" title={contact.phone}>
                                                            <span className="material-symbols-outlined !text-sm">call</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <Link to={`/crm/contacts/${contact.id}`} className="text-slate-400 hover:text-indigo-500 flex-shrink-0"><span className="material-symbols-outlined">visibility</span></Link>
                                        </div>
                                    )) : <p className="text-sm text-slate-400 italic">No hay contactos adicionales.</p>}
                                </div>
                            </InfoCard>

                            <InfoCard title="Información General">
                                <InfoRow label="Responsable" value={owner?.name || 'N/A'} />
                                <InfoRow label="RFC" value={currentCompany.rfc || 'N/A'} />
                                <InfoRow label="Prioridad" value={<Badge text={currentCompany.priority} />} />
                                <InfoRow label="Estado" value={<Badge text={currentCompany.isActive ? 'Activo' : 'Inactivo'} color={currentCompany.isActive ? 'green' : 'gray'} />} />
                                
                                {currentCompany.fiscalAddress && (currentCompany.fiscalAddress.street) && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Domicilio Fiscal</p>
                                                <p className="text-sm text-slate-800 dark:text-slate-200">{currentCompany.fiscalAddress.street}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {currentCompany.fiscalAddress.city}, {currentCompany.fiscalAddress.state} {currentCompany.fiscalAddress.zip}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={openFiscalMap}
                                                className="text-red-500 hover:text-red-600 dark:hover:text-red-400"
                                                title="Ver en Mapa"
                                            >
                                                <span className="material-symbols-outlined">location_on</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </InfoCard>
                        </div>
                    </div>
                ) : activeTab === 'Perfil Comercial' ? (
                    <ProfileView company={currentCompany} />
                ) : (
                    <ActivityFeed activities={companyActivities} usersMap={usersMap} />
                )}
            </div>

            <ContactDrawer 
                isOpen={isContactDrawerOpen}
                onClose={() => setIsContactDrawerOpen(false)}
                onSave={handleSaveContact}
                initialContact={editingContact}
                isPrimary={isEditingPrimary}
            />
        </div>
    );
};

export default ClientDetailPage;