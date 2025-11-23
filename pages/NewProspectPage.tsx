
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Prospect, ProspectStage, Priority, User, Company } from '../types';
import CustomSelect from '../components/ui/CustomSelect';
import { useCollection } from '../hooks/useCollection';
import DuplicateChecker from '../components/ui/DuplicateChecker';
import { useToast } from '../hooks/useToast';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';

// --- Constants & Helpers ---

const ORIGIN_OPTIONS = [
    { value: 'LinkedIn', name: 'LinkedIn' },
    { value: 'Referido', name: 'Referido' },
    { value: 'Sitio Web', name: 'Sitio Web' },
    { value: 'Llamada en Frío', name: 'Llamada en Frío' },
    { value: 'Evento / Networking', name: 'Evento / Networking' },
    { value: 'Base de Datos', name: 'Base de Datos' },
    { value: 'Google Maps', name: 'Google Maps' },
    { value: 'Otro', name: 'Otro' }
];

const initialProspectState: Partial<Prospect> = {
    name: '',
    estValue: 0,
    ownerId: '', 
    createdById: '',
    stage: ProspectStage.Nueva,
    priority: Priority.Media,
    origin: '',
    industry: '',
    notes: '',
    email: '',
    phone: '',
    website: '',
    address: '',
};

// --- UI Components ---

