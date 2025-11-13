
import React from 'react';
import { SalesOrder, Delivery, DeliveryStatus } from '../../types';
import { MOCK_COMPANIES } from '../../data/mockData';

interface SalesOrderCardProps {
  item: SalesOrder;
  deliveries?: Delivery[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, itemId: string) => void;
}

const SalesOrderCard: React.FC<SalesOrderCardProps> = ({ item, deliveries = [], onDragStart }) => {
  const client = MOCK_COMPANIES.find(c => c.id === item.companyId);

  const completedDeliveries = deliveries.filter(d => d.status === DeliveryStatus.Entregada).length;
  const totalDeliveries = deliveries.length;
  const progress = totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
       <div className="flex justify-between items-start">
        <div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.id}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{client?.shortName || 'Cliente no encontrado'}</p>
        </div>
        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">${item.total.toLocaleString('en-US')}</p>
      </div>
      
      {totalDeliveries > 0 && (
        <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Entregas</span>
                <span className="font-semibold">{completedDeliveries}/{totalDeliveries}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      )}

      <div className="text-right text-xs text-gray-500 mt-2">
        Creada: {new Date(item.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
};

export default SalesOrderCard;