
import React, { useMemo, useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Product, ProductLot, LotStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import { Link } from 'react-router-dom';
import FilterButton from '../components/ui/FilterButton';

const AlertActionCard: React.FC<{ 
    title: string; 
    count: number; 
    icon: string; 
    colorClass: string;
    description: string;
    items: React.ReactNode;
}> = ({ title, count, icon, colorClass, description, items }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                    <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{count} casos</p>
                </div>
            </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{description}</p>
        <div className="flex-1 space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            {items}
        </div>
    </div>
);

const InventoryAlertsPage: React.FC = () => {
    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: lotsData, loading: lLoading } = useCollection<ProductLot>('lots');
    const [filter, setFilter] = useState('all');

    const lowStockAlerts = useMemo(() => {
        if (!products || !lotsData) return [];
        const allLots = lotsData;
        return products
            .map(product => {
                if (!product.reorderPoint) return null;
                const productLots = allLots.filter(l => l.productId === product.id);
                const totalStock = productLots.reduce((sum, lot) => sum + lot.stock.reduce((lotSum, s) => lotSum + s.qty, 0), 0);
                if (totalStock < product.reorderPoint) {
                    return { product, totalStock };
                }
                return null;
            })
            .filter(Boolean);
    }, [products, lotsData]);

    const quarantineAlerts = useMemo(() => {
        if (!products || !lotsData) return [];
        const allLots = lotsData;
        const now = new Date();
        const quarantineThresholdDays = 7;

        return allLots
            .filter(lot => {
                const daysInQuarantine = (now.getTime() - new Date(lot.receptionDate).getTime()) / (1000 * 3600 * 24);
                return lot.status === LotStatus.EnCuarentena && daysInQuarantine > quarantineThresholdDays;
            })
            .map(lot => {
                const product = products.find(p => p.id === lot.productId);
                return { lot, product };
            })
            .filter(item => item.product);
    }, [products, lotsData]);

    const loading = pLoading || lLoading;

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
    
    const filterOptions = [
        { value: 'all', label: 'Todas las Alertas' },
        { value: 'low_stock', label: 'Stock Bajo' },
        { value: 'quarantine', label: 'Cuarentena' },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Centro de Alertas</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Atención prioritaria para incidencias de inventario.</p>
                </div>
                 <FilterButton 
                    label="Mostrar" 
                    options={filterOptions} 
                    selectedValue={filter} 
                    onSelect={setFilter} 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {(filter === 'all' || filter === 'low_stock') && (
                    <AlertActionCard 
                        title="Stock Crítico" 
                        count={lowStockAlerts.length} 
                        icon="production_quantity_limits" 
                        colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                        description="Productos por debajo del punto de reorden. Se recomienda generar órdenes de compra."
                        items={
                            lowStockAlerts.length > 0 ? lowStockAlerts.map(alert => (
                                <div key={alert!.product.id} className="p-4 bg-white border border-slate-200 dark:bg-slate-700/30 dark:border-slate-600 rounded-xl flex justify-between items-center transition-shadow hover:shadow-sm">
                                    <div>
                                        <Link to={`/products/${alert!.product.id}`} className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                            {alert!.product.name}
                                        </Link>
                                        <div className="flex items-center gap-2 mt-1 text-sm">
                                             <span className="text-red-600 font-bold">{alert!.totalStock.toLocaleString()}</span>
                                             <span className="text-slate-400">/</span>
                                             <span className="text-slate-500 dark:text-slate-400">Min: {alert!.product.reorderPoint?.toLocaleString()} {alert!.product.unitDefault}</span>
                                        </div>
                                    </div>
                                    <Link to="/purchase/orders/new" className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">
                                        Resurtir
                                    </Link>
                                </div>
                            )) : <div className="text-center p-8 text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">Todo en orden.</div>
                        }
                    />
                )}

                {(filter === 'all' || filter === 'quarantine') && (
                    <AlertActionCard 
                        title="Cuarentena Prolongada" 
                        count={quarantineAlerts.length} 
                        icon="science" 
                        colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                        description="Lotes que han permanecido en cuarentena por más de 7 días. Requieren inspección de calidad."
                        items={
                             quarantineAlerts.length > 0 ? quarantineAlerts.map(item => (
                                <div key={item!.lot.id} className="p-4 bg-white border border-slate-200 dark:bg-slate-700/30 dark:border-slate-600 rounded-xl flex justify-between items-center transition-shadow hover:shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{item!.lot.code}</span>
                                            <span className="text-xs text-slate-400">• {new Date(item!.lot.receptionDate).toLocaleDateString()}</span>
                                        </div>
                                        <Link to={`/products/${item!.product!.id}`} className="font-semibold text-slate-800 dark:text-slate-200 hover:underline block mt-1">
                                            {item!.product!.name}
                                        </Link>
                                    </div>
                                    <button className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">
                                        Inspeccionar
                                    </button>
                                </div>
                            )) : <div className="text-center p-8 text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">Sin lotes estancados.</div>
                        }
                    />
                )}
            </div>
        </div>
    );
};

export default InventoryAlertsPage;
