import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_SALES_ORDERS } from '../data/mockData';
import { SALES_ORDERS_PIPELINE_COLUMNS } from '../constants';
import { SalesOrder, SalesOrderStatus, Delivery, DeliveryStatus } from '../types';
import SalesOrderCard from '../components/hubs/SalesOrderCard';
import { useCollection } from '../hooks/useCollection';

interface PipelineColumnProps<T> {
  stage: string;
  objective: string;
  items: T[];
  totalValue?: number;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, stage: any) => void;
  children: (item: T) => React.ReactNode;
}

const PipelineColumn = <T extends {id: string}>({ stage, objective, items, totalValue, onDragOver, onDrop, children }: PipelineColumnProps<T>) => {
  return (
    <div
      className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/10 rounded-xl p-3"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      <div className="flex justify-between items-center mb-1 px-1">
        <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{stage}</h3>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 px-1 truncate" title={objective}>
        {totalValue !== undefined ? `$${totalValue.toLocaleString('en-US')} • ` : ''}{objective}
      </div>
      <div className="h-full overflow-y-auto pr-1" style={{maxHeight: 'calc(100vh - 250px)'}}>
        {items.map(item => children(item))}
      </div>
    </div>
  );
};


const SalesOrdersPipelinePage: React.FC = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(MOCK_SALES_ORDERS);
  const { data: deliveries } = useCollection<Delivery>('deliveries');

  const deliveriesBySalesOrderId = useMemo(() => {
    if (!deliveries) return new Map<string, Delivery[]>();
    return deliveries.reduce((acc, delivery) => {
        if (!acc.has(delivery.salesOrderId)) {
            acc.set(delivery.salesOrderId, []);
        }
        acc.get(delivery.salesOrderId)!.push(delivery);
        return acc;
    }, new Map<string, Delivery[]>());
  }, [deliveries]);

  const groupedColumns = useMemo(() => {
    return SALES_ORDERS_PIPELINE_COLUMNS.reduce((acc, column) => {
      const group = column.group;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(column);
      return acc;
    }, {} as Record<string, (typeof SALES_ORDERS_PIPELINE_COLUMNS)[number][]>);
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    e.dataTransfer.setData('itemId', itemId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: SalesOrderStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    if (!itemId) return;

    if (targetStage === SalesOrderStatus.Entregada) {
        const orderDeliveries = deliveriesBySalesOrderId.get(itemId) || [];
        if (orderDeliveries.length > 0) {
            const allDelivered = orderDeliveries.every(d => d.status === DeliveryStatus.Entregada);
            if (!allDelivered) {
                alert('No se puede mover a "Entregada" hasta que todas las entregas estén completas.');
                return;
            }
        }
    }
    
    setSalesOrders(prevItems =>
      prevItems.map(p =>
        p.id === itemId ? { ...p, status: targetStage } : p
      )
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Pipeline de Órdenes de Venta</h2>
        <div className="flex items-center gap-2">
            <Link 
                to="/crm/lists?view=sales-orders"
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                <span className="material-symbols-outlined mr-2">list</span>
                Ver Lista
            </Link>
            <Link 
              to="/hubs/sales-orders/new"
              className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
              <span className="material-symbols-outlined mr-2">add</span>
              Nueva Orden de Venta
            </Link>
        </div>
      </div>
      <div className="flex-1 flex gap-8 overflow-x-auto pb-4">
        {Object.keys(groupedColumns).map((groupName) => {
          const columns = groupedColumns[groupName];
          return (
            <div key={groupName} className="flex flex-col">
              <div className="px-3 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{groupName}</h3>
              </div>
              <div className="flex gap-4">
                {columns.map(col => {
                  const stageItems = salesOrders.filter(p => p.status === col.stage);
                  const totalValue = stageItems.reduce((sum, so) => sum + so.total, 0);
                  return (
                    <div key={col.stage}>
                      <PipelineColumn<SalesOrder>
                        stage={col.stage}
                        objective={col.objective}
                        items={stageItems}
                        totalValue={totalValue}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        children={(item) => <SalesOrderCard key={item.id} item={item} deliveries={deliveriesBySalesOrderId.get(item.id)} onDragStart={handleDragStart} />}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SalesOrdersPipelinePage;