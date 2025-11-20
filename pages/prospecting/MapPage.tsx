
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Candidate, CandidateStatus } from '../../types';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import FilterButton from '../../components/ui/FilterButton';

// Declare Leaflet types locally since we are using CDN
declare const L: any;

declare global {
    interface Window {
        navigateToCandidate: (id: string) => void;
    }
}

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

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [showBoundary, setShowBoundary] = useState(true);

    // Expose navigate function to window for Leaflet popup access
    useEffect(() => {
        window.navigateToCandidate = (id: string) => {
            navigate(`/prospecting/candidates/${id}`);
        };
    }, [navigate]);
    
    const filteredData = useMemo(() => {
        if (!candidates) return [];
        return candidates.filter(c => {
            const statusMatch = statusFilter === 'all' || c.status === statusFilter;
            const stateMatch = stateFilter === 'all' || c.state === stateFilter;
            const cityMatch = cityFilter === 'all' || c.city === cityFilter;
            // Filter out candidates without valid location
            const hasLocation = c.location && c.location.lat && c.location.lng;

            return statusMatch && stateMatch && cityMatch && hasLocation;
        });
    }, [candidates, statusFilter, stateFilter, cityFilter]);

    // --- MAP INITIALIZATION & MARKERS ---
    useEffect(() => {
        if (mapContainerRef.current && !cLoading) {
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
                        if(markers.length > 0) {
                            mapRef.current.fitBounds(markersRef.current.getBounds(), { padding: [50, 50] });
                        }
                    } catch (e) {
                        console.warn("Could not fit bounds (maybe single point or invalid bounds)");
                    }
                }
            }
        }
    }, [filteredData, cLoading, stateFilter]);


    // --- STATE BOUNDARY GEOJSON EFFECT ---
    useEffect(() => {
        // Only run if map exists
        if (mapRef.current) {
            // Remove existing boundary if any
            if (boundaryLayerRef.current) {
                mapRef.current.removeLayer(boundaryLayerRef.current);
                boundaryLayerRef.current = null;
            }

            if (stateFilter !== 'all' && showBoundary) {
                const fetchGeoJSON = async () => {
                    try {
                        const response = await fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/mexico.geojson');
                        
                        if (!response.ok) {
                             throw new Error(`Failed to fetch state boundaries: ${response.statusText}`);
                        }

                        const data = await response.json();
                        
                        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        const targetState = normalize(stateFilter);

                        const stateFeature = data.features.find((f: any) => {
                            const name = f.properties.state_name || f.properties.name;
                            if (!name) return false;
                            const normalizedName = normalize(name);
                            
                            if ((targetState === 'cdmx' || targetState === 'ciudad de mexico') && (normalizedName === 'distrito federal' || normalizedName === 'ciudad de mexico')) {
                                return true;
                            }
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
    

    const statusOptions = Object.values(CandidateStatus).map(s => ({ value: s, label: s }));

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
                <FilterButton label="Estado" options={stateOptions} selectedValue={stateFilter} onSelect={val => { setStateFilter(val); setCityFilter('all'); }} />
                <FilterButton label="Ciudad" options={cityOptions} selectedValue={cityFilter} onSelect={setCityFilter} disabled={stateFilter === 'all'} />
                
                {stateFilter !== 'all' && (
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
                {cLoading ? (
                    <div className="flex justify-center items-center h-full"><Spinner /></div>
                ) : error ? (
                    <p className="text-center text-red-500 py-12">Error al cargar los candidatos.</p>
                ) : !filteredData || filteredData.length === 0 ? (
                    <EmptyState
                        icon="location_off"
                        title="No hay candidatos con ubicación"
                        message="Tus candidatos actuales no tienen coordenadas válidas para mostrar en el mapa."
                    />
                ) : (
                    <div ref={mapContainerRef} className="w-full h-full z-0" />
                )}
            </div>
        </div>
    );
};

export default MapPage;
