import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Checkbox from '../components/ui/Checkbox';
import Aurora from '../components/ui/Aurora';

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
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
        <div
          className="w-full max-w-xl rounded-2xl bg-black/40 backdrop-blur-sm p-8 shadow-2xl shadow-black/20 animate-slide-in-up"
        >
            <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Email o Usuario</label>
                    <input type="email" defaultValue="natalia.v@crmstudio.com" className="login-input" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Contraseña</label>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} defaultValue="password" className="login-input pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white">
                            <span className="material-symbols-outlined !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <Checkbox id="remember-me" checked={rememberMe} onChange={setRememberMe}>
                        <span className="text-sm text-slate-300">Recuérdame</span>
                    </Checkbox>
                    <Link to="#" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">¿Olvidaste tu contraseña?</Link>
                </div>

                <div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                        Iniciar Sesión
                    </button>
                </div>
            </form>

             <p className="mt-8 text-center text-sm text-slate-400">
                ¿Nuevo en nuestra plataforma?{' '}
                <Link to="/signup" className="font-semibold text-indigo-400 hover:text-indigo-300">
                    Crea una cuenta
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;