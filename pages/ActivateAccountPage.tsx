import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import Aurora from '../components/ui/Aurora';
import { useAuth } from '../hooks/useAuth';

const ActivateAccountPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    
    const [oobCode, setOobCode] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const code = searchParams.get('oobCode');
        if (!code) {
            setError('Falta el código de activación. Por favor, utiliza el enlace de tu correo.');
            setIsLoading(false);
            return;
        }
        setOobCode(code);

        verifyPasswordResetCode(auth, code)
            .then((verifiedEmail) => {
                setEmail(verifiedEmail);
                setIsLoading(false);
            })
            .catch((err) => {
                setError('El enlace de activación no es válido o ha expirado. Por favor, solicita una nueva invitación.');
                setIsLoading(false);
            });
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (!oobCode || !email) {
            setError('Información de activación incompleta.');
            return;
        }
        
        setIsLoading(true);
        setError('');

        try {
            await confirmPasswordReset(auth, oobCode, password);
            setSuccess('¡Contraseña establecida con éxito! Iniciando sesión...');
            
            // Auto-login and redirect
            await login(email, password);
            navigate('/onboarding', { replace: true });

        } catch (err: any) {
            if(err.code === 'auth/weak-password') {
                setError('La contraseña es demasiado débil. Debe tener al menos 6 caracteres.');
            } else {
                setError('No se pudo establecer la contraseña. El enlace puede haber expirado.');
            }
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        if(isLoading) {
            return <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>;
        }

        if(error) {
            return <p className="text-red-400">{error}</p>;
        }

        return (
            <>
                <h1 className="text-2xl font-bold text-white mb-2">Activa tu Cuenta</h1>
                <p className="text-slate-300 mb-6">Establece tu contraseña para acceder a ORI.</p>
                <p className="text-sm text-slate-400 mb-1">Cuenta: <span className="font-semibold text-slate-200">{email}</span></p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-400">Nueva Contraseña</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="login-input mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400">Confirmar Contraseña</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="login-input mt-1" />
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                            {isLoading ? 'Guardando...' : 'Activar Cuenta y Entrar'}
                        </button>
                    </div>
                </form>
            </>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
            <div className="absolute inset-0 z-0"><Aurora /></div>
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-black/40 backdrop-blur-sm p-8 shadow-2xl text-center">
                {renderContent()}
                {success && <p className="text-green-400 mt-4">{success}</p>}
            </div>
        </div>
    );
};

export default ActivateAccountPage;