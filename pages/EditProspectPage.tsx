import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Prospect, ProspectStage, Priority, User } from '../types';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';

const EditProspectPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialProspect, loading: pLoading } = useDoc<Prospect>('prospects', id || '');
    const { data: users, loading: uLoading } = useCollection<User>('users');

    const [prospect, setProspect] = useState<Partial<Prospect> | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const loading = pLoading || uLoading;

    useEffect(() => {
        if (initialProspect) {
            setProspect(initialProspect);
        }
    }, [initialProspect]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!prospect?.name?.trim()) newErrors.name = 'El nombre es requerido.';
        if (!prospect?.estValue || prospect.estValue <= 0) newErrors.estValue = 'El valor estimado debe ser mayor a cero.';
        if (!prospect?.ownerId) newErrors.ownerId = 'El responsable es requerido.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (field: keyof Prospect, value: any) => {
        setProspect(prev => (prev ? { ...prev, [field]: value } : null));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            console.log("Prospecto Actualizado:", prospect);
            alert("Prospecto actualizado (revisa la consola).");
            navigate(`/hubs/prospects/${id}`);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!prospect) {
        return <div className="text-center p-12">Prospecto no encontrado</div>;
    }

    const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
          <div className="space-y-4">
            {children}
          </div>
        </div>
    );
    
    const creator = users?.find(u => u.id === prospect.createdById);
    const userOptions = (users || []).map(u => ({ value: u.id, name: u.name }));
    const stageOptions = Object.values(ProspectStage).map(s => ({ value: s, name: s }));
    const priorityOptions = Object.values(Priority).map(p => ({ value: p, name: p }));

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Editar Prospecto</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate(`/hubs/prospects/${id}`)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <FormBlock title="Información del Prospecto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Prospecto</label>
                            <input type="text" value={prospect.name || ''} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 block w-full" />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Valor Estimado (USD)</label>
                            <input type="number" value={prospect.estValue || ''} onChange={(e) => handleChange('estValue', parseFloat(e.target.value) || 0)} className="mt-1 block w-full" />
                            {errors.estValue && <p className="text-red-500 text-xs mt-1">{errors.estValue}</p>}
                        </div>
                        
                        <CustomSelect label="Responsable" options={userOptions} value={prospect.ownerId || ''} onChange={val => handleChange('ownerId', val)} />
                        {errors.ownerId && <p className="text-red-500 text-xs mt-1">{errors.ownerId}</p>}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Creador</label>
                             <input 
                                type="text" 
                                value={creator?.name || 'Desconocido'} 
                                disabled 
                                className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed" 
                            />
                        </div>
                        
                        <CustomSelect label="Etapa" options={stageOptions} value={prospect.stage || ''} onChange={val => handleChange('stage', val as ProspectStage)} />
                        
                        <CustomSelect label="Prioridad" options={priorityOptions} value={prospect.priority || ''} onChange={val => handleChange('priority', val as Priority)} />

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Origen</label>
                            <input type="text" value={prospect.origin || ''} onChange={(e) => handleChange('origin', e.target.value)} className="mt-1 block w-full" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Industria</label>
                            <input type="text" value={prospect.industry || ''} onChange={(e) => handleChange('industry', e.target.value)} className="mt-1 block w-full" />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notas</label>
                        <textarea value={prospect.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} rows={4} className="mt-1 block w-full" />
                    </div>
                </FormBlock>
            </form>
        </div>
    );
};

export default EditProspectPage;