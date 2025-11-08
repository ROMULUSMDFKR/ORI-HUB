
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
      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing mb-4"
    >
      <div className="flex justify-between items-start">
        <div>
            <h4 className="font-bold text-sm text-text-main">{item.id}</h4>
            <p className="text-xs text-text-secondary mt-1">{recipientName || 'Destinatario no asignado'}</p>
        </div>
        <p className="text-sm text-secondary font-semibold">${item.totals.grandTotal.toLocaleString('en-US')}</p>
      </div>
    </div>
  );
};

export default QuoteCard;