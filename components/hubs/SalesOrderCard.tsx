
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SalesOrder, Delivery, DeliveryStatus, Company, User, SalesOrderStatus } from '../../types';
import { useCollection } from '../../hooks/useCollection';

interface SalesOrderCardProps {
  item: SalesOrder;
  deliveries?: Delivery[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, itemId: string) => void;
}

const SalesOrderCard: React.FC<SalesOrderCardProps> = ({ item, deliveries: propDeliveries, onDragStart }) => {
  const { data: companies } = useCollection<Company>('companies');
  const { data: users } = useCollection<User>('users');
  const { data: fetchedDeliveries } = useCollection<Delivery>('deliveries');
  
  const client = useMemo(() => companies?.find(c => c.id === item.companyId), [companies, item.companyId]);
  
  const responsibleUser = useMemo(() => {
      if (!users) return null;
      if (item.salespersonId) return users.find(u => u.id === item.salespersonId);
      if (client?.ownerId) return users.find(u => u.id === client.ownerId);
      return null;
  }, [users, item.salespersonId, client]);

  const deliveries = useMemo(() => {
      if (propDeliveries) return propDeliveries;
      if (fetchedDeliveries) return fetchedDeliveries.filter(d => d.salesOrderId === item.id);
      return [];
  }, [propDeliveries, fetchedDeliveries, item.id]);

  const completedDeliveries = deliveries.filter(d => d.status === DeliveryStatus.Entregada).length;
  const totalDeliveries = deliveries.length;
  const progress = totalDeliveries > 0 
      ? (completedDeliveries / totalDeliveries) * 100 
      : (item.status === SalesOrderStatus.Entregada || item.status === SalesOrderStatus.Facturada ? 100 : 0);
  
  const [menuOpen, setMenuOpen] = useState(false);

  const displayId = item.folio || `OV-${item.id.slice(-6).toUpperCase()}`;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
    >
       <div className="flex justify-between items-start">
        <div className="flex-1 pr-2 overflow-hidden">
            <Link to={`/hubs/sales-orders/${item.id}`} onClick={e => e.stopPropagation()}>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 hover:underline truncate" title={item.id}>
                    {displayId}
                </h4>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{client?.shortName || client?.name || 'Cliente no encontrado'}</p>
        </div>
        <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} onBlur={() => setTimeout(() => setMenuOpen(false), 150)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      
      {(totalDeliveries > 0 || item.status === SalesOrderStatus.EnTransito || item.status === SalesOrderStatus.EnPreparacion) && (
        <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Entregas</span>
                <span className="font-semibold">{totalDeliveries > 0 ? `${completedDeliveries}/${totalDeliveries}` : '-'}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
           <div className="flex items-center gap-2">
              {responsibleUser ? (
                  <img 
                    src={responsibleUser.avatarUrl} 
                    alt={responsibleUser.name} 
                    title={`Responsable: ${responsibleUser.name}`}
                    className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600 object-cover"
                  />
              ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center" title="Sin responsable asignado">
                      <span className="material-symbols-outlined text-xs text-slate-500">person_off</span>
                  </div>
              )}
           </div>
           <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold">${(item.total || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
      </div>
    </div>
  );
};

export default SalesOrderCard;
