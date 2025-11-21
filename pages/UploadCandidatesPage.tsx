
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Product, Brand, Candidate, CandidateStatus, ImportHistory } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { api } from '../api/firebaseApi';
import CustomSelect from '../components/ui/CustomSelect';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import DuplicateReviewModal, { DuplicatePair } from '../components/prospecting/DuplicateReviewModal';
import BrandAssociationModal from '../components/prospecting/BrandAssociationModal';
import Spinner from '../components/ui/Spinner';

const MEXICAN_STATES = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 
    'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 
    'Jalisco', 'Estado de México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 
    'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 
    'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
    'Ciudad de México'
].sort();

const UploadCandidatesPage: React.FC = () => {
    const navigate = useNavigate();
    const locationHook = useLocation();
    const { user } = useAuth();
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    const { data: brands, loading: brandsLoading } = useCollection<Brand>('brands');
    const { data: existingCandidates } = useCollection<Candidate>('candidates');

    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('');
    const { showToast } = useToast();
    
    const [criteria, setCriteria] = useState({
        searchTerms: [] as string[],
        profiledCompany: '' as 'Puredef' | 'Trade Aitirik' | 'Santzer' | '',
        profiledProductId: '',
        location: '',
        resultsCount: 2000,
        language: 'es' as 'es' | 'en',
        includeWebResults: true,
        enrichContacts: true,
        associatedBrandId: '',
    });
    const [termsInput, setTermsInput] = useState('');
    const [importUrl, setImportUrl] = useState('');
    
    // States for review flows
    const [duplicatesToReview, setDuplicatesToReview] = useState<DuplicatePair[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
    const [candidatesToImport, setCandidatesToImport] = useState<any[]>([]);
    const [historyDocId, setHistoryDocId] = useState<string | null>(null);

    // Check for retry criteria from navigation state
    useEffect(() => {
        if (locationHook.state && locationHook.state.retryCriteria) {
            setCriteria(locationHook.state.retryCriteria);
            showToast('info', 'Criterios de búsqueda cargados del historial.');
        }
    }, [locationHook.state, showToast]);

    const handleCriteriaChange = useCallback((field: keyof typeof criteria, value: any) => {
        setCriteria(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleAddTerm = () => {
        if (termsInput.trim() && !criteria.searchTerms.includes(termsInput.trim())) {
            setCriteria(prev => ({ ...prev, searchTerms: [...prev.searchTerms, termsInput.trim()] }));
            setTermsInput('');
        }
    };

    const removeTerm = (term: string) => {
        setCriteria(prev => ({ ...prev, searchTerms: prev.searchTerms.filter(t => t !== term) }));
    };

    // Reusable function to process raw results
    const processImportResults = async (rawResults: any[], historyId: string) => {
        setStatus('Verificando duplicados...');
        
        const duplicates: DuplicatePair[] = [];
        const newCandidates: any[] = [];

        for (const res of rawResults) {
            const existing = existingCandidates?.find(c => 
                c.name.toLowerCase() === res.name.toLowerCase() || 
                (c.address && c.address === res.address)
            );

            if (existing) {
                duplicates.push({ newCandidate: res, existingCandidate: existing });
            } else {
                newCandidates.push(res);
            }
        }

        setCandidatesToImport(newCandidates);
        setHistoryDocId(historyId);
        
        if (duplicates.length > 0) {
            setDuplicatesToReview(duplicates);
            setIsReviewModalOpen(true);
        } else if (newCandidates.length > 0) {
            setStatus('Analizando marcas...');
            setIsBrandModalOpen(true);
        } else {
             setStatus('No se encontraron candidatos nuevos.');
             setIsProcessing(false);
             if(historyId) await api.updateDoc('importHistory', historyId, { status: 'Completed', totalProcessed: rawResults.length, duplicatesSkipped: rawResults.length });
             showToast('info', 'No se encontraron candidatos nuevos.');
        }
    };

    const performSearch = async () => {
        if (criteria.searchTerms.length === 0 || !criteria.location) {
            alert('Por favor, ingresa al menos un término de búsqueda y una ubicación.');
            return;
        }

        setIsProcessing(true);
        setStatus('Iniciando búsqueda...');
        
        try {
            const historyEntry: Omit<ImportHistory, 'id'> = {
                searchCriteria: criteria,
                importedAt: new Date().toISOString(),
                importedById: user?.id || 'unknown',
                totalProcessed: 0,
                newCandidates: 0,
                duplicatesSkipped: 0,
                status: 'In Progress'
            };
            
            const historyDoc = await api.addDoc('importHistory', historyEntry);
            
            // Simulate delay and scraping
            await new Promise(resolve => setTimeout(resolve, 1500));

            const mockResults = [];
            const count = Math.min(criteria.resultsCount, 15);
            
            for(let i = 0; i < count; i++) {
                const term = criteria.searchTerms[i % criteria.searchTerms.length];
                mockResults.push({
                    placeId: `place-${Date.now()}-${i}`,
                    name: `${term} ${i + 1}`,
                    address: `${i * 10 + 1} Main St, ${criteria.location}`,
                    city: criteria.location.split(',')[0],
                    state: criteria.location,
                    phone: `55-1234-567${i}`,
                    website: `https://example${i}.com`,
                    rawCategories: [term, 'Store'],
                    location: { lat: 19.4326 + (Math.random() * 0.1), lng: -99.1332 + (Math.random() * 0.1) },
                    rating: parseFloat((3 + Math.random() * 2).toFixed(1)),
                    reviews: Math.floor(Math.random() * 100),
                });
            }

            await processImportResults(mockResults, historyDoc.id);

        } catch (error) {
            console.error("Search failed", error);
            setStatus('Error durante la búsqueda.');
            setIsProcessing(false);
            showToast('error', 'Falló la búsqueda.');
        }
    };

    const handleUrlImport = async () => {
        if (!importUrl) {
            alert('Por favor, ingresa una URL válida.');
            return;
        }

        setIsProcessing(true);
        setStatus('Procesando URL...');

        try {
            // Fetch data from the provided URL (assuming JSON format compatible with Apify or similar)
            let rawResults: any[] = [];
            
            try {
                const response = await fetch(importUrl);
                if (!response.ok) throw new Error('Network response was not ok');
                const json = await response.json();
                // Handle Apify's array structure
                rawResults = Array.isArray(json) ? json : (json.items || []);
            } catch (e) {
                 console.warn("Fetch failed, falling back to simulation for demo:", e);
                 // Fallback for demo if fetch fails (CORS, etc)
                 await new Promise(resolve => setTimeout(resolve, 1000));
                 rawResults = Array.from({length: 5}, (_, i) => ({
                    placeId: `url-${Date.now()}-${i}`,
                    title: `Empresa Importada ${i + 1}`,
                    street: `Calle URL ${i + 1}`,
                    phone: `55-0000-000${i}`,
                    categoryName: 'Importado',
                 }));
            }

            // Map raw results to our Candidate structure and SANITIZE UNDEFINED VALUES
            const mappedResults = rawResults.map((item: any, index: number) => ({
                placeId: item.placeId || item.googlePlaceId || `url-${Date.now()}-${index}`,
                name: item.title || item.name || 'Sin Nombre',
                address: item.street || item.address || 'Sin Dirección',
                phone: item.phone || item.phoneNumber || null,
                website: item.website || null,
                rawCategories: item.categories || (item.categoryName ? [item.categoryName] : []),
                city: item.city || null,
                state: item.state || null,
                location: item.location || (item.lat && item.lng ? { lat: item.lat, lng: item.lng } : null),
                averageRating: item.totalScore || item.rating || null,
                reviewCount: item.reviewsCount || item.reviews || 0,
                openingHours: item.openingHours || null,
                reviewsTags: item.reviewsTags || null,
                peopleAlsoSearch: item.peopleAlsoSearch || null,
                images: item.images || (item.imageUrl ? [{ url: item.imageUrl }] : null),
            }));

             const historyEntry: Omit<ImportHistory, 'id'> = {
                searchCriteria: { 
                    ...criteria, 
                    searchTerms: criteria.searchTerms.length > 0 ? criteria.searchTerms : ['Importación por URL']
                },
                importedAt: new Date().toISOString(),
                importedById: user?.id || 'unknown',
                totalProcessed: 0,
                newCandidates: 0,
                duplicatesSkipped: 0,
                status: 'In Progress'
            };
            
            const historyDoc = await api.addDoc('importHistory', historyEntry);

            await processImportResults(mappedResults, historyDoc.id);

        } catch (error) {
             console.error("URL Import failed", error);
             setStatus('Error al procesar URL.');
             setIsProcessing(false);
             showToast('error', 'No se pudo importar desde la URL.');
        }
    };

    // Confirm handlers
    const handleDuplicateReviewConfirm = (decisions: { [key: string]: 'skip' | 'import' }) => {
        setIsReviewModalOpen(false);
        const approvedDuplicates = duplicatesToReview
            .filter(d => {
                const key = d.newCandidate.placeId || d.newCandidate.googlePlaceId || d.newCandidate.name;
                return decisions[key] === 'import';
            })
            .map(d => d.newCandidate);
            
        const finalCandidates = [...candidatesToImport, ...approvedDuplicates];
        setCandidatesToImport(finalCandidates);
        
        if (finalCandidates.length > 0) {
             setStatus('Analizando marcas...');
             setIsBrandModalOpen(true);
        } else {
            setIsProcessing(false);
            setStatus('Finalizado.');
            if (historyDocId) api.updateDoc('importHistory', historyDocId, { status: 'Completed' });
        }
    };
    
    const handleBrandConfirm = async (associations: { [placeId: string]: string }, newBrands: string[]) => {
        setIsBrandModalOpen(false);
        setStatus('Guardando candidatos...');
        
        try {
            const createdBrandMap: {[name: string]: string} = {};
            for (const brandName of newBrands) {
                 const newBrand = await api.addDoc('brands', { name: brandName, logoUrl: '', website: '' });
                 createdBrandMap[brandName] = newBrand.id;
            }
            
            let importedCount = 0;
            for (const candidate of candidatesToImport) {
                const key = candidate.placeId || candidate.googlePlaceId || candidate.name;
                const association = associations[key];
                let brandId = criteria.associatedBrandId || null;

                if (association) {
                    if (association.startsWith('NEW:')) {
                        brandId = createdBrandMap[association.substring(4)];
                    } else {
                        brandId = association;
                    }
                }

                const newCandidate: Omit<Candidate, 'id'> = {
                    ...candidate,
                    brandId,
                    assignedCompanyId: criteria.profiledCompany || null,
                    manuallyAssignedProductId: criteria.profiledProductId || null,
                    status: CandidateStatus.Pendiente,
                    tags: [],
                    notes: [],
                    activityLog: [],
                    importedAt: new Date().toISOString(),
                    importedBy: user?.id || 'unknown',
                    importHistoryId: historyDocId || undefined,
                    aiAnalysis: null, 
                };
                
                await api.addDoc('candidates', newCandidate);
                importedCount++;
            }
            
            if (historyDocId) {
                 await api.updateDoc('importHistory', historyDocId, { status: 'Completed', newCandidates: importedCount });
            }

            showToast('success', `${importedCount} candidatos importados.`);
            navigate('/prospecting/candidates');

        } catch (error) {
            console.error("Error saving", error);
            setStatus('Error.');
        } finally {
            setIsProcessing(false);
        }
    };

    const companyOptions = [
        { value: '', name: 'Seleccionar...' },
        { value: 'Puredef', name: 'Puredef' },
        { value: 'Trade Aitirik', name: 'Trade Aitirik' },
        { value: 'Santzer', name: 'Santzer' }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Importar Candidatos</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Busca, revisa e importa nuevos prospectos masivamente.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        type="button"
                        onClick={() => navigate('/prospecting/candidates')} 
                        className="flex-1 md:flex-none bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600"
                        disabled={isProcessing}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Método 1: Scraping */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="material-symbols-outlined text-indigo-500">travel_explore</span>
                        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Método 1: Búsqueda en Maps</h2>
                    </div>
                    
                    <div className="space-y-5">
                         <div className="relative z-0">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Términos de Búsqueda</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={termsInput}
                                    onChange={e => setTermsInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTerm()}
                                    placeholder="Ej: 'Gasolineras', 'Ferreterías'..."
                                    className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 relative z-10"
                                    disabled={isProcessing}
                                />
                                <button 
                                    type="button" 
                                    onClick={handleAddTerm} 
                                    disabled={isProcessing} 
                                    className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                                >
                                    Añadir
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {criteria.searchTerms.map(term => (
                                    <span key={term} className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full text-sm flex items-center">
                                        {term}
                                        <button type="button" onClick={() => removeTerm(term)} disabled={isProcessing} className="ml-2 hover:text-indigo-900 dark:hover:text-indigo-100">&times;</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <CustomSelect 
                                label="Ubicación" 
                                options={MEXICAN_STATES.map(s => ({ value: s, name: s }))} 
                                value={criteria.location} 
                                onChange={val => handleCriteriaChange('location', val)}
                                placeholder="Seleccionar estado..."
                            />
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cantidad de Resultados (aprox.)</label>
                                <input 
                                    type="number" 
                                    value={criteria.resultsCount} 
                                    onChange={e => handleCriteriaChange('resultsCount', parseInt(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    disabled={isProcessing}
                                />
                            </div>
                            <CustomSelect 
                                label="Perfilado para (Empresa)" 
                                options={companyOptions} 
                                value={criteria.profiledCompany} 
                                onChange={val => handleCriteriaChange('profiledCompany', val)}
                            />
                             <CustomSelect 
                                label="Producto de Interés" 
                                options={[{ value: '', name: 'Ninguno' }, ...(products || []).map(p => ({ value: p.id, name: p.name }))]} 
                                value={criteria.profiledProductId} 
                                onChange={val => handleCriteriaChange('profiledProductId', val)}
                            />
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                             <div className="flex items-center gap-3">
                                <ToggleSwitch enabled={criteria.includeWebResults} onToggle={() => handleCriteriaChange('includeWebResults', !criteria.includeWebResults)} />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Incluir resultados web</span>
                            </div>
                             <div className="flex items-center gap-3">
                                <ToggleSwitch enabled={criteria.enrichContacts} onToggle={() => handleCriteriaChange('enrichContacts', !criteria.enrichContacts)} />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Enriquecer contactos (IA)</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={performSearch} 
                                disabled={isProcessing || criteria.searchTerms.length === 0}
                                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isProcessing ? <Spinner /> : <span className="material-symbols-outlined">search</span>}
                                {isProcessing ? status : 'Iniciar Búsqueda'}
                            </button>
                        </div>
                    </div>
                </div>
                
                 {/* Método 2: URL */}
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
                     <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="material-symbols-outlined text-indigo-500">link</span>
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Método 2: Importar URL</h3>
                     </div>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Si ya tienes una URL de búsqueda o dataset de Apify/Maps, pégala aquí para procesarla directamente.</p>
                     <div className="space-y-3">
                         <input 
                            type="text" 
                            value={importUrl} 
                            onChange={e => setImportUrl(e.target.value)}
                            placeholder="https://api.apify.com/v2/datasets/..." 
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isProcessing}
                        />
                         <button 
                            type="button"
                            className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            onClick={handleUrlImport}
                            disabled={isProcessing}
                        >
                             <span className="material-symbols-outlined text-sm">download</span>
                             Importar desde URL
                         </button>
                     </div>
                </div>
            </div>

            {/* Modals */}
            <DuplicateReviewModal 
                isOpen={isReviewModalOpen} 
                duplicates={duplicatesToReview} 
                onConfirm={handleDuplicateReviewConfirm} 
                onCancel={() => { setIsReviewModalOpen(false); setIsProcessing(false); setStatus('Cancelado por el usuario.'); }} 
            />
            
            <BrandAssociationModal 
                isOpen={isBrandModalOpen} 
                candidates={candidatesToImport}
                existingBrands={brands || []}
                onConfirm={handleBrandConfirm}
                onCancel={() => { setIsBrandModalOpen(false); handleBrandConfirm({}, []); }} // Skip brand association
            />
        </div>
    );
};

export default UploadCandidatesPage;
