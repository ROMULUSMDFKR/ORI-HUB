
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sample, SampleStatus, Prospect, Company, Product, User } from '../types';
import { useCollection } from '../hooks/useCollection';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

// Moved outside
const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const NewSamplePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [recipientType, setRecipientType] = useState<'prospect' | 'company'>('prospect');
    const [sample, setSample] = useState<Partial<Sample>>({
        name: '',
        status: SampleStatus.Solicitada,
        ownerId: 'user-1', 
        requestDate: new Date().toISOString().split('T')[0],
    });
    const [isSaving, setIsSaving] = useState(false);

    const { data: prospects, loading: pLoading } = useCollection<Prospect>('prospects');
    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    const { data: products, loading: prLoading } = useCollection<Product>('products');
    const { data: users, loading: uLoading } = useCollection<User>('users');

    const loading = pLoading || cLoading || prLoading || uLoading;

    const prospectOptions = (prospects || []).map(p => ({ value: p.id, name: p.name }));
    const companyOptions = (companies || []).map(c => ({ value: c.id, name: c.shortName || c.name }));
    const productOptions = (products || []).map(p => ({ value: p.id, name: p.name }));
    const userOptions = useMemo(() => (users || []).map(u => ({ value: u.id, name: u.name })), [users]);


    const handleChange = (field: keyof Sample, value: any) => {
        setSample(prev => ({ ...prev, [field]: value }));
    };

    const handleRecipientTypeChange = (type: 'prospect' | 'company') => {
        setRecipientType(type);
        setSample(prev => ({...prev, prospectId: undefined, companyId: undefined}));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sample.name || !sample.productId || (!sample.prospectId && !sample.companyId)) {
            showToast('warning', 'Por favor, completa los campos obligatorios.');
            return;
        }

        setIsSaving(true);
        const newSampleData: Omit<Sample, 'id'> = {
            ...sample,
        } as Omit<Sample, 'id'>;

        try {
            await api.addDoc('samples', newSampleData);
            showToast('success', 'Muestra guardada exitosamente.');
            navigate('/hubs/samples');
        } catch (error) {
            console.error("Error saving sample:", error);
            showToast('error', 'Error al guardar la muestra.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Muestra</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate('/hubs/samples')} disabled={isSaving} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Muestra
                    </button>
                </div>
            </div>

            {loading ? <Spinner /> : (
                 <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                    <FormBlock title="Detalles de la Muestra">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre de la Muestra / Concepto *</label>
                            <input type="text" value={sample.name || ''} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 w-full" />
                        </div>
                        
                        <CustomSelect label="Producto *" options={productOptions} value={sample.productId || ''} onChange={val => handleChange('productId', val)} />

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Destinatario *</label>
                            <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg p-1 bg-slate-100 dark:bg-slate-900 mt-1">
                                <button type="button" onClick={() => handleRecipientTypeChange('prospect')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${recipientType === 'prospect' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>Prospecto</button>
                                <button type="button" onClick={() => handleRecipientTypeChange('company')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${recipientType === 'company' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>Empresa</button>
                            </div>
                        </div>

                        {recipientType === 'prospect' ? (
                            <CustomSelect label="Seleccionar Prospecto" options={prospectOptions} value={sample.prospectId || ''} onChange={val => handleChange('prospectId', val)} />
                        ) : (
                            <CustomSelect label="Seleccionar Empresa" options={companyOptions} value={sample.companyId || ''} onChange={val => handleChange('companyId', val)} />
                        )}
                        
                        <CustomSelect label="Responsable" options={userOptions} value={sample.ownerId || ''} onChange={val => handleChange('ownerId', val)} />
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Solicitud</label>
                            <input type="date" value={sample.requestDate || ''} onChange={(e) => handleChange('requestDate', e.target.value)} className="mt-1 w-full" />
                        </div>

                    </FormBlock>
                </form>
            )}
        </div>
    );
};

export default NewSamplePage;
