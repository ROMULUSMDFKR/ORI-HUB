
import React, { useState, useEffect } from 'react';
import { Candidate } from '../../types';

export interface DuplicatePair {
  newCandidate: any;
  existingCandidate: Candidate;
}

interface DuplicateReviewModalProps {
  isOpen: boolean;
  duplicates: DuplicatePair[];
  onConfirm: (decisions: { [key: string]: 'skip' | 'import' }) => void;
  onCancel: () => void;
}

const DuplicateReviewModal: React.FC<DuplicateReviewModalProps> = ({ isOpen, duplicates, onConfirm, onCancel }) => {
  const [decisions, setDecisions] = useState<{ [key: string]: 'skip' | 'import' }>({});

  // Initialize default decisions (Skip by default)
  useEffect(() => {
    if (isOpen && duplicates.length > 0) {
      const initialDecisions: { [key: string]: 'skip' | 'import' } = {};
      duplicates.forEach((d) => {
        // Fallback ID logic: try placeId, googlePlaceId, or name as a last resort to ensure a key exists
        const key = d.newCandidate.placeId || d.newCandidate.googlePlaceId || d.newCandidate.name;
        initialDecisions[key] = 'skip';
      });
      setDecisions(initialDecisions);
    }
  }, [isOpen, duplicates]);

  if (!isOpen) return null;

  const handleDecisionChange = (key: string, decision: 'skip' | 'import') => {
    setDecisions(prev => ({ ...prev, [key]: decision }));
  };

  // Helper to safely get the key
  const getKey = (item: any) => item.placeId || item.googlePlaceId || item.name;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Revisar Duplicados Encontrados</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Hemos encontrado {duplicates.length} candidatos que podrían ya existir. Por favor, revisa y decide qué hacer con cada uno.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acción por defecto: Omitir</span>
          </div>
        </div>
        
        {/* Content List */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 space-y-4">
          {duplicates.map(({ newCandidate, existingCandidate }, index) => {
            const key = getKey(newCandidate);
            const decision = decisions[key] || 'skip';
            
            return (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col md:flex-row">
                
                {/* New Candidate Column */}
                <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase">Candidato a Importar</span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">{newCandidate.name || newCandidate.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{newCandidate.address}</p>
                  <div className="mt-3 text-xs text-slate-400 space-y-1">
                    {newCandidate.phone && <p><span className="font-semibold">Tel:</span> {newCandidate.phone}</p>}
                    {newCandidate.website && <p><span className="font-semibold">Web:</span> {newCandidate.website}</p>}
                  </div>
                </div>

                {/* Existing Candidate Column */}
                <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/20">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded uppercase">Ya Existente en Base de Datos</span>
                  </div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">{existingCandidate.name}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{existingCandidate.address}</p>
                   <div className="mt-3 text-xs text-slate-400 space-y-1">
                    {existingCandidate.phone && <p><span className="font-semibold">Tel:</span> {existingCandidate.phone}</p>}
                    {existingCandidate.website && <p><span className="font-semibold">Web:</span> {existingCandidate.website}</p>}
                    <p><span className="font-semibold">Estado:</span> {existingCandidate.status}</p>
                  </div>
                </div>

                {/* Action Column */}
                <div className="w-full md:w-64 p-4 flex flex-col justify-center bg-slate-50 dark:bg-slate-800">
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-3 text-center">Acción</h5>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleDecisionChange(key, 'skip')}
                      className={`w-full flex items-center p-3 rounded-lg border text-left transition-all ${
                        decision === 'skip'
                          ? 'bg-white dark:bg-slate-700 border-slate-400 ring-1 ring-slate-400 shadow-sm'
                          : 'bg-transparent border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${decision === 'skip' ? 'border-slate-600 bg-slate-600' : 'border-slate-400'}`}>
                        {decision === 'skip' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                      <div>
                        <span className={`block text-sm font-bold ${decision === 'skip' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>Omitir</span>
                        <span className="text-xs text-slate-400">Mantener el existente (Recomendado)</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleDecisionChange(key, 'import')}
                      className={`w-full flex items-center p-3 rounded-lg border text-left transition-all ${
                        decision === 'import'
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500 shadow-sm'
                          : 'bg-transparent border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                       <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${decision === 'import' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'}`}>
                        {decision === 'import' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                      <div>
                        <span className={`block text-sm font-bold ${decision === 'import' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500'}`}>Importar</span>
                        <span className="text-xs text-slate-400">Crear duplicado o actualizar</span>
                      </div>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Cancelar Importación
          </button>
          <button onClick={() => onConfirm(decisions)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm">
            Confirmar Selección
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateReviewModal;
