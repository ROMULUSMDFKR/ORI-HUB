import React from 'react';
import { useCollection } from '../hooks/useCollection';
import { PurchaseOrder, Supplier } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

const PurchaseOrdersPage: React.FC = () => {
    const { data: orders, loading, error } = useCollection<PurchaseOrder>('purchaseOrders');
    const { data: suppliers } = useCollection<Supplier>('suppliers');

    const suppliersMap = React.useMemo(() => {
        if (!suppliers) return new Map();
        return new Map(suppliers.map(s => [s.id, s.name]));
    }, [suppliers]);

    const getStatusColor = (status: PurchaseOrder['status']) => {
        switch (status) {
            case 'Confirmada':
            case 'Recibida Completa':
                return 'green';
            case 'Enviada':
            case 'Recibida Parcial':
                return 'blue';
            case 'Borrador':
                return 'gray';
            default:
                return 'yellow';
        }
    };

    const columns = [
        { header: 'ID de Orden', accessor: (order: PurchaseOrder) => <span className="font-medium text-primary hover:underline cursor-pointer">{order.id}</span> },
        { header: 'Proveedor', accessor: (order: PurchaseOrder) => suppliersMap.get(order.supplierId) || 'N/A' },
        { header: 'Fecha', accessor: (order: PurchaseOrder) => new Date(order.createdAt).toLocaleDateString() },
        { header: 'Estado', accessor: (order: PurchaseOrder) => <Badge text={order.status} color={getStatusColor(order.status)} /> },
        { header: 'Total', accessor: (order: PurchaseOrder) => `$${order.total.toLocaleString('en-US', {minimumFractionDigits: 2})}`, className: 'text-right font-medium' },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar las órdenes de compra.</p>;
        if (!orders || orders.length === 0) {
            return (
                <EmptyState
                    icon="receipt_long"
                    title="No hay órdenes de compra"
                    message="Crea tu primera orden de compra para gestionar el abastecimiento de tus proveedores."
                    actionText="Crear Orden de Compra"
                    onAction={() => alert('Abrir drawer para nueva OC')}
                />
            );
        }
        return <Table columns={columns} data={orders} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-text-main">Órdenes de Compra</h2>
                    <p className="text-sm text-text-secondary mt-1">Gestiona el abastecimiento con tus proveedores.</p>
                </div>
                <button 
                  onClick={() => alert('Abrir drawer para nueva OC')}
                  className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Orden de Compra
                </button>
            </div>

            {renderContent()}
        </div>
    );
};

export default PurchaseOrdersPage;
