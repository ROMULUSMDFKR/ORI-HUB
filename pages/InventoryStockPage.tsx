
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Product, ProductLot, Category } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';

interface StockInfo {
    id: string;
    product: Product;
    totalStock: number;
    stockValue: number;
}

// KPI Card Component
const StockKpiCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    }[color] || "bg-slate-100 text-slate-600";

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
            </div>
        </div>
    );
};

const InventoryStockPage: React.FC = () => {
    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: lotsData, loading: lLoading } = useCollection<ProductLot>('lots');
    const { data: categories, loading: cLoading } = useCollection<Category>('categories');
    
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [filter, setFilter] = useState('');

    const stockData = useMemo<StockInfo[]>(() => {
        if (!products || !lotsData) return [];

        const allLots = lotsData;
        
        return products.map(product => {
            const productLots = allLots.filter(lot => lot.productId === product.id);
            
            const totalStock = productLots.reduce((sum, lot) => {
                return sum + lot.stock.reduce((lotSum, s) => lotSum + s.qty, 0);
            }, 0);
            
            // Calculate estimated value based on min price
            const stockValue = totalStock * (product.pricing?.min || 0);

            return { id: product.id, product, totalStock, stockValue };
        });
    }, [products, lotsData]);
    
    const categoryOptions = useMemo(() => (categories || []).map(c => ({ value: c.id, label: c.name })), [categories]);

    const filteredStockData = useMemo(() => {
        return stockData.filter(item => {
            const categoryMatch = categoryFilter === 'all' || item.product.categoryId === categoryFilter;
            const nameMatch = item.product.name.toLowerCase().includes(filter.toLowerCase()) ||
                              item.product.sku.toLowerCase().includes(filter.toLowerCase());
            return categoryMatch && nameMatch;
        });
    }, [stockData, categoryFilter, filter]);

    // Stats Calculation
    const stats = useMemo(() => {
        const totalValue = filteredStockData.reduce((sum, item) => sum + item.stockValue, 0);
        const lowStockCount = filteredStockData.filter(item => item.product.reorderPoint && item.totalStock < item.product.reorderPoint).length;
        return { totalValue, lowStockCount, totalSkus: filteredStockData.length };
    }, [filteredStockData]);

    const getStatus = (item: StockInfo) => {
        if (item.totalStock <= 0) return { text: 'Agotado', color: 'red' };
        if (item.product.reorderPoint && item.totalStock < item.product.reorderPoint) {
            return { text: 'Bajo Stock', color: 'yellow' };
        }
        return { text: 'En Stock', color: 'green' };
    };

    const columns = [
        { 
            header: 'Producto', 
            accessor: (item: StockInfo) => (
                <div className="flex items-center gap-3">
                    {/* App Icon Pattern */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-xl">inventory_2</span>
                    </div>
                    <div>
                        <Link to={`/products/${item.product.id}`} className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            {item.product.name}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{item.product.sku}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Stock Total',
            accessor: (item: StockInfo) => (
                <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.totalStock.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 ml-1">{item.product.unitDefault}</span>
                </div>
            ),
            className: 'text-right'
        },
        {
            header: 'Punto de Reorden',
            accessor: (item: StockInfo) => (
                item.product.reorderPoint 
                ? <span className="text-sm text-slate-600 dark:text-slate-300">{item.product.reorderPoint.toLocaleString()}</span> 
                : <span className="text-slate-400">-</span>
            ),
            className: 'text-right'
        },
        {
            header: 'Valor Estimado',
            accessor: (item: StockInfo) => (
                <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                    ${item.stockValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </span>
            ),
            className: 'text-right'
        },
        {
            header: 'Estado',
            accessor: (item: StockInfo) => {
                const status = getStatus(item);
                return <Badge text={status.text} color={status.color as any} />;
            },
            className: 'text-right'
        }
    ];

    const loading = pLoading || lLoading || cLoading;

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Inventario Actual</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Visión general de existencias y valoración.</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/inventory/movements" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-colors">
                        <span className="material-symbols-outlined">swap_horiz</span>
                        Movimientos
                    </Link>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StockKpiCard title="Total SKUs" value={stats.totalSkus.toLocaleString()} icon="dataset" color="indigo" />
                <StockKpiCard title="Valor Total" value={`$${stats.totalValue.toLocaleString()}`} icon="monetization_on" color="emerald" />
                <StockKpiCard title="Alertas de Stock" value={stats.lowStockCount.toString()} icon="warning" color="amber" />
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                {/* Input Safe Pattern */}
                <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                </div>
                <FilterButton 
                    label="Categoría" 
                    options={categoryOptions} 
                    selectedValue={categoryFilter} 
                    onSelect={setCategoryFilter} 
                    allLabel="Todas" 
                />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table columns={columns} data={filteredStockData} />
            </div>
        </div>
    );
};

export default InventoryStockPage;
