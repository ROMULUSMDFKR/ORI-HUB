
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Candidate, CandidateStatus, Brand } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';

const categoryTranslations: Record<string, string> = {
    "Wholesaler": "Mayorista",
    "Tire shop": "Llantera",
    "Auto repair shop": "Taller mecánico",
    "Gas station": "Gasolinera",
    "Fuel supplier": "Proveedor de combustible",
    "Grocery store": "Tienda de abarrotes",
    "Convenience store": "Tienda de conveniencia",
    "Restaurant": "Restaurante",
    "Corporate office": "Oficina corporativa",
    "Manufacturer": "Fabricante",
    "Logistics service": "Servicio logístico",
    "Trucking company": "Empresa de transporte",
    "Farm": "Granja",
    "Agriculture": "Agricultura",
    "Chemical manufacturer": "Fabricante de productos químicos",
    "Industrial equipment supplier": "Proveedor de equipos industriales",
    "Produce market": "Mercado de productos agrícolas",
    "Supermarket": "Supermercado"
};

const calculateProfileScore = (c: Candidate) => {
    let score = 0;
    if (c.email || (c.emails && c.emails.length > 0)) score += 20;
    if (c.phone || (c.phones && c.phones.length > 0)) score += 20;
    if (c.website) score += 20;
    if ((c.linkedIns && c.linkedIns.length > 0) || (c.facebooks && c.facebooks.length > 0) || (c.instagrams && c.instagrams.length > 0)) score += 10;
    if (c.aiAnalysis) score += 30;
    return Math.min(100, score);
};

