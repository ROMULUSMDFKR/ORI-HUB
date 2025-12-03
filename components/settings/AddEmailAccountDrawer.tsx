
import React, { useState, useEffect } from 'react';
import { User, ConnectedEmailAccount } from '../../types';
import Drawer from '../ui/Drawer';
import Spinner from '../ui/Spinner';

interface AddEmailAccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: ConnectedEmailAccount) => void;
  user: User | null;
  initialData?: ConnectedEmailAccount | null; // New prop for editing
}

const AddEmailAccountDrawer: React.FC<AddEmailAccountDrawerProps> = ({ isOpen, onClose, onSave, user, initialData }) => {
    // Nylas Config
    const [grantId, setGrantId] = useState('');
    const [apiKey, setApiKey] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData && initialData.nylasConfig) {
                // Edit Mode
                setGrantId(initialData.nylasConfig.grantId || '');
                setApiKey(initialData.nylasConfig.apiKey || '');
            } else {
                // Create Mode
                setGrantId('');
                setApiKey('');
            }
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        // TRIM INPUTS
        const cleanGrantId = grantId.trim();
        const cleanApiKey = apiKey.trim();

        if (!cleanGrantId || !cleanApiKey) {
            alert("Por favor ingresa el Grant ID y la API Key de Nylas.");
            return;
        }

        setIsSaving(true);
        
        let emailToSave = '';
        let verificationFailed = false;
        
        // Verify Nylas Credentials (Basic check)
        try {
            const response = await fetch(`https://api.us.nylas.com/v3/grants/${cleanGrantId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${cleanApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Nylas API Error Details:", JSON.stringify(errorData, null, 2)); 
                const errorMessage = errorData.message || errorData.requestId || response.statusText || 'Credenciales inválidas';
                throw new Error(`Error ${response.status}: ${errorMessage}`);
            }
            
            const data = await response.json();
            emailToSave = data.data.email; 

        } catch (error: any) {
            console.error("Nylas Error:", error);
            verificationFailed = true;
            
            const proceed = window.confirm(
                `No se pudo verificar la conexión con Nylas.\n\nDetalle: ${error.message}\n\n¿Deseas guardar estas credenciales de todas formas? (Esto puede causar errores al leer correos)`
            );

            if (!proceed) {
                setIsSaving(false);
                return;
            }

            emailToSave = initialData?.email || user?.email || 'cuenta-nylas@pendiente.com';
        }

        if (user) {
            const newAccount: ConnectedEmailAccount = {
                id: initialData?.id || `acc-${Date.now()}`, // Keep ID if editing
                userId: user.id,
                email: emailToSave,
                status: verificationFailed ? 'Error de autenticación' : 'Conectado',
                provider: 'nylas',
                nylasConfig: {
                    grantId: cleanGrantId,
                    apiKey: cleanApiKey
                },
                signatureTemplate: initialData?.signatureTemplate || '' // Preserve existing settings or default to empty string
            };
            
            onSave(newAccount);
        }
        
        setIsSaving(false);
        onClose();
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Conexión" : "Conectar Cuenta de Correo"} size="lg">
            <div className="space-y-8">
                
                {/* NYLAS SECTION (Reading & Sync) */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-6 rounded-xl text-white shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                                <span className="material-symbols-outlined text-3xl">cloud_sync</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Conexión Nylas v3</h3>
                                <p className="text-blue-50 text-sm leading-relaxed">
                                    {initialData 
                                        ? "Actualiza las credenciales si la conexión ha fallado o expirado." 
                                        : "Ingresa las credenciales de tu aplicación Nylas para sincronizar la bandeja de entrada."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">key</span>
                            Credenciales
                        </h4>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nylas API Key</label>
                            <input 
                                type="password" 
                                value={apiKey} 
                                onChange={e => setApiKey(e.target.value)} 
                                className="block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="nyk_v1_..."
                            />
                             <p className="text-xs text-slate-500 mt-1">Obtenla en Nylas Dashboard &gt; Developer Settings.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Grant ID (ID de Cuenta)</label>
                            <input 
                                type="text" 
                                value={grantId} 
                                onChange={e => setGrantId(e.target.value)} 
                                className="block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                placeholder="e.g. 85800b..."
                            />
                            <p className="text-xs text-slate-500 mt-1">El ID generado al autenticar la cuenta de correo en Nylas.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                    <strong>Nota sobre el envío:</strong>
                    <p className="mt-2 text-xs">
                        El sistema utilizará la configuración global de <b>MailerSend</b> para los envíos salientes. Asegúrate de que el dominio de este correo esté verificado en tu cuenta de MailerSend.
                    </p>
                </div>

                {/* Footer Action */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Spinner /> : <span className="material-symbols-outlined text-2xl">save</span>}
                        <span>{isSaving ? 'Verificando...' : (initialData ? 'Actualizar Credenciales' : 'Conectar Cuenta')}</span>
                    </button>
                </div>

            </div>
        </Drawer>
    );
};

export default AddEmailAccountDrawer;
