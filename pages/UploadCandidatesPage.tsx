import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImportHistory, Candidate, CandidateStatus, Product, Brand, Notification } from '../types';
import { useCollection } from '../hooks/useCollection';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import CustomSelect from '../components/ui/CustomSelect';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import DuplicateReviewModal, { DuplicatePair } from '../components/prospecting/DuplicateReviewModal';
import { useToast } from '../hooks/useToast';

const MEXICAN_STATES = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 
    'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 
    'Jalisco', 'Estado de México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 
    'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 
    'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
    'Ciudad de México', 'CDMX'
].sort();

const UploadCandidatesPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    const { data: brands, loading: brandsLoading } = useCollection<Brand>('brands');
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
    
    const [importUrl, setImportUrl] = useState('https://api.apify.com/v2/datasets/VxgZIyWoqWt3ZKnsZ/items?format=json&clean=false');
    
    // States for duplicate review flow
    const [duplicatesToReview, setDuplicatesToReview] = useState<DuplicatePair[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [candidatesToImport, setCandidatesToImport] = useState<any[]>([]);
    const [historyDocId, setHistoryDocId] = useState<string | null>(null);


    const handleCriteriaChange = useCallback((field: keyof typeof criteria, value: any) => {
        setCriteria(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleProcessTerms = () => {
        const terms = termsInput
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
        
        const uniqueTerms = [...new Set([...criteria.searchTerms, ...terms])];
        handleCriteriaChange('searchTerms', uniqueTerms);
        setTermsInput(''); // Clear textarea after processing
    };

    const handleRemoveSearchTerm = (termToRemove: string) => {
        setCriteria(prev => ({ ...prev, searchTerms: prev.searchTerms.filter(t => t !== termToRemove) }));
    };
    
    const processAndSaveCandidates = async (
        candidatesToProcess: any[],
        skipPlaceIds: Set<string>,
        historyId: string
    ) => {
        setStatus('4/5 - Guardando registros...');
        let newCandidatesCount = 0;
        
        const existingCandidates: Candidate[] = await api.getCollection('candidates');
        const existingPlaceIds = new Set(existingCandidates.map(c => c.googlePlaceId).filter(Boolean));
        
        const duplicatesSkippedCount = skipPlaceIds.size;
    
        for (const rawCandidate of candidatesToProcess) {
            const placeId = rawCandidate.placeId || rawCandidate.googlePlaceId;

            if (placeId && skipPlaceIds.has(placeId)) {
                continue;
            }
            
            if (placeId && existingPlaceIds.has(placeId) && !duplicatesToReview.some(d => (d.newCandidate.placeId || d.newCandidate.googlePlaceId) === placeId)) {
                continue;
            }

            let city = (rawCandidate.city || rawCandidate.City) || null;
            let state = (rawCandidate.state || rawCandidate.State) || null;

            // Normalize Mexico City to CDMX
            if (city === 'Mexico City' || city === 'Ciudad de México') city = 'CDMX';
            if (state === 'Mexico City' || state === 'Ciudad de México') state = 'CDMX';

            if (!state && rawCandidate.address) {
                const addressParts = rawCandidate.address.split(',').map((p: string) => p.trim());
                
                // Check for Mexico City in address
                if (addressParts.some((p: string) => p === 'Mexico City' || p === 'Ciudad de México')) {
                    state = 'CDMX';
                    city = 'CDMX';
                } else {
                    const foundState = addressParts.find((part: string) => MEXICAN_STATES.includes(part));
                    if (foundState) {
                        state = foundState;
                        const stateIndex = addressParts.indexOf(foundState);
                        if (stateIndex > 0) {
                            city = addressParts[stateIndex - 1];
                        }
                    }
                }
            }
            
            const newCandidate: Partial<Candidate> = {
                name: rawCandidate.title || 'Sin Nombre',
                description: rawCandidate.description || null,
                price: rawCandidate.price || null,
                emails: rawCandidate.emails || [],
                phones: rawCandidate.phones || [],
                linkedIns: rawCandidate.linkedIns || [],
                facebooks: rawCandidate.facebooks || [],
                instagrams: rawCandidate.instagrams || [],
                twitters: rawCandidate.twitters || [],
                address: rawCandidate.address || null,
                phone: rawCandidate.phone || (rawCandidate.phones && rawCandidate.phones[0]) || null,
                website: rawCandidate.website || null,
                email: rawCandidate.emails?.[0] || null,
                googleMapsUrl: rawCandidate.url || null,
                googlePlaceId: placeId || null, 
                location: rawCandidate.location || null,
                rawCategories: rawCandidate.categories || (rawCandidate.categoryName ? [rawCandidate.categoryName] : []),
                status: CandidateStatus.Pendiente,
                tags: criteria.searchTerms,
                notes: [],
                activityLog: [],
                reviews: rawCandidate.reviews || [],
                averageRating: rawCandidate.totalScore || 0,
                reviewCount: rawCandidate.reviewsCount || 0,
                openingHours: rawCandidate.openingHours || null,
                imageUrl: rawCandidate.imageUrls?.[0] || null,
                importedAt: new Date().toISOString(),
                importedBy: user!.id,
                importHistoryId: historyId,
                city: city || null,
                state: state || null,
                brandId: criteria.associatedBrandId || null,
                assignedCompanyId: criteria.profiledCompany || undefined,
                manuallyAssignedProductId: criteria.profiledProductId || undefined,
                webResults: rawCandidate.webResults || [],
                reviewsTags: rawCandidate.reviewsTags || [],
                placesTags: rawCandidate.placesTags || [],
                peopleAlsoSearch: rawCandidate.peopleAlsoSearch || [],
                questionsAndAnswers: rawCandidate.questionsAndAnswers || [],
                reviewsDistribution: rawCandidate.reviewsDistribution || null,
            };

            await api.addDoc('candidates', newCandidate);
            newCandidatesCount++;

            if(placeId) {
                existingPlaceIds.add(placeId);
            }
        }
    
        setStatus('5/5 - Finalizando y actualizando historial...');
        await api.updateDoc('importHistory', historyId, {
            newCandidates: newCandidatesCount,
            duplicatesSkipped: duplicatesSkippedCount,
            status: 'Completed',
        });
    
        setStatus('¡Importación completada!');
        showToast('success', `Importación completada: ${newCandidatesCount} nuevos candidatos añadidos, ${duplicatesSkippedCount} duplicados omitidos.`);
        
        if (user) {
            const notification = {
                userId: user.id,
                title: 'Importación Finalizada',
                message: `La importación de ${candidatesToProcess.length} candidatos ha finalizado.`,
                type: 'system' as 'system',
                link: `/prospecting/history`,
                isRead: false,
                createdAt: new Date().toISOString(),
            };
            await api.addDoc('notifications', notification);
        }

        navigate('/prospecting/candidates');
    };

    const handleImportFromUrl = async () => {
        if (!importUrl.trim() || criteria.searchTerms.length === 0 || !criteria.location) {
            showToast('warning', 'Por favor, completa todos los campos de criterios de búsqueda (*) y la URL.');
            return;
        }
        if (!user) {
            showToast('error', 'No se pudo identificar al usuario.');
            return;
        }
    
        setIsProcessing(true);
        setStatus('Iniciando importación...');
        let tempHistoryDocId: string | null = null;
    
        try {
            setStatus('1/5 - Creando registro de historial...');
            const historyEntry: Omit<ImportHistory, 'id'> = {
                searchCriteria: criteria,
                importedAt: new Date().toISOString(),
                importedById: user.id,
                totalProcessed: 0,
                newCandidates: 0,
                duplicatesSkipped: 0,
                status: 'In Progress'
            };
            const historyDoc = await api.addDoc('importHistory', historyEntry);
            tempHistoryDocId = historyDoc.id;
            setHistoryDocId(tempHistoryDocId);
    
            setStatus('2/5 - Descargando registros...');
            const response = await fetch(importUrl);
            if (!response.ok) throw new Error(`Error al descargar: ${response.statusText}`);
            const candidatesData = await response.json();
            if (!Array.isArray(candidatesData)) throw new Error("El formato de datos no es un array válido.");
            
            setCandidatesToImport(candidatesData);
            await api.updateDoc('importHistory', tempHistoryDocId, { totalProcessed: candidatesData.length });
    
            setStatus('3/5 - Verificando duplicados...');
            const existingCandidates: Candidate[] = await api.getCollection('candidates');
            const existingCandidatesMap = new Map(existingCandidates.map(c => [c.googlePlaceId, c]));
            
            const foundDuplicates: DuplicatePair[] = [];
            const processedPlaceIds = new Set<string>();

            for (const rawCandidate of candidatesData) {
                const placeId = rawCandidate.placeId || rawCandidate.googlePlaceId;
                if (placeId && !processedPlaceIds.has(placeId) && existingCandidatesMap.has(placeId)) {
                    foundDuplicates.push({
                        newCandidate: rawCandidate,
                        existingCandidate: existingCandidatesMap.get(placeId)!
                    });
                }
                if (placeId) processedPlaceIds.add(placeId);
            }
    
            if (foundDuplicates.length > 0) {
                setStatus('Duplicados encontrados, esperando revisión...');
                setDuplicatesToReview(foundDuplicates);
                setIsReviewModalOpen(true);
            } else {
                await processAndSaveCandidates(candidatesData, new Set(), tempHistoryDocId);
                setIsProcessing(false);
            }
    
        } catch (error: any) {
            const errorMessage = `Error: ${error.message}`;
            setStatus(errorMessage);
            showToast('error', `Ocurrió un error: ${error.message}`);
            if (tempHistoryDocId) {
                await api.updateDoc('importHistory', tempHistoryDocId, { status: 'Failed' });
            }
            setIsProcessing(false);
        }
    };
    
    const handleConfirmReview = async (decisions: { [key: string]: 'skip' | 'import' }) => {
        setIsReviewModalOpen(false);
        if (!historyDocId) return;

        const skipPlaceIds = new Set<string>();
        for (const duplicate of duplicatesToReview) {
            const placeId = duplicate.newCandidate.placeId || duplicate.newCandidate.googlePlaceId;
            if (placeId && (decisions[placeId] === 'skip' || !decisions[placeId])) {
                skipPlaceIds.add(placeId);
            }
        }
        
        await processAndSaveCandidates(candidatesToImport, skipPlaceIds, historyDocId);
        setIsProcessing(false);
    };

    const handleCancelReview = async () => {
        setIsReviewModalOpen(false);
        setIsProcessing(false);
        setStatus('Importación cancelada por el usuario.');
        if (historyDocId) {
            await api.updateDoc('importHistory', historyDocId, { status: 'Cancelled' });
        }
    };

    const companyOptions = [
        { value: '', name: 'No aplica / Se definirá después' },
        { value: 'Puredef', name: 'Puredef' },
        { value: 'Trade Aitirik', name: 'Trade Aitirik' },
        { value: 'Santzer', name: 'Santzer' }
    ];

    const productOptions = useMemo(() => {
        if (!products) return [{ value: '', name: 'No aplica / Se definirá después' }];
        return [
            { value: '', name: 'No aplica / Se definirá después' },
            ...products.map(p => ({ value: p.id, name: p.name }))
        ];
    }, [products]);

    const brandOptions = useMemo(() => {
        if (!brands) return [{ value: '', name: 'No aplica / Se definirá después' }];
        return [
            { value: '', name: 'No aplica / Se definirá después' },
            ...brands.map(b => ({ value: b.id, name: b.name }))
        ];
    }, [brands]);
    
    const locationOptions = [
        { value: 'Todo México', name: 'Todo México' },
        { isSeparator: true } as const,
        ...MEXICAN_STATES.map(s => ({ value: s, name: s }))
    ];

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Importar Candidatos</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Define los criterios de búsqueda, configura las opciones y sube tu lote de candidatos.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Paso 1: Definir Criterios de Búsqueda</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Términos de búsqueda *</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Pega una lista de términos separados por comas. Se convertirán en etiquetas para los candidatos importados.</p>
                            <textarea
                                value={termsInput}
                                onChange={e => setTermsInput(e.target.value)}
                                rows={5}
                                placeholder="Transportes de carga, Empresa de transporte, Servicios de fletes..."
                                className="w-full"
                            />
                            <button type="button" onClick={handleProcessTerms} className="mt-2 border border-indigo-600 text-indigo-600 font-semibold py-2 px-4 rounded-lg">Procesar y Añadir Términos</button>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {criteria.searchTerms.map(term => (
                                    <span key={term} className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                                        {term}
                                        <button onClick={() => handleRemoveSearchTerm(term)} className="ml-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">&times;</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomSelect 
                                label="Perfilado para (Empresa)"
                                options={companyOptions}
                                value={criteria.profiledCompany}
                                onChange={(val) => handleCriteriaChange('profiledCompany', val as any)}
                            />
                            <CustomSelect 
                                label="Producto perfilado"
                                options={productOptions}
                                value={criteria.profiledProductId}
                                onChange={(val) => handleCriteriaChange('profiledProductId', val)}
                                placeholder={productsLoading ? 'Cargando...' : 'Seleccionar...'}
                            />
                            <CustomSelect 
                                label="Asociar a Marca"
                                options={brandOptions}
                                value={criteria.associatedBrandId}
                                onChange={(val) => handleCriteriaChange('associatedBrandId', val)}
                                placeholder={brandsLoading ? 'Cargando...' : 'Seleccionar...'}
                            />
                            <CustomSelect 
                                label="Ubicación *"
                                options={locationOptions}
                                value={criteria.location}
                                onChange={(val) => handleCriteriaChange('location', val)}
                                placeholder="Seleccionar ubicación..."
                            />
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número de resultados *</label>
                                <input type="number" value={criteria.resultsCount} onChange={e => handleCriteriaChange('resultsCount', Number(e.target.value))} />
                            </div>
                            <CustomSelect 
                                label="Lenguaje *"
                                options={[{value: 'es', name: 'Español'}, {value: 'en', name: 'Inglés'}]}
                                value={criteria.language}
                                onChange={(val) => handleCriteriaChange('language', val as 'es' | 'en')}
                            />
                        </div>

                        <div className="flex gap-8 pt-2">
                            <div className="flex items-center gap-3">
                                <ToggleSwitch enabled={criteria.includeWebResults} onToggle={() => handleCriteriaChange('includeWebResults', !criteria.includeWebResults)} />
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Incluir resultados web</label>
                            </div>
                            <div className="flex items-center gap-3">
                                <ToggleSwitch enabled={criteria.enrichContacts} onToggle={() => handleCriteriaChange('enrichContacts', !criteria.enrichContacts)} />
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Enriquecer contactos</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Paso 2: Importar desde URL</h3>
                    <div className="flex gap-4 items-center">
                        <input type="text" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://..." className="flex-grow w-full" />
                        <button onClick={handleImportFromUrl} disabled={isProcessing} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 disabled:opacity-50 flex-shrink-0">
                            {isProcessing ? 'Procesando...' : 'Iniciar Importación'}
                        </button>
                    </div>
                    {status && <p className={`text-sm mt-4 ${isProcessing ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-green-600'}`}>{status}</p>}
                </div>
            </div>
            <DuplicateReviewModal
                isOpen={isReviewModalOpen}
                duplicates={duplicatesToReview}
                onConfirm={handleConfirmReview}
                onCancel={handleCancelReview}
            />
        </>
    );
};

export default UploadCandidatesPage;