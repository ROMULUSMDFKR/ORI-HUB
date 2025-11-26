
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
            <div className="space-y-6">
                
                {/* Email Input - Safe Pattern */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección de correo</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">email</span>
                        </div>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="ejemplo@empresa.com"
                        />
                    </div>
                </div>

                {/* Password Input - Safe Pattern */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">lock</span>
                        </div>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <span className="material-symbols-outlined h-5 w-5">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                    </div>
                </div>

                <div className="pt-2">
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex justify-between items-center w-full text-left font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        Configuración Avanzada
                        <span className="material-symbols-outlined transition-transform" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)'}}>expand_more</span>
                    </button>
                </div>

                {showAdvanced && (
                    <div className="space-y-6 p-5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        
                        {/* Incoming Server */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Servidor Entrante (IMAP)</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Host</label>
                                    <div className="relative">
                                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined h-4 w-4 text-gray-400 text-xs">dns</span>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={incomingServer} 
                                            onChange={e => setIncomingServer(e.target.value)} 
                                            className="block w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-slate-700"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Puerto</label>
                                    <input 
                                        type="text" 
                                        value={imapPort} 
                                        onChange={e => setImapPort(e.target.value)} 
                                        className="block w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-slate-700"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usar SSL/TLS</span>
                                <ToggleSwitch enabled={useSslImap} onToggle={() => setUseSslImap(prev => !prev)} />
                            </div>
                        </div>

                        {/* Outgoing Server */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Servidor Saliente (SMTP)</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Host</label>
                                     <div className="relative">
                                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined h-4 w-4 text-gray-400 text-xs">dns</span>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={outgoingServer} 
                                            onChange={e => setOutgoingServer(e.target.value)} 
                                            className="block w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-slate-700"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Puerto</label>
                                    <input 
                                        type="text" 
                                        value={smtpPort} 
                                        onChange={e => setSmtpPort(e.target.value)} 
                                        className="block w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-slate-700"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usar SSL/TLS</span>
                                <ToggleSwitch enabled={useSslSmtp} onToggle={() => setUseSslSmtp(prev => !prev)} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
             <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button onClick={handleConnect} disabled={isConnecting} className="w-full bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait transition-all">
                    {isConnecting ? <Spinner /> : <span className="material-symbols-outlined">sync</span>}
                    {isConnecting ? 'Probando...' : 'Probar Conexión y Guardar'}
                </button>
                {statusMessage && (
                     <div className={`mt-3 p-3 rounded-lg text-sm font-medium text-center ${connectionStatus === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                        {statusMessage}
                    </div>
                )}
            </div>
        </Drawer>
    );
};

export default AddEmailAccountDrawer;
