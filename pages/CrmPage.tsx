import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Contact, Company, CompanyPipelineStage, Priority, Prospect, ProspectStage, User } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { MOCK_USERS } from '../data/mockData';

type CrmView = 'companies' | 'contacts' | 'prospects';

const CRM_VIEWS: { id: CrmView, name: string, icon: string, singular: string }[] = [
    { id: 'prospects', name: 'Prospectos', icon: 'person_search', singular: 'Prospecto' },
    { id: 'companies', name: 'Empresas', icon: 'apartment', singular: 'Empresa' },
    { id: 'contacts', name: 'Contactos', icon: 'contacts', singular: 'Contacto' },
];

const MasterList: React.FC<{ activeView: CrmView, setActiveView: (view: CrmView) => void, counts: Record<CrmView, number> }> = ({ activeView, setActiveView, counts }) => (
    <nav className="flex flex-col space-y-1">
        {CRM_VIEWS.map(view => (
            <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex items-center justify-between p-3 rounded-lg text-left transition-colors duration-200 ${activeView === view.id ? 'bg-primary text-on-primary font-semibold' : 'hover:bg-background text-on-surface'}`}
            >
                <div className="flex items-center">
                    <span className="material-symbols-outlined w-6 h-6 mr-3">{view.icon}</span>
                    <span>{view.name}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${activeView === view.id ? 'bg-black/10' : 'bg-gray-200 text-on-surface-secondary'}`}>
                    {counts[view.id] || 0}
                </span>
            </button>
        ))}
    </nav>
);

