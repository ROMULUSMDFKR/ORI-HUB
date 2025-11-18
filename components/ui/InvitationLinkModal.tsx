
import React, { useState } from 'react';

interface InvitationLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    link: string;
}

const InvitationLinkModal: React.FC<InvitationLinkModalProps> = ({ isOpen, onClose, link }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">¡Invitación Generada!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Comparte este enlace con el usuario para que pueda crear su contraseña y activar su cuenta.
                </p>
                
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600 mb-4">
                    <input 
                        type="text" 
                        readOnly 
                        value={link} 
                        className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none"
                    />
                    <button 
                        onClick={handleCopy}
                        className={`p-2 rounded-md transition-colors ${copied ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-500'}`}
                        title="Copiar"
                    >
                        <span className="material-symbols-outlined text-base">{copied ? 'check' : 'content_copy'}</span>
                    </button>
                </div>

                <div className="flex justify-end">
                    <button onClick={onClose} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvitationLinkModal;
