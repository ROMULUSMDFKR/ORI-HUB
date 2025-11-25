

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Product, Category, ProductLot, SalesOrder, QuoteItem } from '../types';
import Spinner from '../components/ui/Spinner';

// --- Reusable UI Components ---

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; link?: string; }> = ({ title, value, icon, link }) => {
  const content = (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start">
          <h3 className="text-base font-semibold text-slate-500 dark:text-slate-400">{title}</h3>
          <span className="material-symbols-outlined text-3xl text-slate-400 dark:text-slate-500">{icon}</span>
        </div>
        <p className="text-4xl font-bold mt-2 text-slate-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
};


const ChartCard: React.FC<{ title: string; data: { label: string; value: number }[]; }> = ({ title, data }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  const colors = ['bg-indigo-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
      <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.label} className="group">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">${(item.value || 0).toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
              <div
                className={`${colors[index % colors.length]} h-2.5 rounded-full`}
                style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductListCard: React.FC<{ title: string; products: Product[]; linkTo: string; emptyMessage: string; }> = ({ title, products, linkTo, emptyMessage }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 h-full flex flex-col">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{title}</h3>
      <Link to={linkTo} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Ver todo</Link>
    </div>
    <ul className="space-y-3 flex-1">
      {products.length > 0 ? products.map(product => (
        <li key={product.id}>
          <Link to={`/products/${product.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50">
            <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{product.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{product.sku}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
        </li>
      )) : (
        <li className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">{emptyMessage}</li>
      )}
    </ul>
  </div>
);

// --- Main Dashboard Page Component ---

const ProductDashboardPage: React.FC = () => {
    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: categories, loading: cLoading } = useCollection<Category>('categories');
    const { data: lotsData, loading: lLoading } = useCollection<ProductLot>('lots');
    const { data: salesOrders, loading: soLoading } = useCollection<SalesOrder>('salesOrders');

    const loading = pLoading || cLoading || lLoading || soLoading;

    // --- Data Processing ---
    const lotsByProductId = useMemo(() => {
        if (!lotsData) return new Map<string, ProductLot[]>();
        return lotsData.reduce((acc, lot) => {
            if (!acc.has(lot.productId)) {
                acc.set(lot.productId, []);
            }
            acc.get(lot.productId)!.push(lot);
            return acc;
        }, new Map<string, ProductLot[]>());
    }, [lotsData]);


    // --- KPI Calculations ---
    const kpiData = useMemo(() => {
        if (!products || !salesOrders) {
            return { total: 0, active: 0, lowStock: 0, topSeller: { name: '-', value: 0 } };
        }

        let lowStockCount = 0;
        
        products.forEach(p => {
            if (p.reorderPoint) {
                const productLots = lotsByProductId.get(p.id) || [];
                const totalStock = productLots.reduce((sum, lot) => sum + lot.stock.reduce((lotSum, s) => lotSum + s.qty, 0), 0);
                if (totalStock < p.reorderPoint) {
                    lowStockCount++;
                }
            }
        });

        const salesByProduct: { [productId: string]: number } = {};
        salesOrders.forEach(order => {
            order.items.forEach((item: QuoteItem) => {
                salesByProduct[item.productId] = (salesByProduct[item.productId] || 0) + item.subtotal;
            });
        });

        let topSeller = { name: '-', value: 0 };
        if (Object.keys(salesByProduct).length > 0) {
            const topProductId = Object.keys(salesByProduct).reduce((a, b) => salesByProduct[a] > salesByProduct[b] ? a : b);
            const topProduct = products.find(p => p.id === topProductId);
            if (topProduct) {
                topSeller = { name: topProduct.name, value: salesByProduct[topProductId] };
            }
        }

        return {
            total: products.length,
            active: products.filter(p => p.isActive).length,
            lowStock: lowStockCount,
            topSeller: topSeller,
        };
    }, [products, salesOrders, lotsByProductId]);

    // --- Chart and List Data ---
    const salesByCategory = useMemo(() => {
        if (!products || !categories || !salesOrders) return [];
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const sales: { [categoryId: string]: number } = {};

        salesOrders.forEach(order => {
            order.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    sales[product.categoryId] = (sales[product.categoryId] || 0) + item.subtotal;
                }
            });
        });
        
        return Object.entries(sales)
            .map(([catId, value]) => ({ label: categoryMap.get(catId) || 'Sin Categoría', value }))
            .sort((a, b) => b.value - a.value);
    }, [products, categories, salesOrders]);
    
    const lowStockList = useMemo(() => {
        if (!products) return [];
        return products.filter(p => {
            if (!p.reorderPoint) return false;
            const productLots = lotsByProductId.get(p.id) || [];
            const totalStock = productLots.reduce((sum, lot) => sum + lot.stock.reduce((lotSum, s) => lotSum + s.qty, 0), 0);
            return totalStock < p.reorderPoint;
        }).slice(0, 5);
    }, [products, lotsByProductId]);

    const recentProducts = useMemo(() => {
        if (!products) return [];
        return [...products].sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 5);
    }, [products]);
    

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total de Productos" value={kpiData.total} icon="inventory_2" link="/products/list" />
                <KpiCard title="Productos Activos" value={`${kpiData.active} / ${kpiData.total}`} icon="toggle_on" link="/products/list" />
                <KpiCard title="Productos con Bajo Stock" value={kpiData.lowStock} icon="warning" link="/inventory/alerts" />
                <KpiCard title="Top Ventas (Mes)" value={kpiData.topSeller.name} icon="star" />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ChartCard title="Ventas por Categoría" data={salesByCategory} />
                </div>
                <div className="space-y-6">
                    <ProductListCard title="Productos con Bajo Stock" products={lowStockList} linkTo="/inventory/alerts" emptyMessage="¡Todo el stock está en orden!" />
                    <ProductListCard title="Productos Recientemente Añadidos" products={recentProducts} linkTo="/products/list" emptyMessage="No hay productos nuevos." />
                </div>
            </div>
        </div>
    );
};

export default ProductDashboardPage;