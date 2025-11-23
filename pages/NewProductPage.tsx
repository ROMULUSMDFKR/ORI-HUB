
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, Unit, Currency } from '../types';
import { useCollection } from '../hooks/useCollection';
import { UNITS } from '../constants';
import CustomSelect from '../components/ui/CustomSelect';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

// --- Reusable Components ---
const FormBlock: React.FC<{ title: string; children: React.ReactNode; icon?: string; className?: string }> = ({ title, children, icon, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
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
    <div className="w-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-700/50 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
        <div className="w-16 h-16 bg-white dark:bg-slate-600 rounded-full shadow-sm flex items-center justify-center text-indigo-500 dark:text-indigo-300 mb-3 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Subir Imagen del Producto</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PNG, JPG hasta 5MB</p>
    </div>
);

const initialProductState: Partial<Product> = {
    sku: '',
    name: '',
    unitDefault: 'ton',
    currency: 'MXN',
    isActive: true,
    categoryId: '',
    pricing: { min: 0 },
    description: '',
    barcode: '',
    brand: '',
    tags: [],
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0, unit: 'cm' },
    costPrice: 0,
    minStock: 0,
    maxStock: 0
};

const NewProductPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [product, setProduct] = useState(initialProductState);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [tagInput, setTagInput] = useState('');
    
    const { data: categories, loading: categoriesLoading } = useCollection<Category>('categories');
    
    const categoryOptions = (categories || []).map(c => ({ value: c.id, name: c.name }));
    const unitOptions = UNITS.map(u => ({ value: u, name: u }));

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!product.name?.trim()) newErrors.name = 'El nombre es requerido.';
        if (!product.sku?.trim()) newErrors.sku = 'El SKU es requerido.';
        if (!product.categoryId) newErrors.categoryId = 'La categoría es requerida.';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = useCallback((field: string, value: any) => {
        setProduct(prev => {
            // Handle nested updates for dimensions
            if (field.startsWith('dimensions.')) {
                const dimKey = field.split('.')[1];
                return {
                    ...prev,
                    dimensions: { ...prev.dimensions!, [dimKey]: value }
                };
            }
            // Handle nested updates for pricing
            if (field === 'pricing.min') {
                return { ...prev, pricing: { ...prev.pricing!, min: parseFloat(value) || 0 } };
            }
            return { ...prev, [field]: value };
        });
    }, []);

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!product.tags?.includes(tagInput.trim())) {
                setProduct(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setProduct(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tagToRemove) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const newProductData: Omit<Product, 'id'> = {
                ...product,
                // Ensure mandatory types from Partial
                name: product.name!,
                sku: product.sku!,
                unitDefault: product.unitDefault || 'ton',
                currency: product.currency || 'MXN',
                isActive: product.isActive ?? true,
                categoryId: product.categoryId!,
                pricing: product.pricing || { min: 0 },
                createdAt: new Date().toISOString()
            };

            try {
                await api.addDoc('products', newProductData);
                showToast('success', "Producto guardado exitosamente.");
                navigate('/products/list');
            } catch (error) {
                console.error("Error saving product:", error);
                showToast('error', "Hubo un error al guardar el producto.");
            }
        } else {
            showToast('warning', 'Por favor completa los campos requeridos.');
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Crear Nuevo Producto</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Registra un nuevo ítem en el catálogo maestro.</p>
                </div>
                <div className="flex space-x-2">
                    <button onClick={() => navigate('/products/list')} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">save</span>
                        Guardar Producto
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT COLUMN (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* 1. Detalles Principales */}
                        <FormBlock title="Información del Producto" icon="info">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <Input 
                                        label="Nombre del Producto" 
                                        value={product.name || ''} 
                                        onChange={(val) => handleChange('name', val)} 
                                        required 
                                        placeholder="Ej. Urea Granulada Automotriz"
                                        icon="inventory_2"
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <Input 
                                        label="SKU (Código Interno)" 
                                        value={product.sku || ''} 
                                        onChange={(val) => handleChange('sku', val)} 
                                        required 
                                        placeholder="Ej. UREA-GR-001"
                                        icon="qr_code"
                                    />
                                    {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
                                </div>

                                <div>
                                    <Input 
                                        label="Código de Barras / UPC" 
                                        value={product.barcode || ''} 
                                        onChange={(val) => handleChange('barcode', val)} 
                                        placeholder="Escanea o escribe..."
                                        icon="barcode_reader"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría <span className="text-red-500">*</span></label>
                                    <CustomSelect 
                                        options={categoryOptions} 
                                        value={product.categoryId || ''} 
                                        onChange={val => handleChange('categoryId', val)} 
                                        placeholder={categoriesLoading ? 'Cargando...' : 'Seleccionar categoría...'} 
                                    />
                                    {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
                                </div>

                                <div>
                                    <Input 
                                        label="Marca / Fabricante" 
                                        value={product.brand || ''} 
                                        onChange={(val) => handleChange('brand', val)} 
                                        placeholder="Ej. Yara, FertiMex"
                                        icon="branding_watermark"
                                    />
                                </div>
                            </div>
                        </FormBlock>

                        {/* 2. Precios y Costos */}
                        <FormBlock title="Estrategia de Precios" icon="monetization_on">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unidad Base</label>
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
                                    <Input 
                                        label="Costo Estimado" 
                                        value={product.costPrice || ''} 
                                        onChange={(val) => handleChange('costPrice', parseFloat(val))} 
                                        type="number" 
                                        placeholder="0.00"
                                        icon="attach_money"
                                        helper="Referencia interna"
                                    />
                                    <Input 
                                        label="Precio Mínimo Venta" 
                                        value={product.pricing?.min || ''} 
                                        onChange={(val) => handleChange('pricing.min', val)} 
                                        type="number" 
                                        placeholder="0.00"
                                        icon="price_check"
                                        helper="Base para cotizaciones"
                                    />
                                </div>
                            </div>
                        </FormBlock>

                        {/* 3. Datos Logísticos */}
                        <FormBlock title="Logística y Dimensiones" icon="local_shipping">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <Input 
                                        label="Peso Neto (Kg)" 
                                        value={product.weight || ''} 
                                        onChange={(val) => handleChange('weight', parseFloat(val))} 
                                        type="number" 
                                        placeholder="0.00"
                                        icon="scale"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dimensiones (L x An x Al) en cm</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <input type="number" placeholder="L" className="p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm" onChange={e => handleChange('dimensions.length', parseFloat(e.target.value))}/>
                                        <input type="number" placeholder="An" className="p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm" onChange={e => handleChange('dimensions.width', parseFloat(e.target.value))}/>
                                        <input type="number" placeholder="Al" className="p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm" onChange={e => handleChange('dimensions.height', parseFloat(e.target.value))}/>
                                    </div>
                                </div>
                             </div>
                        </FormBlock>
                    </div>

                    {/* RIGHT COLUMN (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {/* 4. Multimedia */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                             <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">image</span>
                                Multimedia
                            </h3>
                            <ImageUploadPlaceholder />
                        </div>

                        {/* 5. Control de Inventario */}
                        <FormBlock title="Alertas de Inventario" icon="notifications_active">
                             <div className="space-y-4">
                                <Input 
                                    label="Punto de Reorden (Mínimo)" 
                                    value={product.minStock || product.reorderPoint || ''} 
                                    onChange={(val) => handleChange('minStock', parseFloat(val))} 
                                    type="number"
                                    helper="Alerta cuando el stock baje de este nivel"
                                />
                                <Input 
                                    label="Stock Máximo Deseado" 
                                    value={product.maxStock || ''} 
                                    onChange={(val) => handleChange('maxStock', parseFloat(val))} 
                                    type="number"
                                    helper="Para planificación de compras"
                                />
                             </div>
                        </FormBlock>

                        {/* 6. Organización */}
                        <FormBlock title="Organización" icon="tune">
                            <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Producto Activo</span>
                                <button type="button" onClick={() => handleChange('isActive', !product.isActive)} className={`${product.isActive ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                                    <span className={`${product.isActive ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                                </button>
                            </div>

                            <div className="mb-4">
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

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                                <textarea 
                                    rows={4}
                                    value={product.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                                    placeholder="Detalles técnicos, notas internas..."
                                />
                            </div>
                        </FormBlock>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default NewProductPage;
