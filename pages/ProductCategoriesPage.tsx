import React, { useMemo, useState, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Category, Product } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import CategoryDrawer from '../components/products/CategoryDrawer';
import { api } from '../api/firebaseApi';
import Badge from '../components/ui/Badge';

const ConfirmationDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl m-4 max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <span className="material-symbols-outlined text-2xl">warning</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white" id="modal-title">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {message}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm transition-colors"
                        onClick={onConfirm}
                    >
                        Eliminar
                    </button>
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm transition-colors"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};


const ProductCategoriesPage: React.FC = () => {
    const { data: initialCategories, loading: categoriesLoading, error: categoriesError } = useCollection<Category>('categories');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    
    const [categories, setCategories] = useState<Category[] | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [hasAttemptedSeed, setHasAttemptedSeed] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    
    // Search state
    const [searchTerm, setSearchTerm] = useState('');


    useEffect(() => {
        if (initialCategories) {
            setCategories(initialCategories);
        }
    }, [initialCategories]);

    // --- AUTO-SEED DATA LOGIC ---
    useEffect(() => {
        const seedData = async () => {
            // Run only once, when not loading, and if the collection is empty
            if (!categoriesLoading && categories && categories.length === 0 && !hasAttemptedSeed) {
                setHasAttemptedSeed(true); // Mark that we've tried, to prevent re-runs
                console.log("No categories found, seeding initial data...");

                const SEED_DATA = [
                    // Roots
                    { id: 'cat-root-campo', name: 'Campo', code: 'CAMP', parentId: '', description: 'Insumos agrícolas y fertilizantes', isActive: true },
                    { id: 'cat-root-ind', name: 'Industria', code: 'IND', parentId: '', description: 'Insumos para procesos industriales', isActive: true },
                    { id: 'cat-root-auto', name: 'Automotriz', code: 'AUTO', parentId: '', description: 'Soluciones automotrices', isActive: true },
                    
                    // Children of Campo
                    { id: 'cat-fosf', name: 'Fosfatados', code: 'FOSF', parentId: 'cat-root-campo', description: 'Fertilizantes a base de fósforo', isActive: true },
                    { id: 'cat-liq', name: 'Líquidos', code: 'LIQD', parentId: 'cat-root-campo', description: 'Fertilizantes en solución líquida', isActive: true },
                    { id: 'cat-npk', name: 'Mezclas NPK', code: 'NPK', parentId: 'cat-root-campo', description: 'Mezclas físicas NPK', isActive: true },
                    { id: 'cat-nitr', name: 'Nitrogenados', code: 'NITR', parentId: 'cat-root-campo', description: 'Fertilizantes nitrogenados', isActive: true },
                    { id: 'cat-pota', name: 'Potásicos', code: 'POTA', parentId: 'cat-root-campo', description: 'Fertilizantes potásicos', isActive: true },
                    
                    // Children of Industria
                    { id: 'cat-quim', name: 'Químicos básicos', code: 'QBAS', parentId: 'cat-root-ind', description: 'Químicos base y materia prima', isActive: true },
                    
                    // Children of Automotriz
                    { id: 'cat-urea', name: 'Urea liquida', code: 'URLQ', parentId: 'cat-root-auto', description: 'Solución de urea automotriz', isActive: true },
                ];

                try {
                    for (const cat of SEED_DATA) {
                        await api.setDoc('categories', cat.id, cat);
                    }
                    console.log("Initial categories seeded successfully.");
                    setCategories(SEED_DATA); // Update local state
                } catch (error) {
                    console.error("Error seeding categories:", error);
                    alert("Hubo un error al cargar las categorías iniciales.");
                }
            }
        };

        seedData();
    }, [categories, categoriesLoading, hasAttemptedSeed]);


    const productCounts = useMemo(() => {
        if (!products) return new Map();
        return products.reduce((acc, product) => {
            acc.set(product.categoryId, (acc.get(product.categoryId) || 0) + 1);
            return acc;
        }, new Map<string, number>());
    }, [products]);

    const categoriesMap = useMemo(() => {
        if (!categories) return new Map();
        return new Map(categories.map(c => [c.id, c.name]));
    }, [categories]);
    
    const filteredCategories = useMemo(() => {
        if (!categories) return [];
        if (!searchTerm) return categories;
        return categories.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [categories, searchTerm]);

    const handleSaveCategory = async (categoryData: Partial<Category>) => {
        try {
            if (editingCategory) {
                const updatedCategory = { ...editingCategory, ...categoryData };
                await api.updateDoc('categories', editingCategory.id, categoryData);
                setCategories(prev => prev!.map(c => c.id === editingCategory.id ? updatedCategory : c));
            } else {
                const newCategory = await api.addDoc('categories', { ...categoryData });
                setCategories(prev => [...(prev || []), newCategory]);
            }
            setIsDrawerOpen(false);
            setEditingCategory(null);
        } catch (error) {
            console.error("Error saving category:", error);
            alert("Hubo un error al guardar la categoría.");
        }
    };
    
    const handleDeleteCategory = (category: Category) => {
        const count = productCounts.get(category.id) || 0;
        if (count > 0) {
            alert(`No puedes eliminar la categoría "${category.name}" porque tiene ${count} productos asociados.`);
            return;
        }
        setCategoryToDelete(category);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        try {
            await api.deleteDoc('categories', categoryToDelete.id);
            setCategories(prev => prev!.filter(c => c.id !== categoryToDelete.id));
        } catch (error) {
            console.error("Error deleting category:", error);
            alert('No se pudo eliminar la categoría.');
        } finally {
            setIsDeleteDialogOpen(false);
            setCategoryToDelete(null);
        }
    };

    const openEdit = (category: Category) => {
        setEditingCategory(category);
        setIsDrawerOpen(true);
    };

    const openNew = () => {
        setEditingCategory(null);
        setIsDrawerOpen(true);
    };

    const columns = [
        {
            header: 'Nombre',
            accessor: (c: Category) => (
                <div className="flex items-center gap-3">
                     {/* App Icon Pattern */}
                     <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                         <span className="material-symbols-outlined text-xl">category</span>
                     </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{c.name}</p>
                        {c.description && <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{c.description}</p>}
                    </div>
                </div>
            )
        },
        {
            header: 'Código',
            accessor: (c: Category) => <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">{c.code || '-'}</span>
        },
        {
            header: 'Categoría Padre',
            accessor: (c: Category) => c.parentId ? <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{categoriesMap.get(c.parentId)}</span> : <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Raíz</span>
        },
        {
            header: '# Prod.',
            accessor: (c: Category) => (
                <span className="text-center block font-semibold text-slate-700 dark:text-slate-300">{productCounts.get(c.id) || 0}</span>
            ),
            className: 'text-center'
        },
        {
            header: 'Estado',
            accessor: (c: Category) => <Badge text={c.isActive ? 'Activo' : 'Inactivo'} color={c.isActive ? 'green' : 'gray'} />
        },
        {
            header: 'Acciones',
            accessor: (c: Category) => (
                <div className="flex space-x-2 justify-end">
                    <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Editar">
                        <span className="material-symbols-outlined text-lg">edit_square</span>
                    </button>
                    <button onClick={() => handleDeleteCategory(c)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">
                        <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            ),
            className: 'text-right'
        },
    ];
    
    const renderContent = () => {
        if (categoriesLoading || productsLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (categoriesError) return <p className="text-center text-red-500 py-12">Error al cargar las categorías.</p>;
        if (!categories || categories.length === 0) {
            return (
                <div className="flex flex-col items-center">
                    <EmptyState
                        icon="category"
                        title="No hay categorías definidas"
                        message="Crea categorías para organizar tus productos de manera eficiente."
                        actionText="Crear Categoría"
                        onAction={openNew}
                    />
                </div>
            );
        }
        return <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"><Table columns={columns} data={filteredCategories} /></div>;
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Categorías de Productos</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Organiza tu catálogo con jerarquías y códigos para facilitar la gestión.</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                 {/* Input Safe Pattern */}
                 <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar categorías..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                </div>
                <button 
                    onClick={openNew}
                    className="w-full sm:w-auto bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors gap-2"
                >
                    <span className="material-symbols-outlined">add_circle</span>
                    Nueva Categoría
                </button>
            </div>

            {renderContent()}

            <CategoryDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleSaveCategory}
                category={editingCategory}
                existingCategories={categories || []}
            />
            
            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Eliminar Categoría"
                message={`¿Estás seguro de que quieres eliminar la categoría "${categoryToDelete?.name}"? Esta acción no se puede deshacer.`}
            />
        </div>
    );
};

export default ProductCategoriesPage;