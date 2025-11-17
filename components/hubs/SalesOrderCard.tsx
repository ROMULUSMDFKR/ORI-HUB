

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
       <div className="flex justify-between items-start">
        <div>
            <Link to={`/hubs/sales-orders/${item.id}`} onClick={e => e.stopPropagation()}>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 hover:underline">{item.id}</h4>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{client?.shortName || 'Cliente no encontrado'}</p>
        </div>
        <div className="flex items-center gap-2">
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">${item.total.toLocaleString('en-US')}</p>
             <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} onBlur={() => setTimeout(() => setMenuOpen(false), 150)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 -mt-1 -mr-1">
                    <span className="material-symbols-outlined text-sm">more_horiz</span>
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg z-10 border border-slate-200 dark:border-slate-700 py-1">
                         <Link to={`/hubs/sales-orders/${item.id}`} onClick={e => e.stopPropagation()} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <span className="material-symbols-outlined text-base mr-2">visibility</span>Ver Detalle
                        </Link>
                    </div>
                )}
            </div>
        </div>
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