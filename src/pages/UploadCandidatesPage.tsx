import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    
    // States for review flows
    const [duplicatesToReview, setDuplicatesToReview] = useState<DuplicatePair[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
    const [candidatesToImport, setCandidatesToImport] = useState<any[]>([]);
    const [historyDocId, setHistoryDocId] = useState<string | null>(null);


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

    // Mock Search function (simulates Google Maps scraping)
    const performSearch = async () => {
        if (criteria.searchTerms.length === 0 || !criteria.location) {
            alert('Por favor, ingresa al menos un término de búsqueda y una ubicación.');
            return;
        }

        setIsProcessing(true);
        setStatus('Iniciando búsqueda...');
        
        try {
            // 1. Create Import History Record
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
            setHistoryDocId(historyDoc.id);

            setStatus('Scraping Google Maps (Simulado)...');
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Generate Mock Data based on search terms
            const mockResults = [];
            const count = Math.min(criteria.resultsCount, 15); // Limit for mock
            
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
                    rating: (3 + Math.random() * 2).toFixed(1),
                    reviews: Math.floor(Math.random() * 100),
                });
            }

            setStatus('Verificando duplicados...');
            
            // Check Duplicates
            const duplicates: DuplicatePair[] = [];
            const newCandidates: any[] = [];

            for (const res of mockResults) {
                // Simple duplicate check by name (case insensitive) or exact address
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
            
            if (duplicates.length > 0) {
                setDuplicatesToReview(duplicates);
                setIsReviewModalOpen(true);
            } else if (newCandidates.length > 0) {
                // If no duplicates, proceed to Brand Association check
                setStatus('Analizando marcas...');
                setIsBrandModalOpen(true);
            } else {
                 setStatus('No se encontraron candidatos nuevos.');
                 setIsProcessing(false);
                 if(historyDocId) await api.updateDoc('importHistory', historyDocId, { status: 'Completed', totalProcessed: count, duplicatesSkipped: count });
            }

        } catch (error) {
            console.error("Search failed", error);
            setStatus('Error durante la búsqueda.');
            setIsProcessing(false);
            if(historyDocId) await api.updateDoc('importHistory', historyDocId, { status: 'Failed' });
        }
    };

    const handleDuplicateReviewConfirm = (decisions: { [key: string]: 'skip' | 'import' }) => {
        setIsReviewModalOpen(false);
        const approvedDuplicates = duplicatesToReview
            .filter(d => decisions[d.newCandidate.placeId] === 'import')
            .map(d => d.newCandidate);
            
        const finalCandidates = [...candidatesToImport, ...approvedDuplicates];
        setCandidatesToImport(finalCandidates);
        
        if (finalCandidates.length > 0) {
             setStatus('Analizando marcas...');
             setIsBrandModalOpen(true);
        } else {
            setIsProcessing(false);
            setStatus('Proceso finalizado sin importaciones.');
             // Update history
            if (historyDocId) {
                 const skipped = duplicatesToReview.length - approvedDuplicates.length;
                 api.updateDoc('importHistory', historyDocId, { status: 'Completed', totalProcessed: duplicatesToReview.length, duplicatesSkipped: skipped, newCandidates: 0 });
            }
        }
    };
    
    const handleBrandConfirm = async (associations: { [placeId: string]: string }, newBrands: string[]) => {
        setIsBrandModalOpen(false);
        setStatus('Guardando candidatos...');
        
        try {
            // 1. Create new brands if any
            const createdBrandMap: {[name: string]: string} = {};
            for (const brandName of newBrands) {
                 const newBrand = await api.addDoc('brands', { name: brandName, logoUrl: '', website: '' });
                 createdBrandMap[brandName] = newBrand.id;
            }
            
            let importedCount = 0;

            // 2. Save candidates
            for (const candidate of candidatesToImport) {
                const association = associations[candidate.placeId];
                let brandId = criteria.associatedBrandId || null; // Default from criteria

                if (association) {
                    if (association.startsWith('NEW:')) {
                        const brandName = association.substring(4);
                        brandId = createdBrandMap[brandName];
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
                    importHistoryId: historyDocId || undefined
                };
                
                await api.addDoc('candidates', newCandidate);
                importedCount++;
            }
            
             if (historyDocId) {
                 const skipped = duplicatesToReview.length - (candidatesToImport.length - (duplicatesToReview.length > 0 ? duplicatesToReview.length : 0)); // Approximation
                 await api.updateDoc('importHistory', historyDocId, { 
                     status: 'Completed', 
                     totalProcessed: candidatesToImport.length + skipped, 
                     newCandidates: importedCount,
                     duplicatesSkipped: skipped
                 });
            }

            showToast('success', `${importedCount} candidatos importados exitosamente.`);
            navigate('/prospecting/candidates');

        } catch (error) {
            console.error("Error saving candidates:", error);
            setStatus('Error al guardar.');
             if (historyDocId) await api.updateDoc('importHistory', historyDocId, { status: 'Failed' });
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
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Importar Candidatos</h1>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Criterios de Búsqueda (Scraping)</h2>
                
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Términos de Búsqueda</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={termsInput}
                                onChange={e => setTermsInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTerm()}
                                placeholder="Ej: 'Gasolineras', 'Ferreterías'..."
                                className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={isProcessing}
                            />
                            <button onClick={handleAddTerm} disabled={isProcessing} className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Añadir</button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {criteria.searchTerms.map(term => (
                                <span key={term} className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full text-sm flex items-center">
                                    {term}
                                    <button onClick={() => removeTerm(term)} disabled={isProcessing} className="ml-2 hover:text-indigo-900 dark:hover:text-indigo-100">&times;</button>
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="flex flex-wrap gap-6 pt-2">
                         <div className="flex items-center gap-3">
                            <ToggleSwitch enabled={criteria.includeWebResults} onToggle={() => handleCriteriaChange('includeWebResults', !criteria.includeWebResults)} />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Incluir resultados web</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <ToggleSwitch enabled={criteria.enrichContacts} onToggle={() => handleCriteriaChange('enrichContacts', !criteria.enrichContacts)} />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Enriquecer contactos (IA)</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                     <button 
                        onClick={performSearch} 
                        disabled={isProcessing || criteria.searchTerms.length === 0}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isProcessing ? <Spinner /> : <span className="material-symbols-outlined">search</span>}
                        {isProcessing ? status : 'Iniciar Búsqueda e Importación'}
                    </button>
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