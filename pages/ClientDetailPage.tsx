import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Company, Note, ActivityLog, Contact, SalesOrder, SalesOrderStatus, CompanyPipelineStage, Quote, Sample, QuoteStatus, SampleStatus, User } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { GoogleGenAI } from '@google/genai';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
import { COMPANIES_PIPELINE_COLUMNS } from '../constants';


// --- Reusable UI Components ---

const WavyBg: React.FC = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 150" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full opacity-10">
      <path d="M-50,20 C100,100 200,-50 350,50 L350,150 L-50,150 Z" fill="currentColor" />
      <path d="M-50,50 C100,-50 200,100 350,20 L350,150 L-50,150 Z" fill="currentColor" opacity="0.5"/>
    </svg>
);

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n').map((line, i) => {
        const boldedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith('### ')) return <h3 key={i} className="text-md font-semibold mt-4 mb-2">{boldedLine.substring(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{boldedLine.substring(3)}</h2>;
        if (line.startsWith('- ')) return <li key={i} className="list-disc ml-5" dangerouslySetInnerHTML={{ __html: boldedLine.substring(2) }}></li>;
        if (line.match(/^\d+\. /)) return <li key={i} className="list-decimal ml-5" dangerouslySetInnerHTML={{ __html: boldedLine.substring(line.indexOf(' ') + 1) }}></li>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} dangerouslySetInnerHTML={{ __html: boldedLine }} />;
    });

    return <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-200 space-y-2">{lines}</div>;
};

const SuggestionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl m-4 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Cerrar">
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">close</span>
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

