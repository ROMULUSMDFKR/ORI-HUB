
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Candidate, CandidateStatus, Brand } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';

const calculateProfileScore = (c: Candidate) => {
    let score = 0;
    if (c.email || (c.emails && c.emails.length > 0)) score += 20;
    if (c.phone || (c.phones && c.phones.length > 0)) score += 20;
    if (c.website) score += 20;
    if ((c.linkedIns && c.linkedIns.length > 0) || (c.facebooks && c.facebooks.length > 0) || (c.instagrams && c.instagrams.length > 0)) score += 10;
    if (c.aiAnalysis) score += 30;
    return Math.min(100, score);
};

const getStatusColorClass = (status: CandidateStatus) => {
    switch (status) {
        case CandidateStatus.Aprobado: return 'bg-green-500';
        case CandidateStatus.EnRevision: return 'bg-blue-500';
        case CandidateStatus.Pendiente: return 'bg-yellow-500'; // Using yellow/amber for pending
        case CandidateStatus.Rechazado: return 'bg-slate-500';
        case CandidateStatus.ListaNegra: return 'bg-red-600';
        default: return 'bg-gray-500';
    }
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
    
    // Tag-based search state
    const [searchTags, setSearchTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    const loading = cLoading || bLoading;
    
    // Handle Tag Input
    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!searchTags.includes(tagInput.trim())) {
                setSearchTags([...searchTags, tagInput.trim()]);
            }
            setTagInput('');
        } else if (e.key === 'Backspace' && !tagInput && searchTags.length > 0) {
            // Remove last tag if input is empty and backspace is pressed
            setSearchTags(searchTags.slice(0, -1));
        }
    };

    const removeSearchTag = (tag: string) => {
        setSearchTags(searchTags.filter(t => t !== tag));
    };

    const filteredData = useMemo(() => {
        if (!candidates) return [];
        return candidates.filter(c => {
            const statusMatch = statusFilter === 'all' || c.status === statusFilter;
            const tagMatch = tagFilter === 'all' || c.tags.includes(tagFilter);
            const companyMatch = companyFilter === 'all' || c.assignedCompanyId === companyFilter;
            const stateMatch = stateFilter === 'all' || c.state === stateFilter;
            const cityMatch = cityFilter === 'all' || c.city === cityFilter;
            
            // Logic: Search Terms (Additive / OR logic)
            // If no tags, show all. If tags exist, candidate must match AT LEAST ONE tag in their rawCategories.
            let searchMatch = true;
            if (searchTags.length > 0) {
                if (!c.rawCategories || c.rawCategories.length === 0) {
                    searchMatch = false;
                } else {
                    // Check if any of the search tags are included in any of the candidate's raw categories
                    // Case insensitive matching
                    searchMatch = searchTags.some(tag => 
                        c.rawCategories?.some(cat => cat.toLowerCase().includes(tag.toLowerCase()))
                    );
                }
            }

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

            return statusMatch && tagMatch && companyMatch && stateMatch && cityMatch && scoreMatch && searchMatch;
        });
    }, [candidates, statusFilter, tagFilter, companyFilter, stateFilter, cityFilter, scoreFilter, searchTags]);

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
            case CandidateStatus.EnRevision: return 'blue';
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
                <div className="max-w-[200px] truncate" title={c.name}>
                    <Link to={`/prospecting/candidates/${c.id}`} onClick={e => e.stopPropagation()} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        {c.name}
                    </Link>
                </div>
            )
        },
        { 
            header: 'Término de Búsqueda', 
            accessor: (c: Candidate) => (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                    {c.rawCategories?.[0] ? <Badge text={c.rawCategories[0]} color="gray" /> : '-'}
                </span>
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
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Candidatos de Prospección</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona, califica y convierte datos crudos en prospectos de valor.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link to="/prospecting/upload" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                        <span className="material-symbols-outlined mr-2">upload</span>
                        Importar Candidatos
                    </Link>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                <FilterButton label="Estatus" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
                <FilterButton label="Etiqueta" options={tagOptions} selectedValue={tagFilter} onSelect={setTagFilter} />
                <FilterButton label="Compañía" options={companyOptions} selectedValue={companyFilter} onSelect={setCompanyFilter} allLabel="Cualquiera" />
                <FilterButton label="Estado" options={stateOptions} selectedValue={stateFilter} onSelect={val => { setStateFilter(val); setCityFilter('all'); }} />
                <FilterButton label="Ciudad" options={cityOptions} selectedValue={cityFilter} onSelect={setCityFilter} disabled={stateFilter === 'all'} />
                <FilterButton label="Puntuación" options={scoreOptions} selectedValue={scoreFilter} onSelect={setScoreFilter} />
                
                {/* Search Term Filter with Tags */}
                <div className="flex-grow ml-auto flex justify-end">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 w-full max-w-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                        <span className="material-symbols-outlined text-slate-400 text-xl">search</span>
                        <div className="flex flex-wrap gap-2 items-center flex-1">
                            {searchTags.map((tag, index) => (
                                <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                                    {tag}
                                    <button onClick={() => removeSearchTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100 focus:outline-none">
                                        &times;
                                    </button>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagInputKeyDown}
                                placeholder={searchTags.length === 0 ? "Filtrar por término..." : ""}
                                className="bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200 min-w-[120px] flex-1 py-1"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 min-h-0 relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-full"><Spinner /></div>
                ) : error ? (
                    <p className="text-center text-red-500 py-12">Error al cargar los candidatos.</p>
                ) : !filteredData || filteredData.length === 0 ? (
                    <EmptyState
                        icon="group_add"
                        title="No hay candidatos"
                        message="Importa una nueva lista de candidatos para empezar a calificar o ajusta tus filtros."
                        actionText="Importar Datos"
                        onAction={() => navigate('/prospecting/upload')}
                    />
                ) : (
                    <div className="h-full overflow-y-auto">
                        <Table columns={columns} data={filteredData} onRowClick={handleRowClick} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CandidatesPage;
