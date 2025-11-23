
import React, { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import { InternalCompany } from '../../types';
import ToggleSwitch from '../ui/ToggleSwitch';
import CustomSelect from '../ui/CustomSelect';

interface InternalCompanyDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (company: Omit<InternalCompany, 'id'>) => void;
    company?: InternalCompany | null;
}

const Input: React.FC<{ label: string; value: string; onChange: (val: string) => void; placeholder?: string; icon?: string }> = ({ label, value, onChange, placeholder, icon }) => (
    <div>
        <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {icon && <span className="material-symbols-outlined text-sm mr-1 text-slate-400">{icon}</span>}
            {label}
        </label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
            placeholder={placeholder}
        />
    </div>
);

const InternalCompanyDrawer: React.FC<InternalCompanyDrawerProps> = ({ isOpen, onClose, onSave, company }) => {
    const [activeTab, setActiveTab] = useState<'identity' | 'fiscal' | 'banking' | 'config'>('identity');
    const [formData, setFormData] = useState<Omit<InternalCompany, 'id'>>({
        name: '',
        rfc: '',
        address: '',
        website: '',
        logoUrl: '',
        isActive: true,
        legalRepresentative: '',
        fiscalRegime: '',
        bankInfo: { bankName: '', accountNumber: '', clabe: '', currency: 'MXN' },
        brandColor: '#6366f1',
        defaultCurrency: 'MXN'
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
                    legalRepresentative: company.legalRepresentative || '',
                    fiscalRegime: company.fiscalRegime || '',
                    bankInfo: company.bankInfo || { bankName: '', accountNumber: '', clabe: '', currency: 'MXN' },
                    brandColor: company.brandColor || '#6366f1',
                    defaultCurrency: company.defaultCurrency || 'MXN'
                });
            } else {
                setFormData({
                    name: '',
                    rfc: '',
                    address: '',
                    website: '',
                    logoUrl: '',
                    isActive: true,
                    legalRepresentative: '',
                    fiscalRegime: '',
                    bankInfo: { bankName: '', accountNumber: '', clabe: '', currency: 'MXN' },
                    brandColor: '#6366f1',
                    defaultCurrency: 'MXN'
                });
            }
            setActiveTab('identity');
        }
    }, [isOpen, company]);

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBankChange = (field: keyof typeof formData.bankInfo, value: string) => {
        setFormData(prev => ({ 
            ...prev, 
            bankInfo: { ...(prev.bankInfo || { bankName: '', accountNumber: '', clabe: '', currency: 'MXN' }), [field]: value } 
        }));
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
            <div className="flex flex-col h-full">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto -mx-6 px-6">
                    {[
                        { id: 'identity', label: 'Identidad', icon: 'business' },
                        { id: 'fiscal', label: 'Datos Fiscales', icon: 'receipt_long' },
                        { id: 'banking', label: 'Bancario', icon: 'account_balance' },
                        { id: 'config', label: 'Configuración', icon: 'settings' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            <span className="material-symbols-outlined !text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto py-6 space-y-6">
                    {activeTab === 'identity' && (
                        <>
                            <Input label="Nombre / Razón Social *" value={formData.name} onChange={(v) => handleChange('name', v)} placeholder="Ej. Trade Aitirik S.A. de C.V." />
                            <Input label="Sitio Web" value={formData.website || ''} onChange={(v) => handleChange('website', v)} icon="language" placeholder="www.miempresa.com" />
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL del Logo</label>
                                <div className="flex gap-3 items-center">
                                    <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600">
                                        {formData.logoUrl ? <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain rounded" /> : <span className="material-symbols-outlined text-slate-400">image</span>}
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.logoUrl || ''}
                                        onChange={(e) => handleChange('logoUrl', e.target.value)}
                                        className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                             <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Empresa Activa</span>
                                <ToggleSwitch enabled={formData.isActive} onToggle={() => handleChange('isActive', !formData.isActive)} />
                            </div>
                        </>
                    )}

                    {activeTab === 'fiscal' && (
                        <>
                            <Input label="RFC" value={formData.rfc || ''} onChange={(v) => handleChange('rfc', v.toUpperCase())} icon="badge" />
                            <Input label="Régimen Fiscal" value={formData.fiscalRegime || ''} onChange={(v) => handleChange('fiscalRegime', v)} placeholder="Ej. 601 - General de Ley" />
                            <Input label="Representante Legal" value={formData.legalRepresentative || ''} onChange={(v) => handleChange('legalRepresentative', v)} icon="person" />
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección Fiscal</label>
                                <textarea
                                    rows={3}
                                    value={formData.address || ''}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'banking' && (
                        <>
                            <Input label="Banco" value={formData.bankInfo?.bankName || ''} onChange={(v) => handleBankChange('bankName', v)} icon="account_balance" />
                            <Input label="Número de Cuenta" value={formData.bankInfo?.accountNumber || ''} onChange={(v) => handleBankChange('accountNumber', v)} icon="numbers" />
                            <Input label="CLABE" value={formData.bankInfo?.clabe || ''} onChange={(v) => handleBankChange('clabe', v)} />
                            <CustomSelect 
                                label="Moneda de Cuenta" 
                                options={[{value: 'MXN', name: 'MXN - Peso Mexicano'}, {value: 'USD', name: 'USD - Dólar Americano'}]} 
                                value={formData.bankInfo?.currency || 'MXN'} 
                                onChange={(val) => handleBankChange('currency', val)} 
                            />
                        </>
                    )}

                    {activeTab === 'config' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color de Marca (Hex)</label>
                                <div className="flex gap-2">
                                    <input type="color" value={formData.brandColor || '#6366f1'} onChange={(e) => handleChange('brandColor', e.target.value)} className="h-10 w-10 border-0 p-0 rounded cursor-pointer" />
                                    <input type="text" value={formData.brandColor || '#6366f1'} onChange={(e) => handleChange('brandColor', e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 text-sm font-mono" />
                                </div>
                            </div>
                            <CustomSelect 
                                label="Moneda por Defecto" 
                                options={[{value: 'MXN', name: 'MXN'}, {value: 'USD', name: 'USD'}]} 
                                value={formData.defaultCurrency || 'MXN'} 
                                onChange={(val) => handleChange('defaultCurrency', val)} 
                            />
                        </>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 mt-auto">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">{company ? 'Guardar Cambios' : 'Crear Empresa'}</button>
                </div>
            </div>
        </Drawer>
    );
};

export default InternalCompanyDrawer;
