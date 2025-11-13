import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Contact, Company, CompanyPipelineStage, Priority, Prospect, ProspectStage, User, Sample, Quote, SalesOrder, QuoteStatus, SampleStatus, SalesOrderStatus } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { MOCK_USERS } from '../data/mockData';
import FilterButton from '../components/ui/FilterButton';

type CrmView = 'prospects' | 'companies' | 'contacts' | 'samples' | 'quotes' | 'sales-orders';

const CRM_VIEWS: { id: CrmView, name: string, icon: string, singular: string, newLink: string }[] = [
    { id: 'prospects', name: 'Prospectos', icon: 'person_search', singular: 'Prospecto', newLink: '/crm/prospects/new' },
    { id: 'companies', name: 'Empresas', icon: 'apartment', singular: 'Empresa', newLink: '/crm/clients/new' },
    { id: 'contacts', name: 'Contactos', icon: 'contacts', singular: 'Contacto', newLink: '#' }, // Contact creation could be a modal
    { id: 'samples', name: 'Muestras', icon: 'science', singular: 'Muestra', newLink: '/hubs/samples/new' },
    { id: 'quotes', name: 'Cotizaciones', icon: 'request_quote', singular: 'Cotización', newLink: '/hubs/quotes/new' },
    { id: 'sales-orders', name: 'Órdenes de Venta', icon: 'receipt_long', singular: 'Orden', newLink: '/hubs/sales-orders/new' },
];

