import React from 'react';
import Drawer from '../ui/Drawer';
import { Prospect } from '../../types';

interface ProspectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
}

const ProspectDrawer: React.FC<ProspectDrawerProps> = ({ isOpen, onClose, prospect }) => {
  if (!prospect) {
    return null;
  }
  
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Prospecto: ${prospect.name}`}>
      {/* Contenido del drawer */}
      <div className="text-slate-800 dark:text-slate-200 space-y-4">
        <p><strong>Valor Estimado:</strong> ${prospect.estValue.toLocaleString()}</p>
        <p><strong>Responsable:</strong> {prospect.ownerId}</p>
        <p><strong>Etapa:</strong> {prospect.stage}</p>
        {prospect.notes && (
          <div className="mt-4">
            <h4 className="font-semibold">Notas:</h4>
            <p className="text-sm whitespace-pre-wrap p-3 bg-slate-100 dark:bg-slate-700 rounded-md">{prospect.notes}</p>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default ProspectDrawer;