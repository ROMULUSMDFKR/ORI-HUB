
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

    const usersMap = useMemo(() => {
        if (!allUsers) return new Map<string, User>();
        return new Map(allUsers.map(u => [u.id, u]));
    }, [allUsers]);

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewNote(text);
        
        // Detect trigger character '@' followed by characters
        const lastAtIndex = text.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const query = text.substring(lastAtIndex + 1);
            // Only show suggestions if we are typing a word immediately after @ (no spaces yet, or handling spaces logic)
            // Simple logic: Show if there's no space OR if we want to support spaces, we need a more complex regex.
            // For now, keeping it simple: support typing until a newline.
            if (!query.includes('\n')) {
                setShowUserSuggestions(true);
                setUserSuggestionQuery(query);
            } else {
                setShowUserSuggestions(false);
            }
        } else {
            setShowUserSuggestions(false);
        }
    };

    const userSuggestions = useMemo(() => {
        if (!userSuggestionQuery && userSuggestionQuery !== '') return []; // Allow empty query to show all initially
        if (!allUsers) return [];
        
        const lowerQuery = userSuggestionQuery.toLowerCase();
        
        return allUsers.filter(u => 
            u.name.toLowerCase().includes(lowerQuery) || 
            (u.email && u.email.toLowerCase().includes(lowerQuery))
        );
    }, [userSuggestionQuery, allUsers]);

    const handleMentionSelect = (userName: string) => {
        // Replace the last occurrence of @query with @userName
        const lastAtIndex = newNote.lastIndexOf('@');
        const textBefore = newNote.substring(0, lastAtIndex);
        const textAfter = `@${userName} `; // Add space after mention
        
        setNewNote(textBefore + textAfter);
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
        setShowUserSuggestions(false);
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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                    />
                    
                    {/* Suggestions Dropdown */}
                    {showUserSuggestions && userSuggestions.length > 0 && (
                        <div className="absolute bottom-full left-0 mb-1 w-full max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                            <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Sugerencias</p>
                            </div>
                            <ul>
                                {userSuggestions.map(user => (
                                    <li 
                                        key={user.id} 
                                        onClick={() => handleMentionSelect(user.name)}
                                        className="flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors"
                                    >
                                        <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-8 h-8 rounded-full object-cover bg-slate-200" />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div className="text-right mt-2">
                        <button onClick={handleAddNote} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-indigo-700 transition-colors">Agregar Nota</button>
                    </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {notes.length > 0 ? notes.map(note => (
                        <NoteCard 
                            key={note.id} 
                            note={note} 
                            usersMap={usersMap} 
                            onUpdate={onNoteUpdated}
                            onDelete={onNoteDeleted}
                        />
                    ))
                    : <div className="text-center py-8 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">No hay notas registradas.</div>}
                </div>
            </div>
        </div>
    );
};

export default NotesSection;
