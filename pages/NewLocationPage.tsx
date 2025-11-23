
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Location } from '../types';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';
import CustomSelect from '../components/ui/CustomSelect';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import { useDoc } from '../hooks/useDoc';
import Spinner from '../components/ui/Spinner';

// --- Reusable Components ---
const FormBlock: React.FC<{ title: string; children: React.ReactNode; icon?: string; className?: string }> = ({ title, children, icon, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">{children}</div>
    </div>
);

const Input: React.FC<{ label: string; value: string | number; onChange: (val: any) => void; type?: string, placeholder?: string, icon?: string }> = ({ label, value, onChange, type = 'text', placeholder, icon }) => (
    <div>
        <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {icon && <span className="material-symbols-outlined text-sm mr-1 text-slate-400">{icon}</span>}
            {label}
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

const NewLocationPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isEditMode = !!id;

    const { data: existingLocation, loading: locLoading } = useDoc<Location>('locations', id || '');

    const [location, setLocation] = useState<Partial<Location>>({
        name: '',
        type: 'Estantería',
        capacity: 0,
        description: '',
        dimensions: { width: 0, height: 0, depth: 0, unit: 'm' },
        zone: '',
        temperatureControl: 'Ambiente',
        isRestricted: false
    });

    useEffect(() => {
        if (existingLocation) {
            setLocation({
                ...existingLocation,
                dimensions: existingLocation.dimensions || { width: 0, height: 0, depth: 0, unit: 'm' },
                temperatureControl: existingLocation.temperatureControl || 'Ambiente',
                isRestricted: existingLocation.isRestricted || false,
                zone: existingLocation.zone || ''
            });
        }
    }, [existingLocation]);

    const handleSave = async () => {
        if (!location.name?.trim()) {
            showToast('warning', 'El nombre de la ubicación es obligatorio.');
            return;
        }

        try {
            if (isEditMode && id) {
                await api.updateDoc('locations', id, location);
                showToast('success', 'Ubicación actualizada.');
            } else {
                await api.addDoc('locations', location);
                showToast('success', 'Ubicación creada.');
            }
            navigate('/inventory/locations');
        } catch (error) {
            console.error("Error saving location:", error);
            showToast('error', 'Error al guardar la ubicación.');
        }
    };

    const typeOptions = [
        { value: 'Estantería', name: 'Estantería / Rack' },
        { value: 'Piso', name: 'Zona de Piso' },
        { value: 'Refrigerado', name: 'Cámara Fría' },
        { value: 'Muelle', name: 'Muelle de Carga' },
        { value: 'Cuarentena', name: 'Cuarentena' },
    ];

    const tempOptions = [
        { value: 'Ambiente', name: 'Ambiente' },
        { value: 'Refrigerado', name: 'Refrigerado (2°C a 8°C)' },
        { value: 'Congelado', name: 'Congelado (-18°C)' },
    ];
    
    const zoneOptions = [
        { value: 'Pasillo A', name: 'Pasillo A' },
        { value: 'Pasillo B', name: 'Pasillo B' },
        { value: 'Zona Carga', name: 'Zona Carga' },
        { value: 'Patio', name: 'Patio' },
    ];

    if (isEditMode && locLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-20 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{isEditMode ? 'Editar Ubicación' : 'Nueva Ubicación'}</h2>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/inventory/locations')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-sm">save</span>
                        Guardar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormBlock title="Identidad y Capacidad" icon="pin_drop">
                    <Input label="Nombre / Código *" value={location.name || ''} onChange={val => setLocation({...location, name: val})} placeholder="Ej. Rack A-01-02" icon="tag" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <CustomSelect label="Tipo de Ubicación" options={typeOptions} value={location.type || 'Estantería'} onChange={val => setLocation({...location, type: val as any})} />
                        <CustomSelect label="Zona / Área" options={zoneOptions} value={location.zone || ''} onChange={val => setLocation({...location, zone: val})} placeholder="Seleccionar..." />
                    </div>

                    <Input label="Capacidad Máxima" type="number" value={location.capacity || ''} onChange={val => setLocation({...location, capacity: parseFloat(val)})} placeholder="0 para ilimitado" icon="fitness_center" />
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                        <textarea 
                            rows={3}
                            value={location.description || ''}
                            onChange={e => setLocation({...location, description: e.target.value})}
                            className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Detalles adicionales..."
                        />
                    </div>
                </FormBlock>

                <FormBlock title="Especificaciones Técnicas" icon="settings_applications">
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Dimensiones (Metros)</label>
                            <div className="grid grid-cols-3 gap-2">
                                <Input label="Largo" type="number" value={location.dimensions?.width || ''} onChange={val => setLocation({...location, dimensions: {...location.dimensions!, width: parseFloat(val)}})} icon="straighten" />
                                <Input label="Alto" type="number" value={location.dimensions?.height || ''} onChange={val => setLocation({...location, dimensions: {...location.dimensions!, height: parseFloat(val)}})} icon="height" />
                                <Input label="Fondo" type="number" value={location.dimensions?.depth || ''} onChange={val => setLocation({...location, dimensions: {...location.dimensions!, depth: parseFloat(val)}})} icon="layers" />
                            </div>
                        </div>

                        <CustomSelect label="Control de Temperatura" options={tempOptions} value={location.temperatureControl || 'Ambiente'} onChange={val => setLocation({...location, temperatureControl: val as any})} />

                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                            <div>
                                <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">Acceso Restringido</span>
                                <span className="text-xs text-slate-500">Solo personal autorizado (Jaula/Seguridad)</span>
                            </div>
                            <ToggleSwitch enabled={location.isRestricted || false} onToggle={() => setLocation({...location, isRestricted: !location.isRestricted})} />
                        </div>
                        
                        <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center">
                             <span className="material-symbols-outlined text-slate-400 text-3xl mb-2">qr_code_2</span>
                             <p className="text-xs text-slate-500">El código QR de ubicación se generará al guardar.</p>
                        </div>
                     </div>
                </FormBlock>
            </div>
        </div>
    );
};

export default NewLocationPage;
