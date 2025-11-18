
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Product, Category, ProductLot } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { api } from '../api/firebaseApi';

const ActionsMenu: React.FC<{ product: Product, onDelete: (product: Product) => void }> = ({ product, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} onBlur={() => setTimeout(() => setIsOpen(false), 200)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                <span className="material-symbols-outlined">more_vert</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-10 border border-slate-200 dark:border-slate-700">
                    <ul className="py-1">
                        <li>
                            <button onClick={() => onDelete(product)} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                <span className="material-symbols-outlined mr-3 text-base">delete</span>
                                Eliminar
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};


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

    const handleDeleteProduct = async (product: Product) => {
        try {
            const productLots = await api.getLotsForProduct(product.id);
            const hasStock = productLots.some(lot => lot.stock.some((s: { qty: number; }) => s.qty > 0));
            
            if (hasStock) {
                alert(`No se puede eliminar "${product.name}" porque tiene lotes con stock disponible.`);
                return;
            }

            if (window.confirm(`¿Estás seguro de que quieres eliminar el producto "${product.name}"? Esta acción no se puede deshacer.`)) {
                await api.deleteDoc('products', product.id);
                setProducts(prev => prev!.filter(p => p.id !== product.id));
                alert('Producto eliminado con éxito.');
            }
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("No se pudo eliminar el producto.");
        }
    };

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
            accessor: (p: Product) => <ActionsMenu product={p} onDelete={handleDeleteProduct} />,
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
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
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
                        className="w-full bg-transparent pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none search-input-field"
                    />
                </div>
                 <Link 
                  to="/products/new"
                  className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Producto
                </Link>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default ProductsListPage;
