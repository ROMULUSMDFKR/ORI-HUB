import React, { useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Product, ProductLot, LotStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import { Link } from 'react-router-dom';

const AlertCard: React.FC<{ title: string; children: React.ReactNode; icon: string; iconClass: string; }> = ({ title, children, icon, iconClass }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center mb-4">
            <span className={`material-symbols-outlined text-2xl mr-3 ${iconClass}`}>{icon}</span>
            <h3 className="text-lg font-semibold text-text-main">{title}</h3>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InventoryAlertsPage: React.FC = () => {
    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: lotsData, loading: lLoading } = useCollection<{[key: string]: ProductLot[]}>('lots');

    const lowStockAlerts = useMemo(() => {
        if (!products || !lotsData) return [];
        // FIX: The useCollection hook returns an array containing the object, so we extract the first element.
        const lotsObject = (lotsData && lotsData.length > 0) ? lotsData[0] : {};
        
        return products
            .map(product => {
                if (!product.reorderPoint) return null;
                const productLots = lotsObject[product.id] || [];
                // FIX: Correctly reduce stock from all lots associated with the product.
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
        // FIX: The useCollection hook returns an array containing the object, so we extract the first element.
        const lotsObject = (lotsData && lotsData.length > 0) ? lotsData[0] : {};
        const allLots = Object.values(lotsObject).flat();
        const now = new Date();
        const quarantineThresholdDays = 7;

        return allLots
            .filter(lot => {
                // FIX: Ensure types are correct for date calculation and status comparison.
                const daysInQuarantine = (now.getTime() - new Date(lot.receptionDate).getTime()) / (1000 * 3600 * 24);
                return lot.status === LotStatus.EnCuarentena && daysInQuarantine > quarantineThresholdDays;
            })
            .map(lot => {
                // FIX: Correctly find the product associated with the lot.
                const product = products.find(p => (lotsObject[p.id] || []).some(l => l.id === lot.id));
                return { lot, product };
            })
            .filter(item => item.product);
    }, [products, lotsData]);

    const loading = pLoading || lLoading;

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-main">Alertas de Inventario</h2>
                <p className="text-sm text-text-secondary mt-1">Acciones proactivas para mantener tu stock saludable.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AlertCard title="Stock Bajo" icon="warning" iconClass="text-yellow-500">
                    {lowStockAlerts.length > 0 ? lowStockAlerts.map(alert => (
                        <div key={alert!.product.id} className="p-3 bg-yellow-50 rounded-md flex justify-between items-center">
                            <div>
                                <Link to={`/products/${alert!.product.id}`} className="font-semibold text-yellow-800 hover:underline">{alert!.product.name}</Link>
                                <p className="text-sm text-yellow-700">
                                    Actual: {alert!.totalStock.toLocaleString()} / Reorden: {alert!.product.reorderPoint?.toLocaleString()} {alert!.product.unitDefault}
                                </p>
                            </div>
                            <button className="bg-primary text-white text-xs font-bold py-1 px-3 rounded-full hover:bg-primary-dark">Crear OC</button>
                        </div>
                    )) : <p className="text-sm text-gray-500">No hay productos con bajo stock.</p>}
                </AlertCard>
                <AlertCard title="Lotes Requieren Atención" icon="science" iconClass="text-blue-500">
                    {/* FIX: Completed the truncated JSX to correctly render quarantine alerts. */}
                    {quarantineAlerts.length > 0 ? quarantineAlerts.map(item => (
                        <div key={item!.lot.id} className="p-3 bg-blue-50 rounded-md flex justify-between items-center">
                            <div>
                                <Link to={`/products/${item!.product!.id}`} className="font-semibold text-blue-800 hover:underline">{item!.product!.name}</Link>
                                <p className="text-sm text-blue-700">
                                    Lote: {item!.lot.code} - En cuarentena por más de 7 días.
                                </p>
                            </div>
                            <button className="bg-primary text-white text-xs font-bold py-1 px-3 rounded-full hover:bg-primary-dark">Revisar</button>
                        </div>
                    )) : <p className="text-sm text-gray-500">No hay lotes que requieran atención.</p>}
                </AlertCard>
            </div>
        </div>
    );
};

export default InventoryAlertsPage;
