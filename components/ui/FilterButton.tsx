
import React, { useState, useRef, useEffect } from 'react';

interface FilterButtonOption {
    value: string;
    label: string;
}

interface FilterButtonProps {
    label: string;
    options: FilterButtonOption[];
    selectedValue: string;
    onSelect: (value: string) => void;
    allLabel?: string;
    disabled?: boolean;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, options, selectedValue, onSelect, allLabel = 'Todos', disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const selectedOption = options.find(opt => opt.value === selectedValue);
    const buttonText = selectedOption ? `${label}: ${selectedOption.label}` : label;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">filter_list</span>
                {buttonText}
                <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-20 border border-slate-200 dark:border-slate-700 py-1">
                    <button onClick={() => { onSelect('all'); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">
                        {allLabel}
                    </button>
                    {options.map(option => (
                        <button
                            key={option.value}
                            onClick={() => { onSelect(option.value); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 ${selectedValue === option.value ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FilterButton;