const FormBlock: React.FC<{ title: string; children: React.ReactNode; icon?: string }> = ({ title, children, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-5 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-5">
            {children}
        </div>
    </div>
);

const IconInput: React.FC<{ 
    label: string; 
    icon: string; 
    value: string | number; 
    onChange: (val: string) => void; 
    type?: string; 
    placeholder?: string;
    required?: boolean;
    error?: string;
    prefix?: string;
}> = ({ label, icon, value, onChange, type = 'text', placeholder, required, error, prefix }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
                {prefix && <span className="text-slate-500 text-sm ml-1 font-medium">{prefix}</span>}
            </div>
            <input
                type={type}
                className={`block w-full pl-10 pr-3 py-2.5 sm:text-sm border rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-500 transition-colors ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
);

const NewProspectPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [prospect, setProspect] = useState(initialProspectState);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const { data: companies } = useCollection<Company>('companies');
    const { data: prospects } = useCollection<Prospect>('prospects');
    const { data: users } = useCollection<User>('users');

    // Auto-assign current user
    useEffect(() => {
        if (user && !prospect.ownerId) {
            setProspect(prev => ({
                ...prev,
                ownerId: user.id,
                createdById: user.id
            }));
        }
    }, [user]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!prospect.name?.trim()) newErrors.name = 'El nombre es requerido.';
        if (prospect.estValue !== undefined && prospect.estValue < 0) newErrors.estValue = 'El valor no puede ser negativo.';
        if (!prospect.ownerId) newErrors.ownerId = 'El responsable es requerido.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = useCallback((field: keyof Prospect, value: any) => {
        setProspect(prev => ({ ...prev, [field]: value }));
         if (field === 'name') {
            setSearchTerm(value);
            if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
        }
    }, [errors]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            setIsSaving(true);
            const newProspectData: Omit<Prospect, 'id'> = {
                createdAt: new Date().toISOString(),
                ...initialProspectState,
                ...prospect,
            } as Omit<Prospect, 'id'>;

            try {
                const docRef = await api.addDoc('prospects', newProspectData);
                showToast('success', 'Prospecto creado con éxito.');
                // Redirect to the new prospect detail page instead of the list for better flow
                navigate(`/hubs/prospects/${docRef.id}`);
            } catch (error) {
                console.error("Error saving prospect:", error);
                showToast('error', 'Hubo un error al guardar el prospecto.');
            } finally {
                setIsSaving(false);
            }
        } else {
            showToast('warning', 'Por favor completa los campos requeridos.');
        }
    };
    
    const userOptions = useMemo(() => (users || []).map(u => ({ value: u.id, name: u.name })), [users]);
    const stageOptions = Object.values(ProspectStage).map(s => ({ value: s, name: s }));
    const priorityOptions = Object.values(Priority).map(p => ({ value: p, name: p }));

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nuevo Prospecto</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Registra una nueva oportunidad de negocio.</p>
                </div>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => navigate('/hubs/prospects')} 
                        disabled={isSaving} 
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSaving} 
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Prospecto
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT COLUMN (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Información Comercial */}
                        <FormBlock title="Información Comercial" icon="domain">
                            <div className="grid grid-cols-1 gap-5">
                                <div className="relative">
                                    <IconInput 
                                        label="Nombre del Prospecto / Empresa" 
                                        icon="business" 
                                        value={prospect.name || ''} 
                                        onChange={(val) => handleChange('name', val)}
                                        placeholder="Ej: Grupo Industrial Alpha"
                                        required
                                        error={errors.name}
                                    />
                                    <DuplicateChecker 
                                        searchTerm={searchTerm}
                                        existingProspects={prospects || []}
                                        existingCompanies={companies || []}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <IconInput 
                                        label="Valor Estimado (USD)" 
                                        icon="attach_money" 
                                        value={prospect.estValue || ''} 
                                        onChange={(val) => handleChange('estValue', parseFloat(val) || 0)}
                                        type="number"
                                        placeholder="0.00"
                                        error={errors.estValue}
                                    />

                                    <IconInput 
                                        label="Industria / Sector" 
                                        icon="factory" 
                                        value={prospect.industry || ''} 
                                        onChange={(val) => handleChange('industry', val)}
                                        placeholder="Ej: Automotriz, Alimentos"
                                    />
                                </div>

                                <div>
                                    <CustomSelect 
                                        label="Origen del Prospecto"
                                        options={ORIGIN_OPTIONS}
                                        value={prospect.origin || ''}
                                        onChange={(val) => handleChange('origin', val)}
                                        placeholder="Seleccionar origen..."
                                    />
                                </div>
                            </div>
                        </FormBlock>

                        {/* Detalles de Contacto */}
                        <FormBlock title="Detalles de Contacto" icon="contact_phone">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <IconInput 
                                    label="Correo Electrónico" 
                                    icon="email" 
                                    value={prospect.email || ''} 
                                    onChange={(val) => handleChange('email', val)} 
                                    type="email"
                                    placeholder="contacto@empresa.com"
                                />
                                <IconInput 
                                    label="Teléfono" 
                                    icon="phone" 
                                    value={prospect.phone || ''} 
                                    onChange={(val) => handleChange('phone', val)} 
                                    type="tel"
                                    placeholder="+52 (55) 1234 5678"
                                />
                                <div className="md:col-span-2">
                                    <IconInput 
                                        label="Sitio Web" 
                                        icon="language" 
                                        value={prospect.website || ''} 
                                        onChange={(val) => handleChange('website', val)} 
                                        type="url"
                                        placeholder="https://www.empresa.com"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <IconInput 
                                        label="Dirección" 
                                        icon="location_on" 
                                        value={prospect.address || ''} 
                                        onChange={(val) => handleChange('address', val)} 
                                        placeholder="Calle, Ciudad, Estado"
                                    />
                                </div>
                             </div>
                        </FormBlock>

                        {/* Notas */}
                        <FormBlock title="Notas Iniciales" icon="description">
                            <textarea 
                                value={prospect.notes || ''} 
                                onChange={(e) => handleChange('notes', e.target.value)} 
                                rows={4} 
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                placeholder="Detalles importantes, necesidades específicas, siguientes pasos..."
                            />
                        </FormBlock>
                    </div>

                    {/* RIGHT COLUMN (1/3) */}
                    <div className="lg:col-span-1 space-y-6">
                        <FormBlock title="Clasificación y Asignación" icon="tune">
                            <div className="space-y-5">
                                <CustomSelect 
                                    label="Etapa Inicial" 
                                    options={stageOptions} 
                                    value={prospect.stage || ''} 
                                    onChange={val => handleChange('stage', val as ProspectStage)} 
                                />

                                <CustomSelect 
                                    label="Prioridad" 
                                    options={priorityOptions} 
                                    value={prospect.priority || ''} 
                                    onChange={val => handleChange('priority', val as Priority)} 
                                />

                                <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>

                                <CustomSelect 
                                    label="Asignado a (Responsable)" 
                                    options={userOptions} 
                                    value={prospect.ownerId || ''} 
                                    onChange={val => handleChange('ownerId', val)} 
                                />
                                {errors.ownerId && <p className="text-red-500 text-xs mt-1">{errors.ownerId}</p>}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Creado por</label>
                                    <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                        <span className="material-symbols-outlined text-slate-400">person</span>
                                        <span className="text-sm text-slate-600 dark:text-slate-300">{user?.name || 'Desconocido'}</span>
                                    </div>
                                </div>
                            </div>
                        </FormBlock>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default NewProspectPage;
