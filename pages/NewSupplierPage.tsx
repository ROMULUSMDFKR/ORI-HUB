
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Supplier, SupplierRating } from '../../types';
import { api } from '../../api/firebaseApi';
import CustomSelect from '../../components/ui/CustomSelect';

// --- Reusable Components Outside ---
const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-6">
        <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    </div>
);

const NewSupplierPage: React.FC = () => {
    const navigate = useNavigate();
    const [supplier, setSupplier] = useState<Partial<Supplier>>({
        name: '',
        industry: '',
        rating: undefined,
        website: '',
        phone: '',
        address: { street: '', city: '', state: '', zip: '' },
        contactPerson: { name: '', email: '', phone: '' },
        bankInfo: { bankName: '', accountNumber: '', clabe: '' },
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!supplier?.name?.trim()) newErrors.name = 'El nombre es requerido.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = useCallback((field: string, value: any) => {
        const keys = field.split('.');
        if (keys.length > 1) {
            setSupplier(prev => ({
                ...prev,
                [keys[0]]: {
                    ...(prev as any)[keys[0]],
                    [keys[1]]: value
                }
            }));
        } else {
            setSupplier(prev => ({ ...prev, [field]: value }));
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            try {
                const dataToSave = { ...supplier };
                if (!dataToSave.rating) {
                    delete (dataToSave as Partial<Supplier>).rating;
                }
                await api.addDoc('suppliers', dataToSave);
                alert('Proveedor guardado con éxito.');
                navigate('/purchase/suppliers');
            } catch (error) {
                console.error("Error creating supplier:", error);
                alert("Error al crear el proveedor.");
            }
        }
    };
    
    const ratingOptions = [{ value: '', name: 'Sin Calificar' }, ...Object.values(SupplierRating).map(r => ({ value: r, name: r }))];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nuevo Proveedor</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate('/purchase/suppliers')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">
                        Guardar Proveedor
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <FormBlock title="Información del Proveedor">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Proveedor *</label>
                            <input
                                type="text"
                                value={supplier.name || ''}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Industria</label>
                            <input
                                type="text"
                                value={supplier.industry || ''}
                                onChange={(e) => handleChange('industry', e.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                        <CustomSelect
                            label="Rating Inicial"
                            options={ratingOptions}
                            value={supplier.rating || ''}
                            onChange={val => handleChange('rating', val as SupplierRating)}
                        />
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sitio Web</label>
                            <input type="url" value={supplier.website || ''} onChange={(e) => handleChange('website', e.target.value)} className="mt-1 block w-full" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Teléfono General</label>
                            <input type="tel" value={supplier.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} className="mt-1 block w-full" />
                        </div>
                    </div>
                    
                    <Section title="Ubicación">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Calle y Número</label>
                            <input type="text" value={supplier.address?.street || ''} onChange={(e) => handleChange('address.street', e.target.value)} className="mt-1 block w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ciudad</label>
                            <input type="text" value={supplier.address?.city || ''} onChange={(e) => handleChange('address.city', e.target.value)} className="mt-1 block w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
                            <input type="text" value={supplier.address?.state || ''} onChange={(e) => handleChange('address.state', e.target.value)} className="mt-1 block w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Código Postal</label>
                            <input type="text" value={supplier.address?.zip || ''} onChange={(e) => handleChange('address.zip', e.target.value)} className="mt-1 block w-full" />
                        </div>
                    </Section>

                    <Section title="Contacto Principal">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Persona de Contacto</label>
                            <input type="text" value={supplier.contactPerson?.name || ''} onChange={(e) => handleChange('contactPerson.name', e.target.value)} className="mt-1 block w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email de Contacto</label>
                            <input type="email" value={supplier.contactPerson?.email || ''} onChange={(e) => handleChange('contactPerson.email', e.target.value)} className="mt-1 block w-full" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Teléfono de Contacto</label>
                            <input type="tel" value={supplier.contactPerson?.phone || ''} onChange={(e) => handleChange('contactPerson.phone', e.target.value)} className="mt-1 block w-full" />
                        </div>
                    </Section>

                    <Section title="Datos Bancarios">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Banco</label>
                            <input type="text" value={supplier.bankInfo?.bankName || ''} onChange={(e) => handleChange('bankInfo.bankName', e.target.value)} className="mt-1 block w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Número de Cuenta</label>
                            <input type="text" value={supplier.bankInfo?.accountNumber || ''} onChange={(e) => handleChange('bankInfo.accountNumber', e.target.value)} className="mt-1 block w-full" />
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">CLABE Interbancaria</label>
                            <input type="text" value={supplier.bankInfo?.clabe || ''} onChange={(e) => handleChange('bankInfo.clabe', e.target.value)} className="mt-1 block w-full" />
                        </div>
                    </Section>

                </FormBlock>
            </form>
        </div>
    );
};

export default NewSupplierPage;
