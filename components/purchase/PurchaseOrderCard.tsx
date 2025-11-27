
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PurchaseOrder, Supplier, PurchaseOrderStatus } from '../../types';
import { useCollection } from '../../hooks/useCollection';
import Badge from '../ui/Badge';

interface PurchaseOrderCardProps {
  item: PurchaseOrder;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, itemId: string) => void;
}

const PurchaseOrderCard: React.FC<PurchaseOrderCardProps> = ({ item, onDragStart }) => {
  const { data: suppliers } = useCollection<Supplier>('suppliers');
  
  const supplier = useMemo(() => suppliers?.find(s => s.id === item.supplierId), [suppliers, item.supplierId]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Simple progress logic based on status
  const progress = useMemo(() => {
      if (item.status === PurchaseOrderStatus.Facturada || item.status === PurchaseOrderStatus.Recibida) return 100;
      if (item.status === PurchaseOrderStatus.EnTransito) return 75;
      if (item.status === PurchaseOrderStatus.Pagada) return 60;
      if (item.status === PurchaseOrderStatus.PagoParcial) return 45;
      if (item.status === PurchaseOrderStatus.Ordenada) return 30;
      return 10; // Borrador/Por Aprobar
  }, [item.status]);

  const getProgressColor = () => {
      if (progress === 100) return 'bg-emerald-500';
      if (progress > 50) return 'bg-blue-500';
      return 'bg-indigo-500';
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-2 overflow-hidden">
            <Link to={`/purchase/orders/${item.id}`} onClick={e => e.stopPropagation()}>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 hover:underline truncate" title={item.id}>
                    {item.id}
                </h4>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-semibold">{supplier?.name || 'Proveedor desconocido'}</p>
        </div>
        <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} onBlur={() => setTimeout(() => setMenuOpen(false), 150)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-sm">more_horiz</span>
            </button>
            {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg z-10 border border-slate-200 dark:border-slate-700 py-1">
                     <Link to={`/purchase/orders/${item.id}`} onClick={e => e.stopPropagation()} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <span className="material-symbols-outlined text-base mr-2">visibility</span>Ver Detalle
                    </Link>
                </div>
            )}
        </div>
      </div>
      
      {/* Internal Pipeline / Progress Bar */}
      <div className="mt-3">
           <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase font-bold">
                <span>Progreso</span>
                <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${getProgressColor()}`} style={{ width: `${progress}%` }}></div>
            </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
           <div className="flex items-center gap-2">
              {item.approverId ? (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <span className="material-symbols-outlined !text-[10px]">gavel</span> Por aprobar
                  </span>
              ) : (
                  <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
              )}
           </div>
           <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold">${(item.total || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
      </div>
    </div>
  );
};

export default PurchaseOrderCard;
