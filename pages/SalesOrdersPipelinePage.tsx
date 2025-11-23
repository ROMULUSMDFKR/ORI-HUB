import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SALES_ORDERS_PIPELINE_COLUMNS } from '../constants';
import { SalesOrder, SalesOrderStatus, Delivery, DeliveryStatus, ActivityLog, User } from '../types';
import SalesOrderCard from '../components/hubs/SalesOrderCard';
import { useCollection } from '../hooks/useCollection';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

const PipelineColumn: React.FC<{
  stage: SalesOrderStatus;
  objective: string;
  items: SalesOrder[];
  deliveriesBySoId: Map<string, Delivery[]>;
}> = ({ stage, objective, items, deliveriesBySoId }) => {
    const totalValue = items.reduce((sum, so) => sum + so.total, 0);
    return (
        <div className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/10 rounded-xl p-3 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2 px-1 group relative">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{stage}</h3>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">{items.length}</span>
                </div>

                {/* Info Icon with Tooltip */}
                <div className="relative">
                    <span className="material-symbols-outlined text-slate-400 hover:text-indigo-500 cursor-help text-lg">info</span>
                    <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Objetivo de la Etapa</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{objective}</p>
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-xs text-slate-500">Valor Total</span>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">${totalValue.toLocaleString('en-US')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-full overflow-y-auto pr-1 custom-scrollbar flex-1" style={{maxHeight: 'calc(100vh - 220px)'}}>
                {items.map(item => (
                    <div key={item.id} data-id={item.id}>
                        <SalesOrderCard item={item} deliveries={deliveriesBySoId.get(item.id)} onDragStart={() => {}} />
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg m-1">
                        <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">Sin órdenes</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const SalesOrdersPipelinePage: React.FC = () => {
  const { data: soData, loading: soLoading } = useCollection<SalesOrder>('salesOrders');
  const { data: deliveries, loading: delLoading } = useCollection<Delivery>('deliveries');
  const { data: activitiesData, loading: actLoading } = useCollection<ActivityLog>('activities');
  const { data: users, loading: uLoading } = useCollection<User>('users');
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');

  useEffect(() => {
    if (soData) {
      setSalesOrders(soData);
    }
  }, [soData]);

  useEffect(() => {
    if (activitiesData) {
      setActivities(activitiesData);
    }
  }, [activitiesData]);
  
  const loading = soLoading || delLoading || actLoading || uLoading;
  const usersMap = useMemo(() => new Map<string, User>(users?.map(u => [u.id, u] as [string, User])), [users]);

  const deliveriesBySalesOrderId = useMemo(() => {
    if (!deliveries) return new Map<string, Delivery[]>();
    return deliveries.reduce((acc, delivery) => {
        if (!acc.has(delivery.salesOrderId)) acc.set(delivery.salesOrderId, []);
        acc.get(delivery.salesOrderId)!.push(delivery);
        return acc;
    }, new Map<string, Delivery[]>());
  }, [deliveries]);
  
  const pipelineActivities = useMemo(() => {
    if (!activities) return [];
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

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStage: SalesOrderStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId || !currentUser) return;
    
    const originalOrder = salesOrders.find(o => o.id === itemId);
    if (!originalOrder || originalOrder.status === targetStage) return;

    if (targetStage === SalesOrderStatus.Entregada) {
        const orderDeliveries = deliveriesBySalesOrderId.get(itemId) || [];
        if (orderDeliveries.length > 0) {
            const allDelivered = orderDeliveries.every(d => d.status === DeliveryStatus.Entregada);
            if (!allDelivered) {
                showToast('warning', 'No se puede mover a "Entregada" hasta que todas las entregas estén completas.');
                return;
            }
        }
    }
    setSalesOrders(prevItems => prevItems.map(p => p.id === itemId ? { ...p, status: targetStage } : p));
    
    try {
        await api.updateDoc('salesOrders', itemId, { status: targetStage });
        const activity: Omit<ActivityLog, 'id'> = {
            salesOrderId: itemId,
            type: 'Cambio de Estado',
            description: `Orden de Venta movida de "${originalOrder.status}" a "${targetStage}"`,
            userId: currentUser.id,
            createdAt: new Date().toISOString()
        };
        const newActivity = await api.addDoc('activities', activity);
        setActivities(prev => [newActivity, ...prev]);
    } catch (error) {
        showToast('error', 'No se pudo actualizar la etapa.');
        setSalesOrders(prev => prev.map(p => p.id === itemId ? originalOrder : p));
    }
  };
  
  const pipelineViews: ViewOption[] = [
    { id: 'pipeline', name: 'Pipeline', icon: 'view_kanban' },
    { id: 'list', name: 'Lista', icon: 'list' },
    { id: 'history', name: 'Historial', icon: 'history' },
  ];

  const renderContent = () => {
    if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;

    switch(view) {
        case 'pipeline':
             return (
                 <div className="flex-1 flex gap-8 overflow-x-auto pb-4" onDragStart={handleDragStart}>
                    {Object.keys(groupedColumns).map((groupName) => (
                      <div key={groupName} className="flex flex-col h-full">
                        <div className="px-3 pb-3 flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{groupName}</h3>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                        </div>
                        <div className="flex gap-4 h-full">
                            {groupedColumns[groupName].map(col => {
                              const stageItems = salesOrders.filter(p => p.status === col.stage);
                              return (
                                <div key={col.stage} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.stage)} className="h-full">
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
            if (pipelineActivities.length === 0) {
                 return (
                     <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                         <span className="material-symbols-outlined text-4xl mb-2">history</span>
                         <p>No hay actividad registrada para las órdenes de venta.</p>
                     </div>
                 );
             }
            return (
                <ul className="space-y-4">
                    {pipelineActivities.map(activity => {
                        const user = usersMap.get(activity.userId);
                        const so = salesOrders.find(s => s.id === activity.salesOrderId);
                        
                        const userName = user?.name || 'Usuario Desconocido';
                        const userAvatar = user?.avatarUrl || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
                        const soLink = so ? `/hubs/sales-orders/${so.id}` : '#';
                        const soId = so?.id || 'Orden Desconocida';

                        return (
                            <li key={activity.id} className="flex items-start gap-3 text-sm p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div><img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full" /></div>
                                <div className="flex-1">
                                    <p className="text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {userName} en <Link to={soLink} className="font-semibold hover:underline">{soId}</Link> &bull; {new Date(activity.createdAt).toLocaleString()}
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