
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
      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing mb-4"
    >
      <h4 className="font-bold text-sm text-text-main">{item.name}</h4>
      <p className="text-xs text-text-secondary mt-1">{recipientName || 'Destinatario no encontrado'}</p>
      <p className="text-xs text-text-secondary">{product?.name || 'Producto no encontrado'}</p>
      <div className="text-right text-xs text-gray-500 mt-2">
        Solicitada: {new Date(item.requestDate).toLocaleDateString()}
      </div>
    </div>
  );
};

export default SampleCard;