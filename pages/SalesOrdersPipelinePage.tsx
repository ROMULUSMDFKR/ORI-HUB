import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_SALES_ORDERS, MOCK_ACTIVITIES, MOCK_USERS } from '../data/mockData';
import { SALES_ORDERS_PIPELINE_COLUMNS } from '../constants';
import { SalesOrder, SalesOrderStatus, Delivery, DeliveryStatus, ActivityLog } from '../types';
import SalesOrderCard from '../components/hubs/SalesOrderCard';
import { useCollection } from '../hooks/useCollection';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';

const PipelineColumn: React.FC<{
  stage: SalesOrderStatus;
  objective: string;
  items: SalesOrder[];
  deliveriesBySoId: Map<string, Delivery[]>;
}> = ({ stage, objective, items, deliveriesBySoId }) => {
    const totalValue = items.reduce((sum, so) => sum + so.total, 0);
    return (
        <div className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/10 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1 px-1">
                <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{stage}</h3>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 px-1 truncate" title={objective}>
                ${totalValue.toLocaleString('en-US')} • {objective}
            </div>
            <div className="h-full overflow-y-auto pr-1" style={{maxHeight: 'calc(100vh - 290px)'}}>
                {items.map(item => (
                    <div key={item.id} data-id={item.id}>
                        <SalesOrderCard item={item} deliveries={deliveriesBySoId.get(item.id)} onDragStart={() => {}} />
                    </div>
                ))}
            </div>
        </div>
    );
};


const SalesOrdersPipelinePage: React.FC = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(MOCK_SALES_ORDERS);
  const { data: deliveries } = useCollection<Delivery>('deliveries');
  const [activities] = useState<ActivityLog[]>(MOCK_ACTIVITIES);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');

  const deliveriesBySalesOrderId = useMemo(() => {
    if (!deliveries) return new Map<string, Delivery[]>();
    return deliveries.reduce((acc, delivery) => {
        if (!acc.has(delivery.salesOrderId)) acc.set(delivery.salesOrderId, []);
        acc.get(delivery.salesOrderId)!.push(delivery);
        return acc;
    }, new Map<string, Delivery[]>());
  }, [deliveries]);
  
  const pipelineActivities = useMemo(() => {
    const soIds = new Set(salesOrders.map(s => s.id));
    return activities
      .filter(a => a.salesOrderId && soIds.has(a.salesOrderId))
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [salesOrders, activities]);

  const groupedColumns = useMemo(() => {
    return SALES_ORDERS_PIPELINE_COLUMNS.reduce((acc, column) => {
      const group = column.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(column);
      return acc;
    }, {} as Record<string, (typeof SALES_ORDERS_PIPELINE_COLUMNS)[number][]>);
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const cardElement = target.closest('[data-id]');
    if(cardElement){
        e.dataTransfer.setData('text/plain', cardElement.getAttribute('data-id') || '');
        e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
     e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: SalesOrderStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId) {
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
        setSalesOrders(prevItems => prevItems.map(p => p.id === itemId ? { ...p, status: targetStage } : p));
    }
  };
  
  const pipelineViews: ViewOption[] = [
    { id: 'pipeline', name: 'Pipeline', icon: 'view_kanban' },
    { id: 'list', name: 'Lista', icon: 'list' },
    { id: 'history', name: 'Historial', icon: 'history' },
  ];

  const renderContent = () => {
    switch(view) {
        case 'pipeline':
             return (
                 <div className="flex-1 flex gap-8 overflow-x-auto pb-4" onDragStart={handleDragStart}>
                    {Object.keys(groupedColumns).map((groupName) => (
                      <div key={groupName} className="flex flex-col">
                        <div className="px-3 pb-2"><h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{groupName}</h3></div>
                        <div className="flex gap-4">
                            {groupedColumns[groupName].map(col => {
                              const stageItems = salesOrders.filter(p => p.status === col.stage);
                              return (
                                <div key={col.stage} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.stage)}>
                                  <PipelineColumn stage={col.stage} objective={col.objective} items={stageItems} deliveriesBySoId={deliveriesBySalesOrderId} />
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                </div>
            );
        case 'list':
             const columns = [
                { header: 'Orden #', accessor: (so: SalesOrder) => <Link to={`/hubs/sales-orders/${so.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{so.id}</Link> },
                { header: 'Estado', accessor: (so: SalesOrder) => <Badge text={so.status} />},
                { header: 'Total', accessor: (so: SalesOrder) => `$${so.total.toLocaleString()}`},
                { header: 'Creación', accessor: (so: SalesOrder) => new Date(so.createdAt).toLocaleDateString()},
            ];
            return <Table columns={columns} data={salesOrders} />;
        case 'history':
            return (
                <ul className="space-y-4">
                    {pipelineActivities.map(activity => {
                        const user = MOCK_USERS[activity.userId];
                        const so = salesOrders.find(s => s.id === activity.salesOrderId);
                        return (
                            <li key={activity.id} className="flex items-start gap-3 text-sm p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div><img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" /></div>
                                <div className="flex-1">
                                    <p className="text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {user.name} en <Link to={`/hubs/sales-orders/${so?.id}`} className="font-semibold hover:underline">{so?.id}</Link> &bull; {new Date(activity.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            );
    }
  };


  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <ViewSwitcher views={pipelineViews} activeView={view} onViewChange={(v) => setView(v as 'pipeline' | 'list' | 'history')} />
        </div>
        <Link 
          to="/hubs/sales-orders/new"
          className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
          <span className="material-symbols-outlined mr-2">add</span>
          Nueva Orden de Venta
        </Link>
      </div>
      {renderContent()}
    </div>
  );
};

export default SalesOrdersPipelinePage;
