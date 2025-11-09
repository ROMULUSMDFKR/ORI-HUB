
import React from 'react';

interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

const Checkbox: React.FC<CheckboxProps> = ({ id, checked, onChange, className = '', children }) => {
  return (
    <label htmlFor={id} className={`flex items-center cursor-pointer ${className}`}>
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors
            ${checked ? 'bg-accent border-accent' : 'bg-surface border-border'}`}
        >
          {checked && (
            <span className="material-symbols-outlined text-white" style={{ fontSize: '12px', fontWeight: 900 }}>
              check
            </span>
          )}
        </div>
      </div>
      {children && <div className="ml-2">{children}</div>}
    </label>
  );
};
export default Checkbox;
