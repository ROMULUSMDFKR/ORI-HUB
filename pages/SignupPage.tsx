import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Checkbox from '../components/ui/Checkbox';
import TermsAndConditionsDrawer from '../components/auth/TermsAndConditionsDrawer';
import Aurora from '../components/ui/Aurora';

interface SignupPageProps {
    onSignup: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignup }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isTermsOpen, setIsTermsOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (!agreed) {
            setError('Debes aceptar los términos y condiciones.');
            return;
        }
        setError('');
        // Proceed with signup logic
        onSignup();
    };

    return (
        <>
            <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 font-sans relative overflow-hidden">
                 <div className="absolute inset-0 z-0">
                    <Aurora
                      colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
                      blend={0.5}
                      amplitude={1.0}
                      speed={0.5}
                    />
                </div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <img src="https://tradeaitirik.com.mx/wp-content/uploads/2025/11/ORI-LOGO.png" alt="ORI Logo" className="w-24 h-auto mb-8 animate-zoom-in" />
                    <div className="w-full max-w-xl rounded-2xl bg-black/40 backdrop-blur-sm p-8 shadow-2xl shadow-black/20 animate-slide-in-up">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400">Nombre Completo</label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                        className="login-input"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400">Email</label>
                                <div className="mt-1">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="login-input"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400">Contraseña</label>
                                <div className="mt-1 relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="login-input"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400">
                                        <span className="material-symbols-outlined !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400">Confirmar Contraseña</label>
                                <div className="mt-1">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="login-input"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-start">
                                <Checkbox id="terms-agreed" checked={agreed} onChange={setAgreed}>
                                    <span className="text-sm text-slate-300">
                                        Acepto los <button type="button" onClick={() => setIsTermsOpen(true)} className="font-semibold text-indigo-400 hover:text-indigo-300 underline">términos y condiciones</button>
                                    </span>
                                </Checkbox>
                            </div>
                            
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            
                            <div>
                                <button
                                    type="submit"
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Crear Cuenta
                                </button>
                            </div>
                        </form>
                        <p className="mt-6 text-center text-sm text-slate-400">
                            ¿Ya tienes una cuenta?{' '}
                            <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
                                Inicia sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
            <TermsAndConditionsDrawer isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
        </>
    );
};

export default SignupPage;