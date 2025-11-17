import React, { useState } from 'react';
import Drawer from '../ui/Drawer';
import { ActivityLog } from '../../types';
import CustomSelect from '../ui/CustomSelect';

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  prospectId: string;
  onAddActivity: (activity: ActivityLog) => void;
}

const ActivityDrawer: React.FC<ActivityDrawerProps> = ({ isOpen, onClose, prospectId, onAddActivity }) => {
    const [type, setType] = useState<ActivityLog['type']>('Llamada');
    const [description, setDescription] = useState('');
    
    const typeOptions = [
        { value: 'Llamada', name: 'Llamada' },
        { value: 'Email', name: 'Email' },
        { value: 'Reunión', name: 'Reunión' },
        { value: 'Nota', name: 'Nota Rápida' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (description.trim() === '') {
            alert('La descripción no puede estar vacía.');
            return;
        }

        const newActivity: ActivityLog = {
            id: `act-${Date.now()}`,
            prospectId,
            type,
            description,
            userId: 'user-1', // Assuming current user
            createdAt: new Date().toISOString(),
        };

        onAddActivity(newActivity);
        console.log("Nueva Actividad:", newActivity);
        onClose();
        setDescription('');
        setType('Llamada');
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Registrar Actividad">
            <form onSubmit={handleSubmit} className="space-y-6">
                <CustomSelect
                    label="Tipo de Actividad"
                    options={typeOptions}
                    value={type}
                    onChange={(val) => setType(val as ActivityLog['type'])}
                />

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                    <textarea
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full"
                        placeholder="Ej: Llamada de seguimiento sobre la cotización QT-1002. Cliente pidió ajuste en precios."
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-white dark:bg-slate-700 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Guardar Actividad
                    </button>
                </div>
            </form>
        </Drawer>
    );
};

export default ActivityDrawer;
