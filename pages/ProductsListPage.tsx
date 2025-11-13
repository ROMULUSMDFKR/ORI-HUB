import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Product, Category } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

const ProductsListPage: React.FC = () => {
    const { data: initialProducts, loading: productsLoading, error: productsError } = useCollection<Product>('products');
    const { data: categories, loading: categoriesLoading } = useCollection<Category>('categories');
    const [products, setProducts] = useState<Product[] | null>(null);
    const [filter, setFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if(initialProducts) {
            setProducts(initialProducts);
        }
    }, [initialProducts]);

    const categoriesMap = useMemo(() => {
        if (!categories) return new Map();
        return new Map(categories.map(cat => [cat.id, cat.name]));
    }, [categories]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(product =>
            product.name.toLowerCase().includes(filter.toLowerCase()) ||
            product.sku.toLowerCase().includes(filter.toLowerCase())
        );
    }, [products, filter]);

    const columns = [
        { header: 'SKU', accessor: (p: Product) => <span className="font-mono text-xs">{p.sku}</span> },
        {
            header: 'Nombre',
            accessor: (p: Product) => (
                <Link to={`/products/${p.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {p.name}
                </Link>
            )
        },
        { header: 'Categoría', accessor: (p: Product) => categoriesMap.get(p.categoryId) || 'N/A' },
        { header: 'Unidad', accessor: (p: Product) => p.unitDefault },
        { 
            header: 'Precio Mín.', 
            accessor: (p: Product) => `$${p.pricing.min.toFixed(2)}`,
            className: 'text-right' 
        },
        { 
            header: 'Estado', 
            accessor: (p: Product) => (
                p.isActive ? <Badge text="Activo" color="green" /> : <Badge text="Inactivo" color="red" />
            )
        },
        {
            header: 'Acciones',
            accessor: (p: Product) => (
                 <button className="text-gray-500 hover:text-indigo-600 p-1 rounded-full"><span className="material-symbols-outlined">more_vert</span></button>
            ),
            className: 'text-center'
        }
    ];

    const renderContent = () => {
        if (productsLoading || categoriesLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (productsError) return <p className="text-center text-red-500 py-12">Error al cargar los productos.</p>;
        if (!filteredProducts || filteredProducts.length === 0) {
            return (
                <div className="p-6">
                    <EmptyState
                        icon="inventory_2"
                        title="No se encontraron productos"
                        message="Comienza creando tu primer producto para gestionar tu catálogo."
                        actionText="Crear Producto"
                        onAction={() => navigate('/products/new')}
                    />
                </div>
            );
        }
        return <Table columns={columns} data={filteredProducts} />;
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Lista de Productos</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tu catálogo de productos.</p>
                </div>
                <Link 
                  to="/products/new"
                  className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Producto
                </Link>
            </div>

            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center w-80 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-1 focus-within:ring-indigo-500">
                    <span className="material-symbols-outlined px-3 text-slate-500 dark:text-slate-400 pointer-events-none">
                        search
                    </span>
                    <input
                        id="product-search"
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full bg-transparent pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none"
                    />
                </div>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default ProductsListPage;