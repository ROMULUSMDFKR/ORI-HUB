

import React, { useState, useEffect, useCallback } from 'react';

const SecuritySettings = () => {
    const [maxAttempts, setMaxAttempts] = useState(5);
    const [lockoutTime, setLockoutTime] = useState(15);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Política de Inicio de Sesión</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Define los parámetros de seguridad para el inicio de sesión de todos los usuarios.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="max-attempts" className="block text-sm font-medium text-slate-500 dark:text-slate-400">Número máximo de intentos fallidos</label>
                        <input
                            type="number"
                            id="max-attempts"
                            value={maxAttempts}
                            onChange={e => setMaxAttempts(Number(e.target.value))}
                        />
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Después de este número de intentos, la cuenta se bloqueará.</p>
                    </div>
                    <div>
                        <label htmlFor="lockout-time" className="block text-sm font-medium text-slate-500 dark:text-slate-400">Tiempo de bloqueo de la cuenta (minutos)</label>
                        <input
                            type="number"
                            id="lockout-time"
                            value={lockoutTime}
                            onChange={e => setLockoutTime(Number(e.target.value))}
                        />
                         <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">La cuenta permanecerá bloqueada durante este tiempo.</p>
                    </div>
                </div>
                 <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4 flex justify-end">
                    <button onClick={() => alert('Política de seguridad guardada.')} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">
                        Guardar Política
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
