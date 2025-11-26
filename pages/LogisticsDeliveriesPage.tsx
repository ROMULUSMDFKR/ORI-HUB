
import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Delivery, DeliveryStatus, Company, Carrier } from '../types';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { Link } from 'react-router-dom';
import DeliveryDetailModal from '../components/logistics/DeliveryDetailModal';
import FilterButton from '../components/ui/FilterButton';

const LogisticsDeliveriesPage: React.FC = () => {
    const { data: initialDeliveries, loading: deliveriesLoading } = useCollection<Delivery>('deliveries');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { data: carriers, loading: carriersLoading } = useCollection<Carrier>('carriers');

    const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [carrierFilter, setCarrierFilter] = useState('all');

    React.useEffect(() => {
        if(initialDeliveries) {
            setDeliveries(initialDeliveries);
        }
    }, [initialDeliveries]);

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);
    const carriersMap = useMemo(() => new Map(carriers?.map(c => [c.id, c.name])), [carriers]);
    
    const handleOpenModal = (delivery: Delivery) => {
        setSelectedDelivery(delivery);
        setIsModalOpen(true);
    };

    const handleUpdateDelivery = (updatedDelivery: Delivery) => {
        setDeliveries(prev => prev!.map(d => d.id === updatedDelivery.id ? updatedDelivery : d));
    };

    const getStatusColor = (status: DeliveryStatus) => {
        switch (status) {
            case DeliveryStatus.Entregada: return 'green';
            case DeliveryStatus.EnTransito: return 'blue';
            case DeliveryStatus.Programada: return 'yellow';
            case DeliveryStatus.Incidencia:
            case DeliveryStatus.Cancelada: return 'red';
            default: return 'gray';
        }
    };
    
    // Filter Data first
    const filteredDeliveries = useMemo(() => {
        if (!deliveries) return [];
        return deliveries.filter(d => {
            const matchesSearch = 
                d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.salesOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                companiesMap.get(d.companyId)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.trackingNumber && d.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
            const matchesCarrier = carrierFilter === 'all' || d.carrierId === carrierFilter;
            
            return matchesSearch && matchesStatus && matchesCarrier;
        });
    }, [deliveries, searchTerm, statusFilter, carrierFilter, companiesMap]);

    // Group deliveries by date
    const groupedDeliveries = useMemo<Record<string, Delivery[]>>(() => {
        const groups: Record<string, Delivery[]> = {};
        const now = new Date();
        const todayStr = now.toLocaleDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString();

        const sortedDeliveries = [...filteredDeliveries].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

        sortedDeliveries.forEach(delivery => {
            const date = new Date(delivery.scheduledDate);
            const dateStr = date.toLocaleDateString();
            let key = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            key = key.charAt(0).toUpperCase() + key.slice(1);
            
            if (dateStr === todayStr) key = 'Hoy';
            else if (dateStr === tomorrowStr) key = 'Mañana';

            if (!groups[key]) groups[key] = [];
            groups[key].push(delivery);
        });
        
        return groups;
    }, [filteredDeliveries]);
    
    const statusOptions = [
        { value: 'all', label: 'Todos' },
        ...Object.values(DeliveryStatus).map(s => ({ value: s, label: s }))
    ];
    
    const carrierOptions = [
        { value: 'all', label: 'Todos' },
        ...(carriers || []).map(c => ({ value: c.id, label: c.name }))
    ];

    const loading = deliveriesLoading || companiesLoading || carriersLoading;

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-8 pb-12">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Entregas</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Programación y seguimiento de envíos.</p>
                </div>
                {/* Mock action since creation usually happens from Sales Orders */}
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 justify-between items-center">
                 {/* Input Safe Pattern */}
                <div className="relative w-full lg:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar guía, orden o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                    <FilterButton 
                        label="Estado" 
                        options={statusOptions} 
                        selectedValue={statusFilter} 
                        onSelect={setStatusFilter} 
                    />
                    <FilterButton 
                        label="Transportista" 
                        options={carrierOptions} 
                        selectedValue={carrierFilter} 
                        onSelect={setCarrierFilter} 
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
                {!deliveries || deliveries.length === 0 ? (
                    <EmptyState icon="local_shipping" title="No hay entregas programadas" message="Las entregas creadas desde Órdenes de Venta aparecerán aquí." />
                ) : Object.keys(groupedDeliveries).length === 0 ? (
                     <div className="text-center py-12">
                        <p className="text-slate-500 dark:text-slate-400">No se encontraron entregas con los filtros seleccionados.</p>
                        <button onClick={() => {setSearchTerm(''); setStatusFilter('all'); setCarrierFilter('all')}} className="mt-2 text-indigo-600 hover:underline font-medium">Limpiar filtros</button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.keys(groupedDeliveries).map((dateLabel) => {
                            const dateDeliveries = groupedDeliveries[dateLabel];
                            return (
                            <div key={dateLabel}>
                                <div className="flex items-center gap-3 mb-4">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{dateLabel}</h4>
                                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                                    <span className="text-xs font-medium text-slate-500">{dateDeliveries.length} envíos</span>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {dateDeliveries.map(delivery => (
                                        <div 
                                            key={delivery.id} 
                                            onClick={() => handleOpenModal(delivery)}
                                            className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 mb-3 sm:mb-0">
                                                {/* App Icon Pattern */}
                                                <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${delivery.isSample ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                    <span className="material-symbols-outlined text-2xl">{delivery.isSample ? 'science' : 'inventory_2'}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
                                                            {delivery.deliveryNumber}
                                                        </p>
                                                        <span className="text-xs text-slate-400 font-normal">• {delivery.isSample ? 'Muestra' : 'Pedido'}</span>
                                                    </div>
                                                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline truncate">{companiesMap.get(delivery.companyId) || 'Cliente desconocido'}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 text-sm">
                                                 <div className="flex items-center gap-2 min-w-[150px]">
                                                    <span className="material-symbols-outlined text-slate-400 text-lg">local_shipping</span>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Transportista</span>
                                                        <span className="text-slate-700 dark:text-slate-300">{carriersMap.get(delivery.carrierId) || 'Pendiente'}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 min-w-[150px]">
                                                    <span className="material-symbols-outlined text-slate-400 text-lg">location_on</span>
                                                     <div className="flex flex-col">
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Destino</span>
                                                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={delivery.destination}>{delivery.destination}</span>
                                                    </div>
                                                </div>

                                                 <div className="sm:text-right">
                                                    <Badge text={delivery.status} color={getStatusColor(delivery.status)} />
                                                </div>
                                            </div>
                                            
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                                                <span className="material-symbols-outlined">chevron_right</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>

            <DeliveryDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                delivery={selectedDelivery}
                onUpdateDelivery={handleUpdateDelivery}
            />
        </div>
    );
};

export default LogisticsDeliveriesPage;
