import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { LogisticsDelivery, SalesOrder, Company, Carrier } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { Link } from 'react-router-dom';

const LogisticsDeliveriesPage: React.FC = () => {
    const { data: deliveries, loading, error } = useCollection<LogisticsDelivery>('deliveries');
    const { data: salesOrders } = useCollection<SalesOrder>('salesOrders');
    const { data: companies } = useCollection<Company>('companies');
    const { data: carriers } = useCollection<Carrier>('carriers');

    const [statusFilter, setStatusFilter] = useState('all');
    const [carrierFilter, setCarrierFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);
    const carriersMap = useMemo(() => new Map(carriers?.map(c => [c.id, c.name])), [carriers]);
    const deliveryStatuses = useMemo(() => deliveries ? [...new Set(deliveries.map(d => d.status))] : [], [deliveries]);

    const filteredData = useMemo(() => {
        if (!deliveries) return [];
        return deliveries.filter(delivery => {
            if (statusFilter !== 'all' && delivery.status !== statusFilter) return false;
            if (carrierFilter !== 'all' && delivery.carrierId !== carrierFilter) return false;
            const scheduledDate = new Date(delivery.scheduledDate);
            if (dateFrom && scheduledDate < new Date(dateFrom)) return false;
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (scheduledDate > toDate) return false;
            }
            return true;
        });
    }, [deliveries, statusFilter, carrierFilter, dateFrom, dateTo]);

    const getStatusColor = (status: LogisticsDelivery['status']) => {
        switch (status) {
            case 'Entregada': return 'green';
            case 'En Tránsito': return 'blue';
            case 'Programada': return 'yellow';
            case 'Retrasada': return 'red';
            default: return 'gray';
        }
    };

    const columns = [
        {
            header: 'Orden Venta',
            accessor: (d: LogisticsDelivery) => <Link to={`/hubs/sales-orders/${d.salesOrderId}`} className="font-medium text-primary hover:underline">{d.salesOrderId}</Link>
        },
        {
            header: 'Cliente',
            accessor: (d: LogisticsDelivery) => <Link to={`/crm/clients/${d.companyId}`} className="font-medium hover:underline">{companiesMap.get(d.companyId) || 'N/A'}</Link>
        },
        { header: 'Destino', accessor: (d: LogisticsDelivery) => d.destination },
        { header: 'Transportista', accessor: (d: LogisticsDelivery) => carriersMap.get(d.carrierId) || 'N/A' },
        { header: 'Estado', accessor: (d: LogisticsDelivery) => <Badge text={d.status} color={getStatusColor(d.status)} /> },
        {
            header: 'Fecha Programada',
            accessor: (d: LogisticsDelivery) => new Date(d.scheduledDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
        },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar las entregas.</p>;
        if (!filteredData || filteredData.length === 0) {
            return (
                <EmptyState
                    icon="local_shipping"
                    title="No se encontraron entregas"
                    message="Ajusta los filtros o programa una nueva entrega para comenzar."
                    actionText="Programar Entrega"
                    onAction={() => alert('Abrir modal para nueva entrega')}
                />
            );
        }
        return <Table columns={columns} data={filteredData} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-text-main">Entregas Programadas</h2>
                    <p className="text-sm text-text-secondary mt-1">Supervisa y gestiona todas tus entregas.</p>
                </div>
                <button
                    onClick={() => alert('Abrir modal para nueva entrega')}
                    className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Programar Entrega
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Estado:</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white text-gray-900 text-sm border-gray-300 rounded-md shadow-sm">
                        <option value="all">Todos</option>
                        {deliveryStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Transportista:</label>
                    <select value={carrierFilter} onChange={e => setCarrierFilter(e.target.value)} className="bg-white text-gray-900 text-sm border-gray-300 rounded-md shadow-sm">
                        <option value="all">Todos</option>
                        {carriers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Desde:</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-white text-gray-900 text-sm border-gray-300 rounded-md shadow-sm" />
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Hasta:</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-white text-gray-900 text-sm border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>

            {renderContent()}
        </div>
    );
};

export default LogisticsDeliveriesPage;
