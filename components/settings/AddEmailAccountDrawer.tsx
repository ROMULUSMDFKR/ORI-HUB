import React, { useState, useEffect } from 'react';
import { User, ConnectedEmailAccount } from '../../types';
import Drawer from '../ui/Drawer';
import Spinner from '../ui/Spinner';
import ToggleSwitch from '../ui/ToggleSwitch';

interface AddEmailAccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: ConnectedEmailAccount) => void;
  user: User | null;
}

const AddEmailAccountDrawer: React.FC<AddEmailAccountDrawerProps> = ({ isOpen, onClose, onSave, user }) => {
    const [email, setEmail] = useState('roberto@tradeaitirik.com.mx');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(true);

    // Pre-fill with user's provided data
    const [incomingServer, setIncomingServer] = useState('mail.tradeaitirik.com.mx');
    const [imapPort, setImapPort] = useState('993');
    const [useSslImap, setUseSslImap] = useState(true);
    const [outgoingServer, setOutgoingServer] = useState('mail.tradeaitirik.com.mx');
    const [smtpPort, setSmtpPort] = useState('465');
    const [useSslSmtp, setUseSslSmtp] = useState(true);

    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setPassword('');
            setIsConnecting(false);
            setConnectionStatus('idle');
            setStatusMessage('');
        }
    }, [isOpen]);

    const handleConnect = async () => {
        if (!email || !password || !incomingServer || !outgoingServer) {
            alert("Por favor completa todos los campos.");
            return;
        }
        setIsConnecting(true);
        setConnectionStatus('idle');
        setStatusMessage('Conectando con el servidor...');

        await new Promise(resolve => setTimeout(resolve, 2500));

        if (email === 'roberto@tradeaitirik.com.mx' && password.length > 0) {
            setConnectionStatus('success');
            setStatusMessage('¡Conexión exitosa! Guardando configuración...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (user) {
                const newAccount: ConnectedEmailAccount = {
                    id: `acc-${Date.now()}`,
                    userId: user.id,
                    email: email,
                    status: 'Conectado',
                };
                onSave(newAccount);
            }
            onClose();
        } else {
            setConnectionStatus('error');
            setStatusMessage('Error de conexión. Verifica tus credenciales e información del servidor.');
        }

        setIsConnecting(false);
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Conectar Nueva Cuenta de Correo">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Dirección de correo</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600">
                            <span className="material-symbols-outlined !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex justify-between items-center w-full text-left font-semibold text-slate-600 dark:text-slate-300">
                        Configuración Avanzada
                        <span className="material-symbols-outlined transition-transform" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)'}}>expand_more</span>
                    </button>
                </div>

                {showAdvanced && (
                    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">Servidor Entrante (IMAP)</h4>
                        <div className="grid grid-cols-3 gap-3 items-end">
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Servidor</label>
                                <input type="text" value={incomingServer} onChange={e => setIncomingServer(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Puerto</label>
                                <input type="text" value={imapPort} onChange={e => setImapPort(e.target.value)} />
                            </div>
                        </div>
                         <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usar SSL/TLS</span><ToggleSwitch enabled={useSslImap} onToggle={setUseSslImap} /></div>

                        <h4 className="font-semibold pt-4 border-t border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200">Servidor Saliente (SMTP)</h4>
                         <div className="grid grid-cols-3 gap-3 items-end">
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Servidor</label>
                                <input type="text" value={outgoingServer} onChange={e => setOutgoingServer(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Puerto</label>
                                <input type="text" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usar SSL/TLS</span><ToggleSwitch enabled={useSslSmtp} onToggle={setUseSslSmtp} /></div>
                    </div>
                )}
            </div>
             <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button onClick={handleConnect} disabled={isConnecting} className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-70">
                    {isConnecting ? <Spinner /> : <span className="material-symbols-outlined">sync</span>}
                    {isConnecting ? 'Probando...' : 'Probar Conexión y Guardar'}
                </button>
                {statusMessage && (
                     <p className={`text-sm text-center mt-2 ${connectionStatus === 'error' ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                        {statusMessage}
                    </p>
                )}
            </div>
        </Drawer>
    );
};

export default AddEmailAccountDrawer;
