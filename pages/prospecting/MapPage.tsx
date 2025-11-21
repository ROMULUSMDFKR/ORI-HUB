
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Candidate, CandidateStatus } from '../../types';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import FilterButton from '../../components/ui/FilterButton';
import Badge from '../../components/ui/Badge';
import { getCanonicalState } from '../../constants';

// Declare Leaflet types locally since we are using CDN
declare const L: any;

declare global {
    interface Window {
        navigateToCandidate: (id: string) => void;
    }
}

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
        case CandidateStatus.Pendiente: return 'bg-yellow-500';
        case CandidateStatus.Rechazado: return 'bg-slate-500';
        case CandidateStatus.ListaNegra: return 'bg-red-600';
        default: return 'bg-gray-500';
    }
};

const MapPage: React.FC = () => {
    const { data: candidates, loading: cLoading, error } = useCollection<Candidate>('candidates');
    const navigate = useNavigate();

    const mapRef = useRef<any>(null);
    const markersRef = useRef<any>(null);
    const boundaryLayerRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [tagFilter, setTagFilter] = useState<string>('all');
    const [companyFilter, setCompanyFilter] = useState<string>('all');
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [scoreFilter, setScoreFilter] = useState<string>('all');
    const [showBoundary, setShowBoundary] = useState(true);

    // Search Box State
    const [searchTags, setSearchTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Expose navigate function to window for Leaflet popup access
    useEffect(() => {
        window.navigateToCandidate = (id: string) => {
            navigate(`/prospecting/candidates/${id}`);
        };
    }, [navigate]);

    // Extract all unique categories and names for suggestions
    const allSuggestions = useMemo(() => {
        if (!candidates) return [];
        const suggestions = new Set<string>();
        candidates.forEach(c => {
            c.rawCategories?.forEach(cat => {
                if (cat) suggestions.add(cat);
            });
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
        ).slice(0, 10);
    }, [tagInput, allSuggestions, searchTags]);

    // Handle Tag Input
    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
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
            // Filter out candidates without valid location for the map
            if (!c.location || !c.location.lat || !c.location.lng) return false;

            const statusMatch = statusFilter === 'all' || c.status === statusFilter;
            const tagMatch = tagFilter === 'all' || c.tags.includes(tagFilter);
            const companyMatch = companyFilter === 'all' || c.assignedCompanyId === companyFilter;
            
            // Use centralized state normalization logic
            const normalizedState = getCanonicalState(c.state);
            const stateMatch = stateFilter === 'all' || normalizedState === stateFilter;
            
            const cityMatch = cityFilter === 'all' || c.city === cityFilter;
            
            // Search Terms Logic
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
                    case 'excellent': scoreMatch = score >= 80; break;
                    case 'good': scoreMatch = score >= 50 && score < 80; break;
                    case 'low': scoreMatch = score < 50; break;
                }
            }

            return statusMatch && tagMatch && companyMatch && stateMatch && cityMatch && scoreMatch && searchMatch;
        });
    }, [candidates, statusFilter, tagFilter, companyFilter, stateFilter, cityFilter, scoreFilter, searchTags]);

    // --- MAP INITIALIZATION & MARKERS ---
    useEffect(() => {
        if (mapContainerRef.current && !cLoading) {
            if (!mapRef.current) {
                mapRef.current = L.map(mapContainerRef.current).setView([23.6345, -102.5528], 5);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(mapRef.current);
                markersRef.current = L.markerClusterGroup({
                    showCoverageOnHover: false,
                    maxClusterRadius: 50,
                });
                mapRef.current.addLayer(markersRef.current);
            }

            if (markersRef.current) {
                markersRef.current.clearLayers();
            }

            const markers: any[] = [];
            if (filteredData.length > 0) {
                filteredData.forEach(c => {
                    if (c.location && c.location.lat && c.location.lng) {
                        const colorClass = getStatusColorClass(c.status);
                        const customIcon = L.divIcon({
                            className: 'custom-pin',
                            html: `<div class="pin-inner ${colorClass}"></div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8]
                        });

                        const marker = L.marker([c.location.lat, c.location.lng], { icon: customIcon });
                        
                        const popupContent = `
                            <div class="p-1 min-w-[220px] font-sans text-left">
                                <div class="flex justify-between items-start mb-2">
                                    <h3 class="font-bold text-base text-slate-800 leading-tight pr-2 m-0">${c.name}</h3>
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${colorClass.replace('bg-', 'bg-')} flex-shrink-0">${c.status}</span>
                                </div>
                                <p class="text-xs text-slate-500 mb-3 leading-snug">${c.address || 'Ubicación aproximada'}</p>
                                <button 
                                    onclick="window.navigateToCandidate('${c.id}')" 
                                    class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-4 rounded shadow-sm transition-colors flex items-center justify-center cursor-pointer"
                                >
                                    Abrir Ficha
                                </button>
                            </div>
                        `;
                        
                        marker.bindPopup(popupContent);
                        markers.push(marker);
                    }
                });

                markersRef.current.addLayers(markers);
                
                if (stateFilter === 'all') {
                    try {
                        if(markers.length > 0) {
                            mapRef.current.fitBounds(markersRef.current.getBounds(), { padding: [50, 50] });
                        }
                    } catch (e) {
                        console.warn("Could not fit bounds");
                    }
                }
            }
        }
    }, [filteredData, cLoading, stateFilter]);


    // --- STATE BOUNDARY GEOJSON EFFECT ---
    useEffect(() => {
        if (mapRef.current) {
            if (boundaryLayerRef.current) {
                mapRef.current.removeLayer(boundaryLayerRef.current);
                boundaryLayerRef.current = null;
            }

            if (stateFilter !== 'all' && showBoundary) {
                const fetchGeoJSON = async () => {
                    try {
                        const response = await fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/mexico.geojson');
                        if (!response.ok) throw new Error(`Failed to fetch state boundaries`);

                        const data = await response.json();
                        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        // Normalize the filter value too for comparison
                        const targetState = normalize(stateFilter);

                        const stateFeature = data.features.find((f: any) => {
                            const name = f.properties.state_name || f.properties.name;
                            if (!name) return false;
                            const normalizedName = normalize(name);
                            
                            // Special mapping for GeoJSON specific naming quirks vs standard names
                            if ((targetState === 'cdmx' || targetState === 'ciudad de mexico') && (normalizedName === 'distrito federal' || normalizedName === 'ciudad de mexico')) return true;
                            if ((targetState === 'estado de mexico' || targetState === 'mexico') && (normalizedName === 'mexico' || normalizedName === 'estado de mexico')) return true;
                            
                            return normalizedName === targetState;
                        });

                        if (stateFeature) {
                            boundaryLayerRef.current = L.geoJSON(stateFeature, {
                                style: {
                                    color: '#6366f1',
                                    weight: 3,
                                    opacity: 0.8,
                                    fillColor: '#6366f1',
                                    fillOpacity: 0.1
                                }
                            }).addTo(mapRef.current);
                            mapRef.current.fitBounds(boundaryLayerRef.current.getBounds());
                        }
                    } catch (error) {
                        console.error("Error loading state boundary:", error);
                    }
                };
                fetchGeoJSON();
            }
        }
    }, [stateFilter, showBoundary]);


    // Dynamic filter options using Canonical State Names
    const { stateOptions, cityOptions } = useMemo(() => {
        if (!candidates) return { stateOptions: [], cityOptions: [] };
        
        // Use a Set to deduplicate Canonical names
        const uniqueStates = new Set<string>();
        candidates.forEach(c => {
            const canonical = getCanonicalState(c.state);
            if (canonical) uniqueStates.add(canonical);
        });
        
        const stateOpts = Array.from(uniqueStates).sort().map(s => ({ value: s, label: s }));

        let citiesInState: string[] = [];
        if (stateFilter !== 'all') {
            // Filter candidates where canonical state matches the filter
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
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Mapa de Candidatos</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Visualiza geográficamente tus oportunidades de negocio.</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                <FilterButton label="Estatus" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
                <FilterButton label="Etiqueta" options={tagOptions} selectedValue={tagFilter} onSelect={setTagFilter} />
                <FilterButton label="Compañía" options={companyOptions} selectedValue={companyFilter} onSelect={setCompanyFilter} allLabel="Cualquiera" />
                <FilterButton label="Estado" options={stateOptions} selectedValue={stateFilter} onSelect={val => { setStateFilter(val); setCityFilter('all'); }} />
                <FilterButton label="Ciudad" options={cityOptions} selectedValue={cityFilter} onSelect={setCityFilter} disabled={stateFilter === 'all'} />
                <FilterButton label="Puntuación" options={scoreOptions} selectedValue={scoreFilter} onSelect={setScoreFilter} />
                
                {/* Search Term Input with Autocomplete */}
                <div className="relative">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 w-64 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                        <span className="material-symbols-outlined text-slate-400 text-xl mr-2">search</span>
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(true); }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            onKeyDown={handleTagInputKeyDown}
                            placeholder="Buscar..."
                            className="bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200 w-full placeholder-slate-500 dark:placeholder-slate-400"
                        />
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-[1001] max-h-60 overflow-y-auto">
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

                {stateFilter !== 'all' && (
                    <div className="flex items-center gap-2 ml-auto border-l border-slate-200 dark:border-slate-700 pl-4">
                        <input 
                            type="checkbox" 
                            id="showBoundary" 
                            checked={showBoundary} 
                            onChange={(e) => setShowBoundary(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="showBoundary" className="text-sm text-slate-700 dark:text-slate-300">Ver contorno</label>
                    </div>
                )}
                
                {/* Active Search Tags */}
                <div className="flex flex-wrap gap-2 items-center w-full">
                    {searchTags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800">
                            {tag}
                            <button onClick={() => removeSearchTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100 focus:outline-none flex items-center">
                                <span className="material-symbols-outlined !text-sm">close</span>
                            </button>
                        </span>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 min-h-0 relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {cLoading ? (
                    <div className="flex justify-center items-center h-full"><Spinner /></div>
                ) : error ? (
                    <p className="text-center text-red-500 py-12">Error al cargar los candidatos.</p>
                ) : !filteredData || filteredData.length === 0 ? (
                    <EmptyState
                        icon="location_off"
                        title="No hay candidatos"
                        message="No se encontraron candidatos con ubicación válida para los filtros seleccionados."
                    />
                ) : (
                    <div ref={mapContainerRef} className="w-full h-full z-0" />
                )}
            </div>
        </div>
    );
};

export default MapPage;
