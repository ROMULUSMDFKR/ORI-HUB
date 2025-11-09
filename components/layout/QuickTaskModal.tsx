import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Priority } from '../../types';

interface QuickTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<Task>) => void;
}

const QuickTaskModal: React.FC<QuickTaskModalProps> = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setTitle(''); // Reset title when modal closes
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (title.trim()) {
            onSave({ 
                title, 
                status: TaskStatus.PorHacer, 
                priority: Priority.Media 
            });
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-20" onClick={onClose}>
            <div 
                className="bg-surface rounded-xl shadow-2xl w-full max-w-lg transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4">
                    <input
                        autoFocus
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        placeholder="¿Qué necesitas hacer?"
                        className="w-full bg-transparent text-lg placeholder:text-on-surface-secondary focus:outline-none"
                    />
                </div>
                <div className="p-4 bg-background border-t border-border flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         {/* Placeholder for future quick actions */}
                        <button className="p-2 rounded-lg hover:bg-surface-inset text-on-surface-secondary"><span className="material-symbols-outlined text-base">person_add</span></button>
                        <button className="p-2 rounded-lg hover:bg-surface-inset text-on-surface-secondary"><span className="material-symbols-outlined text-base">flag</span></button>
                        <button className="p-2 rounded-lg hover:bg-surface-inset text-on-surface-secondary"><span className="material-symbols-outlined text-base">calendar_month</span></button>
                    </div>
                    <button 
                        onClick={handleSubmit} 
                        disabled={!title.trim()}
                        className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg shadow-sm disabled:opacity-50"
                    >
                        Crear Tarea
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickTaskModal;