
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
    inventoryValue: number;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 flex-1">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
             <span className={`material-symbols-outlined text-2xl ${color.replace('bg-', 'text-')}`}>{icon}</span>
        </div>
        <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{title}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
        </div>
    </div>
);

const InventoryStockPage: React.FC = () => {
    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: lotsData, loading: lLoading } = useCollection<ProductLot>('lots');
    const { data: categories, loading: cLoading } = useCollection<Category>('categories');
    
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [filter, setFilter] = useState('');

    const { stockData, totalValue, totalItems, lowStockCount } = useMemo(() => {
        if (!products || !lotsData) return { stockData: [], totalValue: 0, totalItems: 0, lowStockCount: 0 };

        const allLots = lotsData;
        let valueAccumulator = 0;
        let lowStockAccumulator = 0;
        
        const data = products.map(product => {
            const productLots = allLots.filter(lot => lot.productId === product.id);
            
            const totalStock = productLots.reduce((sum, lot) => {
                return sum + lot.stock.reduce((lotSum, s) => lotSum + s.qty, 0);
            }, 0);

            // Calculate value based on lot costs
            const productValue = productLots.reduce((val, lot) => {
                 const lotQty = lot.stock.reduce((s, stock) => s + stock.qty, 0);
                 return val + (lotQty * lot.unitCost);
            }, 0);

            valueAccumulator += productValue;
            if (product.reorderPoint && totalStock <= product.reorderPoint) lowStockAccumulator++;

            return { id: product.id, product, totalStock, inventoryValue: productValue };
        });

        return { stockData: data, totalValue: valueAccumulator, totalItems: products.length, lowStockCount: lowStockAccumulator };
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
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600">
                        {item.product.imageUrl ? (
                            <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-400">image</span>
                        )}
                    </div>
                    <div>
                        <Link to={`/products/${item.product.id}`} className="font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:underline block">
                            {item.product.name}
                        </Link>
                        <span className="text-xs text-slate-500 font-mono">{item.product.sku}</span>
                    </div>
                </div>
            ) 
        },
        {
            header: 'Nivel de Stock',
            accessor: (item: StockInfo) => {
                const max = item.product.maxStock || item.totalStock * 2 || 100;
                const percent = Math.min((item.totalStock / max) * 100, 100);
                const isLow = item.product.reorderPoint && item.totalStock <= item.product.reorderPoint;
                
                return (
                    <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold dark:text-slate-200">{item.totalStock.toLocaleString()} {item.product.unitDefault}</span>
                            {item.product.reorderPoint && <span className="text-[10px] text-slate-400">Mín: {item.product.reorderPoint}</span>}
                        </div>
                         <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`} 
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Valor (Costo)',
            accessor: (item: StockInfo) => <span className="font-medium text-slate-700 dark:text-slate-300">${item.inventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>,
            className: 'text-right'
        },
        {
            header: 'Días Inventario',
            accessor: (item: StockInfo) => <span className="text-xs text-slate-500">~30 días</span>, // Mock calculation
            className: 'text-center'
        },
        {
            header: 'Estado',
            accessor: (item: StockInfo) => {
                const status = getStatus(item);
                return <Badge text={status.text} color={status.color as any} />;
            },
            className: 'text-center'
        },
        {
            header: 'Acciones',
            accessor: (item: StockInfo) => (
                 <div className="flex justify-end gap-2">
                     <Link to="/inventory/movements" className="p-1 text-slate-400 hover:text-indigo-600" title="Ajustar Stock">
                        <span className="material-symbols-outlined text-lg">tune</span>
                     </Link>
                     <Link to={`/products/${item.product.id}`} className="p-1 text-slate-400 hover:text-indigo-600" title="Ver Kardex">
                        <span className="material-symbols-outlined text-lg">history</span>
                     </Link>
                </div>
            ),
            className: 'text-right'
        }
    ];

    const loading = pLoading || lLoading || cLoading;

    return (
        <div className="space-y-6">
            {/* KPI Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard title="Valor Total Inventario" value={`$${totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`} icon="monetization_on" color="bg-emerald-500" />
                <KpiCard title="Productos Bajo Stock" value={lowStockCount} icon="warning" color="bg-amber-500" />
                <KpiCard title="Total SKUs" value={totalItems} icon="inventory_2" color="bg-blue-500" />
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center justify-between gap-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4 flex-wrap flex-grow">
                    <div className="flex items-center flex-grow max-w-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500">
                        <span className="material-symbols-outlined px-3 text-slate-500 dark:text-slate-400 pointer-events-none">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o SKU..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="w-full bg-transparent pr-4 py-2 text-sm focus:outline-none search-input-field"
                        />
                    </div>
                    <FilterButton label="Categoría" options={categoryOptions} selectedValue={categoryFilter} onSelect={setCategoryFilter} allLabel="Todas" />
                </div>
                <Link to="/inventory/movements" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">swap_horiz</span>
                    Nuevo Movimiento
                </Link>
            </div>

            {loading ? <div className="flex justify-center py-12"><Spinner /></div> : <Table columns={columns} data={filteredStockData} />}
        </div>
    );
};

export default InventoryStockPage;
