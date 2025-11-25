
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Aurora from '../components/ui/Aurora';

interface LoginPageProps {
    onLogin: (email: string, password: string) => Promise<void>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await onLogin(email, password);
        } catch (err: any) {
            // Simple error handling compatible with previous logic
            setError('Credenciales incorrectas. Por favor verifica tu correo y contraseña.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
            {/* Background Layers */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <Aurora colorStops={["#3A29FF", "#FF94B4", "#FF3232"]} speed={0.5} amplitude={1.2} />
            </div>
            
            {/* Decorative Giant Asterisk/Logo Background */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40rem] leading-none font-bold text-white/[0.02] pointer-events-none select-none z-0 font-serif">
                *
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md p-6 sm:p-10 mx-4">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-black/50 p-8 sm:p-10 relative overflow-hidden group">
                    
                    {/* Top Glow Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Header & Logo */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 mb-6 shadow-inner">
                            <img 
                                src="https://firebasestorage.googleapis.com/v0/b/ori-405da.firebasestorage.app/o/Logo%2FIMG_1043.png?alt=media&token=28b3c9f6-ebbc-4681-b604-3eae6dfa6bbc" 
                                alt="ORI Logo" 
                                className="w-10 h-auto drop-shadow-lg" 
                            />
                        </div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 mb-2 tracking-tight">
                            Bienvenido
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Ingresa a tu cuenta para gestionar tu negocio
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-slide-in-up">
                            <span className="material-symbols-outlined text-red-400 text-xl">error</span>
                            <p className="text-sm text-red-200 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5">
                            {/* Email Input */}
                            <div className="group/input">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Correo Electrónico</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors">
                                        <span className="material-symbols-outlined text-xl">mail</span>
                                    </div>
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        className="w-full bg-black/20 border border-white/10 text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block pl-12 pr-4 py-3.5 placeholder-slate-500/50 transition-all duration-200" 
                                        placeholder="nombre@empresa.com" 
                                        required 
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="group/input">
                                <div className="flex justify-between items-center mb-2 ml-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                                </div>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors">
                                        <span className="material-symbols-outlined text-xl">lock</span>
                                    </div>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        className="w-full bg-black/20 border border-white/10 text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block pl-12 pr-12 py-3.5 placeholder-slate-500/50 transition-all duration-200" 
                                        placeholder="••••••••" 
                                        required 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute right-4 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                                        aria-label="Mostrar contraseña"
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                <div className="flex justify-end mt-2">
                                    <Link to="/reset-password" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-500/25 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Iniciando...</span>
                                </>
                            ) : (
                                <>
                                    <span>Iniciar Sesión</span>
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Link */}
                    <div className="mt-8 text-center border-t border-white/10 pt-6">
                        <p className="text-slate-400 text-sm">
                            ¿Aún no tienes cuenta?{' '}
                            <Link to="/signup" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors hover:underline decoration-indigo-400/30 underline-offset-4">
                                Solicitar acceso
                            </Link>
                        </p>
                    </div>
                </div>
                
                {/* Footer Copyright */}
                <div className="text-center mt-8 opacity-40">
                    <p className="text-xs text-slate-500">© 2025 ORI System. Todos los derechos reservados.</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