const CandidatesPage: React.FC = () => {
    const { data: candidates, loading: cLoading, error } = useCollection<Candidate>('candidates');
    const { data: brands, loading: bLoading } = useCollection<Brand>('brands');
    const navigate = useNavigate();

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [tagFilter, setTagFilter] = useState<string>('all');
    const [companyFilter, setCompanyFilter] = useState<string>('all');
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [scoreFilter, setScoreFilter] = useState<string>('all');

    const loading = cLoading || bLoading;
    const brandsMap = useMemo(() => new Map(brands?.map(b => [b.id, b.name])), [brands]);

    const filteredData = useMemo(() => {
        if (!candidates) return [];
        return candidates.filter(c => {
            const statusMatch = statusFilter === 'all' || c.status === statusFilter;
            const tagMatch = tagFilter === 'all' || c.tags.includes(tagFilter);
            const companyMatch = companyFilter === 'all' || c.assignedCompanyId === companyFilter;
            const stateMatch = stateFilter === 'all' || c.state === stateFilter;
            const cityMatch = cityFilter === 'all' || c.city === cityFilter;

            const score = calculateProfileScore(c);
            let scoreMatch = true;
            if (scoreFilter !== 'all') {
                switch (scoreFilter) {
                    case 'excellent':
                        scoreMatch = score >= 80;
                        break;
                    case 'good':
                        scoreMatch = score >= 50 && score < 80;
                        break;
                    case 'low':
                        scoreMatch = score < 50;
                        break;
                    default:
                        scoreMatch = true;
                }
            }

            return statusMatch && tagMatch && companyMatch && stateMatch && cityMatch && scoreMatch;
        });
    }, [candidates, statusFilter, tagFilter, companyFilter, stateFilter, cityFilter, scoreFilter]);
    
    // Dynamic filter options
    const { stateOptions, cityOptions } = useMemo(() => {
        if (!candidates) return { stateOptions: [], cityOptions: [] };
        
        const uniqueStates = [...new Set(candidates.map(c => c.state).filter(Boolean) as string[])].sort();
        const stateOpts = uniqueStates.map(s => ({ value: s, label: s }));

        let citiesInState: string[] = [];
        if (stateFilter !== 'all') {
            citiesInState = [...new Set(candidates.filter(c => c.state === stateFilter).map(c => c.city).filter(Boolean) as string[])].sort();
        }
        const cityOpts = citiesInState.map(c => ({ value: c, label: c }));

        return { stateOptions: stateOpts, cityOptions: cityOpts };
    }, [candidates, stateFilter]);
    

    const getStatusColor = (status: CandidateStatus) => {
        switch (status) {
            case CandidateStatus.Aprobado: return 'green';
            case CandidateStatus.Pendiente: return 'yellow';
            case CandidateStatus.Rechazado: return 'gray';
            case CandidateStatus.ListaNegra: return 'red';
            default: return 'gray';
        }
    };
    
    const handleRowClick = (candidate: Candidate) => {
        navigate(`/prospecting/candidates/${candidate.id}`);
    };

    const columns = [
        { 
            header: 'Nombre', 
            accessor: (c: Candidate) => (
                <Link to={`/prospecting/candidates/${c.id}`} onClick={e => e.stopPropagation()} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {c.name}
                </Link>
            )
        },
        { 
            header: 'Categorías (Fuente)', 
            accessor: (c: Candidate) => (
                <div className="flex flex-wrap gap-1">
                    {c.rawCategories?.slice(0, 2).map(cat => <Badge key={cat} text={categoryTranslations[cat] || cat} />)}
                </div>
            )
        },
        { 
            header: 'Ciudad', 
            accessor: (c: Candidate) => <span className="text-sm text-slate-500 dark:text-slate-400">{c.city || '-'}</span>
        },
        { 
            header: 'Estado', 
            accessor: (c: Candidate) => <span className="text-sm text-slate-500 dark:text-slate-400">{c.state || '-'}</span>
        },
        {
            header: 'Perfilado Para',
            accessor: (c: Candidate) => c.assignedCompanyId ? <Badge text={c.assignedCompanyId} color="blue" /> : <span className="text-sm text-slate-500 dark:text-slate-400">-</span>
        },
        {
            header: 'Puntuación',
            accessor: (c: Candidate) => {
                const score = calculateProfileScore(c);
                let color: 'green' | 'yellow' | 'red' = 'green';
                if (score < 50) color = 'red';
                else if (score < 80) color = 'yellow';
                return <Badge text={`${score}%`} color={color} />;
            },
            className: 'text-center'
        },
        { header: 'Estado', accessor: (c: Candidate) => <Badge text={c.status} color={getStatusColor(c.status)} /> },
        { 
            header: 'Fecha Creación', 
            accessor: (c: Candidate) => <span className="text-sm text-slate-500 dark:text-slate-400">{new Date(c.importedAt).toLocaleDateString('es-ES')}</span> 
        },
    ];

    const statusOptions = Object.values(CandidateStatus).map(s => ({ value: s, label: s }));
    const tagOptions: {value: string, label: string}[] = (['Alto Potencial', 'Potencial Distribuidor', 'Consumidor Directo', 'Para seguimiento', 'No Relevante', 'Lista Negra'] as const).map(t => ({ value: t, label: t }));
    const companyOptions = [{value: 'Puredef', label: 'Puredef'}, {value: 'Trade Aitirik', label: 'Trade Aitirik'}, {value: 'Santzer', label: 'Santzer'}];
    const scoreOptions = [
        { value: 'excellent', label: 'Excelente (80+)' },
        { value: 'good', label: 'Bueno (50-79)' },
        { value: 'low', label: 'Bajo (<50)' },
    ];
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Candidatos de Prospección</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona, califica y convierte datos crudos en prospectos de valor.</p>
                </div>
                <Link to="/prospecting/upload" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">upload</span>
                    Importar Candidatos
                </Link>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                <FilterButton label="Estatus" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
                <FilterButton label="Etiqueta" options={tagOptions} selectedValue={tagFilter} onSelect={setTagFilter} />
                <FilterButton label="Compañía" options={companyOptions} selectedValue={companyFilter} onSelect={setCompanyFilter} allLabel="Cualquiera" />
                <FilterButton label="Estado" options={stateOptions} selectedValue={stateFilter} onSelect={val => { setStateFilter(val); setCityFilter('all'); }} />
                <FilterButton label="Ciudad" options={cityOptions} selectedValue={cityFilter} onSelect={setCityFilter} disabled={stateFilter === 'all'} />
                <FilterButton label="Puntuación" options={scoreOptions} selectedValue={scoreFilter} onSelect={setScoreFilter} />
            </div>
            
            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : error ? (
                <p className="text-center text-red-500 py-12">Error al cargar los candidatos.</p>
            ) : !filteredData || filteredData.length === 0 ? (
                <EmptyState
                    icon="group_add"
                    title="No hay candidatos"
                    message="Importa una nueva lista de candidatos para empezar a calificar."
                    actionText="Importar Datos"
                    onAction={() => navigate('/prospecting/upload')}
                />
            ) : (
                <Table columns={columns} data={filteredData} onRowClick={handleRowClick} />
            )}
        </div>
    );
};

export default CandidatesPage;
