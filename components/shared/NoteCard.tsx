import React, { useMemo } from 'react';
import { Note, User } from '../../types';

interface NoteCardProps {
  note: Note;
  usersMap: Map<string, User>;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, usersMap }) => {
    // FIX: Memoize user lookup for performance.
    const user = useMemo(() => usersMap.get(note.userId), [usersMap, note.userId]);

    const renderText = (text: string) => {
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                // FIX: Add explicit type for 'u' to resolve a TypeScript inference issue where it was being treated as 'unknown'.
                const mentionedUser = Array.from(usersMap.values()).find((u: User) => u.name.toLowerCase() === username.toLowerCase());
                if (mentionedUser) {
                    return <strong key={index} className="text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10 px-1 rounded">{part}</strong>;
                }
            }
            return part;
        });
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{renderText(note.text)}</p>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                {user && <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full mr-2" />}
                <span>{user?.name || 'Usuario desconocido'} &bull; {new Date(note.createdAt).toLocaleString()}</span>
            </div>
        </div>
    );
};

export default NoteCard;