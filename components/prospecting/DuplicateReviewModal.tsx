import React, { useState } from 'react';
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

  if (!isOpen) return null;

  const handleDecisionChange = (placeId: string, decision: 'skip' | 'import') => {
    setDecisions(prev => ({ ...prev, [placeId]: decision }));
  };
  
  const allDecided = duplicates.every(d => d.newCandidate.placeId && decisions[d.newCandidate.placeId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onCancel}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl m-4 w-full max-w-4xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Revisar Duplicados Encontrados</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Hemos encontrado {duplicates.length} candidatos que podrían ya existir. Por favor, revisa y decide qué hacer con cada uno.</p>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Candidato a Importar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Candidato Existente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {duplicates.map(({ newCandidate, existingCandidate }) => {
                const placeId = newCandidate.placeId;
                const decision = decisions[placeId] || 'skip'; // Default to skip
                return (
                  <tr key={placeId}>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-sm">{newCandidate.title}</p>
                      <p className="text-xs text-slate-500">{newCandidate.address}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-sm">{existingCandidate.name}</p>
                      <p className="text-xs text-slate-500">{existingCandidate.address}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-2">
                         <label className="flex items-center text-sm">
                           <input type="radio" name={`decision-${placeId}`} value="skip" checked={decision === 'skip'} onChange={() => handleDecisionChange(placeId, 'skip')} className="mr-2"/>
                           Omitir (Recomendado)
                         </label>
                         <label className="flex items-center text-sm">
                           <input type="radio" name={`decision-${placeId}`} value="import" checked={decision === 'import'} onChange={() => handleDecisionChange(placeId, 'import')} className="mr-2"/>
                           Importar de todos modos
                         </label>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button onClick={onCancel} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-semibold py-2 px-4 rounded-lg">Cancelar Importación</button>
          <button onClick={() => onConfirm(decisions)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg">
            Confirmar e Importar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateReviewModal;