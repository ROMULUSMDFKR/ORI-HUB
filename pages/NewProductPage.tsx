
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, Unit, Currency } from '../types';
import { useCollection } from '../hooks/useCollection';
import { UNITS } from '../constants';
import CustomSelect from '../components/ui/CustomSelect';
import { api } from '../api/firebaseApi';

// --- Reusable Component Outside ---
const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-4">
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

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Crear Nuevo Producto</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate('/products/list')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">
                        Guardar Producto
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                <div className="space-y-6">
                    <FormBlock title="Información General del Producto">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Producto</label>
                            <input type="text" value={product.name} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 block w-full" />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">SKU</label>
                            <input type="text" value={product.sku} onChange={(e) => handleChange('sku', e.target.value)} className="mt-1 block w-full" />
                            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
                        </div>

                        <div>
                            <CustomSelect label="Categoría" options={categoryOptions} value={product.categoryId} onChange={val => handleChange('categoryId', val)} placeholder={categoriesLoading ? 'Cargando...' : 'Seleccionar...'} />
                            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
                        </div>

                        <CustomSelect label="Unidad Default" options={unitOptions} value={product.unitDefault} onChange={val => handleChange('unitDefault', val as Unit)} />

                        <CustomSelect 
                            label="Moneda" 
                            options={[{value: 'USD', name: 'Dólares (USD)'}, {value: 'MXN', name: 'Pesos (MXN)'}]} 
                            value={product.currency} 
                            onChange={val => handleChange('currency', val as Currency)} 
                        />

                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Producto Activo</span>
                            <button type="button" onClick={() => handleChange('isActive', !product.isActive)} className={`${product.isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
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
