import React, { useState, useEffect, useCallback } from 'react';
import UserManagement from './settings/UserManagement';
import TeamManagement from './settings/TeamManagement';
import IndustryManagement from './settings/IndustryManagement';
import PipelineManagement from './settings/PipelineManagement';

const initialTheme = {
  // Global & Typography
  '--color-primary': '#D7FE03',
  '--color-accent': '#83AF3B',
  '--color-background': '#F5F5F8',
  '--color-surface': '#FFFFFF',
  '--color-on-surface': '#1F2937',
  '--color-on-surface-secondary': '#6B7280',
  '--color-border': '#E5E7EB',
  '--font-sans': "'Inter', sans-serif",
  '--font-size-base': '16px',

  // Borders & Shadows
  '--border-radius': '0.5rem',
  '--card-shadow': '0 1px 2px 0 rgb(0 0 0 / 0.05)',

  // Buttons
  '--color-button-primary-bg': '#D7FE03',
  '--color-button-primary-text': '#1F2937',
  '--color-button-accent-bg': '#83AF3B',
  '--color-button-accent-text': '#FFFFFF',
  '--color-button-default-bg': '#FFFFFF',
  '--color-button-default-text': '#1F2937',
  '--color-button-default-border': '#E5E7EB',
  '--button-border-radius': '0.5rem',
  
  // Cards
  '--card-bg': '#FFFFFF',
  '--card-border-color': '#E5E7EB',
  '--card-border-width': '1px',

  // Forms
  '--form-input-bg': '#F3F4F6',
  '--form-input-border-color': '#E5E7EB',
  '--form-input-focus-ring-color': '#D7FE03',
};


type Theme = typeof initialTheme;

const FONT_OPTIONS = [
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Lato', value: "'Lato', sans-serif" },
  { name: 'Sistema (Helvetica)', value: "'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif" },
];

