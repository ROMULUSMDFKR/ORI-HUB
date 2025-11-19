import React, { useMemo, useState } from 'react';
import { Note, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface NoteCardProps {
  note: Note;
  usersMap: Map<string, User>;
  onUpdate?: (noteId: string, newText: string) => void;
  onDelete?: (noteId: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, usersMap, onUpdate, onDelete }) => {
    const { user: currentUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(note.text);
    const [isSaving, setIsSaving] = useState(false);

    // FIX: Memoize user lookup for performance.
    const author = useMemo(() => usersMap.get(note.userId), [usersMap, note.userId]);
    const isAuthor = currentUser?.id === note.userId;

    const handleSave = async () => {
        if (editedText.trim() !== '' && onUpdate) {
            setIsSaving(true);
            await onUpdate(note.id, editedText);
            setIsSaving(false);
            setIsEditing(false);
        }
    };

    const handleDelete = () => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta nota?') && onDelete) {
            onDelete(note.id);
        }
    };

    const renderText = (text: string) => {
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                const mentionedUser = Array.from(usersMap.values()).find((u: User) => u.name.toLowerCase() === username.toLowerCase());
                if (mentionedUser) {
                    return <strong key={index} className="text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10 px-1 rounded">{part}</strong>;
                }
            }
            return part;
        });
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg group relative">
            {isEditing ? (
                <div className="space-y-2">
                    <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-200"
                        rows={3}
                    />
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="text-xs px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                            disabled={isSaving}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-start">
                        <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap w-full">{renderText(note.text)}</p>
                        {isAuthor && (
                            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => setIsEditing(true)} 
                                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600"
                                    title="Editar nota"
                                >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                                <button 
                                    onClick={handleDelete} 
                                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600"
                                    title="Eliminar nota"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {author && <img src={author.avatarUrl} alt={author.name} className="w-5 h-5 rounded-full mr-2" />}
                        <span>{author?.name || 'Usuario desconocido'} &bull; {new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default NoteCard;