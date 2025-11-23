
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Product, ProductLot, InventoryMove } from '../types';
import Spinner from '../components/ui/Spinner';
import { api } from '../api/firebaseApi';

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string; secondary?: string }> = ({ title, value, icon, color, secondary }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">{title}</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-2">{value}</p>
                {secondary && <p className="text-xs text-slate-400 mt-1">{secondary}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
                <span className={`material-symbols-outlined text-3xl ${color.replace('bg-', 'text-')}`}>{icon}</span>
            </div>
        </div>
    </div>
);

const HeatMap: React.FC<{ data: { zone: string; value: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
            {data.map((item, index) => {
                const intensity = item.value / maxValue;
                let bgColor = 'bg-slate-100 dark:bg-slate-700';
                if (intensity > 0.7) bgColor = 'bg-red-500';
                else if (intensity > 0.4) bgColor = 'bg-orange-400';
                else if (intensity > 0.1) bgColor = 'bg-green-500';
                
                return (
                    <div key={index} className={`p-4 rounded-lg ${bgColor} text-white text-center transition-all hover:scale-105`}>
                        <p className="font-bold text-sm">{item.zone}</p>
                        <p className="text-xs opacity-80">{item.value} movs.</p>
                    </div>
                );
            })}
        </div>
    );
};

const InventoryDashboardPage: React.FC = () => {
    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: lots, loading: lLoading } = useCollection<ProductLot>('lots');
    const { data: movements, loading: mLoading } = useCollection<InventoryMove>('inventoryMoves');

    const loading = pLoading || lLoading || mLoading;

    const metrics = useMemo(() => {
        if (!products || !lots || !movements) return null;

        let totalValue = 0;
        let totalItems = 0;
        let lowStockCount = 0;
        let expiringLotsCount = 0; // Mock logic for expiration

        lots.forEach(lot => {
             const qty = lot.stock.reduce((acc, s) => acc + s.qty, 0);
             totalValue += qty * lot.unitCost;
             totalItems += qty;
             // Mock check: if reception date > 1 year ago -> "Expiring"
             if(new Date(lot.receptionDate).getTime() < new Date().getTime() - (365 * 24 * 60 * 60 * 1000)) {
                 expiringLotsCount++;
             }
        });

        products.forEach(p => {
            const pLots = lots.filter(l => l.productId === p.id);
            const stock = pLots.reduce((acc, l) => acc + l.stock.reduce((a,s) => a + s.qty, 0), 0);
            if (p.reorderPoint && stock <= p.reorderPoint) lowStockCount++;
        });

        // Mock Heatmap data from movements
        const zones = ['Pasillo A', 'Pasillo B', 'Zona Carga', 'Refrigerado', 'Patio', 'Rack 1', 'Rack 2', 'Rack 3'];
        const heatmapData = zones.map(z => ({
            zone: z,
            value: Math.floor(Math.random() * 50) // Simulated activity
        }));

        return {
            totalValue,
            totalItems,
            lowStockCount,
            expiringLotsCount,
            heatmapData
        };
    }, [products, lots, movements]);

    if (loading || !metrics) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Dashboard de Inventario</h1>
                <div className="flex gap-2">
                    <Link to="/inventory/movements/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">swap_horiz</span>
                        Registrar Movimiento
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    title="Valor Total Inventario" 
                    value={`$${metrics.totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`} 
                    icon="monetization_on" 
                    color="bg-emerald-500"
                    secondary="Costo Promedio"
                />
                <KpiCard 
                    title="Unidades en Stock" 
                    value={metrics.totalItems.toLocaleString()} 
                    icon="inventory_2" 
                    color="bg-blue-500" 
                />
                <KpiCard 
                    title="Alertas de Stock Bajo" 
                    value={metrics.lowStockCount} 
                    icon="warning" 
                    color="bg-amber-500" 
                    secondary="Productos bajo mínimo"
                />
                <KpiCard 
                    title="Lotes en Riesgo" 
                    value={metrics.expiringLotsCount} 
                    icon="timelapse" 
                    color="bg-red-500" 
                    secondary="Antigüedad > 1 año"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Actividad por Zona (Mapa de Calor)</h3>
                    <p className="text-sm text-slate-500 mb-4">Intensidad de movimientos en los últimos 30 días.</p>
                    <HeatMap data={metrics.heatmapData} />
                </div>

                <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Acciones Rápidas</h3>
                    <div className="space-y-3">
                         <Link to="/inventory/stock" className="block p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-indigo-500">inventory</span>
                                <div>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">Consultar Existencias</p>
                                    <p className="text-xs text-slate-500">Ver stock por producto y lote</p>
                                </div>
                            </div>
                        </Link>
                         <Link to="/inventory/locations/new" className="block p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-indigo-500">add_location_alt</span>
                                <div>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">Nueva Ubicación</p>
                                    <p className="text-xs text-slate-500">Crear rack, pasillo o zona</p>
                                </div>
                            </div>
                        </Link>
                        <Link to="/inventory/alerts" className="block p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-indigo-500">notifications_active</span>
                                <div>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">Gestionar Alertas</p>
                                    <p className="text-xs text-slate-500">Configurar puntos de reorden</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryDashboardPage;
