
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
                
                {/* Name Input */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre / Razón Social <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">business</span>
                        </div>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Ej. Trade Aitirik S.A. de C.V."
                        />
                    </div>
                </div>

                {/* RFC Input */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RFC</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">badge</span>
                        </div>
                        <input
                            type="text"
                            value={formData.rfc}
                            onChange={(e) => handleChange('rfc', e.target.value.toUpperCase())}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono uppercase"
                            placeholder="XAXX010101000"
                        />
                    </div>
                </div>

                {/* Address Input */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección Fiscal</label>
                    <div className="relative">
                        <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">location_on</span>
                        </div>
                        <textarea
                            rows={3}
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Calle, Número, Colonia, CP, Ciudad..."
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Website Input */}
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sitio Web</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">language</span>
                            </div>
                            <input
                                type="text"
                                value={formData.website}
                                onChange={(e) => handleChange('website', e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    
                    {/* Logo URL Input */}
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL del Logo</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">image</span>
                            </div>
                            <input
                                type="text"
                                value={formData.logoUrl}
                                onChange={(e) => handleChange('logoUrl', e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${formData.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                             <span className="material-symbols-outlined text-xl">{formData.isActive ? 'check_circle' : 'block'}</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Estado de la Empresa</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formData.isActive ? 'Activa y disponible' : 'Inactiva (Oculta)'}</p>
                        </div>
                    </div>
                    <ToggleSwitch enabled={formData.isActive} onToggle={() => handleChange('isActive', !formData.isActive)} />
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                        {company ? 'Guardar Cambios' : 'Crear Empresa'}
                    </button>
                </div>
            </div>
        </Drawer>
    );
};

export default InternalCompanyDrawer;
