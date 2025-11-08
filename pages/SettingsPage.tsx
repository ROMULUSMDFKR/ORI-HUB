import React, { useState, useEffect, useCallback } from 'react';
import UserManagement from './settings/UserManagement';
import TeamManagement from './settings/TeamManagement';
import IndustryManagement from './settings/IndustryManagement';
import PipelineManagement from './settings/PipelineManagement';

const initialTheme = {
  '--color-primary': '#D7FE03',
  '--color-accent': '#83AF3B',
  '--color-on-primary': '#1F2937',
  '--color-background': '#F5F5F8',
  '--color-surface': '#FFFFFF',
  '--color-on-surface': '#1F2937',
  '--color-on-surface-secondary': '#6B7280',
  '--color-border': '#E5E7EB',
  '--font-sans': "'Inter', sans-serif",
  '--font-size-base': '16px',
  '--border-radius': '0.5rem',
  '--button-border-radius': '0.5rem',
};

type Theme = typeof initialTheme;

const FONT_OPTIONS = [
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Lato', value: "'Lato', sans-serif" },
  { name: 'Sistema (Helvetica)', value: "'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif" },
];


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
                            className="mt-1 block w-full bg-surface-inset border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none"
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
                            className="mt-1 block w-full bg-surface-inset border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none"
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

const ColorInput: React.FC<{ label: string; color: string; onChange: (color: string) => void; }> = ({ label, color, onChange }) => {
    const id = `color-picker-${label.replace(' ', '-')}`;
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
                        className="w-8 h-8 rounded-md border border-border"
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

const ThemePreview = () => (
  <div className="bg-background p-6 rounded-xl border border-border space-y-4 sticky top-8">
    <h3 className="text-lg font-bold text-on-surface">Vista Previa</h3>
    <div className="bg-surface p-4 rounded-lg shadow-md space-y-3">
      <h4 className="text-xl font-bold text-on-surface">Tarjeta de Ejemplo</h4>
      <p className="text-sm text-on-surface-secondary">
        Este es un texto de ejemplo para mostrar cómo se ve la tipografía y los colores en una superficie.
      </p>
      <button className="bg-primary text-on-primary font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 transition-opacity">
        Botón Primario
      </button>
      <button className="bg-accent text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 transition-opacity ml-2">
        Botón de Acento
      </button>
    </div>
  </div>
);


const AppearanceSettings = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const savedTheme = localStorage.getItem('crm-theme');
            return savedTheme ? JSON.parse(savedTheme) : initialTheme;
        } catch (error) {
            console.error("Failed to parse theme from localStorage", error);
            return initialTheme;
        }
    });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');


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
                  <p className="text-on-surface-secondary mt-1">Personaliza la apariencia de la aplicación. Los cambios se previsualizan en vivo.</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                    className={`bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${saveStatus === 'saved' ? '!bg-green-500' : ''}`}
                >
                    <span className="material-symbols-outlined mr-2">{saveStatus === 'saved' ? 'check_circle' : 'save'}</span>
                    {getSaveButtonText()}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-surface p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Paleta de Colores</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <ColorInput label="Primario" color={theme['--color-primary']} onChange={c => handleThemeChange('--color-primary', c)} />
                            <ColorInput label="Acento" color={theme['--color-accent']} onChange={c => handleThemeChange('--color-accent', c)} />
                            <ColorInput label="Fondo" color={theme['--color-background']} onChange={c => handleThemeChange('--color-background', c)} />
                            <ColorInput label="Superficie" color={theme['--color-surface']} onChange={c => handleThemeChange('--color-surface', c)} />
                            <ColorInput label="Texto en Primario" color={theme['--color-on-primary']} onChange={c => handleThemeChange('--color-on-primary', c)} />
                            <ColorInput label="Texto Principal" color={theme['--color-on-surface']} onChange={c => handleThemeChange('--color-on-surface', c)} />
                            <ColorInput label="Texto Secundario" color={theme['--color-on-surface-secondary']} onChange={c => handleThemeChange('--color-on-surface-secondary', c)} />
                            <ColorInput label="Bordes" color={theme['--color-border']} onChange={c => handleThemeChange('--color-border', c)} />
                        </div>
                    </div>
                     <div className="bg-surface p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Tipografía y Diseño</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm text-on-surface-secondary mb-1 block">Fuente Principal</label>
                                <select 
                                    value={theme['--font-sans']}
                                    onChange={e => handleThemeChange('--font-sans', e.target.value)}
                                    className="w-full bg-surface-inset border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                >
                                    {FONT_OPTIONS.map(font => (
                                    <option key={font.name} value={font.value}>{font.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-on-surface-secondary mb-1 block">Tamaño de Fuente Base ({parseInt(theme['--font-size-base'])}px)</label>
                                <input
                                    type="range"
                                    min="12"
                                    max="20"
                                    step="1"
                                    value={parseInt(theme['--font-size-base'])}
                                    onChange={e => handleThemeChange('--font-size-base', `${e.target.value}px`)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-on-surface-secondary mb-1 block">Radio del Borde ({parseFloat(theme['--border-radius']).toFixed(1)}rem)</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={parseFloat(theme['--border-radius'])}
                                    onChange={e => handleThemeChange('--border-radius', `${e.target.value}rem`)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-on-surface-secondary mb-1 block">Radio del Borde del Botón ({parseFloat(theme['--button-border-radius']).toFixed(1)}rem)</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={parseFloat(theme['--button-border-radius'])}
                                    onChange={e => handleThemeChange('--button-border-radius', `${e.target.value}rem`)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="lg:col-span-1 space-y-6">
                    <ThemePreview />
                    <div className="bg-surface p-4 rounded-xl shadow-sm">
                        <button onClick={handleReset} className="w-full bg-surface border border-border text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-background transition-colors">
                            Restablecer a Predeterminado
                        </button>
                    </div>
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