import React, { useState, useEffect, useMemo } from 'react';
import { User, ConnectedEmailAccount } from '../../types';
import Drawer from '../ui/Drawer';

interface SignatureEditorDrawerProps {
    user: User;
    account: ConnectedEmailAccount;
    onClose: () => void;
    onSave: (accountId: string, newTemplate: string) => void;
}

const SignatureEditorDrawer: React.FC<SignatureEditorDrawerProps> = ({ user, account, onClose, onSave }) => {
    const [template, setTemplate] = useState(account.signatureTemplate || '');

    const handleSave = () => {
        onSave(account.id, template);
        onClose();
    };

    const previewHtml = useMemo(() => {
        return template
            .replace(/{{name}}/g, user.name)
            .replace(/{{role}}/g, user.role)
            .replace(/{{email}}/g, user.email)
            .replace(/{{phone}}/g, user.phone || 'N/A');
    }, [template, user]);

    const placeholders = [
        { key: '{{name}}', description: 'Nombre completo del usuario' },
        { key: '{{role}}', description: 'Rol del usuario (ej. Ventas)' },
        { key: '{{email}}', description: 'Email del usuario' },
        { key: '{{phone}}', description: 'Teléfono del usuario' },
    ];

    return (
        <Drawer isOpen={true} onClose={onClose} title={`Editor de Firma para ${account.email}`} size="4xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* Editor Column */}
                <div className="flex flex-col h-full">
                    <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">Editor de Plantilla HTML</h3>
                    <textarea
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        className="w-full flex-1 font-mono text-sm border-slate-300 dark:border-slate-600 rounded-lg p-2"
                        placeholder="Pega tu código HTML de la firma aquí..."
                        spellCheck="false"
                    />
                    <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Variables Disponibles</h4>
                        <ul className="space-y-1">
                            {placeholders.map(p => (
                                <li key={p.key} className="flex justify-between items-center text-xs">
                                    <code className="font-mono bg-slate-200 dark:bg-slate-600 px-1 rounded">{p.key}</code>
                                    <span className="text-slate-500 dark:text-slate-400">{p.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                {/* Preview Column */}
                <div className="flex flex-col h-full">
                    <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">Vista Previa</h3>
                    <div className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-4 overflow-auto bg-white dark:bg-slate-100">
                        <iframe
                            srcDoc={previewHtml}
                            title="Vista Previa de Firma"
                            className="w-full h-full border-0"
                            sandbox="allow-same-origin"
                        />
                    </div>
                </div>
            </div>
             <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Plantilla</button>
            </div>
        </Drawer>
    );
};

export default SignatureEditorDrawer;
