
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InternalCompany } from '../../types';
import { useDoc } from '../../hooks/useDoc';
import { api } from '../../api/firebaseApi';
import { useToast } from '../../hooks/useToast';
import Spinner from '../../components/ui/Spinner';
import CustomSelect from '../../components/ui/CustomSelect';
import ToggleSwitch from '../../components/ui/ToggleSwitch';

// Reusable Form Component
const FormBlock: React.FC<{ title: string; children: React.ReactNode; icon?: string; className?: string }> = ({ title, children, icon, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

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
            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder={placeholder}
        />
    </div>
);

const EditInternalCompanyPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isEditMode = !!id;

    const { data: existingCompany, loading: companyLoading } = useDoc<InternalCompany>('internalCompanies', id || '');

    const [formData, setFormData] = useState<Partial<InternalCompany>>({
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
        defaultCurrency: 'MXN',
        phoneNumber: '',
        switchboardExtension: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isEditMode && existingCompany) {
            setFormData({
                ...existingCompany,
                bankInfo: existingCompany.bankInfo || { bankName: '', accountNumber: '', clabe: '', currency: 'MXN' }
            });
        } else if (!isEditMode) {
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
                defaultCurrency: 'MXN',
                phoneNumber: '',
                switchboardExtension: ''
            });
        }
    }, [isEditMode, existingCompany]);

    const handleChange = (field: keyof InternalCompany, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBankChange = (field: string, value: string) => {
        setFormData(prev => ({ 
            ...prev, 
            bankInfo: { 
                bankName: prev.bankInfo?.bankName || '', 
                accountNumber: prev.bankInfo?.accountNumber || '', 
                clabe: prev.bankInfo?.clabe || '', 
                currency: prev.bankInfo?.currency || 'MXN',
                [field]: value 
            } 
        }));
    };

    const handleSave = async () => {
        if (!formData.name?.trim()) {
            showToast('warning', 'El nombre de la empresa es obligatorio.');
            return;
        }
        
        setIsSaving(true);
        try {
            // We ensure we are not passing 'id' property to update if it's in formData, handled by logic
            const companyData = { ...formData };
            
            if (isEditMode && id) {
                // Use Partial<InternalCompany> minus ID for update
                await api.updateDoc('internalCompanies', id, companyData);
                showToast('success', 'Empresa actualizada correctamente.');
            } else {
                await api.addDoc('internalCompanies', companyData);
                showToast('success', 'Empresa creada correctamente.');
            }
            navigate('/settings/internal-companies');
        } catch (error) {
            console.error("Error saving company:", error);
            showToast('error', "Hubo un error al guardar la empresa.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isEditMode && companyLoading) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{isEditMode ? 'Editar Empresa Interna' : 'Nueva Empresa Interna'}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configura los datos de facturación e identidad de tu organización.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/settings/internal-companies')} disabled={isSaving} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Empresa
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Identity & Config */}
                <div className="lg:col-span-5 space-y-6">
                    <FormBlock title="Identidad Corporativa" icon="business">
                         <div className="flex flex-col items-center mb-4">
                             <div className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 mb-2 overflow-hidden">
                                {formData.logoUrl ? (
                                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="material-symbols-outlined text-slate-400 text-4xl">add_photo_alternate</span>
                                )}
                             </div>
                             <p className="text-xs text-slate-500">Logo de la Empresa</p>
                         </div>
                         
                         <Input label="Nombre / Razón Social *" value={formData.name || ''} onChange={(v) => handleChange('name', v)} placeholder="Ej. Trade Aitirik S.A. de C.V." />
                         <Input label="Sitio Web" value={formData.website || ''} onChange={(v) => handleChange('website', v)} icon="language" placeholder="www.miempresa.com" />
                         
                         <div className="grid grid-cols-2 gap-3">
                            <Input label="No. Conmutador" value={formData.phoneNumber || ''} onChange={(v) => handleChange('phoneNumber', v)} icon="call" placeholder="(55) 1234 5678" />
                            <Input label="Ext. Empresa" value={formData.switchboardExtension || ''} onChange={(v) => handleChange('switchboardExtension', v)} icon="dialpad" placeholder="101" />
                         </div>

                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL del Logo</label>
                            <input
                                type="text"
                                value={formData.logoUrl || ''}
                                onChange={(e) => handleChange('logoUrl', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                placeholder="https://..."
                            />
                        </div>

                        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
                             <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Empresa Activa</span>
                                <ToggleSwitch enabled={formData.isActive || false} onToggle={() => handleChange('isActive', !formData.isActive)} />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color de Marca</label>
                                <div className="flex gap-2">
                                    <input type="color" value={formData.brandColor || '#6366f1'} onChange={(e) => handleChange('brandColor', e.target.value)} className="h-10 w-10 border-0 p-0 rounded cursor-pointer" />
                                    <input type="text" value={formData.brandColor || '#6366f1'} onChange={(e) => handleChange('brandColor', e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 text-sm font-mono uppercase" />
                                </div>
                            </div>
                        </div>
                    </FormBlock>
                </div>

                {/* Right Column: Fiscal & Banking */}
                <div className="lg:col-span-7 space-y-6">
                    <FormBlock title="Datos Fiscales" icon="receipt_long">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="RFC" value={formData.rfc || ''} onChange={(v) => handleChange('rfc', v.toUpperCase())} icon="badge" />
                            <Input label="Régimen Fiscal" value={formData.fiscalRegime || ''} onChange={(v) => handleChange('fiscalRegime', v)} placeholder="Ej. 601 - General de Ley" />
                            <div className="md:col-span-2">
                                 <Input label="Representante Legal" value={formData.legalRepresentative || ''} onChange={(v) => handleChange('legalRepresentative', v)} icon="person" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección Fiscal</label>
                                <textarea
                                    rows={3}
                                    value={formData.address || ''}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                                    placeholder="Calle, Número, Colonia, CP, Ciudad, Estado"
                                />
                            </div>
                        </div>
                    </FormBlock>

                    <FormBlock title="Información Bancaria" icon="account_balance">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Banco" value={formData.bankInfo?.bankName || ''} onChange={(v) => handleBankChange('bankName', v)} icon="account_balance" />
                            <CustomSelect 
                                label="Moneda de Cuenta" 
                                options={[{value: 'MXN', name: 'MXN - Peso Mexicano'}, {value: 'USD', name: 'USD - Dólar Americano'}]} 
                                value={formData.bankInfo?.currency || 'MXN'} 
                                onChange={(val) => handleBankChange('currency', val)} 
                            />
                            <Input label="Número de Cuenta" value={formData.bankInfo?.accountNumber || ''} onChange={(v) => handleBankChange('accountNumber', v)} icon="numbers" />
                            <Input label="CLABE" value={formData.bankInfo?.clabe || ''} onChange={(v) => handleBankChange('clabe', v)} icon="password" />
                        </div>
                    </FormBlock>
                    
                    <FormBlock title="Configuración Regional" icon="settings">
                         <CustomSelect 
                            label="Moneda por Defecto para Documentos" 
                            options={[{value: 'MXN', name: 'MXN - Peso Mexicano'}, {value: 'USD', name: 'USD - Dólar Americano'}]} 
                            value={formData.defaultCurrency || 'MXN'} 
                            onChange={(val) => handleChange('defaultCurrency', val)} 
                        />
                    </FormBlock>
                </div>
            </div>
        </div>
    );
};

export default EditInternalCompanyPage;
