import React from 'react';
import { useCollection } from '../hooks/useCollection';
import { Carrier, SupplierRating } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

const LogisticsProvidersPage: React.FC = () => {
    const { data: carriers, loading, error } = useCollection<Carrier>('carriers');

    const getRatingColor = (rating: SupplierRating) => {
        switch (rating) {
            case SupplierRating.Excelente: return 'green';
            case SupplierRating.Bueno: return 'blue';
            case SupplierRating.Regular: return 'yellow';
            default: return 'gray';
        }
    };

    const columns = [
        {
            header: 'Nombre del Transportista',
            accessor: (c: Carrier) => <span className="font-medium text-text-main">{c.name}</span>,
        },
        {
            header: 'Rating',
            accessor: (c: Carrier) => <Badge text={c.rating} color={getRatingColor(c.rating)} />,
        },
        { header: 'Contacto', accessor: (c: Carrier) => c.contactName },
        { header: 'Teléfono', accessor: (c: Carrier) => c.contactPhone },
        {
            header: 'Tipos de Servicio',
            accessor: (c: Carrier) => c.serviceTypes.join(', '),
        },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar los transportistas.</p>;
        if (!carriers || carriers.length === 0) {
            return (
                <EmptyState
                    icon="local_shipping"
                    title="No hay transportistas"
                    message="Añade tus proveedores de transporte para gestionar tus entregas."
                    actionText="Añadir Transportista"
                    onAction={() => alert('Abrir modal para nuevo transportista')}
                />
            );
        }
        return <Table columns={columns} data={carriers} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-text-main">Proveedores de Transporte</h2>
                    <p className="text-sm text-text-secondary mt-1">Gestiona tu red de transportistas.</p>
                </div>
                <button
                    onClick={() => alert('Abrir modal para nuevo transportista')}
                    className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Añadir Transportista
                </button>
            </div>

            {renderContent()}
        </div>
    );
};

export default LogisticsProvidersPage;
