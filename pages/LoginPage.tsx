
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import Checkbox from '../components/ui/Checkbox';
import Squares from '../components/ui/Squares';

interface LoginPageProps {
    onLogin: (email: string, password: string) => Promise<void>;
}

const ALLOWED_DOMAINS = [
    '@santzer.com.mx',
    '@deaitirik.com.mx',
    '@tradeaitirik.com.mx', // Included for system consistency
    '@puredef.com.mx',
    '@robertoortega.me'
];

const GREETINGS = [
    "¡Qué bueno verte!",
    "Te damos la bienvenida.",
    "¡Hola de nuevo!",
    "Es un gusto tenerte aquí.",
    "¡Adelante!",
    "Todo listo para empezar.",
    "¡Vamos a ello!",
    "Te estábamos esperando.",
    "¡Hola! ¿Comenzamos?",
    "Un placer verte por aquí.",
    "Accediendo al sistema.",
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for Flip Animation and Recovery
  const [isFlipped, setIsFlipped] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  // State to control animations
  const [isDomainValid, setIsDomainValid] = useState(false);
  const [dynamicGreeting, setDynamicGreeting] = useState('Hola');

  // Check email domain in real-time
  useEffect(() => {
      const isValid = ALLOWED_DOMAINS.some(domain => email.trim().toLowerCase().endsWith(domain));
      
      // Trigger animations only when the validity changes
      if (isValid && !isDomainValid) {
          const randomIndex = Math.floor(Math.random() * GREETINGS.length);
          setDynamicGreeting(GREETINGS[randomIndex]);
      }
      
      setIsDomainValid(isValid);
  }, [email, isDomainValid]);

  // Auto-fill reset email if user typed it in login
  useEffect(() => {
      if (isFlipped && email) {
          setResetEmail(email);
      }
  }, [isFlipped, email]);

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

  const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetEmail) return;

      setResetStatus('sending');
      setResetMessage('');

      try {
          await sendPasswordResetEmail(auth, resetEmail);
          setResetStatus('success');
          setResetMessage('Te hemos enviado un correo con las instrucciones.');
      } catch (error: any) {
          setResetStatus('error');
          if (error.code === 'auth/user-not-found') {
              setResetMessage('No encontramos una cuenta con este correo.');
          } else {
              setResetMessage('Ocurrió un error al enviar el correo.');
          }
      }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 font-sans relative overflow-hidden">
      {/* Background Layer 1: Squares */}
      <div className="absolute inset-0 z-0">
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Squares 
                speed={0.5} 
                squareSize={40}
                direction='diagonal'
                borderColor='#333' 
                hoverFillColor='#222'
            />
        </div>
      </div>

      {/* Background Layer 2: Giant Asterisk - Slower Rotation (120s) */}
      <div 
        className="absolute left-[calc(-135vh-100px)] z-10 pointer-events-none animate-entrance"
        style={{ top: 'calc(-135vh - 250px)' }}
      >
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            id="asterisk"
            className="w-[340vh] h-[340vh] text-white animate-[spin_120s_linear_infinite]"
            style={{ fill: 'currentColor' }}
        >
          <path d="M16.58,12.51a1.5743,1.5743,0,0,1-2.31,1.77l-2.69-1.55v3.11a1.58,1.58,0,0,1-3.16,0V12.73L5.73,14.28a1.57,1.57,0,1,1-1.57-2.72L6.85,10,4.16,8.44a1.5608,1.5608,0,0,1-.58-2.15,1.58,1.58,0,0,1,2.15-.57L8.42,7.27V4.16a1.58,1.58,0,0,1,3.16,0V7.27l2.69-1.55a1.5743,1.5743,0,0,1,2.31,1.77,1.562,1.562,0,0,1-.74.95L13.15,10l2.69,1.56A1.562,1.562,0,0,1,16.58,12.51Z"></path>
        </svg>
      </div>
      
      {/* Logo Top Left */}
      <div className="absolute top-8 left-8 z-30 animate-zoom-in">
        <img 
            src="https://firebasestorage.googleapis.com/v0/b/ori-405da.firebasestorage.app/o/Logo%2FLOGO%20BLANCO.png?alt=media&token=88ceaa56-56c5-4270-80b4-25c0b398da84" 
            alt="ORI Logo" 
            className="h-10 w-auto"
        />
      </div>

      {/* Foreground: Login Box with 3D Flip Effect */}
      <div className="relative z-20 flex flex-col items-center w-full perspective-[1000px]">
        <div
          className={`relative w-full max-w-xl transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
        >
            {/* --- FRONT SIDE: LOGIN --- */}
            <div className="w-full rounded-2xl bg-black/60 backdrop-blur-lg border border-white/10 p-8 shadow-2xl shadow-black/20 [backface-visibility:hidden]">
                <div className="mb-6 relative h-14">
                    {/* Default Text */}
                    <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${isDomainValid ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
                        <h2 className="text-2xl font-bold text-white">Hola</h2>
                        <p className="text-slate-200 font-medium">Ingresa tus credenciales corporativas.</p>
                    </div>
                    {/* Welcome Back Text */}
                    <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${isDomainValid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <h2 className="text-2xl font-bold text-white">{dynamicGreeting}</h2>
                        <p className="text-slate-200 font-medium">Ingresa tu contraseña para continuar.</p>
                    </div>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email Corporativo</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required 
                            className="login-input" 
                            placeholder="usuario@empresa.com"
                        />
                    </div>

                    {/* Expandable Password & Button Section */}
                    <div 
                        className={`overflow-hidden transition-all duration-700 ease-in-out ${
                            isDomainValid ? 'max-h-[300px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4'
                        }`}
                    >
                        <div className="space-y-6 pt-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required={isDomainValid}
                                        className="login-input pr-10" 
                                        tabIndex={isDomainValid ? 0 : -1}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white" tabIndex={-1}>
                                        <span className="material-symbols-outlined !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <Checkbox id="remember-me" checked={rememberMe} onChange={setRememberMe}>
                                    <span className="text-sm text-slate-200 font-medium">Recuérdame</span>
                                </Checkbox>
                                <button 
                                    type="button"
                                    onClick={() => setIsFlipped(true)} 
                                    className="text-sm font-medium text-indigo-400 hover:text-indigo-300" 
                                    tabIndex={isDomainValid ? 0 : -1}
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>

                            {error && <p className="text-sm text-red-400 text-center animate-pulse font-medium">{error}</p>}
                            
                            <div>
                                <button 
                                    type="submit" 
                                    disabled={isLoading} 
                                    className="w-full font-semibold py-3 px-4 rounded-lg shadow-lg transition-colors flex justify-center items-center border bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/25 border-transparent disabled:opacity-50"
                                    tabIndex={isDomainValid ? 0 : -1}
                                >
                                    {isLoading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                    ) : (
                                        'Iniciar Sesión'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
                 <p className="mt-8 text-center text-sm text-slate-300 font-medium">
                    El registro es solo por invitación de un administrador.
                </p>
            </div>

            {/* --- BACK SIDE: RECOVERY --- */}
            <div className="absolute top-0 left-0 w-full h-full rounded-2xl bg-black/60 backdrop-blur-lg border border-white/10 p-8 shadow-2xl shadow-black/20 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center">
                 <div className="mb-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-indigo-500 mb-4">lock_reset</span>
                    <h2 className="text-2xl font-bold text-white">Recuperar Cuenta</h2>
                    <p className="text-slate-200 font-medium mt-2">
                        Ingresa tu correo y te enviaremos las instrucciones.
                    </p>
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email Corporativo</label>
                        <input 
                            type="email" 
                            value={resetEmail} 
                            onChange={e => setResetEmail(e.target.value)} 
                            required 
                            className="login-input" 
                            placeholder="usuario@empresa.com"
                        />
                    </div>

                    {resetStatus === 'error' && <p className="text-sm text-red-400 text-center font-medium">{resetMessage}</p>}
                    {resetStatus === 'success' && <p className="text-sm text-green-400 text-center font-medium">{resetMessage}</p>}

                    <div>
                        <button 
                            type="submit" 
                            disabled={resetStatus === 'sending' || resetStatus === 'success'} 
                            className="w-full font-semibold py-3 px-4 rounded-lg shadow-lg transition-colors flex justify-center items-center border bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/25 border-transparent disabled:opacity-50"
                        >
                            {resetStatus === 'sending' ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                            ) : (
                                'Enviar Correo'
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => {
                            setIsFlipped(false);
                            setResetStatus('idle');
                            setResetMessage('');
                        }} 
                        className="text-sm font-medium text-slate-400 hover:text-white flex items-center justify-center w-full gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver al inicio de sesión
                    </button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
