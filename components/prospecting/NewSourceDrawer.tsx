import React, { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import { ImportSource } from '../../types';

interface NewSourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Se corrigió el tipo de la prop para que coincida con los datos que se envían.
  onSave: (source: Omit<ImportSource, 'id' | 'createdById'>) => void;
}

const NewSourceDrawer: React.FC<NewSourceDrawerProps> = ({ isOpen, onClose, onSave }) => {
    const initialState = { name: '', description: '', tags: '', createdAt: '' };
    const [source, setSource] = useState(initialState);

    useEffect(() => {
        if (!isOpen) {
            setSource(initialState);
        }
    }, [isOpen]);

    const handleChange = (field: keyof typeof source, value: string) => {
        setSource(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!source.name.trim() || !source.description.trim()) {
            alert('El nombre y la descripción son obligatorios.');
            return;
        }
        
        const sourceData = {
            name: source.name,
            description: source.description,
            tags: source.tags.split(',').map(t => t.trim()).filter(Boolean),
            createdAt: new Date().toISOString(),
        };

        // FIX: Se eliminó la conversión de tipos innecesaria ya que los tipos ahora coinciden.
        onSave(sourceData);
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Crear Nueva Fuente de Importación">
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Una "Fuente" representa una búsqueda o un origen de datos específico. Guarda los parámetros que usaste para encontrar este lote de candidatos.
                </p>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre de la Fuente *</label>
                    <input 
                        type="text"
                        value={source.name}
                        onChange={e => handleChange('name', e.target.value)}
                        placeholder="Ej: Agroindustria EdoMex Jul24"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción / Criterios de Búsqueda *</label>
                    <textarea
                        rows={4}
                        value={source.description}
                        onChange={e => handleChange('description', e.target.value)}
                        placeholder="Pega aquí la consulta exacta que usaste. Ej: 'Agro-industry in Mexico, State of Mexico...'"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Etiquetas (separadas por comas)</label>
                    <input
                        type="text"
                        value={source.tags}
                        onChange={e => handleChange('tags', e.target.value)}
                        placeholder="Ej: agro, edomex, gmaps"
                    />
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Fuente</button>
            </div>
        </Drawer>
    );
};

export default NewSourceDrawer;