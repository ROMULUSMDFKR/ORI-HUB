
import React from 'react';
import { User } from '../../types';

interface UserAvatarProps {
    user: User;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
};

const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md', className = '' }) => {
    const initials = user.name
        ? user.name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : '??';

    if (user.avatarUrl) {
        return (
            <img
                src={user.avatarUrl}
                alt={user.name}
                className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 dark:border-slate-700 ${className}`}
            />
        );
    }

    return (
        <div className={`${sizeClasses[size]} rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 ${className}`}>
            {initials}
        </div>
    );
};

export default UserAvatar;
