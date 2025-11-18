
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

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={category ? 'Editar Categoría' : 'Nueva Categoría'}>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la Categoría <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                        placeholder="Ej. Fertilizantes"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código / Prefijo</label>
                    <input
                        type="text"
                        value={formData.code || ''}
                        onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm font-mono uppercase"
                        placeholder="Ej. FERT"
                    />
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
                    <textarea
                        rows={3}
                        value={formData.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                        placeholder="Describe qué tipo de productos pertenecen a esta categoría."
                    />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Estado Activo</span>
                    <ToggleSwitch enabled={formData.isActive ?? true} onToggle={() => handleChange('isActive', !formData.isActive)} />
                </div>

                <div className="pt-4 flex justify-end gap-2">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">{category ? 'Guardar Cambios' : 'Crear Categoría'}</button>
                </div>
            </div>
        </Drawer>
    );
};

export default CategoryDrawer;
