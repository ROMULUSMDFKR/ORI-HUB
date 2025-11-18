import React from 'react';
import { Link } from 'react-router-dom';
import Aurora from '../components/ui/Aurora';

// This component is no longer used for active signups.
// It serves as an informational page.
const SignupPage: React.FC = () => {
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
                <img src="https://tradeaitirik.com.mx/wp-content/uploads/2025/11/ORI-LOGO.png" alt="ORI Logo" className="w-24 h-auto mb-8" />
                <div className="w-full max-w-xl rounded-2xl bg-black/40 backdrop-blur-sm p-8 shadow-2xl shadow-black/20 text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Registro por Invitación</h1>
                    <p className="text-slate-300">
                        El acceso a esta plataforma es exclusivamente por invitación.
                    </p>
                    <p className="text-slate-300 mt-2">
                        Si has sido invitado, por favor, busca el correo de activación en tu bandeja de entrada para configurar tu cuenta y establecer tu contraseña.
                    </p>
                    <p className="mt-8 text-center text-sm text-slate-400">
                        ¿Ya tienes una cuenta?{' '}
                        <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
                            Inicia sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;