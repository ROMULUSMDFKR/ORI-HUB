import React, { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import { Category } from '../../types';
import CustomSelect from '../ui/CustomSelect';
import ToggleSwitch from '../ui/ToggleSwitch';

interface CategoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Partial<Category>) => void;
    category?: Category | null;
    existingCategories: Category[];
}

const CategoryDrawer: React.FC<CategoryDrawerProps> = ({ isOpen, onClose, onSave, category, existingCategories }) => {
    const [formData, setFormData] = useState<Partial<Category>>({
        name: '',
        code: '',
        parentId: '',
        description: '',
        isActive: true,
    });

    useEffect(() => {
        if (isOpen) {
            if (category) {
                setFormData(category);
            } else {
                setFormData({
                    name: '',
                    code: '',
                    parentId: '',
                    description: '',
                    isActive: true,
                });
            }
        }
    }, [isOpen, category]);

    const handleChange = (field: keyof Category, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formData.name?.trim()) {
            alert('El nombre de la categoría es obligatorio.');
            return;
        }
        onSave(formData);
    };

    // Filter out the category itself from parent options to avoid circular dependency
    const parentOptions = [
        { value: '', name: 'Ninguna (Raíz)' },
        ...existingCategories
            .filter(c => c.id !== category?.id)
            .map(c => ({ value: c.id, name: c.name }))
    ];
    
    // Input Safe Pattern classes
    const inputWrapperClass = "relative";
    const inputIconClass = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none";
    const inputFieldClass = "block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm";


    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={category ? 'Editar Categoría' : 'Nueva Categoría'}>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la Categoría <span className="text-red-500">*</span></label>
                    <div className={inputWrapperClass}>
                        <div className={inputIconClass}>
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">category</span>
                        </div>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className={inputFieldClass}
                            placeholder="Ej. Fertilizantes"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código / Prefijo</label>
                    <div className={inputWrapperClass}>
                        <div className={inputIconClass}>
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">tag</span>
                        </div>
                        <input
                            type="text"
                            value={formData.code || ''}
                            onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                            className={`${inputFieldClass} font-mono uppercase`}
                            placeholder="Ej. FERT"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Usado para la generación de SKUs.</p>
                </div>

                <CustomSelect
                    label="Categoría Padre"
                    options={parentOptions}
                    value={formData.parentId || ''}
                    onChange={(val) => handleChange('parentId', val)}
                />

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción / Alcance</label>
                    <div className={inputWrapperClass}>
                        <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">description</span>
                        </div>
                        <textarea
                            rows={3}
                            value={formData.description || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className={`${inputFieldClass} resize-none`}
                            placeholder="Describe qué tipo de productos pertenecen a esta categoría."
                        />
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${formData.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                             <span className="material-symbols-outlined text-xl">{formData.isActive ? 'check_circle' : 'block'}</span>
                        </div>
                        <div>
                            <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">Estado</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{formData.isActive ? 'Categoría activa' : 'Categoría inactiva'}</span>
                        </div>
                    </div>
                    <ToggleSwitch enabled={formData.isActive ?? true} onToggle={() => handleChange('isActive', !formData.isActive)} />
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700 mt-4">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">{category ? 'Guardar Cambios' : 'Crear Categoría'}</button>
                </div>
            </div>
        </Drawer>
    );
};

export default CategoryDrawer;