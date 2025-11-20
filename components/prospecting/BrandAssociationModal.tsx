
import React, { useState, useEffect, useMemo } from 'react';
import { Brand } from '../../types';
import { api } from '../../api/firebaseApi';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';

interface BrandAssociationModalProps {
    isOpen: boolean;
    candidates: any[];
    existingBrands: Brand[];
    onConfirm: (associations: { [placeId: string]: string }, newBrands: string[]) => void;
    onCancel: () => void;
}

const COMMON_STOPWORDS = ['gasolinera', 'estacion', 'servicio', 'service', 'station', 'grupo', 'corporativo', 'inc', 'llantas', 'taller', 'de', 'la', 'el', 'y', 'en', 'mexico', 'mx', 'sucursal'];

const BrandAssociationModal: React.FC<BrandAssociationModalProps> = ({ isOpen, candidates, existingBrands, onConfirm, onCancel }) => {
    const [analyzing, setAnalyzing] = useState(true);
    const [matches, setMatches] = useState<{ candidateIdx: number, brandId: string, brandName: string }[]>([]);
    const [suggestions, setSuggestions] = useState<{ name: string, count: number, selected: boolean }[]>([]);
    const [associations, setAssociations] = useState<{ [placeId: string]: string }>({}); // Map placeId/index -> brandId (or new brand name)

    useEffect(() => {
        if (isOpen && candidates.length > 0) {
            analyzeData();
        }
    }, [isOpen, candidates]);

    const analyzeData = async () => {
        setAnalyzing(true);
        
        // 1. Detect Matches with Existing Brands
        const foundMatches: typeof matches = [];
        const tempAssociations: typeof associations = {};
        
        candidates.forEach((c, idx) => {
            const cName = (c.title || c.name || '').toLowerCase();
            const matchedBrand = existingBrands.find(b => cName.includes(b.name.toLowerCase()));
            
            if (matchedBrand) {
                foundMatches.push({
                    candidateIdx: idx,
                    brandId: matchedBrand.id,
                    brandName: matchedBrand.name
                });
                const key = c.placeId || c.googlePlaceId || `idx-${idx}`;
                tempAssociations[key] = matchedBrand.id;
            }
        });

        setMatches(foundMatches);

        // 2. Detect New Brand Suggestions (Frequency Analysis)
        const wordCounts: Record<string, number> = {};
        
        candidates.forEach(c => {
            // Skip if already matched to an existing brand
            const cName = (c.title || c.name || '').toLowerCase();
            if (existingBrands.some(b => cName.includes(b.name.toLowerCase()))) return;

            // Clean name and extract potential brand name (first 1-2 significant words)
            const words = cName
                .replace(/[^\w\s]/gi, '')
                .split(/\s+/)
                .filter((w: string) => w.length > 2 && !COMMON_STOPWORDS.includes(w));

            if (words.length > 0) {
                const firstWord = words[0];
                // Capitalize first letter
                const brandKey = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
                wordCounts[brandKey] = (wordCounts[brandKey] || 0) + 1;
            }
        });

        // Filter suggestions: appear at least 5 times or 5% of list, whichever is smaller (but min 3)
        const threshold = Math.max(3, Math.min(5, candidates.length * 0.05));
        const topSuggestions = Object.entries(wordCounts)
            .filter(([_, count]) => count >= threshold)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count, selected: true })); // Default selected

        setSuggestions(topSuggestions);
        setAssociations(tempAssociations);
        setAnalyzing(false);
    };

    const handleConfirm = () => {
        // Create final map. 
        // Existing associations are already in 'associations' state.
        // We need to add the new suggestions that are selected.
        
        const finalAssociations = { ...associations };
        const newBrandsToCreate: string[] = [];

        suggestions.filter(s => s.selected).forEach(suggestion => {
            newBrandsToCreate.push(suggestion.name);
            
            // Find candidates that match this new brand name and aren't already associated
            candidates.forEach((c, idx) => {
                const key = c.placeId || c.googlePlaceId || `idx-${idx}`;
                if (!finalAssociations[key]) {
                     const cName = (c.title || c.name || '').toLowerCase();
                     if (cName.includes(suggestion.name.toLowerCase())) {
                         // Use a special prefix or just the name to indicate it's a new brand to be created
                         finalAssociations[key] = `NEW:${suggestion.name}`; 
                     }
                }
            });
        });

        onConfirm(finalAssociations, newBrandsToCreate);
    };

    const toggleSuggestion = (index: number) => {
        setSuggestions(prev => prev.map((s, i) => i === index ? { ...s, selected: !s.selected } : s));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onCancel}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl m-4 w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">hub</span>
                        Detección Automática de Marcas
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Hemos analizado tu base de datos para detectar franquicias y cadenas automáticamente.
                    </p>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    {analyzing ? (
                        <div className="flex justify-center py-10"><Spinner /></div>
                    ) : (
                        <>
                            {/* Existing Matches */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                                    Marcas Existentes Detectadas
                                </h4>
                                {matches.length > 0 ? (
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                        <p className="text-green-800 dark:text-green-300 font-medium mb-1">
                                            <span className="material-symbols-outlined align-bottom mr-1 !text-lg">check_circle</span>
                                            {matches.length} candidatos vinculados automáticamente
                                        </p>
                                        <p className="text-sm text-green-700 dark:text-green-400">
                                            Se asignarán a marcas como: {[...new Set(matches.map(m => m.brandName))].slice(0, 3).join(', ')}...
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No se encontraron coincidencias con tus marcas actuales.</p>
                                )}
                            </div>

                            {/* New Suggestions */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                                    Sugerencias de Nuevas Marcas
                                </h4>
                                <p className="text-sm text-slate-500 mb-3">
                                    Detectamos estos nombres repetidos frecuentemente. Selecciónalos para crear la marca y agrupar los candidatos automáticamente.
                                </p>
                                {suggestions.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {suggestions.map((s, idx) => (
                                            <div 
                                                key={s.name} 
                                                onClick={() => toggleSuggestion(idx)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${s.selected ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-indigo-300'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${s.selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                                        {s.selected && <span className="material-symbols-outlined text-white !text-sm font-bold">check</span>}
                                                    </div>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</span>
                                                </div>
                                                <Badge text={`${s.count} registros`} color="blue" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No hay patrones claros para sugerir nuevas marcas.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button onClick={onCancel} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-semibold py-2 px-4 rounded-lg">Omitir Análisis</button>
                    <button onClick={handleConfirm} disabled={analyzing} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                        Aplicar Agrupación
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BrandAssociationModal;
