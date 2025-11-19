
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Company, CompanyPipelineStage, Priority, User, Prospect } from '../types';
import CustomSelect from '../components/ui/CustomSelect';
import { useCollection } from '../hooks/useCollection';
import DuplicateChecker from '../components/ui/DuplicateChecker';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

const initialClientState: Partial<Company> = {
    name: '',
    shortName: '',
    rfc: '',
    industry: '',
    ownerId: 'user-1', // Default value, can be updated from fetched users
    createdById: 'user-1', // Default value
    stage: CompanyPipelineStage.Investigacion,
    priority: Priority.Media,
    isActive: true,
};

// Moved outside to fix focus loss
const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
);

const NewClientPage: React.FC = () => {
    const navigate = useNavigate();
    const [client, setClient] = useState(initialClientState);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const { data: companies } = useCollection<Company>('companies');
    const { data: prospects } = useCollection<Prospect>('prospects');
    const { data: users } = useCollection<User>('users');


    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!client.name?.trim()) newErrors.name = 'El nombre o razón social es requerido.';
        if (!client.ownerId) newErrors.ownerId = 'El responsable es requerido.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = useCallback((field: keyof Company, value: any) => {
        setClient(prev => ({ ...prev, [field]: value }));
        if (field === 'name') {
            setSearchTerm(value);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            setIsSaving(true);
            const newClient: Omit<Company, 'id'> = {
                createdAt: new Date().toISOString(),
                productsOfInterest: [],
                deliveryAddresses: [],
                ...initialClientState,
                ...client,
            } as Omit<Company, 'id'>;

            try {
                await api.addDoc('companies', newClient);
                showToast('success', 'Cliente guardado con éxito.');
                navigate('/crm/clients/list'); // Redirect to list or detail
            } catch (error) {
                console.error("Error saving client:", error);
                showToast('error', 'Error al guardar el cliente.');
            } finally {
                setIsSaving(false);
            }
        }
    };
    
    const userOptions = useMemo(() => (users || []).map(u => ({ value: u.id, name: u.name })), [users]);
    const stageOptions = Object.values(CompanyPipelineStage).map(s => ({ value: s, name: s }));
    const priorityOptions = Object.values(Priority).map(p => ({ value: p, name: p }));

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Empresa / Cliente</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate('/crm/clients/list')} disabled={isSaving} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50">
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Empresa
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                 <FormBlock title="Información General">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre / Razón Social</label>
                            <input type="text" value={client.name || ''} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 block w-full" />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            <DuplicateChecker 
                                searchTerm={searchTerm}
                                existingProspects={prospects || []}
                                existingCompanies={companies || []}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre Corto (Alias)</label>
                            <input type="text" value={client.shortName || ''} onChange={(e) => handleChange('shortName', e.target.value)} className="mt-1 block w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">RFC</label>
                            <input type="text" value={client.rfc || ''} onChange={(e) => handleChange('rfc', e.target.value)} className="mt-1 block w-full" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Industria</label>
                            <input type="text" value={client.industry || ''} onChange={(e) => handleChange('industry', e.target.value)} className="mt-1 block w-full" />
                        </div>
                        <CustomSelect label="Responsable" options={userOptions} value={client.ownerId || ''} onChange={val => handleChange('ownerId', val)} />
                         <CustomSelect label="Etapa Inicial" options={stageOptions} value={client.stage || ''} onChange={val => handleChange('stage', val as CompanyPipelineStage)} />
                        <CustomSelect label="Prioridad" options={priorityOptions} value={client.priority || ''} onChange={val => handleChange('priority', val as Priority)} />
                    </div>
                </FormBlock>
            </form>
        </div>
    );
};

export default NewClientPage;
