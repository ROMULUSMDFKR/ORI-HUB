import React, { useState, useRef, useEffect } from 'react';

interface CustomSelectOption {
    value: string;
    name: string;
}

// Add a type for a separator object
interface SeparatorOption {
    isSeparator: true;
    value?: never; // Ensure it's just a separator
    name?: never;
}

type SelectOption = CustomSelectOption | SeparatorOption;

interface CustomSelectProps {
    label?: string;
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    buttonClassName?: string;
    dropdownClassName?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, options, value, onChange, placeholder = "Seleccionar...", buttonClassName, dropdownClassName }) => {
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

    const selectedOption = options.find(opt => 'value' in opt && opt.value === value) as CustomSelectOption | undefined;

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const defaultButtonClasses = "flex items-center justify-between w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm font-medium text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500";
    const defaultDropdownClasses = "border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg shadow-lg mt-1 absolute z-20 w-full py-1";


    return (
        <div ref={dropdownRef} className="relative w-full">
            {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={buttonClassName || defaultButtonClasses}
                    style={{ minHeight: '42px' }}
                >
                    <span className={selectedOption ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                    <span className="material-symbols-outlined text-slate-400 pointer-events-none transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}}>expand_more</span>
                </button>

                {isOpen && (
                    <div className={dropdownClassName || defaultDropdownClasses}>
                        <ul className="max-h-60 overflow-y-auto">
                            {options.map((option, index) => {
                                if ('isSeparator' in option && option.isSeparator) {
                                    return <hr key={`separator-${index}`} className="my-1 border-slate-200 dark:border-slate-600" />;
                                }
                                const opt = option as CustomSelectOption;
                                return (
                                    <li
                                        key={opt.value}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${value === opt.value ? 'font-semibold bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}
                                    >
                                        {opt.name}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomSelect;