
import React from 'react';
import { SalesOrder } from '../../types';
// FIX: Replaced non-existent MOCK_CLIENTS_LIST with MOCK_COMPANIES.
import { MOCK_COMPANIES } from '../../data/mockData';

interface SalesOrderCardProps {
  item: SalesOrder;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, itemId: string) => void;
}

const SalesOrderCard: React.FC<SalesOrderCardProps> = ({ item, onDragStart }) => {
  // FIX: Used item.companyId instead of item.clientId and searched in MOCK_COMPANIES.
  const client = MOCK_COMPANIES.find(c => c.id === item.companyId);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing mb-4"
    >
       <div className="flex justify-between items-start">
        <div>
            <h4 className="font-bold text-sm text-text-main">{item.id}</h4>
            <p className="text-xs text-text-secondary mt-1">{client?.shortName || 'Cliente no encontrado'}</p>
        </div>
        <p className="text-sm text-primary font-semibold">${item.total.toLocaleString('en-US')}</p>
      </div>
      <div className="text-right text-xs text-gray-500 mt-2">
        Creada: {new Date(item.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
};

export default SalesOrderCard;