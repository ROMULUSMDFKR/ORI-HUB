import React, { useState, useMemo, useRef } from 'react';
import { Note, User } from '../../types';
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../hooks/useAuth';
import NoteCard from './NoteCard';

interface NotesSectionProps {
    entityId: string;
    entityType: 'prospect' | 'company' | 'contact' | 'product' | 'supplier' | 'candidate' | 'sample' | 'quote' | 'salesOrder';
    notes: Note[];
    onNoteAdded: (note: Note) => void;
    onNoteUpdated?: (noteId: string, newText: string) => void;
    onNoteDeleted?: (noteId: string) => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({ entityId, entityType, notes, onNoteAdded, onNoteUpdated, onNoteDeleted }) => {
    const [newNote, setNewNote] = useState('');
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);
    const [userSuggestionQuery, setUserSuggestionQuery] = useState('');
    const newNoteInputRef = useRef<HTMLTextAreaElement>(null);
    const { user: currentUser } = useAuth();
    const { data: allUsers } = useCollection<User>('users');

    // FIX: Ensure usersMap is always of type Map<string, User> to prevent downstream type errors.
    const usersMap = useMemo(() => {
        if (!allUsers) return new Map<string, User>();
        return new Map(allUsers.map(u => [u.id, u]));
    }, [allUsers]);

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewNote(text);
        
        const mentionMatch = text.match(/@(\w*)$/);
        if (mentionMatch) {
            setShowUserSuggestions(true);
            setUserSuggestionQuery(mentionMatch[1]);
        } else {
            setShowUserSuggestions(false);
        }
    };

    const userSuggestions = useMemo(() => {
        if (!userSuggestionQuery || !allUsers) return [];
        return allUsers.filter(u => 
            u.name.toLowerCase().startsWith(userSuggestionQuery.toLowerCase()) && !u.name.includes(' ')
        );
    }, [userSuggestionQuery, allUsers]);

    const handleMentionSelect = (userName: string) => {
        setNewNote(prev => prev.replace(/@\w*$/, `@${userName} `));
        setShowUserSuggestions(false);
        newNoteInputRef.current?.focus();
    };

    const handleAddNote = () => {
        if (newNote.trim() === '' || !currentUser) return;
        const note: Note = {
            id: `note-${Date.now()}`,
            [`${entityType}Id`]: entityId,
            text: newNote,
            userId: currentUser.id,
            createdAt: new Date().toISOString(),
        } as Note;
        onNoteAdded(note);
        setNewNote('');
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">Notas</h3>
            <div className="space-y-4">
                <div className="relative">
                    <textarea 
                        ref={newNoteInputRef}
                        value={newNote} 
                        onChange={handleNoteChange} 
                        rows={3} 
                        placeholder="Escribe una nueva nota... (@ para mencionar)" 
                        className="w-full"
                    />
                    {showUserSuggestions && userSuggestions.length > 0 && (
                        <div className="absolute bottom-full left-0 mb-1 w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                            <ul>
                                {userSuggestions.map(user => (
                                    <li 
                                        key={user.id} 
                                        onClick={() => handleMentionSelect(user.name)}
                                        className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                    >
                                        <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full" />
                                        <span className="text-sm text-slate-800 dark:text-slate-200">{user.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="text-right mt-2">
                        <button onClick={handleAddNote} className="bg-indigo-600 text-white font-semibold py-2 px-3 rounded-lg text-sm shadow-sm hover:bg-indigo-700">Agregar Nota</button>
                    </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto pr-2">
                    {notes.length > 0 ? notes.map(note => (
                        <NoteCard 
                            key={note.id} 
                            note={note} 
                            usersMap={usersMap} 
                            onUpdate={onNoteUpdated}
                            onDelete={onNoteDeleted}
                        />
                    ))
                    : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">No hay notas para este registro.</p>}
                </div>
            </div>
        </div>
    );
};

export default NotesSection;