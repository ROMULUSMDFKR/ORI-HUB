import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Product, Category, ProductLot, SalesOrder, QuoteItem } from '../types';
import Spinner from '../components/ui/Spinner';

// --- Reusable UI Components ---

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; link?: string; color: string }> = ({ title, value, icon, link, color }) => {
  const colorClasses = {
      indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
      emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  }[color] || "bg-slate-100 text-slate-600";

  const content = (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex items-center gap-4 hover:shadow-md transition-all">
      <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">{value}</p>
      </div>
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
};


const ChartCard: React.FC<{ title: string; data: { label: string; value: number }[]; }> = ({ title, data }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  const colors = ['bg-indigo-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="font-bold text-lg mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">bar_chart</span>
          {title}
      </h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.label} className="group">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">${(item.value || 0).toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className={`${colors[index % colors.length]} h-2.5 rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductListCard: React.FC<{ title: string; products: Product[]; linkTo: string; emptyMessage: string; icon: string }> = ({ title, products, linkTo, emptyMessage, icon }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
    <div className="flex justify-between items-center mb-6">
      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">{icon}</span>
          {title}
      </h3>
      <Link to={linkTo} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
          Ver todo <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </Link>
    </div>
    <ul className="space-y-3 flex-1">
      {products.length > 0 ? products.map(product => (
        <li key={product.id}>
          <Link to={`/products/${product.id}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500 transition-all group shadow-sm">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-600 flex items-center justify-center border border-slate-200 dark:border-slate-500 text-xs font-bold text-slate-500 dark:text-slate-300">
                     {product.sku.substring(0, 2)}
                 </div>
                 <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{product.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{product.sku}</p>
                </div>
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-indigo-400 transition-colors">chevron_right</span>
          </Link>
        </li>
      )) : (
        <li className="text-center text-sm text-slate-500 dark:text-slate-400 py-8 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
            {emptyMessage}
        </li>
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
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
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
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Panel de Productos</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Resumen de catálogo, inventario y rendimiento.</p>
                </div>
                 <Link to="/products/new" className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined">add_circle</span>
                    Nuevo Producto
                </Link>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total de Productos" value={kpiData.total} icon="inventory_2" link="/products/list" color="indigo" />
                <KpiCard title="Productos Activos" value={`${kpiData.active}`} icon="toggle_on" link="/products/list" color="emerald" />
                <KpiCard title="Bajo Stock" value={kpiData.lowStock} icon="warning" link="/inventory/alerts" color="amber" />
                <KpiCard title="Top Ventas" value={kpiData.topSeller.name} icon="star" color="rose" />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ChartCard title="Ventas por Categoría (Mes)" data={salesByCategory} />
                </div>
                <div className="space-y-8">
                    <ProductListCard title="Alertas de Stock" products={lowStockList} linkTo="/inventory/alerts" emptyMessage="¡Todo en orden!" icon="notifications_active" />
                    <ProductListCard title="Nuevos Productos" products={recentProducts} linkTo="/products/list" emptyMessage="No hay productos recientes." icon="new_releases" />
                </div>
            </div>
        </div>
    );
};

export default ProductDashboardPage;