import React, { useState, useEffect, useMemo } from 'react';
import Drawer from '../ui/Drawer';
import { Brand, Candidate } from '../../types';
import { useCollection } from '../../hooks/useCollection';
import { GoogleGenAI, Type } from '@google/genai';
import Spinner from '../ui/Spinner';
import Checkbox from '../ui/Checkbox';
import { useToast } from '../../hooks/useToast';
import { api } from '../../api/firebaseApi';

interface LinkCandidatesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand;
  onLinkCandidates: (brandId: string, candidateIds: string[]) => void;
}

const LinkCandidatesDrawer: React.FC<LinkCandidatesDrawerProps> = ({ isOpen, onClose, brand, onLinkCandidates }) => {
    const { data: allCandidates, loading: candidatesLoading } = useCollection<Candidate>('candidates');
    const [status, setStatus] = useState<'idle' | 'loading' | 'analyzing' | 'reviewing' | 'linking'>('loading');
    const [suggestedCandidates, setSuggestedCandidates] = useState<Candidate[]>([]);
    const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
    const { showToast } = useToast();

    useEffect(() => {
        if (isOpen && allCandidates) {
            analyzeCandidates();
        }
    }, [isOpen, allCandidates]);

    const analyzeCandidates = async () => {
        if (!allCandidates) return;

        setStatus('analyzing');
        try {
            const unlinkedCandidates = allCandidates.filter(c => !c.brandId);
            if (unlinkedCandidates.length === 0) {
                showToast('info', 'No hay candidatos sin marca para analizar.');
                setStatus('idle');
                onClose();
                return;
            }

            const candidateNames = unlinkedCandidates.map(c => c.name);

            const prompt = `
                Dada la marca "${brand.name}", analiza la siguiente lista de nombres de negocios y devuelve un JSON que contenga un array con los nombres que probablemente pertenezcan a esta marca (franquicias, sucursales, etc.). El array debe estar en una clave llamada "matches".

                Lista de Nombres:
                ${candidateNames.join('\n')}
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            matches: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ['matches'],
                    }
                }
            });

            const result = JSON.parse(response.text);
            const matchedNames = new Set(result.matches || []);
            
            const suggestions = unlinkedCandidates.filter(c => matchedNames.has(c.name));
            
            setSuggestedCandidates(suggestions);
            setSelectedCandidateIds(suggestions.map(s => s.id)); // Pre-select all suggestions
            setStatus('reviewing');

        } catch (error) {
            console.error("AI analysis failed:", error);
            showToast('error', 'El análisis con IA falló.');
            setStatus('idle');
            onClose();
        }
    };

    const handleToggleSelection = (candidateId: string) => {
        setSelectedCandidateIds(prev =>
            prev.includes(candidateId)
                ? prev.filter(id => id !== candidateId)
                : [...prev, candidateId]
        );
    };

    const handleLink = () => {
        setStatus('linking');
        onLinkCandidates(brand.id, selectedCandidateIds);
    };

    const renderContent = () => {
        if (status === 'loading' || status === 'analyzing' || candidatesLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <Spinner />
                    <p className="mt-4 text-slate-500 dark:text-slate-400">
                        {status === 'loading' || candidatesLoading ? 'Cargando candidatos...' : `Analizando candidatos para la marca "${brand.name}"...`}
                    </p>
                </div>
            );
        }

        if (status === 'reviewing') {
            return (
                <>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        La IA sugiere que los siguientes {suggestedCandidates.length} candidatos podrían pertenecer a <strong>{brand.name}</strong>. Desmarca los que no correspondan.
                    </p>
                    {suggestedCandidates.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                            {suggestedCandidates.map(candidate => (
                                <Checkbox
                                    key={candidate.id}
                                    id={`link-cand-${candidate.id}`}
                                    checked={selectedCandidateIds.includes(candidate.id)}
                                    onChange={() => handleToggleSelection(candidate.id)}
                                    className="w-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                >
                                    <div className="text-sm">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{candidate.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{candidate.address}</p>
                                    </div>
                                </Checkbox>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 py-8 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <span className="material-symbols-outlined text-4xl">search_off</span>
                            <p className="mt-2 font-semibold">No se encontraron coincidencias claras.</p>
                        </div>
                    )}
                </>
            );
        }
        
        return null;
    };


    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={`Vincular Candidatos a "${brand.name}"`}>
            {renderContent()}
            {(status === 'reviewing' && suggestedCandidates.length > 0) && (
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                    <button onClick={handleLink} disabled={selectedCandidateIds.length === 0 || status === 'linking'} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center gap-2">
                         {status === 'linking' && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Vincular ({selectedCandidateIds.length}) Seleccionados
                    </button>
                </div>
            )}
        </Drawer>
    );
};

export default LinkCandidatesDrawer;
