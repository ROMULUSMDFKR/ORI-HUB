import React from 'react';
import { Company } from '../../types';
import Badge from '../ui/Badge';
import { MOCK_USERS } from '../../data/mockData';

interface CompanyCardProps {
  item: Company;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, itemId: string) => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ item, onDragStart }) => {
  const owner = MOCK_USERS[item.ownerId] || null;

  const getPriorityColor = (priority: Company['priority']) => {
    switch (priority) {
      case 'Alta': return 'red';
      case 'Media': return 'yellow';
      case 'Baja': return 'gray';
      default: return 'gray';
    }
  };

  const getHealthScoreColor = (label?: Company['healthScore']['label']) => {
    switch(label) {
      case 'Saludable': return 'bg-green-500';
      case 'Estable': return 'bg-yellow-500';
      case 'En Riesgo': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex-1 pr-2">{item.shortName || item.name}</h4>
        {owner && (
          <img 
            src={owner.avatarUrl} 
            alt={owner.name} 
            title={`Responsable: ${owner.name}`} 
            className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800" 
          />
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        <Badge text={item.priority} color={getPriorityColor(item.priority)} />
        {item.industry && <Badge text={item.industry} color="blue" />}
        {item.productsOfInterest[0] && <Badge text={item.productsOfInterest[0]} />}
      </div>
      
      {/* Footer info */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center" title="Contacto Principal">
          <span className="material-symbols-outlined text-sm mr-1 align-bottom">person</span>
          <span className="truncate">{item.primaryContact?.name || 'Sin contacto'}</span>
        </div>
        {item.healthScore && (
          <div className="flex items-center" title={`Puntuación de Salud: ${item.healthScore.score}/100`}>
            <span className={`w-2 h-2 rounded-full mr-1.5 ${getHealthScoreColor(item.healthScore.label)}`}></span>
            {item.healthScore.label}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyCard;