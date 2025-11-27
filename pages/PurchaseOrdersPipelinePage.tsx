
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PURCHASE_ORDERS_PIPELINE_COLUMNS } from '../constants';
import { PurchaseOrder, PurchaseOrderStatus, ActivityLog, Supplier, Attachment } from '../types';
import PurchaseOrderCard from '../components/purchase/PurchaseOrderCard';
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
  stage: PurchaseOrderStatus;
  objective: string;
  items: PurchaseOrder[];
}> = ({ stage, objective, items }) => {
    const totalValue = items.reduce((sum, po) => sum + (po.total || 0), 0);
    return (
        <div className="flex-shrink-0 w-80 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 h-full flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center group">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${items.length > 0 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide truncate max-w-[150px]">{stage}</h3>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">{items.length}</span>
                </div>

                <div className="relative">
                    <span className="material-symbols-outlined text-slate-400 hover:text-blue-600 cursor-help text-lg">info</span>
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
                        <PurchaseOrderCard item={item} onDragStart={() => {}} />
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg m-1">
                         <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-2">shopping_bag</span>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Sin órdenes</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- KPI Widget for Purchase Orders ---
const PurchasingKPIs: React.FC<{ orders: PurchaseOrder[] }> = ({ orders }) => {
    const activeOrders = orders.filter(o => o.status !== PurchaseOrderStatus.Cancelada && o.status !== PurchaseOrderStatus.Facturada);
    const totalCommitment = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    const pendingApproval = orders.filter(o => o.status === PurchaseOrderStatus.PorAprobar).length;
    const pendingPayment = orders.filter(o => o.status === PurchaseOrderStatus.PagoPendiente || o.status === PurchaseOrderStatus.PagoParcial).length;
    const inTransit = orders.filter(o => o.status === PurchaseOrderStatus.EnTransito).length;
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <span className="material-symbols-outlined text-2xl">payments</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Gasto Activo</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">${totalCommitment.toLocaleString('en-US', { notation: "compact", compactDisplay: "short" })}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                 <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <span className="material-symbols-outlined text-2xl">gavel</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Por Aprobar</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{pendingApproval}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                 <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                    <span className="material-symbols-outlined text-2xl">attach_money</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Pendiente Pago</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{pendingPayment}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                 <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <span className="material-symbols-outlined text-2xl">local_shipping</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">En Tránsito</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{inTransit}</p>
                </div>
            </div>
        </div>
    )
}

const PurchaseOrdersPipelinePage: React.FC = () => {
  const { data: poData, loading: poLoading } = useCollection<PurchaseOrder>('purchaseOrders');
  const { data: activitiesData, loading: actLoading } = useCollection<ActivityLog>('activities');
  const { data: suppliers, loading: sLoading } = useCollection<Supplier>('suppliers');
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Invoice Upload Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [orderToInvoice, setOrderToInvoice] = useState<PurchaseOrder | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (poData) {
      setPurchaseOrders(poData);
    }
  }, [poData]);

  useEffect(() => {
    if (activitiesData) {
      setActivities(activitiesData);
    }
  }, [activitiesData]);
  
  const loading = poLoading || actLoading || sLoading;
  const suppliersMap = useMemo(() => new Map<string, string>(suppliers?.map(s => [s.id, s.name] as [string, string])), [suppliers]);

  const filteredOrders = useMemo(() => {
      if (!purchaseOrders) return [];
      return purchaseOrders.filter(po => {
          const matchSearch = po.id.toLowerCase().includes(searchTerm.toLowerCase()) || suppliersMap.get(po.supplierId)?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchStatus = statusFilter === 'all' || po.status === statusFilter;
          return matchSearch && matchStatus;
      });
  }, [purchaseOrders, searchTerm, statusFilter, suppliersMap]);
  
  const groupedColumns = useMemo(() => {
    return PURCHASE_ORDERS_PIPELINE_COLUMNS.reduce((acc, column) => {
      const group = column.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(column);
      return acc;
    }, {} as Record<string, (typeof PURCHASE_ORDERS_PIPELINE_COLUMNS)[number][]>);
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

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStage: PurchaseOrderStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId || !currentUser) return;
    
    const originalOrder = purchaseOrders.find(o => o.id === itemId);
    if (!originalOrder || originalOrder.status === targetStage) return;

    // --- PIPELINE LOCK LOGIC ---
    if (targetStage === PurchaseOrderStatus.Facturada) {
        // Check if fully paid
        if (originalOrder.paidAmount < originalOrder.total) {
            showToast('warning', `La orden no está pagada completamente. Saldo pendiente: $${(originalOrder.total - originalOrder.paidAmount).toFixed(2)}`);
            return;
        }
        
        // If paid, open drawer to upload invoice
        setOrderToInvoice(originalOrder);
        setIsInvoiceModalOpen(true);
        return; // Stop here, modal handles the rest
    }

    // Optimistic update for other stages
    setPurchaseOrders(prevItems => prevItems.map(p => p.id === itemId ? { ...p, status: targetStage } : p));
    
    try {
        await api.updateDoc('purchaseOrders', itemId, { status: targetStage });
        // Log activity if supported
    } catch (error) {
        showToast('error', 'No se pudo actualizar la etapa.');
        setPurchaseOrders(prev => prev.map(p => p.id === itemId ? originalOrder : p));
    }
  };

  const handleInvoiceUploadAndClose = async () => {
    if (!invoiceFile || !orderToInvoice) {
        showToast('warning', 'Debes seleccionar el archivo de la factura.');
        return;
    }

    setIsUploading(true);
    try {
        const url = await api.uploadFile(invoiceFile, `purchase_orders/${orderToInvoice.id}/invoice`);
        const attachment: Attachment = {
            id: `inv-${Date.now()}`,
            name: invoiceFile.name,
            size: invoiceFile.size,
            url: url
        };

        // Update order with Invoice AND Status
        await api.updateDoc('purchaseOrders', orderToInvoice.id, { 
            invoiceAttachment: attachment,
            status: PurchaseOrderStatus.Facturada
        });

        // Update local state
        setPurchaseOrders(prev => prev.map(p => 
            p.id === orderToInvoice.id 
            ? { ...p, status: PurchaseOrderStatus.Facturada, invoiceAttachment: attachment } 
            : p
        ));

        showToast('success', 'Factura subida y orden cerrada exitosamente.');
        setIsInvoiceModalOpen(false);
        setOrderToInvoice(null);
        setInvoiceFile(null);

    } catch (error) {
        console.error("Error uploading invoice:", error);
        showToast('error', 'Error al subir la factura.');
    } finally {
        setIsUploading(false);
    }
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setInvoiceFile(e.target.files[0]);
    }
  };
  
  const pipelineViews: ViewOption[] = [
    { id: 'pipeline', name: 'Pipeline', icon: 'view_kanban' },
    { id: 'list', name: 'Lista', icon: 'list' },
  ];
  
  const statusOptions = Object.values(PurchaseOrderStatus).map(s => ({ value: s, label: s }));

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
                                  <PipelineColumn stage={col.stage} objective={col.objective} items={stageItems} />
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
                    accessor: (po: PurchaseOrder) => (
                         <div className="flex items-center gap-3">
                             <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                <span className="material-symbols-outlined !text-sm">receipt_long</span>
                             </div>
                             <Link to={`/purchase/orders/${po.id}`} className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-mono">{po.id}</Link>
                        </div>
                    )
                },
                { header: 'Proveedor', accessor: (po: PurchaseOrder) => suppliersMap.get(po.supplierId) || 'Desconocido' },
                { header: 'Estado', accessor: (po: PurchaseOrder) => <Badge text={po.status} />},
                { header: 'Total', accessor: (po: PurchaseOrder) => <span className="font-bold text-slate-800 dark:text-slate-200">${(po.total || 0).toLocaleString()}</span>, className: 'text-right'},
                { header: 'Creación', accessor: (po: PurchaseOrder) => new Date(po.createdAt).toLocaleDateString()},
            ];
            return (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table columns={columns} data={filteredOrders} />
                </div>
            );
        default:
            return null;
    }
  };


  return (
    <div className="h-full flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Pipeline de Compras</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona el ciclo de vida de tus adquisiciones.</p>
            </div>
            <div className="flex items-center gap-3">
                <ViewSwitcher views={pipelineViews} activeView={view} onViewChange={(v) => setView(v as 'pipeline' | 'list' | 'history')} />
                <Link 
                    to="/purchase/orders/new"
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nueva OC
                </Link>
            </div>
        </div>
        
        {/* KPI Mini-Dashboard */}
        <PurchasingKPIs orders={filteredOrders} />

        {/* Toolbar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 items-center justify-between flex-shrink-0">
            {/* Input Safe Pattern */}
            <div className="relative w-full lg:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                </div>
                <input
                    type="text"
                    placeholder="Buscar orden o proveedor..."
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

        {/* Invoice Upload Modal for Pipeline Lock */}
        {isInvoiceModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined text-3xl">receipt_long</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Cerrar Orden (Facturada)</h3>
                            <p className="text-sm text-slate-500 mt-2">Para mover a <strong>Facturada</strong>, la orden debe estar pagada y es obligatorio adjuntar el archivo fiscal.</p>
                        </div>
                        
                        <div 
                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                        onClick={() => invoiceInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            ref={invoiceInputRef}
                            className="hidden" 
                            accept=".pdf,.xml"
                            onChange={handleInvoiceFileChange}
                        />
                            {invoiceFile ? (
                                <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                                    <span className="material-symbols-outlined">check_circle</span>
                                    {invoiceFile.name}
                                </div>
                            ) : (
                                <div className="text-slate-500">
                                    <span className="material-symbols-outlined text-3xl mb-2">upload_file</span>
                                    <p className="text-sm font-medium">Haz clic para seleccionar archivo</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button 
                            onClick={() => { setIsInvoiceModalOpen(false); setInvoiceFile(null); setOrderToInvoice(null); }}
                            className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleInvoiceUploadAndClose}
                            disabled={!invoiceFile || isUploading}
                            className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {isUploading && <Spinner />}
                            {isUploading ? 'Guardando...' : 'Confirmar'}
                        </button>
                        </div>
                </div>
            </div>
        )}

      {renderContent()}
    </div>
  );
};

export default PurchaseOrdersPipelinePage;
