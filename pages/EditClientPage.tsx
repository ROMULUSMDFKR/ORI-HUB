import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Company, Address, Stakeholder, CompanyPipelineStage, ActivityLog, Note } from '../types';
import { useDoc } from '../hooks/useDoc';
import Spinner from '../components/ui/Spinner';
import { APPROVAL_CRITERIA_OPTIONS, COMMUNICATION_CHANNELS, EQUIPMENT_OPTIONS, FORMALITY_OPTIONS, INCOTERM_OPTIONS, PAYMENT_TERM_OPTIONS, PREFERRED_DAYS_OPTIONS, PRESENTATION_OPTIONS, PURCHASE_FREQUENCY_OPTIONS, PURCHASE_TYPE_OPTIONS, QUOTE_FORMAT_OPTIONS, REQUIRED_DOCS_OPTIONS, SLA_OPTIONS, TONE_OPTIONS, ACCESS_RESTRICTIONS_OPTIONS } from '../constants';
import { MOCK_ACTIVITIES, MOCK_NOTES, MOCK_USERS } from '../data/mockData';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';

type Tab = 'General' | 'Perfil' | 'Actividad' | 'Notas';

// Reusable Form Components
const FormBlock: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">{title}</h3>
        <div className="space-y-6">{children}</div>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </div>
);

const Input: React.FC<{ label: string; value: string | number; onChange: (val: any) => void; type?: string, required?: boolean }> = ({ label, value, onChange, type = 'text', required=false }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}{required && <span className="text-red-500">*</span>}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1 block w-full" />
    </div>
);

const Select: React.FC<{ label: string; value: string; onChange: (val: any) => void; options: readonly string[] }> = ({ label, value, onChange, options }) => (
    <CustomSelect label={label} value={value} onChange={onChange} options={options.map(opt => ({ value: opt, name: opt }))} />
);

const Toggle: React.FC<{ label: string; enabled: boolean; onToggle: (val: boolean) => void; }> = ({ label, enabled, onToggle }) => (
    <div className="flex items-center justify-between col-span-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <button type="button" onClick={() => onToggle(!enabled)} className={`${enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
            <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
        </button>
    </div>
);

