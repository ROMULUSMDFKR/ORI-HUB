
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Candidate, CandidateStatus, Brand } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';

// Declare Leaflet types locally since we are using CDN
declare const L: any;

// Add type definition for the global function
declare global {
    interface Window {
        navigateToCandidate: (id: string) => void;
    }
}

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

    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any>(null);
    const boundaryLayerRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [tagFilter, setTagFilter] = useState<string>('all');
    const [companyFilter, setCompanyFilter] = useState<string>('all');
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [scoreFilter, setScoreFilter] = useState<string>('all');
    const [showBoundary, setShowBoundary] = useState(true);

    const loading = cLoading || bLoading;

    // Expose navigate function to window for Leaflet popup access
    useEffect(() => {
        window.navigateToCandidate = (id: string) => {
            navigate(`/prospecting/candidates/${id}`);
        };
        return () => {
            // Optional cleanup
             // delete window.navigateToCandidate;
        };
    }, [navigate]);
    
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

    // --- MAP INITIALIZATION & MARKERS ---
    useEffect(() => {
        if (viewMode === 'map' && mapContainerRef.current && !loading) {
            // Initialize Map if not already done
            if (!mapRef.current) {
                // Default center (Mexico center roughly)
                mapRef.current = L.map(mapContainerRef.current).setView([23.6345, -102.5528], 5);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(mapRef.current);

                markersRef.current = L.markerClusterGroup({
                    showCoverageOnHover: false,
                    maxClusterRadius: 50, // Adjust for density
                });
                mapRef.current.addLayer(markersRef.current);
            }

            // Clear existing markers
            if (markersRef.current) {
                markersRef.current.clearLayers();
            }

            // Add new markers based on filteredData
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
                        
                        // Popup Content - Redesigned for better UX and reliable click handling
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
                
                // Only fit bounds if no state filter is active (otherwise state boundary takes precedence)
                if (stateFilter === 'all') {
                    try {
                        mapRef.current.fitBounds(markersRef.current.getBounds(), { padding: [50, 50] });
                    } catch (e) {
                        console.warn("Could not fit bounds (maybe single point or invalid bounds)");
                    }
                }
            }
        }
        
        // Cleanup on unmount is handled by ref persistence for this SPA logic
    }, [viewMode, filteredData, loading, stateFilter]);


    // --- STATE BOUNDARY GEOJSON EFFECT ---
    useEffect(() => {
        // Only run if map exists and we have a specific state filter
        if (viewMode === 'map' && mapRef.current) {
            
            // Remove existing boundary if any
            if (boundaryLayerRef.current) {
                mapRef.current.removeLayer(boundaryLayerRef.current);
                boundaryLayerRef.current = null;
            }

            if (stateFilter !== 'all' && showBoundary) {
                const fetchGeoJSON = async () => {
                    try {
                        // Using a reliable public source for Mexico States GeoJSON (CodeForAmerica)
                        const response = await fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/mexico.geojson');
                        
                        if (!response.ok) {
                             throw new Error(`Failed to fetch state boundaries: ${response.statusText}`);
                        }

                        const data = await response.json();
                        
                        // Normalize strings to match (remove accents, lowercase)
                        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        const targetState = normalize(stateFilter);

                        // Find the feature that matches the state name
                        // Note: The GeoJSON property keys might vary, usually 'state_name' or 'name'
                        const stateFeature = data.features.find((f: any) => {
                            const name = f.properties.state_name || f.properties.name;
                            if (!name) return false;
                            const normalizedName = normalize(name);
                            
                            // Handle CDMX special case
                            if ((targetState === 'cdmx' || targetState === 'ciudad de mexico') && (normalizedName === 'distrito federal' || normalizedName === 'ciudad de mexico')) {
                                return true;
                            }
                             // Handle State of Mexico special case
                            if ((targetState === 'estado de mexico' || targetState === 'mexico') && (normalizedName === 'mexico' || normalizedName === 'estado de mexico')) {
                                return true;
                            }

                            return normalizedName === targetState;
                        });

                        if (stateFeature) {
                            boundaryLayerRef.current = L.geoJSON(stateFeature, {
                                style: {
                                    color: '#6366f1', // Indigo-500
                                    weight: 3,
                                    opacity: 0.8,
                                    fillColor: '#6366f1',
                                    fillOpacity: 0.1
                                }
                            }).addTo(mapRef.current);

                            // Zoom to the state boundary
                            mapRef.current.fitBounds(boundaryLayerRef.current.getBounds());
                        }
                    } catch (error) {
                        console.error("Error loading state boundary:", error);
                    }
                };
                
                fetchGeoJSON();
            }
        }
    }, [stateFilter, viewMode, showBoundary]);


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
    
    const viewOptions: ViewOption[] = [
        { id: 'list', name: 'Lista', icon: 'list' },
        { id: 'map', name: 'Mapa', icon: 'map' },
    ];

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Candidatos de Prospección</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona, califica y convierte datos crudos en prospectos de valor.</p>
                </div>
                <div className="flex items-center gap-3">
                    <ViewSwitcher views={viewOptions} activeView={viewMode} onViewChange={(v) => setViewMode(v as 'list' | 'map')} />
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
                
                {viewMode === 'map' && stateFilter !== 'all' && (
                    <div className="flex items-center gap-2 ml-auto border-l border-slate-200 dark:border-slate-700 pl-4">
                        <input 
                            type="checkbox" 
                            id="showBoundary" 
                            checked={showBoundary} 
                            onChange={(e) => setShowBoundary(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="showBoundary" className="text-sm text-slate-700 dark:text-slate-300">Ver contorno del estado</label>
                    </div>
                )}
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
                        message="Importa una nueva lista de candidatos para empezar a calificar."
                        actionText="Importar Datos"
                        onAction={() => navigate('/prospecting/upload')}
                    />
                ) : viewMode === 'list' ? (
                    <div className="h-full overflow-y-auto">
                        <Table columns={columns} data={filteredData} onRowClick={handleRowClick} />
                    </div>
                ) : (
                    <div ref={mapContainerRef} className="w-full h-full z-0" />
                )}
            </div>
        </div>
    );
};

export default CandidatesPage;
