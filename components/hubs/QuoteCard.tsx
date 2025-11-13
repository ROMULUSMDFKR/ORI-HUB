
import React from 'react';
import { Quote } from '../../types';
import { MOCK_COMPANIES, MOCK_PROSPECTS } from '../../data/mockData';

interface QuoteCardProps {
  item: Quote;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, itemId: string) => void;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ item, onDragStart }) => {
  const recipient = item.companyId 
    ? MOCK_COMPANIES.find(c => c.id === item.companyId)
    : MOCK_PROSPECTS.find(p => p.id === item.prospectId);
  
  const recipientName = item.companyId ? (recipient as any)?.shortName : recipient?.name;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <div className="flex justify-between items-start">
        <div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.id}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{recipientName || 'Destinatario no asignado'}</p>
        </div>
        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">${item.totals.grandTotal.toLocaleString('en-US')}</p>
      </div>
    </div>
  );
};

export default QuoteCard;