const SHADOW_OPTIONS = [
    { name: 'Ninguna', value: 'none' },
    { name: 'Pequeña (sm)', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)'},
    { name: 'Mediana (md)', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'},
    { name: 'Grande (lg)', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'},
]

// --- NEW PREVIEW COMPONENT ---
const ThemePreview: React.FC = () => {
    return (
        <div className="p-6 bg-background rounded-xl border border-border space-y-6">
            <h3 className="text-lg font-bold text-on-surface">Vista Previa en Vivo</h3>
            
            <div className="bg-surface p-4 rounded-lg">
                <h4 className="font-bold text-on-surface">Ejemplo de Tarjeta</h4>
                <p className="text-sm text-on-surface-secondary mt-1">
                    Este es un texto secundario dentro de una tarjeta.
                </p>
                
                <div className="flex flex-wrap gap-2 mt-4">
                    <button className="bg-primary font-semibold py-2 px-4 text-sm">
                        Botón Primario
                    </button>
                    <button className="bg-accent font-semibold py-2 px-4 text-sm">
                        Botón de Acento
                    </button>
                    <button className="bg-surface border font-semibold py-2 px-4 text-sm">
                        Botón Default
                    </button>
                </div>
                
                <div className="mt-4">
                    <label className="block text-sm font-medium text-on-surface-secondary mb-1">
                        Campo de Formulario
                    </label>
                    <input 
                        type="text" 
                        placeholder="Escribe algo..." 
                        className="w-full"
                    />
                </div>
            </div>
            
            <div>
                <h1 className="text-xl font-bold text-on-surface">Tipografía Principal</h1>
                <p className="text-on-surface-secondary mt-1">
                    Este es un párrafo de ejemplo para mostrar la fuente y el color del texto.
                </p>
            </div>
        </div>
    );
};


// --- Sub-Pages ---

const SecuritySettings = () => {
    const [maxAttempts, setMaxAttempts] = useState(5);
    const [lockoutTime, setLockoutTime] = useState(15);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-on-surface">Política de Inicio de Sesión</h2>
                <p className="text-on-surface-secondary mt-1">Define los parámetros de seguridad para el inicio de sesión de todos los usuarios.</p>
            </div>
            <div className="bg-surface p-6 rounded-xl shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="max-attempts" className="block text-sm font-medium text-on-surface-secondary">Número máximo de intentos fallidos</label>
                        <input
                            type="number"
                            id="max-attempts"
                            value={maxAttempts}
                            onChange={e => setMaxAttempts(Number(e.target.value))}
                        />
                        <p className="mt-2 text-xs text-on-surface-secondary">Después de este número de intentos, la cuenta se bloqueará.</p>
                    </div>
                    <div>
                        <label htmlFor="lockout-time" className="block text-sm font-medium text-on-surface-secondary">Tiempo de bloqueo de la cuenta (minutos)</label>
                        <input
                            type="number"
                            id="lockout-time"
                            value={lockoutTime}
                            onChange={e => setLockoutTime(Number(e.target.value))}
                        />
                         <p className="mt-2 text-xs text-on-surface-secondary">La cuenta permanecerá bloqueada durante este tiempo.</p>
                    </div>
                </div>
                 <div className="border-t mt-6 pt-4 flex justify-end">
                    <button className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">
                        Guardar Política de Seguridad
                    </button>
                </div>
            </div>
        </div>
    );
};

const ColorControl: React.FC<{ label: string; color: string; onChange: (color: string) => void; }> = ({ label, color, onChange }) => {
    const id = `color-picker-${label.replace(/\s+/g, '-')}`;
    return (
        <div>
            <label htmlFor={id} className="text-sm text-on-surface-secondary mb-1 block">{label}</label>
            <div className="flex items-center gap-2 border border-border p-2 rounded-lg bg-surface-inset">
                <div className="relative w-8 h-8">
                    <input
                        type="color"
                        id={id}
                        value={color}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div
                        className="w-full h-full rounded-md border border-border"
                        style={{ backgroundColor: color }}
                    ></div>
                </div>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full bg-transparent focus:outline-none font-mono text-sm"
                />
            </div>
        </div>
    );
};

const RangeControl: React.FC<{ label: string, value: string, onChange: (value: string) => void, min: number, max: number, step: number, unit: string }> = 
({ label, value, onChange, min, max, step, unit }) => (
     <div>
        <label className="text-sm text-on-surface-secondary mb-1 block">{label} ({value})</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={parseFloat(value)}
            onChange={e => onChange(`${e.target.value}${unit}`)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
        />
    </div>
);

const SelectControl: React.FC<{ label: string, value: string, onChange: (value: string) => void, options: {name: string, value: string}[] }> = 
({ label, value, onChange, options }) => (
    <div>
        <label className="text-sm text-on-surface-secondary mb-1 block">{label}</label>
        <select 
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-surface-inset border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none text-sm"
        >
            {options.map(opt => (
            <option key={opt.name} value={opt.value}>{opt.name}</option>
            ))}
        </select>
    </div>
);

const AccordionItem: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; onToggle: () => void; }> = ({ title, children, isOpen, onToggle }) => (
    <div className="border-b border-border last:border-b-0">
        <button onClick={onToggle} className="w-full flex justify-between items-center py-4 text-left">
            <h4 className="font-semibold text-lg text-on-surface">{title}</h4>
            <span className={`material-symbols-outlined transition-transform text-on-surface-secondary ${isOpen ? 'rotate-90' : ''}`}>chevron_right</span>
        </button>
        {isOpen && <div className="pb-6 pt-2">{children}</div>}
    </div>
);


const AppearanceSettings = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const savedTheme = localStorage.getItem('crm-theme');
            return savedTheme ? { ...initialTheme, ...JSON.parse(savedTheme) } : initialTheme;
        } catch (error) {
            console.error("Failed to parse theme from localStorage", error);
            return initialTheme;
        }
    });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [openAccordion, setOpenAccordion] = useState<string | null>('colors');


    useEffect(() => {
        // Apply theme changes in real-time for live preview
        for (const key in theme) {
            document.documentElement.style.setProperty(key, theme[key as keyof Theme]);
        }
    }, [theme]);

    const handleThemeChange = (key: keyof Theme, value: string) => {
        setTheme(prevTheme => ({ ...prevTheme, [key]: value }));
        if (saveStatus === 'saved') {
            setSaveStatus('idle');
        }
    };
    
    const handleSave = () => {
        setSaveStatus('saving');
        try {
            localStorage.setItem('crm-theme', JSON.stringify(theme));
            setTimeout(() => {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            }, 500);
        } catch (error) {
            console.error("Failed to save theme to localStorage", error);
            setSaveStatus('idle');
        }
    }

    const handleReset = () => {
        localStorage.removeItem('crm-theme');
        setTheme(initialTheme);
        setSaveStatus('idle');
    }

    const getSaveButtonText = () => {
        switch(saveStatus) {
            case 'saving': return 'Guardando...';
            case 'saved': return '¡Guardado!';
            default: return 'Guardar Cambios';
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-on-surface">Apariencia</h2>
                  <p className="text-on-surface-secondary mt-1">Personaliza la apariencia de la aplicación. Los cambios se aplican en vivo.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="bg-surface border border-border text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-background">
                        Restablecer
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                        className={`bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${saveStatus === 'saved' ? '!bg-green-500' : ''}`}
                    >
                        <span className="material-symbols-outlined mr-2">{saveStatus === 'saved' ? 'check_circle' : 'save'}</span>
                        {getSaveButtonText()}
                    </button>
                </div>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="bg-surface rounded-xl shadow-sm p-6">
                    <AccordionItem title="Colores Globales y Tipografía" isOpen={openAccordion === 'colors'} onToggle={() => setOpenAccordion(openAccordion === 'colors' ? null : 'colors')}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ColorControl label="Primario" color={theme['--color-primary']} onChange={c => handleThemeChange('--color-primary', c)} />
                            <ColorControl label="Acento" color={theme['--color-accent']} onChange={c => handleThemeChange('--color-accent', c)} />
                            <ColorControl label="Fondo" color={theme['--color-background']} onChange={c => handleThemeChange('--color-background', c)} />
                            <ColorControl label="Superficie" color={theme['--color-surface']} onChange={c => handleThemeChange('--color-surface', c)} />
                            <ColorControl label="Texto Principal" color={theme['--color-on-surface']} onChange={c => handleThemeChange('--color-on-surface', c)} />
                            <ColorControl label="Texto Secundario" color={theme['--color-on-surface-secondary']} onChange={c => handleThemeChange('--color-on-surface-secondary', c)} />
                            <ColorControl label="Bordes" color={theme['--color-border']} onChange={c => handleThemeChange('--color-border', c)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                            <SelectControl label="Fuente Principal" value={theme['--font-sans']} onChange={v => handleThemeChange('--font-sans', v)} options={FONT_OPTIONS} />
                            <RangeControl label="Tamaño de Fuente Base" value={theme['--font-size-base']} onChange={v => handleThemeChange('--font-size-base', v)} min={12} max={20} step={1} unit="px" />
                        </div>
                    </AccordionItem>
                    <AccordionItem title="Botones" isOpen={openAccordion === 'buttons'} onToggle={() => setOpenAccordion(openAccordion === 'buttons' ? null : 'buttons')}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ColorControl label="Primario (Fondo)" color={theme['--color-button-primary-bg']} onChange={c => handleThemeChange('--color-button-primary-bg', c)} />
                            <ColorControl label="Primario (Texto)" color={theme['--color-button-primary-text']} onChange={c => handleThemeChange('--color-button-primary-text', c)} />
                            <ColorControl label="Acento (Fondo)" color={theme['--color-button-accent-bg']} onChange={c => handleThemeChange('--color-button-accent-bg', c)} />
                            <ColorControl label="Acento (Texto)" color={theme['--color-button-accent-text']} onChange={c => handleThemeChange('--color-button-accent-text', c)} />
                            <ColorControl label="Default (Fondo)" color={theme['--color-button-default-bg']} onChange={c => handleThemeChange('--color-button-default-bg', c)} />
                            <ColorControl label="Default (Texto)" color={theme['--color-button-default-text']} onChange={c => handleThemeChange('--color-button-default-text', c)} />
                            <ColorControl label="Default (Borde)" color={theme['--color-button-default-border']} onChange={c => handleThemeChange('--color-button-default-border', c)} />
                        </div>
                        <div className="mt-6 pt-6 border-t">
                            <RangeControl label="Radio del Borde del Botón" value={theme['--button-border-radius']} onChange={v => handleThemeChange('--button-border-radius', v)} min={0} max={2} step={0.1} unit="rem" />
                        </div>
                    </AccordionItem>
                    <AccordionItem title="Tarjetas y Superficies" isOpen={openAccordion === 'cards'} onToggle={() => setOpenAccordion(openAccordion === 'cards' ? null : 'cards')}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ColorControl label="Fondo de Tarjeta" color={theme['--card-bg']} onChange={c => handleThemeChange('--card-bg', c)} />
                            <ColorControl label="Borde de Tarjeta" color={theme['--card-border-color']} onChange={c => handleThemeChange('--card-border-color', c)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
                            <RangeControl label="Ancho del Borde" value={theme['--card-border-width']} onChange={v => handleThemeChange('--card-border-width', v)} min={0} max={5} step={1} unit="px" />
                            <RangeControl label="Radio del Borde" value={theme['--border-radius']} onChange={v => handleThemeChange('--border-radius', v)} min={0} max={2} step={0.1} unit="rem" />
                            <SelectControl label="Sombra de Tarjeta" value={theme['--card-shadow']} onChange={v => handleThemeChange('--card-shadow', v)} options={SHADOW_OPTIONS} />
                        </div>
                    </AccordionItem>
                    <AccordionItem title="Formularios" isOpen={openAccordion === 'forms'} onToggle={() => setOpenAccordion(openAccordion === 'forms' ? null : 'forms')}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <ColorControl label="Fondo de Input" color={theme['--form-input-bg']} onChange={c => handleThemeChange('--form-input-bg', c)} />
                            <ColorControl label="Borde de Input" color={theme['--form-input-border-color']} onChange={c => handleThemeChange('--form-input-border-color', c)} />
                            <ColorControl label="Anillo de Foco" color={theme['--form-input-focus-ring-color']} onChange={c => handleThemeChange('--form-input-focus-ring-color', c)} />
                        </div>
                    </AccordionItem>
                </div>
                 <div className="lg:sticky lg:top-8">
                    <ThemePreview />
                </div>
            </div>
        </div>
    );
};

// --- Main Settings Page ---

const SETTINGS_NAV = [
    {
        group: 'Personal',
        links: [
            { id: 'apariencia', name: 'Apariencia', icon: 'palette' },
            { id: 'notificaciones', name: 'Notificaciones', icon: 'notifications' },
        ]
    },
    {
        group: 'Administración de la Plataforma',
        links: [
            { id: 'usuarios', name: 'Usuarios y Permisos', icon: 'manage_accounts' },
            { id: 'equipos', name: 'Equipos', icon: 'groups' },
            { id: 'seguridad', name: 'Seguridad', icon: 'security' },
            { id: 'industrias', name: 'Industrias', icon: 'factory' },
            { id: 'pipelines', name: 'Etapas de Venta', icon: 'mediation' },
            { id: 'integraciones', name: 'Integraciones', icon: 'integration_instructions' },
        ]
    }
];

const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('apariencia');

    const renderContent = () => {
        switch (activeTab) {
            case 'apariencia':
                return <AppearanceSettings />;
            case 'usuarios':
                return <UserManagement />;
            case 'equipos':
                return <TeamManagement />;
            case 'seguridad':
                return <SecuritySettings />;
            case 'industrias':
                return <IndustryManagement />;
            case 'pipelines':
                return <PipelineManagement />;
            case 'notificaciones':
                 return <div><h2 className="text-2xl font-bold">Notificaciones</h2><p className="text-on-surface-secondary mt-4">Página de configuración de notificaciones próximamente.</p></div>;
            case 'integraciones':
                return <div><h2 className="text-2xl font-bold">Integraciones</h2><p className="text-on-surface-secondary mt-4">Página de gestión de integraciones próximamente.</p></div>;
            default:
                return null;
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
                <h1 className="text-2xl font-bold mb-6 px-3">Configuración</h1>
                <nav className="space-y-6">
                     {SETTINGS_NAV.map(group => (
                        <div key={group.group}>
                            <h2 className="px-3 text-xs font-bold uppercase text-on-surface-secondary tracking-wider mb-2">{group.group}</h2>
                            <div className="space-y-1">
                                {group.links.map(link => (
                                    <button 
                                        key={link.id}
                                        onClick={() => setActiveTab(link.id)} 
                                        className={`w-full flex items-center p-3 rounded-lg text-left font-medium transition-colors duration-200 ${activeTab === link.id ? 'bg-primary/20 text-accent' : 'hover:bg-surface text-on-surface'}`}
                                    >
                                        <span className="material-symbols-outlined mr-3">{link.icon}</span>
                                        <span>{link.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>
            <div className="md:col-span-3">
                {renderContent()}
            </div>
        </div>
    );
};

export default SettingsPage;