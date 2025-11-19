

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Supplier, SupplierRating } from '../types';
import { useDoc } from '../hooks/useDoc';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';

const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-4">
            {children}
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

    const handleChange = useCallback((field: keyof Supplier, value: any) => {
        setSupplier(prev => (prev ? { ...prev, [field]: value } : null));
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            console.log("Proveedor Actualizado:", supplier);
            alert("Proveedor actualizado (revisa la consola).");
            navigate(`/purchase/suppliers/${id}`);
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
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Editar Proveedor</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate(`/purchase/suppliers/${id}`)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <FormBlock title="Información del Proveedor">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Proveedor</label>
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
                            label="Rating"
                            options={ratingOptions}
                            value={supplier.rating || ''}
                            onChange={val => handleChange('rating', val as SupplierRating)}
                        />
                    </div>
                </FormBlock>
            </form>
        </div>
    );
};

export default EditSupplierPage;