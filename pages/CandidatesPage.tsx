
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Candidate, CandidateStatus, Brand } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';
import { getCanonicalState } from '../constants'; // Import helper

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
    const locationHook = useLocation();

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [tagFilter, setTagFilter] = useState<string>('all');
    const [companyFilter, setCompanyFilter] = useState<string>('all');
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [scoreFilter, setScoreFilter] = useState<string>('all');
    const [importHistoryFilter, setImportHistoryFilter] = useState<string | null>(null);
    
    // Tag-based search state
    const [searchTags, setSearchTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const loading = cLoading || bLoading;

    // Handle Import History Filter from Navigation State
    useEffect(() => {
        if (locationHook.state && locationHook.state.importHistoryId) {
            setImportHistoryFilter(locationHook.state.importHistoryId);
            // Reset other filters to default to show the full import batch clearly
            setStatusFilter('all');
            setTagFilter('all');
            setCompanyFilter('all');
            setStateFilter('all');
            setCityFilter('all');
            setScoreFilter('all');
            setSearchTags([]);
        }
    }, [locationHook.state]);
    
    // Extract all unique categories and names for suggestions
    const allSuggestions = useMemo(() => {
        if (!candidates) return [];
        const suggestions = new Set<string>();
        candidates.forEach(c => {
            c.rawCategories?.forEach(cat => {
                if (cat) suggestions.add(cat);
            });
            // Also add names to suggestions for better UX
            if (c.name) suggestions.add(c.name);
        });
        return Array.from(suggestions).sort();
    }, [candidates]);

    const suggestions = useMemo(() => {
        if (!tagInput.trim()) return [];
        const lowerInput = tagInput.toLowerCase();
        return allSuggestions.filter(item => 
            item.toLowerCase().includes(lowerInput) && 
            !searchTags.includes(item)
        ).slice(0, 10); // Limit to top 10 matches
    }, [tagInput, allSuggestions, searchTags]);

    // Handle Tag Input
    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            // Only add if it's not already there
            if (!searchTags.includes(tagInput.trim())) {
                setSearchTags([...searchTags, tagInput.trim()]);
            }
            setTagInput('');
            setShowSuggestions(false);
        }
    };

    const addSearchTag = (tag: string) => {
        if (!searchTags.includes(tag)) {
            setSearchTags([...searchTags, tag]);
        }
        setTagInput('');
        setShowSuggestions(false);
    };

    const removeSearchTag = (tag: string) => {
        setSearchTags(searchTags.filter(t => t !== tag));
    };

    const filteredData = useMemo(() => {
        if (!candidates) return [];
        return candidates.filter(c => {
            // Special Import History Filter
            if (importHistoryFilter && c.importHistoryId !== importHistoryFilter) return false;

            const statusMatch = statusFilter === 'all' || c.status === statusFilter;
            const tagMatch = tagFilter === 'all' || c.tags.includes(tagFilter);
            const companyMatch = companyFilter === 'all' || c.assignedCompanyId === companyFilter;
            
            // Use normalized state for filtering
            const normalizedState = getCanonicalState(c.state);
            const stateMatch = stateFilter === 'all' || normalizedState === stateFilter;
            
            const cityMatch = cityFilter === 'all' || c.city === cityFilter;
            
            // Logic: Search Terms (Additive / OR logic)
            // Broad search across Name, Categories, Tags, City, and State
            let searchMatch = true;
            if (searchTags.length > 0) {
                searchMatch = searchTags.some(tag => {
                    const lowerTag = tag.toLowerCase();
                    return (
                        c.name.toLowerCase().includes(lowerTag) ||
                        c.rawCategories?.some(cat => cat.toLowerCase().includes(lowerTag)) ||
                        c.tags?.some(t => t.toLowerCase().includes(lowerTag)) ||
                        c.city?.toLowerCase().includes(lowerTag) ||
                        c.state?.toLowerCase().includes(lowerTag)
                    );
                });
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
    }, [candidates, statusFilter, tagFilter, companyFilter, stateFilter, cityFilter, scoreFilter, searchTags, importHistoryFilter]);

    // Dynamic filter options
    const { stateOptions, cityOptions } = useMemo(() => {
        if (!candidates) return { stateOptions: [], cityOptions: [] };
        
        // Use Set to deduplicate normalized names
        const uniqueStates = new Set<string>();
        candidates.forEach(c => {
            const normalized = getCanonicalState(c.state);
            if(normalized) uniqueStates.add(normalized);
        });
        const stateOpts = Array.from(uniqueStates).sort().map(s => ({ value: s, label: s }));

        let citiesInState: string[] = [];
        if (stateFilter !== 'all') {
            citiesInState = [...new Set(
                candidates
                .filter(c => getCanonicalState(c.state) === stateFilter)
                .map(c => c.city)
                .filter(Boolean) as string[]
            )].sort();
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
                <div className="flex items-center gap-3">
                    {/* App Icon Pattern */}
                     <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        <span className="material-symbols-outlined text-xl">person</span>
                    </div>
                    <div className="max-w-[200px] truncate" title={c.name}>
                        <Link to={`/prospecting/candidates/${c.id}`} onClick={e => e.stopPropagation()} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                            {c.name}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{c.city || 'Sin ciudad'}</p>
                    </div>
                </div>
            )
        },
        { 
            header: 'Categoría', 
            accessor: (c: Candidate) => (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                    {c.rawCategories?.[0] ? <Badge text={c.rawCategories[0]} color="gray" /> : '-'}
                </span>
            )
        },
        {
            header: 'Perfilado',
            accessor: (c: Candidate) => c.assignedCompanyId ? <Badge text={c.assignedCompanyId} color="blue" /> : <span className="text-sm text-slate-500 dark:text-slate-400">-</span>
        },
        {
            header: 'Score',
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
        <div className="space-y-6 h-full flex flex-col pb-12">
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Candidatos</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona y califica los prospectos importados.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link to="/prospecting/upload" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                        <span className="material-symbols-outlined mr-2">upload</span>
                        Importar
                    </Link>
                </div>
            </div>
            
            {/* Import History Banner */}
            {importHistoryFilter && (
                <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 p-3 rounded-xl flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
                        <span className="material-symbols-outlined">filter_list</span>
                        <span className="text-sm font-medium">Filtrado por lote de importación: {filteredData.length} resultados.</span>
                    </div>
                    <button 
                        onClick={() => setImportHistoryFilter(null)} 
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined !text-sm">close</span>
                        Ver Todos
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex flex-col lg:flex-row items-start lg:items-center gap-4 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                 {/* Input Safe Pattern for Search */}
                <div className="relative w-full lg:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Buscar por nombre, tag..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                    {/* Autocomplete Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                            {suggestions.map(suggestion => (
                                <li
                                    key={suggestion}
                                    onClick={() => addSearchTag(suggestion)}
                                    className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                >
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                 {/* Active Search Tags */}
                 <div className="flex flex-wrap gap-2 items-center flex-1">
                    {searchTags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800">
                            {tag}
                            <button onClick={() => removeSearchTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100 focus:outline-none flex items-center">
                                <span className="material-symbols-outlined !text-sm">close</span>
                            </button>
                        </span>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                    <FilterButton label="Estatus" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
                    <FilterButton label="Etiqueta" options={tagOptions} selectedValue={tagFilter} onSelect={setTagFilter} />
                    <FilterButton label="Compañía" options={companyOptions} selectedValue={companyFilter} onSelect={setCompanyFilter} allLabel="Cualquiera" />
                    <FilterButton label="Estado" options={stateOptions} selectedValue={stateFilter} onSelect={val => { setStateFilter(val); setCityFilter('all'); }} />
                    <FilterButton label="Puntuación" options={scoreOptions} selectedValue={scoreFilter} onSelect={setScoreFilter} />
                </div>
            </div>
            
            <div className="flex-1 min-h-0 relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
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
