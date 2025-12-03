
import React, { useState, useEffect } from 'react';
import { api } from '../../api/firebaseApi';
import Spinner from '../../components/ui/Spinner';
import ToggleSwitch from '../../components/ui/ToggleSwitch';

const Net2PhoneSettingsPage: React.FC = () => {
    const [config, setConfig] = useState({
        enabled: false,
        apiKey: '',
        sipUser: '',
        sipPassword: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const data = await api.getDoc('settings', 'net2phone');
                if (data) setConfig(data as any);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.setDoc('settings', 'net2phone', config);
            alert('Configuración guardada correctamente.');
        } catch (e) {
            console.error(e);
            alert('Error al guardar configuración.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Integración Net2Phone</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Configura tu cuenta de VoIP para realizar llamadas directamente desde el CRM.</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? <Spinner /> : <span className="material-symbols-outlined">save</span>}
                    Guardar
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">call</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Habilitar Llamadas</h3>
                                    <p className="text-sm text-slate-500">Activa el marcador (softphone) en la interfaz.</p>
                                </div>
                            </div>
                            <ToggleSwitch enabled={config.enabled} onToggle={() => setConfig({...config, enabled: !config.enabled})} />
                        </div>

                        <div className={`space-y-6 transition-opacity ${config.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Key (Token v2)</label>
                                <input 
                                    type="password" 
                                    value={config.apiKey} 
                                    onChange={e => setConfig({...config, apiKey: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="n2p_..."
                                />
                                <p className="text-xs text-slate-500 mt-1">Se obtiene en Configuración &gt; API Keys (Selecciona 'public_api.v2').</p>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-500">dialpad</span>
                                    Credenciales SIP (Voz)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario SIP</label>
                                        <input 
                                            type="text" 
                                            value={config.sipUser} 
                                            onChange={e => setConfig({...config, sipUser: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Ej: 4532123x101"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña SIP</label>
                                        <input 
                                            type="password" 
                                            value={config.sipPassword} 
                                            onChange={e => setConfig({...config, sipPassword: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-5 rounded-xl">
                        <h4 className="font-bold text-blue-800 dark:text-blue-200 text-sm mb-3 flex items-center gap-2">
                             <span className="material-symbols-outlined">help</span>
                             ¿Dónde encuentro esto?
                        </h4>
                        <ul className="space-y-3 text-xs text-blue-800 dark:text-blue-300">
                            <li className="flex gap-2">
                                <span className="font-bold bg-blue-200 dark:bg-blue-800 w-5 h-5 flex items-center justify-center rounded-full shrink-0">1</span>
                                <span>Entra al portal de administración de Net2Phone.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold bg-blue-200 dark:bg-blue-800 w-5 h-5 flex items-center justify-center rounded-full shrink-0">2</span>
                                <span>Ve a la sección <b>Usuarios</b> o <b>Extensiones</b>.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold bg-blue-200 dark:bg-blue-800 w-5 h-5 flex items-center justify-center rounded-full shrink-0">3</span>
                                <span>Selecciona tu usuario y busca la pestaña <b>Teléfonos</b> o <b>Dispositivos</b>.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold bg-blue-200 dark:bg-blue-800 w-5 h-5 flex items-center justify-center rounded-full shrink-0">4</span>
                                <span>Ahí verás el "SIP Username" y "SIP Password" (Secret).</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2">Nota Importante</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Estas credenciales se guardan a nivel global para esta demostración. En un entorno de producción real, cada usuario debería configurar sus propias credenciales SIP en su perfil personal.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Net2PhoneSettingsPage;