const ActivityFeed: React.FC<{ companyId: string }> = ({ companyId }) => {
    const activities = MOCK_ACTIVITIES.filter(a => a.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
                                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">{iconMap[activity.type]}</span>
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                        <div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {activity.description} por <span className="font-medium text-slate-900 dark:text-slate-200">{MOCK_USERS[activity.userId]?.name}</span>
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

const EditClientPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [activeTab, setActiveTab] = useState<Tab>('General');
    const { data: company, loading, error } = useDoc<Company>('companies', id || '');
    const [notes, setNotes] = useState(MOCK_NOTES.filter(n => n.companyId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

    const handleNoteAdded = (note: Note) => {
        setNotes(prev => [note, ...prev]);
    }

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !company) return <div className="text-center p-12">Empresa no encontrada</div>;

    const renderGeneralTab = () => (
        <div className="space-y-6">
            <FormBlock title="Información del Cliente">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Nombre / Razón Social" value={company.name} onChange={() => {}} required />
                    <Input label="Nombre corto (alias)" value={company.shortName || ''} onChange={() => {}} />
                    <Input label="RFC" value={company.rfc || ''} onChange={() => {}} />
                    <Select label="Industria" value={company.industry || ''} onChange={() => {}} options={['Industrial', 'Agricultura', 'Transporte', 'Construcción']} />
                    <Select label="Responsable Principal" value={company.ownerId || ''} onChange={() => {}} options={['Natalia', 'David']} />
                    <Select label="Prioridad" value={company.priority || ''} onChange={() => {}} options={['Alta', 'Media', 'Baja']} />
                    <Select label="Etapa del Cliente" value={company.stage || ''} onChange={() => {}} options={Object.values(CompanyPipelineStage)} />
                    <Input label="Sitio Web" value={company.website || ''} onChange={() => {}} />
                </div>
            </FormBlock>
            <FormBlock title="Contacto Principal">
                 <p className="text-sm text-slate-500 -mt-4 mb-4">Este contacto principal se llena cuando los campos crea también un contacto asociado inmediatamente</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input label="Nombre" value={company.primaryContact?.name || ''} onChange={() => {}} />
                    <Input label="Email" value={company.primaryContact?.email || ''} onChange={() => {}} type="email"/>
                    <Input label="Teléfono" value={company.primaryContact?.phone || ''} onChange={() => {}} type="tel"/>
                </div>
            </FormBlock>
            <FormBlock title="Direcciones de Entrega">
                {company.deliveryAddresses.map((addr, index) => (
                    <div key={addr.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg relative">
                        {index > 0 && <hr className="my-4"/>}
                        <div className="absolute top-4 right-4 flex items-center">
                           <span className="mr-2 text-sm font-medium text-green-700">Principal</span>
                           <Toggle label="" enabled={addr.isPrincipal} onToggle={()=>{}} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Calle y Número" value={addr.street} onChange={() => {}} />
                            <Input label="Ciudad" value={addr.city} onChange={() => {}} />
                            <Input label="Estado" value={addr.state} onChange={() => {}} />
                            <Input label="Código Postal" value={addr.zip} onChange={() => {}} />
                        </div>
                    </div>
                ))}
                <button className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center mt-4">
                    <span className="material-symbols-outlined mr-1 text-lg">add_circle</span>
                    Añadir otra dirección
                </button>
            </FormBlock>
        </div>
    );
    
    const renderProfileTab = () => (
         <div className="space-y-6">
            <FormBlock title="Preferencias de Comunicación">
                <Section title="">
                    <Select label="Canal Preferido" value={company.profile?.communication?.channel || ''} onChange={()=>{}} options={COMMUNICATION_CHANNELS} />
                    <Input label="Horario Preferido" value={company.profile?.communication?.time || ''} onChange={()=>{}} />
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Días Preferidos</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {PREFERRED_DAYS_OPTIONS.map(day => (
                                <span key={day} className={`px-3 py-1 text-sm rounded-full cursor-pointer ${company.profile?.communication?.days.includes(day) ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    {day}
                                </span>
                            ))}
                        </div>
                    </div>
                    <Toggle label="Disponibilidad de contacto" enabled={company.profile?.communication?.isAvailable ?? false} onToggle={()=>{}} />
                </Section>
                 <Section title="Tono y Formalidad">
                    <Select label="Idioma/Tono" value={company.profile?.communication?.tone || ''} onChange={()=>{}} options={TONE_OPTIONS} />
                    <Select label="Formalidad" value={company.profile?.communication?.formality || ''} onChange={()=>{}} options={FORMALITY_OPTIONS} />
                    <Select label="Tiempo de Respuesta Esperado (SLA)" value={company.profile?.communication?.sla || ''} onChange={()=>{}} options={SLA_OPTIONS} />
                    <Select label="Formato Cotización Preferido" value={company.profile?.communication?.quoteFormat || ''} onChange={()=>{}} options={QUOTE_FORMAT_OPTIONS} />
                </Section>
            </FormBlock>

            <FormBlock title="Mapa de Decisión">
                <div className="col-span-2 space-y-2">
                    {company.profile?.decisionMap?.map(s => (
                        <div key={s.id} className="grid grid-cols-4 gap-4 items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                           <p className="text-sm font-semibold">{s.name}</p>
                           <p className="text-sm">{s.role}</p>
                           <p className="text-sm">{s.power}</p>
                           <p className="text-sm">{s.contact}</p>
                        </div>
                    ))}
                    <button className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center mt-4">
                        <span className="material-symbols-outlined mr-1 text-lg">add_circle</span>
                        Añadir Stakeholder
                    </button>
                </div>
            </FormBlock>
            
            <FormBlock title="Proceso de Compra">
                <Section title="">
                    <Toggle label="Requiere OC" enabled={company.profile?.purchaseProcess?.requiresOC ?? false} onToggle={()=>{}} />
                    <Toggle label="Registro Proveedor" enabled={company.profile?.purchaseProcess?.requiresSupplierRegistry ?? false} onToggle={()=>{}} />
                    <Toggle label="Licitación" enabled={company.profile?.purchaseProcess?.isTender ?? false} onToggle={()=>{}} />
                </Section>
                 <Section title="Detalles del Proceso">
                    <Select label="Documentos Requeridos" value={''} onChange={()=>{}} options={REQUIRED_DOCS_OPTIONS} />
                    <Select label="Criterios de Aprobación" value={''} onChange={()=>{}} options={APPROVAL_CRITERIA_OPTIONS} />
                    <Select label="Término de Pago" value={company.profile?.purchaseProcess?.paymentTerm || ''} onChange={()=>{}} options={PAYMENT_TERM_OPTIONS} />
                    <Input label="Presupuesto" value={company.profile?.purchaseProcess?.budget || 0} onChange={()=>{}} type="number" />
                    <Select label="Tipo de Compra" value={company.profile?.purchaseProcess?.purchaseType || ''} onChange={()=>{}} options={PURCHASE_TYPE_OPTIONS} />
                </Section>
            </FormBlock>

            <FormBlock title="Caso de uso y Especificaciones">
                 <Section title="">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Aplicación</label>
                        <textarea value={company.profile?.useCase?.application || ''} onChange={() => {}} rows={3} />
                    </div>
                    <Select label="Productos de Interés" value={''} onChange={()=>{}} options={[]} />
                    <Select label="Presentación" value={company.profile?.useCase?.presentation || ''} onChange={()=>{}} options={PRESENTATION_OPTIONS} />
                    <Select label="Frecuencia de Compra" value={company.profile?.useCase?.frequency || ''} onChange={()=>{}} options={PURCHASE_FREQUENCY_OPTIONS} />
                    <Input label="Consumo Mensual Estimado" value={company.profile?.useCase?.monthlyConsumption || 0} onChange={()=>{}} type="number" />
                </Section>
            </FormBlock>
            
             <FormBlock title="Logística Operativa">
                 <Section title="">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Punto(s) de Entrega</label>
                        <textarea value={company.profile?.logistics?.deliveryPoints || ''} onChange={() => {}} rows={2} />
                    </div>
                    <Input label="Ventana de Descarga" value={company.profile?.logistics?.downloadWindow || ''} onChange={()=>{}} />
                    <Select label="Equipo en Sitio" value={''} onChange={()=>{}} options={EQUIPMENT_OPTIONS} />
                    <Select label="Restricciones de Acceso" value={''} onChange={()=>{}} options={ACCESS_RESTRICTIONS_OPTIONS} />
                    <Select label="Incoterm" value={company.profile?.logistics?.incoterm || ''} onChange={()=>{}} options={INCOTERM_OPTIONS} />
                    <Select label="Responsable del Flete" value={company.profile?.logistics?.freightResponsible || ''} onChange={()=>{}} options={['Nosotros', 'Cliente']} />
                </Section>
            </FormBlock>
             <FormBlock title="Disparadores y Timing">
                <Section title="">
                    <Input label="Punto de Reposición" value={company.profile?.triggers?.restockPoint || ''} onChange={()=>{}} />
                    <Input label="Tiempo de Entrega Máximo (días)" value={company.profile?.triggers?.maxDeliveryTime || 0} onChange={()=>{}} type="number" />
                </Section>
            </FormBlock>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Cliente: {company.shortName || company.name}</h2>
                </div>
                 <button className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined mr-2 text-base">save</span>
                    Guardar Cambios
                </button>
            </div>
            
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('General')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'General' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        General
                    </button>
                    <button onClick={() => setActiveTab('Perfil')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'Perfil' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        Perfil
                    </button>
                     <button onClick={() => setActiveTab('Actividad')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'Actividad' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        Actividad
                    </button>
                    <button onClick={() => setActiveTab('Notas')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'Notas' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        Notas
                    </button>
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'General' && renderGeneralTab()}
                {activeTab === 'Perfil' && renderProfileTab()}
                {activeTab === 'Actividad' && <ActivityFeed companyId={company.id} />}
                {activeTab === 'Notas' && (
                    <NotesSection 
                        entityId={company.id}
                        entityType="company"
                        notes={notes}
                        onNoteAdded={handleNoteAdded}
                    />
                )}
            </div>
        </div>
    );
};

export default EditClientPage;
