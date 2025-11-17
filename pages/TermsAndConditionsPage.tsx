import React from 'react';
import { Link } from 'react-router-dom';

const TermsAndConditionsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 p-8 sm:p-10 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Términos y Condiciones de Uso - Sistema ORI</h1>
          
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-4 text-slate-600 dark:text-slate-300">
            <p className="text-sm text-slate-500">Última actualización: 28 de Julio de 2024</p>

            <h2 className="text-xl font-semibold !text-slate-800 dark:!text-slate-200">1. Aceptación de los Términos</h2>
            <p>
              Al crear una cuenta y utilizar el sistema de gestión empresarial ORI (en adelante, "el Sistema"), usted (en adelante, "el Usuario") acepta y se compromete a cumplir con los siguientes términos y condiciones. Si no está de acuerdo con estos términos, no debe registrarse ni utilizar el Sistema.
            </p>

            <h2 className="text-xl font-semibold !text-slate-800 dark:!text-slate-200">2. Uso Autorizado y Obligaciones del Usuario</h2>
            <p>
              El acceso al Sistema se concede exclusivamente para fines comerciales legítimos relacionados con su rol dentro de la organización. El Usuario se compromete a no utilizar el Sistema para fines ilícitos, no autorizados o que contravengan las políticas internas de la empresa.
            </p>

            <h2 className="text-xl font-semibold !text-slate-800 dark:!text-slate-200">3. Confidencialidad y Seguridad de la Información</h2>
            <p>
              El Usuario reconoce que toda la información contenida y gestionada a través del Sistema, incluyendo pero no limitándose a datos de clientes, proveedores, precios, estrategias comerciales, reportes financieros y comunicaciones internas (en adelante, "Información Confidencial"), es propiedad exclusiva de la empresa y constituye un secreto comercial de alto valor.
            </p>
            <p>
              El Usuario tiene la obligación estricta de:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Mantener la más absoluta confidencialidad sobre toda la Información Confidencial a la que tenga acceso.</li>
              <li>No divulgar, compartir, copiar, reproducir o distribuir la Información Confidencial a terceros, ya sea de forma oral, escrita o electrónica, sin la autorización expresa y por escrito de la dirección de la empresa.</li>
              <li>Utilizar la Información Confidencial únicamente para el desempeño de sus funciones autorizadas.</li>
              <li>Proteger sus credenciales de acceso (usuario y contraseña), siendo el único responsable por cualquier actividad realizada a través de su cuenta.</li>
            </ul>

            <h2 className="text-xl font-semibold !text-slate-800 dark:!text-slate-200">4. Consecuencias por Incumplimiento y Fuga de Información</h2>
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              Cualquier uso indebido, acceso no autorizado, o fuga de Información Confidencial, ya sea intencional o por negligencia, será considerado una falta grave y una violación directa de estos términos y de las políticas de seguridad de la empresa.
            </p>
            <p>
              El incumplimiento de la cláusula de confidencialidad tendrá consecuencias inmediatas, que pueden incluir, sin limitarse a:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Terminación inmediata</strong> de su contrato laboral o de servicios y la revocación de todo acceso al Sistema.</li>
              <li><strong>Acciones legales:</strong> La empresa se reserva el derecho de iniciar todas las <strong>acciones civiles y penales</strong> que correspondan para reclamar la reparación de los daños y perjuicios ocasionados. Dada la naturaleza sensible de la información de una empresa internacional, la fuga de datos puede constituir delitos tipificados en las leyes aplicables sobre secretos industriales, competencia desleal y delitos informáticos.</li>
            </ul>

            <h2 className="text-xl font-semibold !text-slate-800 dark:!text-slate-200">5. Propiedad Intelectual</h2>
            <p>
              El Sistema, su código fuente, diseño, estructura y todo el contenido generado por la empresa son propiedad exclusiva de la misma y están protegidos por las leyes de propiedad intelectual nacionales e internacionales.
            </p>
            
            <h2 className="text-xl font-semibold !text-slate-800 dark:!text-slate-200">6. Modificaciones</h2>
            <p>
              La empresa se reserva el derecho de modificar estos términos y condiciones en cualquier momento. Las modificaciones serán efectivas al ser publicadas en el Sistema. Es responsabilidad del Usuario revisar periódicamente estos términos.
            </p>
          </div>
          
          <div className="mt-8 text-center">
            <Link to="/signup" className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                Volver al Registro
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;
