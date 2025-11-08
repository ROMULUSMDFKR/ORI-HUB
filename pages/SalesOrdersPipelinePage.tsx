

import React, { useState, useMemo } from 'react';
import { MOCK_SALES_ORDERS } from '../data/mockData';
import { SALES_ORDERS_PIPELINE_COLUMNS } from '../constants';
import { SalesOrder, SalesOrderStatus } from '../types';
import SalesOrderCard from '../components/hubs/SalesOrderCard';

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
      className="flex-shrink-0 w-80 bg-gray-50 rounded-xl p-3"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      <div className="flex justify-between items-center mb-1 px-1">
        <h3 className="font-semibold text-md text-text-main">{stage}</h3>
        <span className="text-sm font-medium text-text-secondary bg-gray-200 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="text-xs text-gray-500 mb-4 px-1 truncate" title={objective}>
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

  // FIX: Used a type assertion on the initial value of reduce to ensure correct type inference.
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
    if (itemId) {
        setSalesOrders(prevItems =>
        prevItems.map(p =>
          p.id === itemId ? { ...p, status: targetStage } : p
        )
      );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-text-main">Pipeline de Órdenes de Venta</h2>
        <button 
          onClick={() => alert('Nueva Orden de Venta')}
          className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
          <span className="material-symbols-outlined mr-2">add</span>
          Nueva Orden de Venta
        </button>
      </div>
      <div className="flex-1 flex gap-8 overflow-x-auto pb-4">
        {/* FIX: Replaced `Object.entries` with `Object.keys` to ensure correct type inference on `columns`. */}
        {Object.keys(groupedColumns).map((groupName) => {
          const columns = groupedColumns[groupName];
          return (
            <div key={groupName} className="flex flex-col">
              <div className="px-3 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">{groupName}</h3>
              </div>
              <div className="flex gap-4">
                {columns.map(col => {
                  const stageItems = salesOrders.filter(p => p.status === col.stage);
                  const totalValue = stageItems.reduce((sum, so) => sum + so.total, 0);
                  return (
                    <div key={col.stage}>
                      {/* FIX: Passed render function explicitly as `children` prop to satisfy TypeScript. */}
                      <PipelineColumn<SalesOrder>
                        stage={col.stage}
                        objective={col.objective}
                        items={stageItems}
                        totalValue={totalValue}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        children={(item) => <SalesOrderCard key={item.id} item={item} onDragStart={handleDragStart} />}
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