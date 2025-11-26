
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Supplier, SupplierRating } from '../types';
import { useDoc } from '../hooks/useDoc';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import { api } from '../api/firebaseApi';

const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold border-b border-slate-200 dark:border-slate-700 pb-3 mb-6 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6 first:border-0 first:pt-0 first:mt-0">
        <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            {title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    </div>
);

const Input: React.FC<{ label: string; value: string; onChange: (val: string) => void; type?: string; icon?: string; placeholder?: string }> = ({ label, value, onChange, type = 'text', icon, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <div className="relative">
            {icon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined h-5 w-5 text-gray-400">{icon}</span>
                </div>
            )}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`block w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400`}
                placeholder={placeholder}
            />
        </div>
    </div>
);

const EditSupplierPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialSupplier, loading } = useDoc<Supplier>('suppliers', id || '');

    const [supplier, setSupplier] = useState<Partial<Supplier> | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialSupplier) {
            setSupplier(initialSupplier);
        }
    }, [initialSupplier]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!supplier?.name?.trim()) newErrors.name = 'El nombre es requerido.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = useCallback((field: string, value: any) => {
        const keys = field.split('.');
        if (keys.length > 1) {
            setSupplier(prev => prev ? ({
                ...prev,
                [keys[0]]: {
                    ...(prev as any)[keys[0]],
                    [keys[1]]: value
                }
            }) : null);
        } else {
            setSupplier(prev => (prev ? { ...prev, [field]: value } : null));
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate() && supplier && id) {
            try {
                const dataToSave = { ...supplier };
                await api.updateDoc('suppliers', id, dataToSave);
                alert('Proveedor actualizado correctamente.');
                navigate(`/purchase/suppliers/${id}`);
            } catch(e) {
                console.error(e);
                alert('Error al actualizar.');
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!supplier) {
        return <div className="text-center p-12">Proveedor no encontrado</div>;
    }
    
    const ratingOptions = [{ value: '', name: 'Sin Calificar' }, ...Object.values(SupplierRating).map(r => ({ value: r, name: r }))];

    return (
        <div className="pb-20 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Editar Proveedor</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate(`/purchase/suppliers/${id}`)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <FormBlock title="Información General">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Proveedor <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined h-5 w-5 text-gray-400">business</span>
                                </div>
                                <input
                                    type="text"
                                    value={supplier.name || ''}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                />
                            </div>
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <Input label="Industria" value={supplier.industry || ''} onChange={(val) => handleChange('industry', val)} icon="factory" />
                        <CustomSelect
                            label="Rating"
                            options={ratingOptions}
                            value={supplier.rating || ''}
                            onChange={val => handleChange('rating', val as SupplierRating)}
                        />
                        <Input label="Sitio Web" value={supplier.website || ''} onChange={(val) => handleChange('website', val)} type="url" icon="language" />
                        <Input label="Teléfono General" value={supplier.phone || ''} onChange={(val) => handleChange('phone', val)} type="tel" icon="phone" />
                    </div>
                    
                    <Section title="Ubicación">
                        <Input label="Calle y Número" value={supplier.address?.street || ''} onChange={(val) => handleChange('address.street', val)} icon="signpost" />
                        <Input label="Ciudad" value={supplier.address?.city || ''} onChange={(val) => handleChange('address.city', val)} icon="location_city" />
                        <Input label="Estado" value={supplier.address?.state || ''} onChange={(val) => handleChange('address.state', val)} icon="map" />
                        <Input label="Código Postal" value={supplier.address?.zip || ''} onChange={(val) => handleChange('address.zip', val)} icon="mail" />
                    </Section>
                </FormBlock>

                <FormBlock title="Datos de Contacto y Bancarios">
                    <Section title="Contacto Principal">
                        <Input label="Persona de Contacto" value={supplier.contactPerson?.name || ''} onChange={(val) => handleChange('contactPerson.name', val)} icon="person" />
                        <Input label="Email" value={supplier.contactPerson?.email || ''} onChange={(val) => handleChange('contactPerson.email', val)} type="email" icon="alternate_email" />
                        <Input label="Teléfono Directo" value={supplier.contactPerson?.phone || ''} onChange={(val) => handleChange('contactPerson.phone', val)} type="tel" icon="call" />
                    </Section>

                    <Section title="Información Bancaria">
                        <Input label="Banco" value={supplier.bankInfo?.bankName || ''} onChange={(val) => handleChange('bankInfo.bankName', val)} icon="account_balance" />
                        <Input label="No. Cuenta" value={supplier.bankInfo?.accountNumber || ''} onChange={(val) => handleChange('bankInfo.accountNumber', val)} icon="numbers" />
                        <Input label="CLABE" value={supplier.bankInfo?.clabe || ''} onChange={(val) => handleChange('bankInfo.clabe', val)} icon="payment" />
                    </Section>
                </FormBlock>
            </form>
        </div>
    );
};

export default EditSupplierPage;
