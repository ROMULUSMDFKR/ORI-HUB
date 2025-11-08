import React from 'react';
import { useCollection } from '../hooks/useCollection';
import { FreightPricingRule } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const LogisticsPricingPage: React.FC = () => {
    const { data: rules, loading, error } = useCollection<FreightPricingRule>('freightPricing');

    const columns = [
        {
            header: 'Zona / Región',
            accessor: (r: FreightPricingRule) => <span className="font-medium text-text-main">{r.zone}</span>,
        },
        {
            header: 'Rango de Peso (kg)',
            accessor: (r: FreightPricingRule) => `${r.minWeightKg.toLocaleString()} - ${r.maxWeightKg.toLocaleString()}`,
        },
        {
            header: 'Precio por Kg',
            accessor: (r: FreightPricingRule) => r.pricePerKg > 0 ? `$${r.pricePerKg.toFixed(2)}` : '-',
            className: 'text-right',
        },
        {
            header: 'Tarifa Fija',
            accessor: (r: FreightPricingRule) => r.flatRate > 0 ? `$${r.flatRate.toLocaleString()}` : '-',
            className: 'text-right',
        },
        {
            header: 'Acciones',
            accessor: (r: FreightPricingRule) => (
                <div className="flex justify-end space-x-2">
                    <button className="p-1 text-gray-500 hover:text-primary"><span className="material-symbols-outlined">edit</span></button>
                    <button className="p-1 text-gray-500 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button>
                </div>
            ),
            className: 'text-right',
        },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar las reglas de precios.</p>;
        if (!rules || rules.length === 0) {
            return (
                <EmptyState
                    icon="price_change"
                    title="No hay reglas de precios de flete"
                    message="Define tus primeras reglas para automatizar el cálculo de costos de envío."
                    actionText="Añadir Regla"
                    onAction={() => alert('Abrir modal para nueva regla')}
                />
            );
        }
        return <Table columns={columns} data={rules} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-text-main">Reglas de Precios de Flete</h2>
                    <p className="text-sm text-text-secondary mt-1">Gestiona los costos de envío por zona, peso y servicio.</p>
                </div>
                <button
                    onClick={() => alert('Abrir modal para nueva regla')}
                    className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Añadir Regla
                </button>
            </div>

            {renderContent()}
        </div>
    );
};

export default LogisticsPricingPage;
