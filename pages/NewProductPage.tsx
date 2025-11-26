import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, Unit, Currency } from '../types';
import { useCollection } from '../hooks/useCollection';
import { UNITS } from '../constants';
import CustomSelect from '../components/ui/CustomSelect';
import { api } from '../api/firebaseApi';

// --- Reusable Component Outside ---
const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold border-b border-slate-200 dark:border-slate-700 pb-4 mb-6 text-slate-900 dark:text-white flex items-center gap-2">
             <span className="material-symbols-outlined text-indigo-500">edit_note</span>
             {title}
        </h3>
        <div className="space-y-6">
        {children}
        </div>
    </div>
);

const initialProductState: Omit<Product, 'id'> = {
    sku: '',
    name: '',
    unitDefault: 'ton',
    currency: 'USD',
    isActive: true,
    categoryId: '',
    pricing: {
        min: 0,
    },
};

const NewProductPage: React.FC = () => {
    const navigate = useNavigate();
    const [product, setProduct] = useState(initialProductState);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const { data: categories, loading: categoriesLoading } = useCollection<Category>('categories');
    
    const categoryOptions = (categories || []).map(c => ({ value: c.id, name: c.name }));
    const unitOptions = UNITS.map(u => ({ value: u, name: u }));

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!product.name.trim()) newErrors.name = 'El nombre es requerido.';
        if (!product.sku.trim()) newErrors.sku = 'El SKU es requerido.';
        if (!product.categoryId) newErrors.categoryId = 'La categoría es requerida.';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = useCallback((field: string, value: any) => {
        setProduct(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const newProductData: Omit<Product, 'id'> = {
                ...product,
                createdAt: new Date().toISOString()
            };

            try {
                // Save Product
                await api.addDoc('products', newProductData);
                
                alert("Producto guardado exitosamente. Ahora puedes añadirle lotes desde la página de edición del producto.");
                navigate('/products/list');
            } catch (error) {
                console.error("Error saving product:", error);
                alert("Hubo un error al guardar el producto.");
            }
        }
    };

    // Safe Input styles
    const inputWrapperClass = "relative";
    const inputIconClass = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none";
    const inputFieldClass = "block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm";

    return (
        <div className="max-w-3xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Crear Nuevo Producto</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Añade un nuevo ítem a tu catálogo global.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/products/list')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-5 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">save</span>
                        Guardar Producto
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-8">
                    <FormBlock title="Información General">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Producto <span className="text-red-500">*</span></label>
                                <div className={inputWrapperClass}>
                                    <div className={inputIconClass}>
                                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">inventory_2</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={product.name} 
                                        onChange={(e) => handleChange('name', e.target.value)} 
                                        className={inputFieldClass} 
                                        placeholder="Ej: Urea Granular Automotriz"
                                    />
                                </div>
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU <span className="text-red-500">*</span></label>
                                <div className={inputWrapperClass}>
                                    <div className={inputIconClass}>
                                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">qr_code</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={product.sku} 
                                        onChange={(e) => handleChange('sku', e.target.value)} 
                                        className={inputFieldClass} 
                                        placeholder="Ej: UREA-GR-001"
                                    />
                                </div>
                                {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
                            </div>

                            <div>
                                <CustomSelect 
                                    label="Categoría *"
                                    options={categoryOptions} 
                                    value={product.categoryId} 
                                    onChange={val => handleChange('categoryId', val)} 
                                    placeholder={categoriesLoading ? 'Cargando...' : 'Seleccionar...'} 
                                />
                                {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
                            </div>

                            <CustomSelect label="Unidad Default" options={unitOptions} value={product.unitDefault} onChange={val => handleChange('unitDefault', val as Unit)} />

                            <CustomSelect 
                                label="Moneda Base" 
                                options={[{value: 'USD', name: 'Dólares (USD)'}, {value: 'MXN', name: 'Pesos (MXN)'}]} 
                                value={product.currency} 
                                onChange={val => handleChange('currency', val as Currency)} 
                            />
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700 mt-2">
                            <div className="flex items-center gap-3">
                                <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${product.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                     <span className="material-symbols-outlined text-xl">{product.isActive ? 'check_circle' : 'block'}</span>
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">Estado del Producto</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400">{product.isActive ? 'Visible en catálogos y cotizaciones' : 'Oculto para nuevas operaciones'}</span>
                                </div>
                            </div>
                            <button type="button" onClick={() => handleChange('isActive', !product.isActive)} className={`${product.isActive ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}>
                                <span className={`${product.isActive ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                            </button>
                        </div>
                    </FormBlock>
                </div>
            </form>
        </div>
    );
};

export default NewProductPage;