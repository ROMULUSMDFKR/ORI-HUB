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
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Título del Evento (Tarea)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Fecha
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">
                Cancelar
            </button>
            <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">
                Guardar Evento
            </button>
        </div>
      </div>
    </Drawer>
  );
};

export default EventDrawer;
