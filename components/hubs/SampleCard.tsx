


import React from 'react';
import { Sample } from '../../types';
import { MOCK_COMPANIES, MOCK_PRODUCTS, MOCK_PROSPECTS } from '../../data/mockData';

interface SampleCardProps {
  item: Sample;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, itemId: string) => void;
}

const SampleCard: React.FC<SampleCardProps> = ({ item, onDragStart }) => {
  const recipient = item.companyId
    ? MOCK_COMPANIES.find(c => c.id === item.companyId)
    : MOCK_PROSPECTS.find(p => p.id === item.prospectId);

  const product = MOCK_PRODUCTS.find(p => p.id === item.productId);
  const recipientName = item.companyId ? (recipient as any)?.shortName : recipient?.name;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.name}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{recipientName || 'Destinatario no encontrado'}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{product?.name || 'Producto no encontrado'}</p>
      <div className="text-right text-xs text-slate-500 dark:text-slate-400 mt-2">
        Solicitada: {new Date(item.requestDate).toLocaleDateString()}
      </div>
    </div>
  );
};

export default SampleCard;