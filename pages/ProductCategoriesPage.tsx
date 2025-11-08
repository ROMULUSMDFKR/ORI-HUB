import React, { useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Category, Product } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const ProductCategoriesPage: React.FC = () => {
    const { data: categories, loading: categoriesLoading, error: categoriesError } = useCollection<Category>('categories');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');

    const productCounts = useMemo(() => {
        if (!products) return new Map();
        return products.reduce((acc, product) => {
            acc.set(product.categoryId, (acc.get(product.categoryId) || 0) + 1);
            return acc;
        }, new Map<string, number>());
    }, [products]);

    const columns = [
        {
            header: 'Nombre de la Categoría',
            accessor: (c: Category) => <span className="font-medium">{c.name}</span>
        },
        {
            header: '# de Productos',
            accessor: (c: Category) => (
                <span className="text-center block">{productCounts.get(c.id) || 0}</span>
            ),
            className: 'text-center'
        },
        {
            header: 'Acciones',
            accessor: (c: Category) => (
                <div className="flex space-x-2 justify-center">
                    <button className="text-gray-500 hover:text-primary p-1 rounded-full"><span className="material-symbols-outlined">edit</span></button>
                    <button className="text-gray-500 hover:text-red-600 p-1 rounded-full"><span className="material-symbols-outlined">delete</span></button>
                </div>
            ),
            className: 'text-center'
        },
    ];
    
    const renderContent = () => {
        if (categoriesLoading || productsLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (categoriesError) return <p className="text-center text-red-500 py-12">Error al cargar las categorías.</p>;
        if (!categories || categories.length === 0) {
            return (
                <EmptyState
                    icon="category"
                    title="No hay categorías definidas"
                    message="Crea categorías para organizar tus productos de manera eficiente."
                    actionText="Crear Categoría"
                    onAction={() => alert('Abrir drawer para nueva categoría')}
                />
            );
        }
        return <Table columns={columns} data={categories} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-text-main">Categorías de Productos</h2>
                    <p className="text-sm text-text-secondary mt-1">Organiza tu inventario en grupos lógicos.</p>
                </div>
                <button 
                    onClick={() => alert('Abrir drawer para nueva categoría')}
                    className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Categoría
                </button>
            </div>

            {renderContent()}
        </div>
    );
};

export default ProductCategoriesPage;