const AlertsPanel: React.FC<{ alerts: string[] }> = ({ alerts }) => {
    if (alerts.length === 0) return null;
    return (
        <div className="bg-yellow-50 dark:bg-yellow-500/10 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex">
                <div className="flex-shrink-0">
                    <span className="material-symbols-outlined text-yellow-500">warning</span>
                </div>
                <div className="ml-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold">Alertas Inteligentes</p>
                    <ul className="list-disc ml-5 mt-1">
                        {alerts.map((alert, index) => (
                           <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">{alert}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
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

const HubItem: React.FC<{ item: any, type: 'quote' | 'sales-order' | 'sample', onStatusChange: (itemId: string, newStatus: any) => void }> = ({ item, type, onStatusChange }) => {
    let title = '', link = '#', options: {value: string, name: string}[] = [];
    if (type === 'quote') { 
        title = item.folio; 
        link=`/hubs/quotes/${item.id}`; 
        options = Object.values(QuoteStatus).map(s => ({value: s, name: s})); 
    }
    if (type === 'sales-order') { 
        title = item.id; 
        link=`/hubs/sales-orders/${item.id}`; 
        options = Object.values(SalesOrderStatus).map(s => ({value: s, name: s})); 
    }
    if (type === 'sample') { 
        title = item.name; 
        link=`/hubs/samples/${item.id}`; 
        options = Object.values(SampleStatus).map(s => ({value: s, name: s})); 
    }

    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
            <Link to={link} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{title}</Link>
            <div className="w-36">
                <CustomSelect 
                    options={options} 
                    value={item.status} 
                    onChange={(newStatus) => onStatusChange(item.id, newStatus)}
                    buttonClassName="w-full text-xs font-medium rounded-md px-2 py-1 border-none focus:ring-0 appearance-none bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                    dropdownClassName="w-40"
                />
            </div>
        </div>
    )
};


const ClientDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: initialCompany, loading: companyLoading, error } = useDoc<Company>('companies', id || '');
    const { data: allContacts } = useCollection<Contact>('contacts');
    const { data: allSalesOrders } = useCollection<SalesOrder>('salesOrders');
    const { data: allActivities } = useCollection<ActivityLog>('activities');
    const { data: allNotes } = useCollection<Note>('notes');
    const { data: allQuotes } = useCollection<Quote>('quotes');
    const { data: allSamples } = useCollection<Sample>('samples');
    const { data: users, loading: usersLoading } = useCollection<User>('users');


    const [company, setCompany] = useState<Company | null>(null);
    const [currentStage, setCurrentStage] = useState<CompanyPipelineStage | undefined>();

    useEffect(() => {
        if(initialCompany) {
            setCompany(initialCompany);
            setCurrentStage(initialCompany.stage);
        }
    }, [initialCompany]);
    
    const handleSaveStatus = () => {
        if (currentStage && company) {
            setCompany(c => c ? { ...c, stage: currentStage } : null);
            alert('Estado de la empresa guardado.');
        }
    };

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);

    const { activities, contacts, salesOrders, totalRevenue, lastActivityDate, notes, quotes, samples } = useMemo(() => {
        if (!id) return { activities: [], contacts: [], salesOrders: [], totalRevenue: 0, lastActivityDate: null, notes: [], quotes: [], samples: [] };
        
        const filteredActivities = (allActivities || [])
            .filter(a => a.companyId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const filteredContacts = (allContacts || []).filter(c => c.companyId === id);

        const filteredSalesOrders = (allSalesOrders || [])
            .filter(so => so.companyId === id && so.status !== SalesOrderStatus.Cancelada)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const filteredNotes = (allNotes || [])
            .filter(n => n.companyId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const filteredQuotes = (allQuotes || []).filter(q => q.companyId === id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const filteredSamples = (allSamples || []).filter(s => s.companyId === id).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

        const revenue = filteredSalesOrders.reduce((sum, so) => sum + so.total, 0);
        const lastActivity = filteredActivities[0]?.createdAt ? new Date(filteredActivities[0].createdAt) : null;

        return { activities: filteredActivities, contacts: filteredContacts, salesOrders: filteredSalesOrders, totalRevenue: revenue, lastActivityDate: lastActivity, notes: filteredNotes, quotes: filteredQuotes, samples: filteredSamples };
    }, [id, allActivities, allContacts, allSalesOrders, allNotes, allQuotes, allSamples]);

    const handleNoteAdded = (note: Note) => {
        if (allNotes) {
            (allNotes as Note[]).unshift(note);
            setCompany(prev => prev ? { ...prev } : null);
        }
    };
    
    const handleHubItemStatusChange = (itemId: string, newStatus: any, type: string) => {
        // This is a simulation. In a real app, you would update the state in your data store.
        console.log(`Updating ${type} ${itemId} to status ${newStatus}`);
        alert(`Estado actualizado a ${newStatus} (simulación).`);
    };


    if (companyLoading || usersLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !company) return <div className="text-center p-12">Cliente no encontrado</div>;
    
    const ownerName = usersMap.get(company.ownerId) || 'N/A';
    const stageOptions = COMPANIES_PIPELINE_COLUMNS.map(s => ({ value: s.stage, name: s.stage }));

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{company.shortName || company.name}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{company.name}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-48">
                        <CustomSelect 
                            options={stageOptions}
                            value={currentStage || ''}
                            onChange={(newStage) => setCurrentStage(newStage as CompanyPipelineStage)}
                        />
                    </div>
                    <button onClick={handleSaveStatus} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">
                        Guardar
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                     <InfoCard title="Contactos">
                        {contacts.length > 0 ? (
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                {contacts.map(contact => (
                                    <li key={contact.id} className="py-3 flex items-center space-x-4">
                                        <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">person</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{contact.name}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{contact.role}</p>
                                        </div>
                                        <a href={`mailto:${contact.email}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">{contact.email}</a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No hay contactos asociados.</p>
                        )}
                    </InfoCard>

                    <NotesSection 
                        entityId={company.id}
                        entityType="company"
                        notes={notes}
                        onNoteAdded={handleNoteAdded}
                    />
                </div>

                {/* Right Sidebar */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                    <InfoCard title="Detalles">
                        <InfoRow label="Responsable" value={ownerName} />
                        <InfoRow label="Industria" value={company.industry || 'N/A'} />
                        <InfoRow label="Prioridad" value={<Badge text={company.priority} color={company.priority === 'Alta' ? 'red' : company.priority === 'Media' ? 'yellow' : 'gray'} />} />
                    </InfoCard>
                    <InfoCard title="Cotizaciones">
                        {quotes.map(q => <HubItem key={q.id} item={q} type="quote" onStatusChange={(id, status) => handleHubItemStatusChange(id, status, 'quote')} />)}
                    </InfoCard>
                     <InfoCard title="Órdenes de Venta">
                        {salesOrders.map(so => <HubItem key={so.id} item={so} type="sales-order" onStatusChange={(id, status) => handleHubItemStatusChange(id, status, 'sales-order')} />)}
                    </InfoCard>
                     <InfoCard title="Muestras">
                        {samples.map(s => <HubItem key={s.id} item={s} type="sample" onStatusChange={(id, status) => handleHubItemStatusChange(id, status, 'sample')} />)}
                    </InfoCard>
                </div>
            </div>
        </div>
    );
};

export default ClientDetailPage;