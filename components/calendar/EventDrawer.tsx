
import React, { useState } from 'react';
import Drawer from '../ui/Drawer';
import { Task, TaskStatus, Priority } from '../../types';

interface EventDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

const EventDrawer: React.FC<EventDrawerProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSave = () => {
    if (!title || !dueDate) {
      alert('Por favor, completa el título y la fecha.');
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      status: TaskStatus.PorHacer,
      dueAt: new Date(dueDate).toISOString(),
      assignees: ['user-1'], // Default to current user for simplicity
      watchers: [],
      priority: Priority.Media,
      createdAt: new Date().toISOString(),
    };

    onSave(newTask);
    onClose();
    setTitle('');
    setDueDate('');
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Añadir Nuevo Evento">
      <div className="space-y-6">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                 <span className="material-symbols-outlined">event</span>
             </div>
             <div>
                 <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Crear Recordatorio</p>
                 <p className="text-xs text-indigo-700 dark:text-indigo-300">Se guardará como una tarea en tu lista.</p>
             </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
             <span className="material-symbols-outlined align-bottom text-base mr-1 text-slate-400">edit</span>
            Título del Evento
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Reunión de seguimiento..."
            className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
             <span className="material-symbols-outlined align-bottom text-base mr-1 text-slate-400">calendar_month</span>
            Fecha y Hora
          </label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm">
                Cancelar
            </button>
            <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-transform active:scale-95 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">save</span>
                Guardar Evento
            </button>
        </div>
      </div>
    </Drawer>
  );
};

export default EventDrawer;
