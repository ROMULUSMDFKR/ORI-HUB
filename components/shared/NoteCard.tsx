import React from 'react';
import { Note } from '../../types';
import { MOCK_USERS } from '../../data/mockData';

interface NoteCardProps {
  note: Note;
}

const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
    const user = MOCK_USERS[note.userId];

    const renderText = (text: string) => {
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                // In a real app, you'd check against a user list/map more robustly
                const userExists = Object.values(MOCK_USERS).some(u => u.name.toLowerCase() === username.toLowerCase());
                if (userExists) {
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
                <span>{user?.name} &bull; {new Date(note.createdAt).toLocaleString()}</span>
            </div>
        </div>
    );
};

export default NoteCard;
