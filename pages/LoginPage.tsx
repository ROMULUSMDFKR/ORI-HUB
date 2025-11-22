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
    '@tradeaitirik.com.mx', // Included for system consistency
    '@puredef.com.mx',
    '@robertoortega.me'
];

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState(''); // Default email cleared
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State to control the expansion animation
  const [isDomainValid, setIsDomainValid] = useState(false);

  // Check email domain in real-time
  useEffect(() => {
      const isValid = ALLOWED_DOMAINS.some(domain => email.trim().toLowerCase().endsWith(domain));
      setIsDomainValid(isValid);
  }, [email]);

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
        className="absolute left-[calc(-135vh-100px)] z-10 pointer-events-none"
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
            src="https://firebasestorage.googleapis.com/v0/b/ori-405da.firebasestorage.app/o/Logo%2FIMG_1039.png?alt=media&token=54ca4912-7921-445b-8bdd-97b11767672a" 
            alt="ORI Logo" 
            className="h-10 w-auto"
        />
      </div>

      {/* Foreground: Login Box */}
      <div className="relative z-20 flex flex-col items-center w-full">
        <div
          className="w-full max-w-xl rounded-2xl bg-black/60 backdrop-blur-lg border border-white/10 p-8 shadow-2xl shadow-black/20 animate-slide-in-up transition-all duration-500"
        >
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Hola</h2>
                <p className="text-slate-200 font-medium">Ingresa tus credenciales corporativas.</p>
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
                            <Link to="#" className="text-sm font-medium text-indigo-400 hover:text-indigo-300" tabIndex={isDomainValid ? 0 : -1}>¿Olvidaste tu contraseña?</Link>
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
      </div>
    </div>
  );
};

export default LoginPage;