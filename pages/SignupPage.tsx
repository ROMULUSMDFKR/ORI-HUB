
import React from 'react';
import { Link } from 'react-router-dom';

interface SignupPageProps {
    onSignup: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignup }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full bg-surface p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-on-surface">Crea tu Cuenta</h1>
            <p className="text-on-surface-secondary mt-2">Únete a CRM Studio.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSignup(); }}>
          <div className="space-y-6">
            <div>
              <label htmlFor="fullname" className="block text-sm font-medium text-on-surface-secondary">
                Nombre Completo
              </label>
              <div className="mt-1">
                <input
                  id="fullname"
                  name="fullname"
                  type="text"
                  required
                  className="w-full"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-on-surface-secondary">
                Correo Electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password"className="block text-sm font-medium text-on-surface-secondary">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-on-primary bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
              >
                Crear Cuenta
              </button>
            </div>
          </div>
        </form>
         <p className="mt-6 text-center text-sm text-on-surface-secondary">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-medium text-accent hover:text-accent/80">
                Inicia Sesión
            </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
