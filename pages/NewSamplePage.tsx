
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sample, SampleStatus, Prospect, Company, Product, User, Task, TaskStatus, Priority, Note, ActivityLog } from '../types';
import { useCollection } from '../hooks/useCollection';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

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
    const { user: currentUser } = useAuth();
    const [recipientType, setRecipientType] = useState<'prospect' | 'company'>('prospect');
    const [sample, setSample] = useState<Partial<Sample>>({
        name: '',
        status: SampleStatus.Solicitada,
        ownerId: '', 
        createdById: '',
        requestDate: new Date().toISOString().split('T')[0],
        notes: ''
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

    // Set defaults when user loads
    useEffect(() => {
        if (currentUser && !sample.ownerId) {
            setSample(prev => ({
                ...prev,
                ownerId: currentUser.id,
                createdById: currentUser.id
            }));
        }
    }, [currentUser]);


    const handleChange = (field: keyof Sample, value: any) => {
        setSample(prev => ({ ...prev, [field]: value }));
    };

    const handleRecipientTypeChange = (type: 'prospect' | 'company') => {
        setRecipientType(type);
        // Clear both IDs when switching to avoid confusion, set to undefined
        setSample(prev => ({...prev, prospectId: undefined, companyId: undefined}));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentUser) return;

        // Strict validation based on selected type
        if (!sample.name?.trim()) {
            showToast('warning', 'El nombre de la muestra es obligatorio.');
            return;
        }
        if (!sample.productId) {
            showToast('warning', 'Debes seleccionar un producto.');
            return;
        }
        if (recipientType === 'prospect' && !sample.prospectId) {
            showToast('warning', 'Debes seleccionar un prospecto.');
            return;
        }
        if (recipientType === 'company' && !sample.companyId) {
            showToast('warning', 'Debes seleccionar una empresa.');
            return;
        }
        if (!sample.ownerId) {
            showToast('warning', 'Debes asignar un responsable.');
            return;
        }

        setIsSaving(true);

        try {
            // 1. Prepare Sample Payload
            const newSampleData: any = {
                name: sample.name,
                status: sample.status,
                ownerId: sample.ownerId,
                createdById: currentUser.id, // Explicitly set creator
                requestDate: sample.requestDate,
                productId: sample.productId,
                // Don't save 'notes' as a field here, we create a Note doc below
            };

            if (recipientType === 'prospect') {
                newSampleData.prospectId = sample.prospectId;
            } else {
                newSampleData.companyId = sample.companyId;
            }

            // 2. Create Sample Document
            const createdSample = await api.addDoc('samples', newSampleData);
            
            // 3. Create Note Document (if notes were provided)
            if (sample.notes && sample.notes.trim()) {
                const noteData: Omit<Note, 'id'> = {
                    text: sample.notes,
                    userId: currentUser.id,
                    sampleId: createdSample.id,
                    createdAt: new Date().toISOString()
                };
                await api.addDoc('notes', noteData);
            }

            // 4. Create Activity Log
            const activityData: Omit<ActivityLog, 'id'> = {
                type: 'Sistema',
                description: `Muestra creada y asignada a ${users?.find(u => u.id === sample.ownerId)?.name || 'Responsable'}`,
                userId: currentUser.id,
                sampleId: createdSample.id,
                createdAt: new Date().toISOString()
            };
            await api.addDoc('activities', activityData);

            // 5. Create Task for Responsible
            const taskData: Omit<Task, 'id'> = {
                title: `Enviar Muestra: ${sample.name}`,
                description: `Nueva solicitud de muestra.\nProducto: ${products?.find(p => p.id === sample.productId)?.name}\nNotas: ${sample.notes || 'N/A'}`,
                status: TaskStatus.PorHacer,
                priority: Priority.Alta,
                assignees: [sample.ownerId!], // Assign to responsible
                watchers: [currentUser.id], // Creator watches
                createdById: currentUser.id,
                createdAt: new Date().toISOString(),
                dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Due in 2 days default
                links: { sampleId: createdSample.id }
            };
            await api.addDoc('tasks', taskData);

            showToast('success', 'Muestra guardada y tarea asignada exitosamente.');
            navigate('/hubs/samples');
        } catch (error) {
            console.error("Error saving sample:", error);
            showToast('error', 'Error al guardar la muestra. Verifica la consola.');
        } finally {
            setIsSaving(false);
        }
    };
    
    // Creator Name (Read-Only)
    const creatorName = currentUser?.name || 'Desconocido';

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
                        Guardar y Asignar Tarea
                    </button>
                </div>
            </div>

            {loading ? <Spinner /> : (
                 <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                    <FormBlock title="Detalles de la Muestra">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre de la Muestra / Concepto *</label>
                            <input type="text" value={sample.name || ''} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 w-full" placeholder="Ej. Muestra UREA 1L para Lab" />
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Creado por</label>
                                <input type="text" value={creatorName} disabled className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-500 cursor-not-allowed" />
                            </div>
                            <CustomSelect label="Responsable (Se le asignará tarea)" options={userOptions} value={sample.ownerId || ''} onChange={val => handleChange('ownerId', val)} />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Solicitud</label>
                            <input type="date" value={sample.requestDate || ''} onChange={(e) => handleChange('requestDate', e.target.value)} className="mt-1 w-full" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Instrucciones Especiales / Notas</label>
                            <textarea 
                                value={sample.notes || ''} 
                                onChange={(e) => handleChange('notes', e.target.value)} 
                                rows={4} 
                                className="mt-1 w-full"
                                placeholder="Ej. Enviar con ficha técnica, atención a Juan Pérez... (Se guardará como nota)"
                            />
                        </div>

                    </FormBlock>
                </form>
            )}
        </div>
    );
};

export default NewSamplePage;
