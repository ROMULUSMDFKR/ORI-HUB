
import React, { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import { InternalCompany } from '../../types';
import ToggleSwitch from '../ui/ToggleSwitch';

interface InternalCompanyDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (company: Omit<InternalCompany, 'id'>) => void;
    company?: InternalCompany | null;
}

const InternalCompanyDrawer: React.FC<InternalCompanyDrawerProps> = ({ isOpen, onClose, onSave, company }) => {
    const [formData, setFormData] = useState<Omit<InternalCompany, 'id'>>({
        name: '',
        rfc: '',
        address: '',
        website: '',
        logoUrl: '',
        isActive: true,
    });

    useEffect(() => {
        if (isOpen) {
            if (company) {
                setFormData({
                    name: company.name,
                    rfc: company.rfc || '',
                    address: company.address || '',
                    website: company.website || '',
                    logoUrl: company.logoUrl || '',
                    isActive: company.isActive,
                });
            } else {
                setFormData({
                    name: '',
                    rfc: '',
                    address: '',
                    website: '',
                    logoUrl: '',
                    isActive: true,
                });
            }
        }
    }, [isOpen, company]);

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            alert('El nombre de la empresa es obligatorio.');
            return;
        }
        onSave(formData);
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={company ? 'Editar Empresa' : 'Nueva Empresa del Sistema'}>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre / Razón Social *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                        placeholder="Ej. Trade Aitirik S.A. de C.V."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RFC</label>
                    <input
                        type="text"
                        value={formData.rfc}
                        onChange={(e) => handleChange('rfc', e.target.value.toUpperCase())}
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm uppercase"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección Fiscal</label>
                    <textarea
                        rows={3}
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sitio Web</label>
                        <input
                            type="text"
                            value={formData.website}
                            onChange={(e) => handleChange('website', e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL del Logo</label>
                        <input
                            type="text"
                            value={formData.logoUrl}
                            onChange={(e) => handleChange('logoUrl', e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                            placeholder="https://..."
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Empresa Activa</span>
                    <ToggleSwitch enabled={formData.isActive} onToggle={() => handleChange('isActive', !formData.isActive)} />
                </div>

                <div className="pt-4 flex justify-end gap-2">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">{company ? 'Guardar Cambios' : 'Crear Empresa'}</button>
                </div>
            </div>
        </Drawer>
    );
};

export default InternalCompanyDrawer;
