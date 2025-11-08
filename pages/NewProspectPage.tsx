import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Prospect, ProspectStage, Priority, User } from '../types';
import { MOCK_USERS } from '../data/mockData';

const initialProspectState: Partial<Prospect> = {
    name: '',
    estValue: 0,
    ownerId: MOCK_USERS.natalia.id,
    createdById: MOCK_USERS.natalia.id,
    stage: ProspectStage.Nueva,
    priority: 'Media',
    origin: '',
    industry: '',
    notes: '',
};

const NewProspectPage: React.FC = () => {
    const navigate = useNavigate();
    const [prospect, setProspect] = useState(initialProspectState);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!prospect.name?.trim()) newErrors.name = 'El nombre es requerido.';
        if (!prospect.estValue || prospect.estValue <= 0) newErrors.estValue = 'El valor estimado debe ser mayor a cero.';
        if (!prospect.ownerId) newErrors.ownerId = 'El responsable es requerido.';
        if (!prospect.createdById) newErrors.createdById = 'El creador es requerido.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (field: keyof Prospect, value: any) => {
        setProspect(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const newProspect: Prospect = {
                id: `prospect-${Date.now()}`,
                createdAt: new Date().toISOString(),
                ...initialProspectState,
                ...prospect,
            } as Prospect;

            console.log("Nuevo Prospecto Guardado:", newProspect);
            alert("Prospecto guardado (revisa la consola).");
            navigate('/hubs/prospects');
        }
    };

    const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold border-b pb-3 mb-4">{title}</h3>
          <div className="space-y-4">
            {children}
          </div>
        </div>
      );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text-main">Crear Nuevo Prospecto</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate('/hubs/prospects')} className="bg-white border border-gray-300 text-text-main font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-dark">
                        Guardar Prospecto
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <FormBlock title="Información del Prospecto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre del Prospecto</label>
                            <input type="text" value={prospect.name || ''} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-container-bg text-text-main" />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Valor Estimado (USD)</label>
                            <input type="number" value={prospect.estValue || ''} onChange={(e) => handleChange('estValue', parseFloat(e.target.value) || 0)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-container-bg text-text-main" />
                            {errors.estValue && <p className="text-red-500 text-xs mt-1">{errors.estValue}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Responsable</label>
                            <select value={prospect.ownerId || ''} onChange={(e) => handleChange('ownerId', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-container-bg text-text-main">
                                {Object.values(MOCK_USERS).map((user: User) => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                            {errors.ownerId && <p className="text-red-500 text-xs mt-1">{errors.ownerId}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Creador</label>
                            <select value={prospect.createdById || ''} onChange={(e) => handleChange('createdById', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-container-bg text-text-main">
                                {Object.values(MOCK_USERS).map((user: User) => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                            {errors.createdById && <p className="text-red-500 text-xs mt-1">{errors.createdById}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Etapa Inicial</label>
                            <select value={prospect.stage || ''} onChange={(e) => handleChange('stage', e.target.value as ProspectStage)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-container-bg text-text-main">
                                {Object.values(ProspectStage).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                            <select value={prospect.priority || ''} onChange={(e) => handleChange('priority', e.target.value as Priority)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-container-bg text-text-main">
                                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Origen</label>
                            <input type="text" value={prospect.origin || ''} onChange={(e) => handleChange('origin', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-container-bg text-text-main" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Industria</label>
                            <input type="text" value={prospect.industry || ''} onChange={(e) => handleChange('industry', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-container-bg text-text-main" />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Notas</label>
                        <textarea value={prospect.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} rows={4} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-container-bg text-text-main" />
                    </div>
                </FormBlock>
            </form>
        </div>
    );
};

export default NewProspectPage;