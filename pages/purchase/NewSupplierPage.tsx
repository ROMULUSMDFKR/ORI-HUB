
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Supplier, SupplierRating } from '../../types';
import { api } from '../../api/firebaseApi';
import CustomSelect from '../../components/ui/CustomSelect';

// --- Reusable Components Outside ---
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

const Input: React.FC<{ label: string; value: string | number; onChange: (val: any) => void; type?: string, required?: boolean, placeholder?: string, icon?: string }> = ({ label, value, onChange, type = 'text', required=false, placeholder, icon }) => (
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
            className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
        />
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
        // New fields
        supplierType: 'Fabricante',
        creditLimit: 0,
        creditDays: 0,
        taxId: '',
        logoUrl: '',
        certifications: []
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
    const typeOptions = ['Fabricante', 'Distribuidor', 'Servicios', 'Mayorista'].map(t => ({ value: t, name: t }));

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nuevo Proveedor</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Registra un socio comercial para abastecimiento.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/purchase/suppliers')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                         <span className="material-symbols-outlined text-sm">save</span>
                        Guardar
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: General & Identity */}
                <div className="lg:col-span-8 space-y-6">
                    <FormBlock title="Perfil General" icon="store">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <Input label="Nombre / Razón Social *" value={supplier.name || ''} onChange={(val) => handleChange('name', val)} required placeholder="Ej. Insumos Globales SA de CV" />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Proveedor</label>
                                <CustomSelect options={typeOptions} value={supplier.supplierType || ''} onChange={(val) => handleChange('supplierType', val)} />
                            </div>

                            <Input label="RFC / Tax ID" value={supplier.taxId || ''} onChange={(val) => handleChange('taxId', val)} icon="badge" />
                            
                            <Input label="Industria / Sector" value={supplier.industry || ''} onChange={(val) => handleChange('industry', val)} placeholder="Ej. Químicos, Logística" icon="factory" />
                            
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rating Inicial</label>
                                <CustomSelect options={ratingOptions} value={supplier.rating || ''} onChange={(val) => handleChange('rating', val as SupplierRating)} />
                            </div>
                            
                            <Input label="Sitio Web" value={supplier.website || ''} onChange={(val) => handleChange('website', val)} icon="language" />
                            <Input label="Teléfono General" value={supplier.phone || ''} onChange={(val) => handleChange('phone', val)} icon="call" />
                        </div>
                    </FormBlock>

                    <FormBlock title="Ubicación" icon="location_on">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Input label="Calle y Número" value={supplier.address?.street || ''} onChange={(val) => handleChange('address.street', val)} />
                            </div>
                            <Input label="Ciudad" value={supplier.address?.city || ''} onChange={(val) => handleChange('address.city', val)} />
                            <Input label="Estado" value={supplier.address?.state || ''} onChange={(val) => handleChange('address.state', val)} />
                            <Input label="Código Postal" value={supplier.address?.zip || ''} onChange={(val) => handleChange('address.zip', val)} />
                        </div>
                    </FormBlock>

                    <FormBlock title="Contacto Principal" icon="person">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Nombre" value={supplier.contactPerson?.name || ''} onChange={(val) => handleChange('contactPerson.name', val)} />
                            <Input label="Email" value={supplier.contactPerson?.email || ''} onChange={(val) => handleChange('contactPerson.email', val)} type="email" icon="mail" />
                            <Input label="Teléfono Directo" value={supplier.contactPerson?.phone || ''} onChange={(val) => handleChange('contactPerson.phone', val)} type="tel" icon="smartphone" />
                        </div>
                    </FormBlock>
                </div>

                {/* Right Column: Commercial & Financial */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Logo Upload Placeholder */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 mb-3 border-2 border-dashed border-slate-300 dark:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer transition-colors">
                             <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Subir Logo del Proveedor</p>
                    </div>

                    <FormBlock title="Condiciones Comerciales" icon="handshake">
                         <div className="space-y-4">
                            <Input label="Días de Crédito" value={supplier.creditDays || ''} onChange={(val) => handleChange('creditDays', parseInt(val))} type="number" icon="calendar_today" placeholder="30" />
                            <Input label="Límite de Crédito" value={supplier.creditLimit || ''} onChange={(val) => handleChange('creditLimit', parseFloat(val))} type="number" icon="attach_money" placeholder="0.00" />
                            <Input label="Lead Time Promedio (Días)" value={supplier.leadTimeDays || ''} onChange={(val) => handleChange('leadTimeDays', parseInt(val))} type="number" icon="local_shipping" placeholder="7" />
                        </div>
                    </FormBlock>

                    <FormBlock title="Datos Bancarios" icon="account_balance">
                         <div className="space-y-4">
                            <Input label="Banco" value={supplier.bankInfo?.bankName || ''} onChange={(val) => handleChange('bankInfo.bankName', val)} icon="account_balance" />
                            <Input label="No. Cuenta" value={supplier.bankInfo?.accountNumber || ''} onChange={(val) => handleChange('bankInfo.accountNumber', val)} icon="numbers" />
                            <Input label="CLABE" value={supplier.bankInfo?.clabe || ''} onChange={(val) => handleChange('bankInfo.clabe', val)} icon="password" />
                        </div>
                    </FormBlock>
                </div>
            </form>
        </div>
    );
};

export default NewSupplierPage;
