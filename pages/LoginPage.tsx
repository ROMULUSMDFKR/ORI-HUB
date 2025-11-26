
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Checkbox from '../components/ui/Checkbox';
import Squares from '../components/ui/Squares';

interface LoginPageProps {
    onLogin: (email: string, password: string) => Promise<void>;
}

const ALLOWED_DOMAINS = [
    '@santzer.com.mx',
    '@deaitirik.com.mx',
    '@tradeaitirik.com.mx',
    '@puredef.com.mx',
    '@robertoortega.me'
];

const GREETINGS = [
    "¡Qué bueno verte!",
    "Bienvenido/a de nuevo.",
    "¡Hola de nuevo!",
    "Es un gusto tenerte aquí.",
    "¡Adelante!",
    "Listo/a para empezar.",
    "¡Vamos a ello!",
    "Te estábamos esperando.",
    "¡Hola! ¿Listo/a para la acción?",
    "Un placer verte por aquí.",
    "¡Bienvenido/a!",
    "Accediendo a tu espacio.",
    "¡Qué alegría verte!",
    "Tu día empieza ahora.",
    "¡Hola! ¿En qué te ayudo hoy?",
    "Es genial tenerte de vuelta.",
    "Conectando...",
    "¡Hola! Tu equipo te espera.",
    "¡A conquistar el día!",
    "Tu sesión está lista."
];

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('contacto@robertoortega.me');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isDomainValid, setIsDomainValid] = useState(false);
  const [dynamicGreeting, setDynamicGreeting] = useState('Hola');

  useEffect(() => {
      const isValid = ALLOWED_DOMAINS.some(domain => email.trim().toLowerCase().endsWith(domain));
      
      if (isValid && !isDomainValid) {
          const randomIndex = Math.floor(Math.random() * GREETINGS.length);
          setDynamicGreeting(GREETINGS[randomIndex]);
      }
      
      setIsDomainValid(isValid);
  }, [email, isDomainValid]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isDomainValid) {
        setError('Ingresa un correo corporativo válido para continuar.');
        return;
    }

    setError('');
    setIsLoading(true);
    try {
        await onLogin(email, password);
    } catch (err: any) {
        switch (err.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                setError('Correo o contraseña incorrectos.');
                break;
            default:
                setError('Ocurrió un error. Inténtalo de nuevo.');
                break;
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 font-sans relative overflow-hidden">
      {/* Background Layer 1: Squares */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Squares 
                speed={0.3} 
                squareSize={40}
                direction='diagonal'
                borderColor='#333' 
                hoverFillColor='#222'
            />
        </div>
      </div>

      {/* Background Layer 2: Giant Asterisk (Morado Oscuro) */}
      <div 
        className="absolute left-[calc(-135vh-100px)] z-10 pointer-events-none animate-entrance"
        style={{ top: 'calc(-135vh - 250px)' }}
      >
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            id="asterisk"
            className="w-[340vh] h-[340vh] text-purple-950 opacity-40 animate-[spin_120s_linear_infinite]"
            style={{ fill: 'currentColor' }}
        >
          <path d="M16.58,12.51a1.5743,1.5743,0,0,1-2.31,1.77l-2.69-1.55v3.11a1.58,1.58,0,0,1-3.16,0V12.73L5.73,14.28a1.57,1.57,0,1,1-1.57-2.72L6.85,10,4.16,8.44a1.5608,1.5608,0,0,1-.58-2.15,1.58,1.58,0,0,1,2.15-.57L8.42,7.27V4.16a1.58,1.58,0,0,1,3.16,0V7.27l2.69-1.55a1.5743,1.5743,0,0,1,2.31,1.77,1.562,1.562,0,0,1-.74.95L13.15,10l2.69,1.56A1.562,1.562,0,0,1,16.58,12.51Z"></path>
        </svg>
      </div>
      
      {/* Logo */}
      <div className="absolute top-8 left-8 z-30 animate-zoom-in">
        <img 
            src="https://firebasestorage.googleapis.com/v0/b/ori-405da.firebasestorage.app/o/Logo%2FIMG_1039.png?alt=media&token=54ca4912-7921-445b-8bdd-97b11767672a" 
            alt="ORI Logo" 
            className="h-10 w-auto"
        />
      </div>

      {/* Foreground: Login Box */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-md">
        <div className="w-full rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 shadow-2xl shadow-black/50 animate-slide-in-up transition-all duration-500">
            
            <div className="mb-8 relative h-12">
                 <h2 className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 transition-all duration-500 absolute inset-0 ${isDomainValid ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                    Hola
                 </h2>
                 <h2 className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all duration-500 absolute inset-0 ${isDomainValid ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    {dynamicGreeting}
                 </h2>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Corporativo</label>
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors">mail</span>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required 
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                            placeholder="usuario@empresa.com"
                        />
                    </div>
                </div>

                <div className={`transition-all duration-500 overflow-hidden ${isDomainValid ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contraseña</label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors">lock</span>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    required={isDomainValid}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-10 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                    tabIndex={isDomainValid ? 0 : -1}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                                    <span className="material-symbols-outlined !text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <Checkbox id="remember-me" checked={rememberMe} onChange={setRememberMe}>
                                <span className="text-sm text-slate-400">Recuérdame</span>
                            </Checkbox>
                            <Link to="#" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors" tabIndex={isDomainValid ? 0 : -1}>¿Olvidaste tu contraseña?</Link>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm animate-pulse">
                                <span className="material-symbols-outlined text-base">error</span>
                                {error}
                            </div>
                        )}
                        
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full font-bold py-3 px-4 rounded-lg shadow-lg shadow-indigo-900/20 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            tabIndex={isDomainValid ? 0 : -1}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Accediendo...</span>
                                </div>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </div>
                </div>
            </form>

             <p className="mt-8 text-center text-xs text-slate-500">
                El registro es solo por invitación de un administrador.
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
