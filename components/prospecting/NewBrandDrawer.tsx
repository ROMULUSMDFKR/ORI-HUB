import React, { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import { Brand } from '../../types';

interface NewBrandDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (brand: Omit<Brand, 'id'>) => void;
}

const NewBrandDrawer: React.FC<NewBrandDrawerProps> = ({ isOpen, onClose, onSave }) => {
    const initialState = { name: '', logoUrl: '', website: '' };
    const [brand, setBrand] = useState(initialState);

    useEffect(() => {
        if (!isOpen) {
            setBrand(initialState);
        }
    }, [isOpen]);

    const handleChange = (field: keyof typeof brand, value: string) => {
        setBrand(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!brand.name.trim()) {
            alert('El nombre de la marca es obligatorio.');
            return;
        }
        onSave(brand);
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Crear Nueva Marca">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la Marca *</label>
                    <input
                        type="text"
                        value={brand.name}
                        onChange={e => handleChange('name', e.target.value)}
                        placeholder="Ej: G500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL del Logo</label>
                    <input
                        type="text"
                        value={brand.logoUrl}
                        onChange={e => handleChange('logoUrl', e.target.value)}
                        placeholder="https://ejemplo.com/logo.png"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sitio Web</label>
                    <input
                        type="text"
                        value={brand.website}
                        onChange={e => handleChange('website', e.target.value)}
                        placeholder="https://ejemplo.com"
                    />
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Marca</button>
            </div>
        </Drawer>
    );
};

export default NewBrandDrawer;