const MasterList: React.FC<{ activeView: CrmView, setActiveView: (view: CrmView) => void, counts: Record<CrmView, number> }> = ({ activeView, setActiveView, counts }) => (
    <nav className="flex flex-col space-y-1">
        {CRM_VIEWS.map(view => (
            <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex items-center justify-between p-3 rounded-lg text-left transition-colors duration-200 ${activeView === view.id ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
            >
                <div className="flex items-center">
                    <span className="material-symbols-outlined w-6 h-6 mr-3">{view.icon}</span>
                    <span>{view.name}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${activeView === view.id ? 'bg-indigo-200 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                    {counts[view.id] || 0}
                </span>
            </button>
        ))}
    </nav>
);

const CrmPage: React.FC = () => {
    const { data: companies, loading: compLoading } = useCollection<Company>('companies');
    const { data: contacts, loading: coLoading } = useCollection<Contact>('contacts');
    const { data: prospects, loading: pLoading } = useCollection<Prospect>('prospects');
    const { data: samples, loading: sLoading } = useCollection<Sample>('samples');
    const { data: quotes, loading: qLoading } = useCollection<Quote>('quotes');
    const { data: salesOrders, loading: soLoading } = useCollection<SalesOrder>('salesOrders');
    
    const [searchParams, setSearchParams] = useSearchParams();
    const [filter, setFilter] = useState('');
    
    // Filter states
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [ownerFilter, setOwnerFilter] = useState<string>('all');
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('');


    const activeView = (searchParams.get('view') as CrmView) || 'prospects';

    const setActiveView = (view: CrmView) => {
        setSearchParams({ view });
        // Reset all filters when view changes
        setFilter('');
        setStageFilter('all');
        setPriorityFilter('all');
        setOwnerFilter('all');
        setClientFilter('all');
        setDateFilter('');
    };
    
    const currentViewInfo = CRM_VIEWS.find(v => v.id === activeView)!;

    const dataMap = {
        companies: { data: companies, loading: compLoading },
        contacts: { data: contacts, loading: coLoading },
        prospects: { data: prospects, loading: pLoading },
        samples: { data: samples, loading: sLoading },
        quotes: { data: quotes, loading: qLoading },
        'sales-orders': { data: salesOrders, loading: soLoading },
    };

    const counts: Record<CrmView, number> = {
        companies: companies?.length ?? 0,
        contacts: contacts?.length ?? 0,
        prospects: prospects?.length ?? 0,
        samples: samples?.length ?? 0,
        quotes: quotes?.length ?? 0,
        'sales-orders': salesOrders?.length ?? 0,
    };
    
    const { loading } = dataMap[activeView];

    const getPriorityBadgeColor = (priority: Priority | Prospect['priority']) => {
        switch (priority) {
            case Priority.Alta: return 'red';
            case Priority.Media: return 'yellow';
            case Priority.Baja: return 'gray';
            default: return 'gray';
        }
    };
    
    const uniqueUsers = useMemo(() => {
        const allUsers = Object.values(MOCK_USERS);
        const seen = new Set();
        return allUsers.filter(user => {
            const duplicate = seen.has(user.id);
            seen.add(user.id);
            return !duplicate;
        });
    }, []);

    const companyMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);
    const prospectMap = useMemo(() => new Map(prospects?.map(p => [p.id, p.name])), [prospects]);
    
    const ownerOptions = useMemo(() => uniqueUsers.map((u: User) => ({ value: u.id, label: u.name })), [uniqueUsers]);
    const clientOptions = useMemo(() => (companies || []).map(c => ({ value: c.id, label: c.shortName || c.name })), [companies]);

    // Column Definitions
    const prospectColumns = useMemo(() => [
        { header: 'NOMBRE', accessor: (p: Prospect) => <Link to={`/crm/prospects/${p.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{p.name}</Link> },
        { header: 'ETAPA', accessor: (p: Prospect) => <Badge text={p.stage} color="blue" /> },
        { header: 'PRIORIDAD', accessor: (p: Prospect) => p.priority ? <Badge text={p.priority} color={getPriorityBadgeColor(p.priority)} /> : '-' },
        { header: 'VALOR EST.', accessor: (p: Prospect) => `$${p.estValue.toLocaleString('en-US')}`, className: 'text-left' },
        { header: 'RESPONSABLE', accessor: (p: Prospect) => MOCK_USERS[p.ownerId]?.name || p.ownerId },
    ], []);

    const companyColumns = useMemo(() => [
        { header: 'Nombre', accessor: (c: Company) => <Link to={`/crm/clients/${c.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{c.shortName || c.name}</Link> },
        { header: 'Etapa', accessor: (c: Company) => <Badge text={c.stage} color="blue" /> },
        { header: 'Prioridad', accessor: (c: Company) => <Badge text={c.priority} color={getPriorityBadgeColor(c.priority)} /> },
        { header: 'Responsable', accessor: (c: Company) => MOCK_USERS[c.ownerId]?.name || c.ownerId },
    ], []);

    const contactColumns = useMemo(() => [
        { header: 'Nombre', accessor: (c: Contact) => <span className="font-medium">{c.name}</span> },
        { header: 'Cargo', accessor: (c: Contact) => c.role || '-' },
        { header: 'Email', accessor: (c: Contact) => <a href={`mailto:${c.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{c.email}</a> || '-' },
        { header: 'Teléfono', accessor: (c: Contact) => c.phone || '-' },
        { header: 'Empresa', accessor: (c: Contact) => c.companyId ? companyMap.get(c.companyId) : '-', className: 'text-left' }
    ], [companyMap]);
    
    const sampleColumns = useMemo(() => [
        { header: 'Concepto', accessor: (s: Sample) => <span className="font-medium">{s.name}</span> },
        { header: 'Destinatario', accessor: (s: Sample) => s.companyId ? companyMap.get(s.companyId) : (s.prospectId ? prospectMap.get(s.prospectId) : '-') },
        { header: 'Estado', accessor: (s: Sample) => <Badge text={s.status} color="yellow" /> },
        { header: 'Fecha Solicitud', accessor: (s: Sample) => new Date(s.requestDate).toLocaleDateString() },
        { header: 'Responsable', accessor: (s: Sample) => MOCK_USERS[s.ownerId]?.name || s.ownerId },
    ], [companyMap, prospectMap]);
    
    const quoteColumns = useMemo(() => [
        { header: 'Folio', accessor: (q: Quote) => <Link to="#" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{q.folio || q.id}</Link> },
        { header: 'Cliente', accessor: (q: Quote) => q.companyId ? companyMap.get(q.companyId) : (q.prospectId ? prospectMap.get(q.prospectId) : '-') },
        { header: 'Estado', accessor: (q: Quote) => <Badge text={q.status} /> },
        { header: 'Total', accessor: (q: Quote) => `$${q.totals.grandTotal.toLocaleString('en-US')}`, className: 'text-right' },
        { header: 'Responsable', accessor: (q: Quote) => MOCK_USERS[q.salespersonId]?.name || q.salespersonId },
    ], [companyMap, prospectMap]);

    const salesOrderColumns = useMemo(() => [
        { header: 'Orden #', accessor: (so: SalesOrder) => <Link to="#" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{so.id}</Link> },
        { header: 'Cliente', accessor: (so: SalesOrder) => companyMap.get(so.companyId) },
        { header: 'Estado', accessor: (so: SalesOrder) => <Badge text={so.status} /> },
        { header: 'Total', accessor: (so: SalesOrder) => `$${so.total.toLocaleString('en-US')}`, className: 'text-right' },
    ], [companyMap]);


    const renderFilters = () => {
        switch (activeView) {
            case 'prospects':
                return (
                    <>
                        <FilterButton label="Etapa" options={Object.values(ProspectStage).map(s => ({ value: s, label: s }))} selectedValue={stageFilter} onSelect={setStageFilter} />
                        <FilterButton label="Prioridad" options={Object.values(Priority).map(p => ({ value: p, label: p }))} selectedValue={priorityFilter} onSelect={setPriorityFilter} />
                        <FilterButton label="Responsable" options={ownerOptions} selectedValue={ownerFilter} onSelect={setOwnerFilter} />
                    </>
                );
            case 'companies':
                 return (
                    <>
                        <FilterButton label="Etapa" options={Object.values(CompanyPipelineStage).map(s => ({ value: s, label: s }))} selectedValue={stageFilter} onSelect={setStageFilter} />
                        <FilterButton label="Prioridad" options={Object.values(Priority).map(p => ({ value: p, label: p }))} selectedValue={priorityFilter} onSelect={setPriorityFilter} />
                        <FilterButton label="Responsable" options={ownerOptions} selectedValue={ownerFilter} onSelect={setOwnerFilter} />
                    </>
                );
            case 'samples':
            case 'quotes':
                return (
                    <>
                        <FilterButton label="Destinatario" options={clientOptions} selectedValue={clientFilter} onSelect={setClientFilter} />
                        <FilterButton label="Estado" options={Object.values(activeView === 'samples' ? SampleStatus : QuoteStatus).map(s => ({ value: s, label: s }))} selectedValue={stageFilter} onSelect={setStageFilter} />
                        <FilterButton label="Responsable" options={ownerOptions} selectedValue={ownerFilter} onSelect={setOwnerFilter} />
                        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                    </>
                );
            case 'sales-orders':
                return (
                    <>
                        <FilterButton label="Cliente" options={clientOptions} selectedValue={clientFilter} onSelect={setClientFilter} />
                        <FilterButton label="Estado" options={Object.values(SalesOrderStatus).map(s => ({ value: s, label: s }))} selectedValue={stageFilter} onSelect={setStageFilter} />
                    </>
                );
            default:
                return null;
        }
    };


    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        
        const renderTableForView = (items: any[] | null, columns: any[]) => {
            if (!items) return <div className="flex justify-center py-12"><Spinner /></div>;
            
            const filtered = items.filter(item => {
                // General text search
                if (filter) {
                    const searchable = item.name || item.shortName || item.id || item.folio || '';
                    if (!searchable.toLowerCase().includes(filter.toLowerCase())) return false;
                }
                
                // Specific filters
                if (stageFilter !== 'all' && item.stage !== stageFilter && item.status !== stageFilter) return false;
                if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
                if (ownerFilter !== 'all' && (item.ownerId !== ownerFilter && item.salespersonId !== ownerFilter)) return false;
                if (clientFilter !== 'all' && (item.companyId !== clientFilter && item.prospectId !== clientFilter)) return false;
                if (dateFilter && (item.requestDate || item.createdAt)) {
                    const itemDate = new Date(item.requestDate || item.createdAt).toISOString().split('T')[0];
                    if (itemDate !== dateFilter) return false;
                }
                
                return true;
            });

            if (filtered.length === 0) {
                return (
                    <EmptyState
                        icon={currentViewInfo.icon}
                        title={`No se encontraron ${currentViewInfo.name.toLowerCase()}`}
                        message={filter ? 'Intenta con otro término de búsqueda o filtro.' : `Comienza creando tu primer ${currentViewInfo.singular.toLowerCase()}.`}
                        actionText={`Crear ${currentViewInfo.singular}`}
                        onAction={() => alert(`Abrir drawer para nuevo ${currentViewInfo.singular}`)}
                    />
                );
            }
            return <Table columns={columns} data={filtered} />;
        };

        switch (activeView) {
            case 'companies': return renderTableForView(companies, companyColumns);
            case 'contacts': return renderTableForView(contacts, contactColumns);
            case 'prospects': return renderTableForView(prospects, prospectColumns);
            case 'samples': return renderTableForView(samples, sampleColumns);
            case 'quotes': return renderTableForView(quotes, quoteColumns);
            case 'sales-orders': return renderTableForView(salesOrders, salesOrderColumns);
            default: return null;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <div className="md:col-span-1 lg:col-span-1 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm h-fit border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold mb-4 px-2 text-slate-800 dark:text-slate-200">Entidades</h3>
                <MasterList activeView={activeView} setActiveView={setActiveView} counts={counts} />
            </div>
            <div className="md:col-span-3 lg:col-span-4 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{currentViewInfo.name}</h2>
                    <Link 
                        to={currentViewInfo.newLink}
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                        <span className="material-symbols-outlined mr-2">add</span>
                        Nuevo {currentViewInfo.singular}
                    </Link>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500">
                         <span className="material-symbols-outlined px-3 text-slate-500 dark:text-slate-400 pointer-events-none">search</span>
                         <input
                            type="text"
                            placeholder="Buscar por nombre/ID..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="w-full bg-transparent pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none"
                         />
                    </div>
                    {renderFilters()}
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default CrmPage;