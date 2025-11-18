
import React, { useState, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { FreightPricingRule } from '../../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import NewFreightRuleDrawer from '../components/logistics/NewFreightRuleDrawer';
import { api } from '../api/firebaseApi';

const LogisticsPricingPage: React.FC = () => {
    const { data: initialRules, loading, error } = useCollection<FreightPricingRule>('freightPricing');
    const [rules, setRules] = useState<FreightPricingRule[] | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        if (initialRules) {
            setRules(initialRules);
        }
    }, [initialRules]);

    const handleSaveRule = async (newRuleData: Omit<FreightPricingRule, 'id'>) => {
        try {
            const newRule = await api.addDoc('freightPricing', newRuleData);
            setRules(prev => [...(prev || []), newRule]);
            setIsDrawerOpen(false);
        } catch (err) {
            console.error("Error saving rule:", err);
            alert("No se pudo guardar la regla.");
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (window.confirm('¿Confirmas que deseas eliminar esta regla de flete?')) {
            try {
                await api.deleteDoc('freightPricing', ruleId);
                setRules(prev => prev!.filter(r => r.id !== ruleId));
            } catch (error) {
                console.error('Error deleting freight rule:', error);
                alert('No se pudo eliminar la regla.');
            }
        }
    };

    const columns = [
        {
            header: 'Origen',
            accessor: (r: FreightPricingRule) => <span className="font-medium text-slate-800 dark:text-slate-200">{r.origin}</span>,
        },
        {
            header: 'Destino',
            accessor: (r: FreightPricingRule) => <span className="font-medium text-slate-800 dark:text-slate-200">{r.destination}</span>,
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
                    <button className="p-1 text-gray-500 hover:text-indigo-600"><span className="material-symbols-outlined">edit</span></button>
                    <button onClick={() => handleDeleteRule(r.id)} className="p-1 text-gray-500 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button>
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
                    onAction={() => setIsDrawerOpen(true)}
                />
            );
        }
        return <Table columns={columns} data={rules} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center">
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Añadir Regla
                </button>
            </div>

            {renderContent()}

            <NewFreightRuleDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleSaveRule}
            />
        </div>
    );
};

export default LogisticsPricingPage;
