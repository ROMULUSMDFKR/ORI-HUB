
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Aurora from '../components/ui/Aurora';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import { Invitation } from '../types';

const AcceptInvitationPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login, refreshUser } = useAuth();
    
    const [token, setToken] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const t = searchParams.get('token');
        if (!t) {
            setError('Enlace de invitación inválido.');
            setIsLoading(false);
            return;
        }
        setToken(t);
        fetchInvitation(t);
    }, [searchParams]);

    const fetchInvitation = async (invitationId: string) => {
        try {
            const data = await api.getInvitation(invitationId);
            if (!data) {
                setError('La invitación no existe o ha expirado.');
            } else if (data.status === 'used') {
                setError('Esta invitación ya ha sido utilizada.');
            } else {
                setInvitation(data);
            }
        } catch (err: any) {
            console.error("Error fetching invitation:", err);
            if (err.code === 'permission-denied') {
                setError('Error de acceso: Reglas de seguridad restrictivas. Contacta al administrador para permitir lectura en "invitations".');
            } else {
                setError('Error al cargar la invitación. Verifica tu conexión.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (!invitation) return;

        setIsSubmitting(true);
        setError('');

        try {
            await api.registerUserWithInvitation(invitation, password);
            
            // Auto login
            await login(invitation.email, password);
            refreshUser();
            
            // Redirect to onboarding
            navigate('/onboarding', { replace: true });

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Este correo ya está registrado. Por favor inicia sesión.');
            } else {
                setError('Error al crear la cuenta. Inténtalo de nuevo.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>;
        }

        if (error) {
            return (
                <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
                    <p className="text-red-400 mb-4">{error}</p>
                    <button onClick={() => navigate('/login')} className="text-indigo-400 hover:text-indigo-300 underline">Ir al Inicio de Sesión</button>
                </div>
            );
        }

        if (!invitation) return null;

        return (
            <>
                <h1 className="text-2xl font-bold text-white mb-2">Bienvenido, {invitation.name}</h1>
                <p className="text-slate-300 mb-6">Completa tu registro para unirte a ORI.</p>
                
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Te estás registrando con</label>
                        <input 
                            type="email" 
                            value={invitation.email} 
                            readOnly 
                            disabled
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 cursor-not-allowed" 
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Define tu Contraseña</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            placeholder="Mínimo 6 caracteres"
                            className="login-input" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Confirmar Contraseña</label>
                        <input 
                            type="password" 
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)} 
                            required 
                            className="login-input" 
                        />
                    </div>
                    <div className="pt-4">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center">
                            {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Crear Cuenta'}
                        </button>
                    </div>
                </form>
            </>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
            <div className="absolute inset-0 z-0"><Aurora /></div>
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-black/40 backdrop-blur-sm p-8 shadow-2xl text-center animate-zoom-in">
                <img src="https://tradeaitirik.com.mx/wp-content/uploads/2025/11/ORI-LOGO.png" alt="ORI Logo" className="w-20 h-auto mx-auto mb-6" />
                {renderContent()}
            </div>
        </div>
    );
};

export default AcceptInvitationPage;
