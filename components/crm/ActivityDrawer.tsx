

import React, { useState } from 'react';
import Drawer from '../ui/Drawer';
import { ActivityLog } from '../../types';

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  prospectId: string;
  onAddActivity: (activity: ActivityLog) => void;
}

const ActivityDrawer: React.FC<ActivityDrawerProps> = ({ isOpen, onClose, prospectId, onAddActivity }) => {
    const [type, setType] = useState<ActivityLog['type']>('Llamada');
    const [description, setDescription] = useState('');

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
            userId: 'natalia', // Assuming current user
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
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Actividad</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as ActivityLog['type'])}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-container-bg text-text-main"
                    >
                        <option value="Llamada">Llamada</option>
                        <option value="Email">Email</option>
                        <option value="Reunión">Reunión</option>
                        <option value="Nota">Nota Rápida</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                    <textarea
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-container-bg text-text-main"
                        placeholder="Ej: Llamada de seguimiento sobre la cotización QT-1002. Cliente pidió ajuste en precios."
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="bg-primary py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-dark"
                    >
                        Guardar Actividad
                    </button>
                </div>
            </form>
        </Drawer>
    );
};

export default ActivityDrawer;