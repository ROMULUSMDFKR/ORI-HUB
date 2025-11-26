import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Product, ProductLot, Category, Unit, Supplier, LotStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import { api } from '../api/firebaseApi';
import { UNITS } from '../constants';
import CustomSelect from '../components/ui/CustomSelect';
import AddLotDrawer from '../components/products/AddLotDrawer';
import { useToast } from '../hooks/useToast';

// --- Reusable Component Outside ---
const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-bold border-b border-slate-200 dark:border-slate-700 pb-3 mb-6 text-slate-900 dark:text-white flex items-center gap-2">
           <span className="material-symbols-outlined text-indigo-500">edit_note</span>
           {title}
      </h3>
      <div className="space-y-6">
        {children}
      </div>
    </div>
);

const EditProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialProduct, loading: productLoading } = useDoc<Product>('products', id || '');
    const { data: categories, loading: categoriesLoading } = useCollection<Category>('categories');
    const { data: suppliers, loading: suppliersLoading } = useCollection<Supplier>('suppliers');
    const { data: locations, loading: locationsLoading } = useCollection<any>('locations');
    const { showToast } = useToast();

    const [product, setProduct] = useState<Partial<Product> | null>(null);
    const [lots, setLots] = useState<ProductLot[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    useEffect(() => {
        if (initialProduct) {
            setProduct(initialProduct);
            const fetchLots = async () => {
                const fetchedLots = await api.getLotsForProduct(initialProduct.id);
                setLots(fetchedLots);
            };
            fetchLots();
        }
    }, [initialProduct]);

    const handleChange = useCallback((field: keyof Product, value: any) => {
        setProduct(prev => (prev ? { ...prev, [field]: value } : null));
    }, []);

    const handlePricingChange = useCallback((field: keyof Product['pricing'], value: any) => {
         setProduct(prev => (prev ? { ...prev, pricing: { ...prev.pricing, [field]: value } } : null));
    }, []);
    
    const handleSaveProduct = async () => {
        if (!product || !id) return;
        try {
             // eslint-disable-next-line @typescript-eslint/no-unused-vars
             const { id: _, ...updateData } = product;
             await api.updateDoc('products', id, updateData);
             showToast('success', 'Producto actualizado correctamente.');
             navigate(`/products/${id}`);
        } catch (error) {
            console.error("Error updating product:", error);
            showToast('error', 'Error al actualizar el producto.');
        }
    };

    const handleAddLot = async (newLotData: any) => {
        if (!product || !product.id) return;
        const newLot: Omit<ProductLot, 'id'> = {
            productId: product.id,
            code: newLotData.code,
            unitCost: newLotData.unitCost,
            supplierId: newLotData.supplierId,
            receptionDate: new Date(newLotData.receptionDate).toISOString(),
            initialQty: newLotData.initialQty,
            status: LotStatus.Disponible,
            pricing: { min: newLotData.minSellPrice },
            stock: [{ locationId: newLotData.initialLocationId, qty: newLotData.initialQty }]
        };

        try {
            const addedLot = await api.addDoc('lots', newLot);
            setLots(prev => [...prev, addedLot]);
            setIsDrawerOpen(false);
            showToast('success', `Lote ${addedLot.code} añadido exitosamente.`);
        } catch (error) {
            console.error("Error adding lot:", error);
            showToast('error', "Error al añadir el lote.");
        }
    }

    const loading = productLoading || categoriesLoading || suppliersLoading || locationsLoading;

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!product) {
        return <div className="text-center p-12">Producto no encontrado</div>;
    }

    const categoryOptions = (categories || []).map(c => ({ value: c.id, name: c.name }));
    const unitOptions = UNITS.map(u => ({ value: u, name: u }));

    // Input Safe Pattern classes
    const inputWrapperClass = "relative";
    const inputIconClass = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none";
    const inputFieldClass = "block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm";

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Editar Producto: {product.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Modifica los detalles y gestiona el inventario.</p>
                </div>
                 <div className="flex space-x-3">
                    <button onClick={() => navigate(`/products/${id}`)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-5 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSaveProduct} className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">save</span>
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                     <FormBlock title="Información General">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU</label>
                                <div className={inputWrapperClass}>
                                    <div className={inputIconClass}>
                                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">qr_code</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={product.sku || ''} 
                                        onChange={(e) => handleChange('sku', e.target.value)} 
                                        className={inputFieldClass} 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Producto</label>
                                 <div className={inputWrapperClass}>
                                    <div className={inputIconClass}>
                                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">inventory_2</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={product.name || ''} 
                                        onChange={(e) => handleChange('name', e.target.value)} 
                                        className={inputFieldClass} 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <CustomSelect label="Categoría" options={categoryOptions} value={product.categoryId || ''} onChange={val => handleChange('categoryId', val)} />
                            <CustomSelect label="Unidad Default" options={unitOptions} value={product.unitDefault || 'ton'} onChange={val => handleChange('unitDefault', val as Unit)} />
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 mt-2">
                            <div className="flex items-center gap-3">
                                <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${product.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                     <span className="material-symbols-outlined text-xl">{product.isActive ? 'check_circle' : 'block'}</span>
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">Estado del Producto</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400">{product.isActive ? 'Activo' : 'Inactivo'}</span>
                                </div>
                            </div>
                            <button type="button" onClick={() => handleChange('isActive', !product.isActive)} className={`${product.isActive ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}>
                                <span className={`${product.isActive ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                            </button>
                        </div>
                    </FormBlock>
                    <FormBlock title="Precios e Inventario">
                         <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Mínimo de Venta</label>
                                <div className={inputWrapperClass}>
                                    <div className={inputIconClass}>
                                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">attach_money</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        value={product.pricing?.min || 0} 
                                        onChange={(e) => handlePricingChange('min', parseFloat(e.target.value) || 0)} 
                                        className={inputFieldClass} 
                                    />
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Punto de Reorden</label>
                                 <div className={inputWrapperClass}>
                                    <div className={inputIconClass}>
                                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">warning</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        value={product.reorderPoint || 0} 
                                        onChange={(e) => handleChange('reorderPoint', parseFloat(e.target.value) || 0)} 
                                        className={inputFieldClass} 
                                    />
                                </div>
                            </div>
                        </div>
                    </FormBlock>
                </div>
                 <div className="space-y-8">
                    <FormBlock title="Gestión de Lotes">
                        <button onClick={() => setIsDrawerOpen(true)} className="w-full bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors gap-2">
                            <span className="material-symbols-outlined">add_circle</span>
                            Añadir Nuevo Lote
                        </button>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar mt-4">
                            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Lotes Existentes ({lots.length})</h4>
                            {lots.length > 0 ? lots.map(lot => (
                                <div key={lot.id} className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-bold font-mono text-slate-800 dark:text-slate-200">{lot.code}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${lot.status === 'Disponible' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{lot.status}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
                                        <p>Inicial: <span className="font-semibold">{lot.initialQty.toLocaleString()} {product.unitDefault}</span></p>
                                        <p>Costo: <span className="font-semibold">${lot.unitCost}</span></p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">No hay lotes registrados.</p>
                                </div>
                            )}
                        </div>
                    </FormBlock>
                 </div>
            </div>

            <AddLotDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleAddLot}
                suppliers={suppliers || []}
                locations={locations || []}
                productSku={product.sku}
            />
        </div>
    );
};

export default EditProductPage;