
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
import FilterButton from '../components/ui/FilterButton';
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
        <div className="flex-shrink-0 w-80 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 h-full flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center group">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${items.length > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">{stage}</h3>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">{items.length}</span>
                </div>

                {/* Info Icon with Tooltip */}
                <div className="relative">
                    <span className="material-symbols-outlined text-slate-400 hover:text-emerald-500 cursor-help text-lg">info</span>
                    <div className="absolute top-full right-0 mt-2 w-72 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">Objetivo</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{objective}</p>
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-xs text-slate-500">Valor Total</span>
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">${totalValue.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-full overflow-y-auto p-2 custom-scrollbar flex-1 space-y-3" style={{maxHeight: 'calc(100vh - 240px)'}}>
                {items.map(item => (
                    <div key={item.id} data-id={item.id}>
                        <SalesOrderCard item={item} deliveries={deliveriesBySoId.get(item.id)} onDragStart={() => {}} />
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg m-1">
                         <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-2">shopping_cart_off</span>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Sin órdenes</p>
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

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filteredOrders = useMemo(() => {
      if (!salesOrders) return [];
      return salesOrders.filter(so => {
          const matchSearch = so.folio?.toLowerCase().includes(searchTerm.toLowerCase()) || so.id.toLowerCase().includes(searchTerm.toLowerCase());
          const matchStatus = statusFilter === 'all' || so.status === statusFilter;
          return matchSearch && matchStatus;
      });
  }, [salesOrders, searchTerm, statusFilter]);

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
    const soIds = new Set(filteredOrders.map(s => s.id));
    return activities
      .filter(a => a.salesOrderId && soIds.has(a.salesOrderId))
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredOrders, activities]);

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
  
  const statusOptions = Object.values(SalesOrderStatus).map(s => ({ value: s, label: s }));

  const renderContent = () => {
    if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;

    switch(view) {
        case 'pipeline':
             return (
                 <div className="flex-1 flex gap-6 overflow-x-auto pb-4 pt-2" onDragStart={handleDragStart}>
                    {Object.keys(groupedColumns).map((groupName) => (
                      <div key={groupName} className="flex flex-col h-full">
                        <div className="px-1 pb-3 flex items-center gap-2 mb-1">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{groupName}</span>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                        </div>
                        <div className="flex gap-4 h-full">
                            {groupedColumns[groupName].map(col => {
                              const stageItems = filteredOrders.filter(p => p.status === col.stage);
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
                { 
                    header: 'Orden #', 
                    accessor: (so: SalesOrder) => (
                         <div className="flex items-center gap-3">
                             {/* App Icon Pattern */}
                             <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                                <span className="material-symbols-outlined !text-sm">receipt_long</span>
                             </div>
                             <Link to={`/hubs/sales-orders/${so.id}`} className="font-medium text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 font-mono">{so.folio || so.id}</Link>
                        </div>
                    )
                },
                { header: 'Estado', accessor: (so: SalesOrder) => <Badge text={so.status} />},
                { header: 'Total', accessor: (so: SalesOrder) => <span className="font-bold text-slate-800 dark:text-slate-200">${so.total.toLocaleString()}</span>, className: 'text-right'},
                { header: 'Creación', accessor: (so: SalesOrder) => new Date(so.createdAt).toLocaleDateString()},
            ];
            return (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table columns={columns} data={filteredOrders} />
                </div>
            );
        case 'history':
            if (pipelineActivities.length === 0) {
                 return (
                     <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                         <span className="material-symbols-outlined text-4xl mb-2">history</span>
                         <p>No hay actividad registrada.</p>
                     </div>
                 );
             }
            return (
                <ul className="space-y-4 max-w-4xl mx-auto">
                    {pipelineActivities.map(activity => {
                        const user = usersMap.get(activity.userId);
                        const so = salesOrders.find(s => s.id === activity.salesOrderId);
                        
                        const userName = user?.name || 'Usuario Desconocido';
                        const userAvatar = user?.avatarUrl || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
                        const soLink = so ? `/hubs/sales-orders/${so.id}` : '#';
                        const soId = so?.folio || so?.id || 'Orden Desconocida';

                        return (
                            <li key={activity.id} className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                                <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full object-cover" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="font-semibold">{userName}</span>
                                        <span>&bull;</span>
                                        <Link to={soLink} className="hover:text-emerald-600 hover:underline">{soId}</Link>
                                        <span>&bull;</span>
                                        <span>{new Date(activity.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            );
    }
  };


  return (
    <div className="h-full flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Órdenes de Venta</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitorea el ciclo de vida de tus pedidos.</p>
            </div>
            <div className="flex items-center gap-3">
                <ViewSwitcher views={pipelineViews} activeView={view} onViewChange={(v) => setView(v as 'pipeline' | 'list' | 'history')} />
                <Link 
                    to="/hubs/sales-orders/new"
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nueva
                </Link>
            </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 items-center justify-between flex-shrink-0">
            {/* Input Safe Pattern */}
            <div className="relative w-full lg:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                </div>
                <input
                    type="text"
                    placeholder="Buscar folio o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                />
            </div>

             <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {view === 'list' && (
                    <FilterButton 
                        label="Estado" 
                        options={statusOptions} 
                        selectedValue={statusFilter} 
                        onSelect={setStatusFilter} 
                        allLabel="Todos"
                    />
                )}
            </div>
        </div>

      {renderContent()}
    </div>
  );
};

export default SalesOrdersPipelinePage;
