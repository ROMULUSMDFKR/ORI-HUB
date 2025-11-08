
import React from 'react';
import { Link } from 'react-router-dom';

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full bg-surface p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-on-surface">Bienvenido a CRM Studio</h1>
            <p className="text-on-surface-secondary mt-2">Inicia sesión para continuar.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          <div className="space-y-6">
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
                  defaultValue="natalia.v@crmstudio.com"
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
                  autoComplete="current-password"
                  required
                  defaultValue="password"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                    <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-accent border-border rounded focus:ring-accent" />
                    <label htmlFor="remember-me" className="ml-2 block text-on-surface-secondary">
                        Recordarme
                    </label>
                </div>
                <a href="#" className="font-medium text-accent hover:text-accent/80">
                    ¿Olvidaste tu contraseña?
                </a>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-on-primary bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
              >
                Iniciar Sesión
              </button>
            </div>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-on-surface-secondary">
            ¿No tienes una cuenta?{' '}
            <Link to="/signup" className="font-medium text-accent hover:text-accent/80">
                Regístrate
            </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
