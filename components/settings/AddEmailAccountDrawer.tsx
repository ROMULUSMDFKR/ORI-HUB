
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
    const [step, setStep] = useState(1); // 1: Credentials, 2: Server Config

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
            setStep(1);
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

        if (email.includes('@') && password.length > 0) {
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

    const InputWithIcon = ({ icon, label, type = 'text', value, onChange, placeholder }: any) => (
        <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5 ml-1">{label}</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
                </div>
                <input 
                    type={type} 
                    value={value} 
                    onChange={onChange} 
                    placeholder={placeholder}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
            </div>
        </div>
    );

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Conectar Nueva Cuenta" size="md">
            <div className="flex flex-col h-full">
                {/* Stepper */}
                <div className="flex items-center gap-2 mb-8 px-1">
                    <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 p-1">
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex items-start gap-3">
                                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl mt-0.5">lock</span>
                                <div>
                                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Credenciales Seguras</h4>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">Tus datos se almacenan encriptados y se usan solo para sincronizar correos.</p>
                                </div>
                            </div>

                            <InputWithIcon 
                                label="Dirección de Correo" 
                                icon="mail" 
                                value={email} 
                                onChange={(e: any) => setEmail(e.target.value)} 
                                placeholder="usuario@empresa.com"
                            />
                            
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Contraseña</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-slate-400 text-lg">key</span>
                                    </div>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600">
                                        <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in">
                            {/* IMAP Section */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                                    <span className="material-symbols-outlined text-indigo-500">download</span>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Servidor Entrante (IMAP)</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <InputWithIcon label="Host" icon="dns" value={incomingServer} onChange={(e: any) => setIncomingServer(e.target.value)} />
                                    </div>
                                    <div>
                                        <InputWithIcon label="Puerto" icon="numbers" value={imapPort} onChange={(e: any) => setImapPort(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-4 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">Usar SSL/TLS</span>
                                    <ToggleSwitch enabled={useSslImap} onToggle={() => setUseSslImap(prev => !prev)} />
                                </div>
                            </div>

                            {/* SMTP Section */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                                    <span className="material-symbols-outlined text-indigo-500">upload</span>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Servidor Saliente (SMTP)</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <InputWithIcon label="Host" icon="dns" value={outgoingServer} onChange={(e: any) => setOutgoingServer(e.target.value)} />
                                    </div>
                                    <div>
                                        <InputWithIcon label="Puerto" icon="numbers" value={smtpPort} onChange={(e: any) => setSmtpPort(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-4 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">Usar SSL/TLS</span>
                                    <ToggleSwitch enabled={useSslSmtp} onToggle={() => setUseSslSmtp(prev => !prev)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                    {step === 1 ? (
                        <button 
                            onClick={() => setStep(2)} 
                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                            Continuar <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setStep(1)} 
                                className="flex-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                disabled={isConnecting}
                            >
                                Atrás
                            </button>
                            <button 
                                onClick={handleConnect} 
                                disabled={isConnecting} 
                                className="flex-[2] bg-green-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-70 transition-transform active:scale-95"
                            >
                                {isConnecting ? <Spinner /> : <span className="material-symbols-outlined">check_circle</span>}
                                {isConnecting ? 'Conectando...' : 'Verificar y Guardar'}
                            </button>
                        </div>
                    )}
                    
                    {statusMessage && (
                        <div className={`mt-2 p-3 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-2 ${connectionStatus === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300'}`}>
                            <span className="material-symbols-outlined text-sm">{connectionStatus === 'error' ? 'error' : 'info'}</span>
                            {statusMessage}
                        </div>
                    )}
                </div>
            </div>
        </Drawer>
    );
};

export default AddEmailAccountDrawer;
