import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Product, ProductLot, Category } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';

interface StockInfo {
    // FIX: Add id for Table component key.
    id: string;
    product: Product;
    totalStock: number;
}

const InventoryStockPage: React.FC = () => {
    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: lotsData, loading: lLoading } = useCollection<{[key: string]: ProductLot[]}>('lots');
    const { data: categories, loading: cLoading } = useCollection<Category>('categories');
    
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [filter, setFilter] = useState('');

    const stockData = useMemo<StockInfo[]>(() => {
        if (!products || !lotsData) return [];

        // FIX: The useCollection hook returns an array containing the object, so we extract the first element.
        const lotsObject = (lotsData && lotsData.length > 0) ? lotsData[0] : {};
        
        return products.map(product => {
            const productLots = lotsObject[product.id] || [];
            const totalStock = productLots.reduce((sum, lot) => {
                return sum + lot.stock.reduce((lotSum, s) => lotSum + s.qty, 0);
            }, 0);
            // FIX: Add product.id to the returned object to match the StockInfo interface and satisfy Table props.
            return { id: product.id, product, totalStock };
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

    const getStatus = (item: StockInfo) => {
        if (item.totalStock <= 0) return { text: 'Agotado', color: 'red' };
        if (item.product.reorderPoint && item.totalStock < item.product.reorderPoint) {
            return { text: 'Bajo Stock', color: 'yellow' };
        }
        return { text: 'En Stock', color: 'green' };
    };

    const columns = [
        { header: 'SKU', accessor: (item: StockInfo) => <span className="font-mono text-xs">{item.product.sku}</span> },
        {
            header: 'Producto',
            accessor: (item: StockInfo) => (
                <Link to={`/products/${item.product.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {item.product.name}
                </Link>
            )
        },
        {
            header: 'Stock Total',
            accessor: (item: StockInfo) => <span className="font-bold">{`${item.totalStock.toLocaleString()} ${item.product.unitDefault}`}</span>,
            className: 'text-right'
        },
        {
            header: 'Punto de Reorden',
            accessor: (item: StockInfo) => item.product.reorderPoint ? `${item.product.reorderPoint.toLocaleString()} ${item.product.unitDefault}` : '-',
            className: 'text-right'
        },
        {
            header: 'Estado',
            accessor: (item: StockInfo) => {
                const status = getStatus(item);
                return <Badge text={status.text} color={status.color as any} />;
            }
        }
    ];

    const loading = pLoading || lLoading || cLoading;

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center justify-between gap-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500">
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
                <button className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Movimiento
                </button>
            </div>

            {loading ? <div className="flex justify-center py-12"><Spinner /></div> : <Table columns={columns} data={filteredStockData} />}
        </div>
    );
};

export default InventoryStockPage;
