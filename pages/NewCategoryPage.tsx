
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Category } from '../types';
import { api } from '../api/firebaseApi';
import { useCollection } from '../hooks/useCollection';
import { useDoc } from '../hooks/useDoc';
import { useToast } from '../hooks/useToast';
import CustomSelect from '../components/ui/CustomSelect';
import Spinner from '../components/ui/Spinner';
import ToggleSwitch from '../components/ui/ToggleSwitch';

// --- Reusable Components (Local for simplicity) ---
const FormBlock: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: string }> = ({ title, children, className, icon }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-6">{children}</div>
    </div>
);

const Input: React.FC<{ label: string; value: string | number; onChange: (val: any) => void; type?: string, required?: boolean, placeholder?: string, icon?: string, helper?: string }> = ({ label, value, onChange, type = 'text', required=false, placeholder, icon, helper }) => (
    <div>
        <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {icon && <span className="material-symbols-outlined text-sm mr-1 text-slate-400">{icon}</span>}
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-medium" 
        />
        {helper && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>}
    </div>
);

const NewCategoryPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isEditMode = !!id;

    // Fetch existing data if editing
    const { data: existingCategory, loading: catLoading } = useDoc<Category>('categories', id || '');
    // Fetch all categories for parent selection
    const { data: allCategories, loading: allCatLoading } = useCollection<Category>('categories');

    const [formData, setFormData] = useState<Partial<Category>>({
        name: '',
        code: '',
        parentId: '',
        description: '',
        isActive: true,
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isEditMode && existingCategory) {
            setFormData(existingCategory);
        } else if (!isEditMode) {
            setFormData({
                name: '',
                code: '',
                parentId: '',
                description: '',
                isActive: true,
            });
        }
    }, [isEditMode, existingCategory]);

    const handleChange = (field: keyof Category, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formData.name?.trim()) {
            showToast('warning', 'El nombre de la categoría es obligatorio.');
            return;
        }

        setIsSaving(true);
        try {
            if (isEditMode && id) {
                await api.updateDoc('categories', id, formData);
                showToast('success', 'Categoría actualizada correctamente.');
            } else {
                await api.addDoc('categories', formData);
                showToast('success', 'Categoría creada correctamente.');
            }
            navigate('/products/categories');
        } catch (error) {
            console.error("Error saving category:", error);
            showToast('error', 'Hubo un error al guardar la categoría.');
        } finally {
            setIsSaving(false);
        }
    };

    // Filter out current category to avoid circular parent dependency
    const parentOptions = [
        { value: '', name: 'Ninguna (Raíz)' },
        ...(allCategories || [])
            .filter(c => !isEditMode || c.id !== id) 
            .map(c => ({ value: c.id, name: c.name }))
    ];

    const loading = (isEditMode && catLoading) || allCatLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-20 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{isEditMode ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{isEditMode ? 'Modifica los detalles de la categoría existente.' : 'Registra una nueva categoría para organizar tus productos.'}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/products/categories')} disabled={isSaving} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        {isEditMode ? 'Guardar Cambios' : 'Crear Categoría'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Main Info - Left Column */}
                <div className="lg:col-span-7 space-y-6">
                    <FormBlock title="Información General" icon="category">
                        <div className="space-y-5">
                            <Input 
                                label="Nombre de la Categoría" 
                                value={formData.name || ''} 
                                onChange={(val) => handleChange('name', val)} 
                                required 
                                placeholder="Ej. Fertilizantes" 
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                                 <Input 
                                    label="Código / Prefijo" 
                                    value={formData.code || ''} 
                                    onChange={(val) => handleChange('code', val.toUpperCase())} 
                                    placeholder="Ej. FERT" 
                                    helper="Usado para generar SKUs automáticamente."
                                />
                                <div className="pt-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado Activo</label>
                                    <div className="flex items-center justify-between p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 h-[42px]">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">{formData.isActive ? 'Visible' : 'Oculto'}</span>
                                        <ToggleSwitch enabled={formData.isActive ?? true} onToggle={() => handleChange('isActive', !formData.isActive)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FormBlock>
                </div>

                {/* Hierarchy & Details - Right Column */}
                <div className="lg:col-span-5 space-y-6">
                    <FormBlock title="Jerarquía y Detalles" icon="account_tree">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría Padre</label>
                                <CustomSelect
                                    options={parentOptions}
                                    value={formData.parentId || ''}
                                    onChange={(val) => handleChange('parentId', val)}
                                    placeholder="Seleccionar..."
                                />
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deja en blanco si es una categoría principal (Raíz).</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                                <textarea
                                    rows={4}
                                    value={formData.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                                    placeholder="Describe qué tipo de productos pertenecen a esta categoría."
                                />
                            </div>
                        </div>
                    </FormBlock>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl mt-0.5">info</span>
                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                            Organizar tus productos en categorías claras ayuda a mejorar la búsqueda, el filtrado en el catálogo y la precisión de los reportes de ventas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewCategoryPage;
