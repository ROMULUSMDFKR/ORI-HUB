import React, { useState, useRef, useEffect } from 'react';

interface CustomSelectOption {
    value: string;
    name: string;
}

interface CustomSelectProps {
    label: string;
    options: CustomSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, options, value, onChange, placeholder = "Seleccionar..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <div className="mt-1 relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between w-full bg-white dark:bg-white border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-slate-900 text-left"
                    style={{ minHeight: '42px' }} // Same height as input
                >
                    <span className={selectedOption ? 'text-slate-900' : 'text-slate-500'}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                    <span className="material-symbols-outlined text-slate-400 pointer-events-none">unfold_more</span>
                </button>

                {isOpen && (
                    <div className="border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-md shadow-lg mt-1 absolute z-10 w-full">
                        <ul className="max-h-48 overflow-y-auto">
                            {options.map(option => (
                                <li
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={`p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${value === option.value ? 'font-semibold bg-slate-100 dark:bg-slate-700' : 'text-slate-800 dark:text-slate-200'}`}
                                >
                                    {option.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomSelect;