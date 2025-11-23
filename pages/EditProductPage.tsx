
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Product, ProductLot, Category, Unit, Supplier, LotStatus, Currency } from '../types';
import Spinner from '../components/ui/Spinner';
import { api } from '../api/firebaseApi';
import { UNITS } from '../constants';
import CustomSelect from '../components/ui/CustomSelect';
import AddLotDrawer from '../components/products/AddLotDrawer';
import { useToast } from '../hooks/useToast';

// --- Reusable Components (Local) ---
const FormBlock: React.FC<{ title: string; children: React.ReactNode; icon?: string; className?: string }> = ({ title, children, icon, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const Input: React.FC<{ 
    label: string; 
    value: string | number; 
    onChange: (val: any) => void; 
    type?: string; 
    required?: boolean; 
    placeholder?: string;
    icon?: string;
    helper?: string;
}> = ({ label, value, onChange, type = 'text', required=false, placeholder, icon, helper }) => (
    <div>
        <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
            {icon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
                </div>
            )}
            <input 
                type={type} 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                placeholder={placeholder}
                className={`block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${icon ? 'pl-10 pr-3' : 'px-3'}`} 
            />
        </div>
        {helper && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>}
    </div>
);

const ImageUploadPlaceholder: React.FC = () => (
    <div className="w-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-700/50 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
        <div className="w-12 h-12 bg-white dark:bg-slate-600 rounded-full shadow-sm flex items-center justify-center text-indigo-500 dark:text-indigo-300 mb-3 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
        </div>
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Cambiar Imagen</p>
    </div>
);

const EditProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    const { data: initialProduct, loading: productLoading } = useDoc<Product>('products', id || '');
    const { data: categories, loading: categoriesLoading } = useCollection<Category>('categories');
    const { data: suppliers, loading: suppliersLoading } = useCollection<Supplier>('suppliers');
    const { data: locations, loading: locationsLoading } = useCollection<any>('locations');

    const [product, setProduct] = useState<Partial<Product> | null>(null);
    const [lots, setLots] = useState<ProductLot[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [tagInput, setTagInput] = useState('');
    
    useEffect(() => {
        if (initialProduct) {
            // Ensure nested objects exist
            setProduct({
                ...initialProduct,
                pricing: initialProduct.pricing || { min: 0 },
                dimensions: initialProduct.dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
                tags: initialProduct.tags || []
            });
            
            const fetchLots = async () => {
                const fetchedLots = await api.getLotsForProduct(initialProduct.id);
                setLots(fetchedLots);
            };
            fetchLots();
        }
    }, [initialProduct]);

    const handleChange = useCallback((field: string, value: any) => {
        setProduct(prev => {
            if (!prev) return null;
            // Handle nested dimension updates
            if (field.startsWith('dimensions.')) {
                const dimKey = field.split('.')[1];
                return {
                    ...prev,
                    dimensions: { ...prev.dimensions!, [dimKey]: value }
                };
            }
            // Handle nested pricing
            if (field === 'pricing.min') {
                return { ...prev, pricing: { ...prev.pricing!, min: parseFloat(value) || 0 } };
            }
            return { ...prev, [field]: value };
        });
    }, []);

    // Tag Handlers
    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!product?.tags?.includes(tagInput.trim())) {
                setProduct(prev => prev ? ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }) : null);
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setProduct(prev => prev ? ({ ...prev, tags: (prev.tags || []).filter(t => t !== tagToRemove) }) : null);
    };

    const handleSaveProduct = async () => {
        if (!product || !id) return;
        try {
            // Ensure we don't send undefined ID to update
            const { id: _, ...updateData } = product as Product;
            await api.updateDoc('products', id, updateData);
            showToast('success', 'Producto actualizado correctamente.');
            navigate(`/products/${id}`);
        } catch (error) {
            console.error("Error saving product:", error);
            showToast('error', 'Error al guardar el producto.');
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

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!product) return <div className="text-center p-12">Producto no encontrado</div>;

    const categoryOptions = (categories || []).map(c => ({ value: c.id, name: c.name }));
    const unitOptions = UNITS.map(u => ({ value: u, name: u }));

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Editar Producto</h2>
                    <p className="text-sm text-slate-500">{product.name}</p>
                </div>
                 <div className="flex space-x-2">
                    <button onClick={() => navigate(`/products/${id}`)} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSaveProduct} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">save</span>
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* MAIN COLUMN (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                     <FormBlock title="Información General" icon="info">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <Input label="Nombre del Producto" value={product.name || ''} onChange={(e) => handleChange('name', e)} icon="inventory_2" />
                            </div>
                            <Input label="SKU" value={product.sku || ''} onChange={(e) => handleChange('sku', e)} icon="qr_code" />
                            <Input label="Código de Barras / UPC" value={product.barcode || ''} onChange={(e) => handleChange('barcode', e)} icon="barcode_reader" />
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                                <CustomSelect options={categoryOptions} value={product.categoryId || ''} onChange={val => handleChange('categoryId', val)} />
                            </div>
                             <div className="md:col-span-1">
                                <Input label="Marca / Fabricante" value={product.brand || ''} onChange={(e) => handleChange('brand', e)} icon="branding_watermark" />
                            </div>
                        </div>
                    </FormBlock>

                    <FormBlock title="Precios y Costos" icon="monetization_on">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unidad</label>
                                    <CustomSelect options={unitOptions} value={product.unitDefault || 'ton'} onChange={val => handleChange('unitDefault', val as Unit)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moneda</label>
                                    <CustomSelect 
                                        options={[{value: 'USD', name: 'USD'}, {value: 'MXN', name: 'MXN'}]} 
                                        value={product.currency || 'MXN'} 
                                        onChange={val => handleChange('currency', val as Currency)} 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Costo Estimado" value={product.costPrice || ''} onChange={(e) => handleChange('costPrice', parseFloat(e))} type="number" icon="attach_money" helper="Costo de reposición actual" />
                                <Input label="Precio Mín. Venta" value={product.pricing?.min || 0} onChange={(e) => handleChange('pricing.min', e)} type="number" icon="price_check" />
                            </div>
                        </div>
                    </FormBlock>

                    <FormBlock title="Logística y Dimensiones" icon="local_shipping">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <Input label="Peso Neto (Kg)" value={product.weight || ''} onChange={(e) => handleChange('weight', parseFloat(e))} type="number" icon="scale" />
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dimensiones (L x An x Al) en cm</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="number" placeholder="L" value={product.dimensions?.length || ''} className="p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm" onChange={e => handleChange('dimensions.length', parseFloat(e.target.value))}/>
                                    <input type="number" placeholder="An" value={product.dimensions?.width || ''} className="p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm" onChange={e => handleChange('dimensions.width', parseFloat(e.target.value))}/>
                                    <input type="number" placeholder="Al" value={product.dimensions?.height || ''} className="p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm" onChange={e => handleChange('dimensions.height', parseFloat(e.target.value))}/>
                                </div>
                            </div>
                        </div>
                    </FormBlock>
                </div>

                {/* SIDEBAR (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                         <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">image</span>
                            Multimedia
                        </h3>
                        <ImageUploadPlaceholder />
                    </div>

                     <FormBlock title="Configuración e Inventario" icon="tune">
                         <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Producto Activo</span>
                            <button type="button" onClick={() => handleChange('isActive', !product.isActive)} className={`${product.isActive ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                                <span className={`${product.isActive ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <Input label="Punto de Reorden (Mínimo)" value={product.reorderPoint || ''} onChange={(e) => handleChange('reorderPoint', parseFloat(e))} type="number" icon="notifications_active" />
                            <Input label="Stock Máximo" value={product.maxStock || ''} onChange={(e) => handleChange('maxStock', parseFloat(e))} type="number" icon="vertical_align_top" />
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Etiquetas</label>
                            <div className="flex flex-wrap gap-2 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/30 min-h-[42px]">
                                {product.tags?.map(tag => (
                                    <span key={tag} className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-1 rounded text-xs flex items-center gap-1">
                                        {tag} <button type="button" onClick={() => removeTag(tag)} className="hover:text-indigo-900">&times;</button>
                                    </span>
                                ))}
                                <input 
                                    type="text" 
                                    value={tagInput} 
                                    onChange={e => setTagInput(e.target.value)} 
                                    onKeyDown={handleAddTag}
                                    className="bg-transparent outline-none text-sm flex-grow min-w-[80px]"
                                    placeholder="Añadir..."
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción Detallada</label>
                             <textarea 
                                rows={4}
                                value={product.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                placeholder="Detalles técnicos y notas..."
                             />
                        </div>
                    </FormBlock>

                    <FormBlock title="Gestión de Lotes" icon="layers">
                        <button onClick={() => setIsDrawerOpen(true)} className="w-full bg-white border border-slate-300 text-slate-700 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 mb-4">
                            <span className="material-symbols-outlined mr-2">add</span>
                            Añadir Nuevo Lote
                        </button>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase">Lotes Existentes ({lots.length})</h4>
                            {lots.length > 0 ? lots.map(lot => (
                                <div key={lot.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-700/30">
                                    <div className="flex justify-between items-center mb-1">
                                         <p className="font-bold font-mono text-slate-800 dark:text-slate-200">{lot.code}</p>
                                         <span className={`text-[10px] px-2 py-0.5 rounded-full ${lot.status === 'Disponible' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{lot.status}</span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                                        Inicial: {lot.initialQty.toLocaleString()} | Costo: ${lot.unitCost}
                                    </p>
                                </div>
                            )) : <p className="text-xs text-slate-400 italic">No hay lotes registrados.</p>}
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
