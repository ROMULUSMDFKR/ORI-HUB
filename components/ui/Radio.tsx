

import React from 'react';

interface RadioProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: (value: any) => void;
  value: any;
  children?: React.ReactNode;
}

const Radio: React.FC<RadioProps> = ({ id, name, checked, onChange, value, children }) => {
  return (
    <label htmlFor={id} className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          id={id}
          type="radio"
          name={name}
          className="sr-only"
          checked={checked}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
            ${checked ? 'border-indigo-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'}`}
        >
          {checked && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
        </div>
      </div>
      {children && <div className="ml-2 text-sm text-slate-600 dark:text-slate-300">{children}</div>}
    </label>
  );
};

export default Radio;