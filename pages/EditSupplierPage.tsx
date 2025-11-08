import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Supplier, SupplierRating } from '../types';
import { useDoc } from '../hooks/useDoc';
import Spinner from '../components/ui/Spinner';

const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold border-b pb-3 mb-4">{title}</h3>
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

    const handleChange = (field: keyof Supplier, value: any) => {
        setSupplier(prev => (prev ? { ...prev, [field]: value } : null));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            console.log("Proveedor Actualizado:", supplier);
            alert("Proveedor actualizado (revisa la consola).");
            navigate(`/crm/suppliers/${id}`);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!supplier) {
        return <div className="text-center p-12">Proveedor no encontrado</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text-main">Editar Proveedor</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate(`/crm/suppliers/${id}`)} className="bg-white border border-gray-300 text-text-main font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-dark">
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <FormBlock title="Información del Proveedor">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre del Proveedor</label>
                            <input
                                type="text"
                                value={supplier.name || ''}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Industria</label>
                            <input
                                type="text"
                                value={supplier.industry || ''}
                                onChange={(e) => handleChange('industry', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Rating</label>
                            <select
                                value={supplier.rating || ''}
                                onChange={(e) => handleChange('rating', e.target.value as SupplierRating)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                            >
                                <option value="">Sin Calificar</option>
                                {Object.values(SupplierRating).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                </FormBlock>
            </form>
        </div>
    );
};

export default EditSupplierPage;