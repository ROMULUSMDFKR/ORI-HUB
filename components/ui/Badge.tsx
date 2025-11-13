import React from 'react';

type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

interface BadgeProps {
  text: string;
  color?: BadgeColor;
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  gray: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300',
};

const Badge: React.FC<BadgeProps> = ({ text, color = 'gray' }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {text}
    </span>
  );
};

export default Badge;