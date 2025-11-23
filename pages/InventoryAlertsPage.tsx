
import React, { useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Product, ProductLot, LotStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import { Link } from 'react-router-dom';

const AlertCard: React.FC<{ title: string; children: React.ReactNode; icon: string; colorClass: string; borderColor: string }> = ({ title, children, icon, colorClass, borderColor }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 ${borderColor} border-y border-r border-slate-200 dark:border-slate-700`}>
        <div className="flex items-center mb-4">
            <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 mr-3`}>
                <span className={`material-symbols-outlined text-2xl ${colorClass.replace('bg-', 'text-')}`}>{icon}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InventoryAlertsPage: React.FC = () => {
    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: lotsData, loading: lLoading } = useCollection<ProductLot>('lots');

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

    const overStockAlerts = useMemo(() => {
        if (!products || !lotsData) return [];
        return products
            .map(product => {
                if (!product.maxStock) return null;
                const productLots = lotsData.filter(l => l.productId === product.id);
                const totalStock = productLots.reduce((sum, lot) => sum + lot.stock.reduce((lotSum, s) => lotSum + s.qty, 0), 0);
                
                if (totalStock > product.maxStock) {
                    return { product, totalStock, excess: totalStock - product.maxStock };
                }
                return null;
            })
            .filter(Boolean);
    }, [products, lotsData]);

    const quarantineAlerts = useMemo(() => {
        if (!products || !lotsData) return [];
        const now = new Date();
        const quarantineThresholdDays = 7;

        return lotsData
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

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Alertas de Inventario</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitoreo de niveles críticos y estado de lotes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <AlertCard title="Stock Crítico (Bajo)" icon="warning" colorClass="bg-red-500" borderColor="border-red-500">
                    {lowStockAlerts.length > 0 ? lowStockAlerts.map(alert => (
                        <div key={alert!.product.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50 flex justify-between items-center">
                            <div>
                                <Link to={`/products/${alert!.product.id}`} className="font-bold text-red-800 dark:text-red-300 hover:underline text-sm">{alert!.product.name}</Link>
                                <div className="flex items-center gap-2 text-xs mt-1">
                                    <span className="text-red-700 dark:text-red-400 font-bold">Actual: {alert!.totalStock.toLocaleString()}</span>
                                    <span className="text-slate-500">Mín: {alert!.product.reorderPoint?.toLocaleString()}</span>
                                </div>
                            </div>
                            <Link to="/purchase/orders/new" className="bg-white dark:bg-slate-800 text-red-600 text-xs font-bold py-1.5 px-3 rounded-lg border border-red-200 dark:border-red-800 shadow-sm hover:bg-red-50">
                                Reabastecer
                            </Link>
                        </div>
                    )) : <div className="text-center py-6 text-slate-400"><span className="material-symbols-outlined text-3xl block mb-2">check_circle</span>Todo en orden</div>}
                </AlertCard>

                <AlertCard title="Exceso de Inventario" icon="inventory" colorClass="bg-amber-500" borderColor="border-amber-500">
                     {overStockAlerts.length > 0 ? overStockAlerts.map(alert => (
                        <div key={alert!.product.id} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/50 flex justify-between items-center">
                            <div>
                                <Link to={`/products/${alert!.product.id}`} className="font-bold text-amber-800 dark:text-amber-300 hover:underline text-sm">{alert!.product.name}</Link>
                                <div className="flex items-center gap-2 text-xs mt-1">
                                    <span className="text-amber-700 dark:text-amber-400 font-bold">Excedente: +{alert!.excess.toLocaleString()}</span>
                                    <span className="text-slate-500">Máx: {alert!.product.maxStock?.toLocaleString()}</span>
                                </div>
                            </div>
                            <Link to="/hubs/prospects" className="bg-white dark:bg-slate-800 text-amber-600 text-xs font-bold py-1.5 px-3 rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm hover:bg-amber-50">
                                Promocionar
                            </Link>
                        </div>
                    )) : <div className="text-center py-6 text-slate-400"><span className="material-symbols-outlined text-3xl block mb-2">check_circle</span>Sin excesos</div>}
                </AlertCard>

                <AlertCard title="Lotes en Cuarentena" icon="science" colorClass="bg-blue-500" borderColor="border-blue-500">
                    {quarantineAlerts.length > 0 ? quarantineAlerts.map(item => (
                        <div key={item!.lot.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/50 flex justify-between items-center">
                            <div>
                                <Link to={`/products/${item!.product!.id}`} className="font-bold text-blue-800 dark:text-blue-300 hover:underline text-sm">{item!.product!.name}</Link>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                    Lote: <span className="font-mono">{item!.lot.code}</span>
                                </p>
                            </div>
                            <button className="bg-white dark:bg-slate-800 text-blue-600 text-xs font-bold py-1.5 px-3 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm hover:bg-blue-50">
                                Liberar
                            </button>
                        </div>
                    )) : <div className="text-center py-6 text-slate-400"><span className="material-symbols-outlined text-3xl block mb-2">check_circle</span>Sin cuarentenas</div>}
                </AlertCard>
            </div>
        </div>
    );
};

export default InventoryAlertsPage;