const CrmPage: React.FC = () => {
    const { data: companies, loading: compLoading, error: compError } = useCollection<Company>('companies');
    const { data: contacts, loading: coLoading, error: coError } = useCollection<Contact>('contacts');
    const { data: prospects, loading: pLoading, error: pError } = useCollection<Prospect>('prospects');
    
    const [searchParams, setSearchParams] = useSearchParams();
    const [filter, setFilter] = useState('');
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [ownerFilter, setOwnerFilter] = useState<string>('all');

    const activeView = (searchParams.get('view') as CrmView) || 'prospects';

    const setActiveView = (view: CrmView) => {
        setSearchParams({ view });
        setFilter('');
        setStageFilter('all');
        setPriorityFilter('all');
        setOwnerFilter('all');
    };
    
    const currentViewInfo = CRM_VIEWS.find(v => v.id === activeView)!;

    const dataMap = {
        companies: { data: companies, loading: compLoading, error: compError },
        contacts: { data: contacts, loading: coLoading, error: coError },
        prospects: { data: prospects, loading: pLoading, error: pError },
    };

    const counts: Record<CrmView, number> = {
        companies: companies?.length ?? 0,
        contacts: contacts?.length ?? 0,
        prospects: prospects?.length ?? 0,
    };
    
    const { data, loading, error } = dataMap[activeView];

    const getPriorityBadgeColor = (priority: Priority | Prospect['priority']) => {
        switch (priority) {
            case Priority.Alta: return 'red';
            case Priority.Media: return 'yellow';
            case Priority.Baja: return 'gray';
            default: return 'gray';
        }
    };

    const filteredData = useMemo(() => {
        if (!data) return [];
        
        let result = data;

        if (filter) {
            result = result.filter((item: any) => {
                const name = item.name || item.shortName;
                return name.toLowerCase().includes(filter.toLowerCase());
            });
        }

        if (activeView === 'companies' && result) {
            const companyResult = result as Company[];
            if (stageFilter !== 'all') {
                result = companyResult.filter(c => c.stage === stageFilter);
            }
            if (priorityFilter !== 'all') {
                result = (result as Company[]).filter(c => c.priority === priorityFilter);
            }
            if (ownerFilter !== 'all') {
                result = (result as Company[]).filter(c => c.ownerId === ownerFilter);
            }
        }

        if (activeView === 'prospects' && result) {
            const prospectResult = result as Prospect[];
            if (stageFilter !== 'all') {
                result = prospectResult.filter(p => p.stage === stageFilter);
            }
            if (priorityFilter !== 'all') {
                result = (result as Prospect[]).filter(p => p.priority === priorityFilter);
            }
            if (ownerFilter !== 'all') {
                result = (result as Prospect[]).filter(p => p.ownerId === ownerFilter);
            }
        }
        
        return result;
    }, [data, filter, stageFilter, priorityFilter, ownerFilter, activeView]);

    const companyColumns = useMemo(() => [
        { header: 'Nombre', accessor: (c: Company) => <Link to={`/crm/clients/${c.id}`} className="font-medium text-accent hover:underline">{c.shortName || c.name}</Link> },
        { header: 'Etapa', accessor: (c: Company) => <Badge text={c.stage} color="blue" /> },
        { header: 'Prioridad', accessor: (c: Company) => <Badge text={c.priority} color={getPriorityBadgeColor(c.priority)} /> },
        { 
            header: 'Responsable', 
            accessor: (c: Company) => {
                const owner = Object.values(MOCK_USERS).find(u => u.id === c.ownerId);
                return owner ? <img src={owner.avatarUrl} alt={owner.name} title={owner.name} className="w-8 h-8 rounded-full object-cover" /> : c.ownerId;
            } 
        },
    ], []);

    const prospectColumns = useMemo(() => [
        { header: 'NOMBRE', accessor: (p: Prospect) => <Link to={`/crm/prospects/${p.id}`} className="font-medium text-accent hover:underline">{p.name}</Link> },
        { header: 'ETAPA', accessor: (p: Prospect) => <Badge text={p.stage} color="blue" /> },
        { header: 'PRIORIDAD', accessor: (p: Prospect) => p.priority ? <Badge text={p.priority} color={getPriorityBadgeColor(p.priority)} /> : '-' },
        { header: 'VALOR EST.', accessor: (p: Prospect) => `$${p.estValue.toLocaleString('en-US')}`, className: 'text-left' },
        { 
            header: 'RESPONSABLE', 
            accessor: (p: Prospect) => {
                const owner = Object.values(MOCK_USERS).find(u => u.id === p.ownerId);
                return owner ? owner.name : p.ownerId;
            } 
        },
    ], []);

    const contactColumns = useMemo(() => {
        const companyMap = new Map(companies?.map(c => [c.id, c.shortName || c.name]));
        return [
            { header: 'Nombre', accessor: (c: Contact) => <span className="font-medium">{c.name}</span> },
            { header: 'Cargo', accessor: (c: Contact) => c.role || '-' },
            { header: 'Email', accessor: (c: Contact) => <a href={`mailto:${c.email}`} className="text-accent hover:underline">{c.email}</a> || '-' },
            { header: 'Teléfono', accessor: (c: Contact) => c.phone || '-' },
            { 
                header: 'Empresa Asociada', 
                accessor: (c: Contact) => {
                    const companyName = c.companyId ? companyMap.get(c.companyId) : null;
                    return companyName ? 
                        <Link to={`/crm/clients/${c.companyId}`} className="text-accent hover:underline">{companyName}</Link> : 
                        <span className="text-gray-400">-</span>;
                },
                className: 'text-left'
            }
        ];
    }, [companies]);

    const columnsMap: Record<CrmView, any[]> = {
        companies: companyColumns,
        contacts: contactColumns,
        prospects: prospectColumns,
    };

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar los datos.</p>;
        if (!filteredData || filteredData.length === 0) {
            return (
                <EmptyState
                    icon={currentViewInfo.icon}
                    title={`No se encontraron ${currentViewInfo.name.toLowerCase()}`}
                    message={`Comienza creando tu primer ${currentViewInfo.singular.toLowerCase()} para gestionar sus datos.`}
                    actionText={`Crear ${currentViewInfo.singular}`}
                    onAction={() => alert(`Abrir drawer para nuevo ${currentViewInfo.singular}`)}
                />
            );
        }
        // FIX: Use a switch statement to ensure type safety when passing data to the Table component.
        switch (activeView) {
            case 'companies':
                return <Table columns={companyColumns} data={filteredData as Company[]} />;
            case 'contacts':
                return <Table columns={contactColumns} data={filteredData as Contact[]} />;
            case 'prospects':
                return <Table columns={prospectColumns} data={filteredData as Prospect[]} />;
            default:
                return null;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <div className="md:col-span-1 lg:col-span-1 bg-surface p-4 rounded-lg shadow-sm h-fit">
                <h3 className="text-lg font-bold mb-4 px-2">Entidades</h3>
                <MasterList activeView={activeView} setActiveView={setActiveView} counts={counts} />
            </div>
            <div className="md:col-span-3 lg:col-span-4 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-on-surface">{currentViewInfo.name}</h2>
                    {activeView === 'prospects' ? (
                       <Link 
                         to="/crm/prospects/new"
                         className="bg-primary text-on-primary font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                           <span className="material-symbols-outlined mr-2">add</span>
                           Nuevo Prospecto
                       </Link>
                    ) : (
                       <button 
                           onClick={() => alert(`Abrir drawer para nuevo ${currentViewInfo.singular}`)}
                           className="bg-primary text-on-primary font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                           <span className="material-symbols-outlined mr-2">add</span>
                           Nuevo {currentViewInfo.singular}
                       </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-secondary">search</span>
                        <input
                            type="text"
                            placeholder="buscar por nombre..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="w-full sm:w-64 bg-surface pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    {(activeView === 'companies' || activeView === 'prospects') && (
                        <>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-on-surface-secondary">Etapa:</label>
                                {activeView === 'companies' && (
                                    <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="bg-surface text-on-surface text-sm border-border rounded-md shadow-sm focus:border-primary focus:ring-primary py-2 px-3">
                                        <option value="all">Todas</option>
                                        {Object.values(CompanyPipelineStage).map(stage => <option key={stage} value={stage}>{stage}</option>)}
                                    </select>
                                )}
                                {activeView === 'prospects' && (
                                     <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="bg-surface text-on-surface text-sm border-border rounded-md shadow-sm focus:border-primary focus:ring-primary py-2 px-3">
                                        <option value="all">Todas</option>
                                        {Object.values(ProspectStage).map(stage => <option key={stage} value={stage}>{stage}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-on-surface-secondary">Prioridad:</label>
                                <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-surface text-on-surface text-sm border-border rounded-md shadow-sm focus:border-primary focus:ring-primary py-2 px-3">
                                    <option value="all">Todas</option>
                                     {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                             <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-on-surface-secondary">Responsable:</label>
                                <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="bg-surface text-on-surface text-sm border-border rounded-md shadow-sm focus:border-primary focus:ring-primary py-2 px-3">
                                    <option value="all">Todos</option>
                                    {Object.values(MOCK_USERS).map((user: User) => <option key={user.id} value={user.id}>{user.name}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default CrmPage;