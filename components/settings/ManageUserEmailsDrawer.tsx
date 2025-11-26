
import React, { useState, useEffect, useMemo } from 'react';
import { User, ConnectedEmailAccount, SignatureTemplate } from '../../types';
import { useCollection } from '../../hooks/useCollection';
import { api } from '../../api/firebaseApi';
import Drawer from '../ui/Drawer';
import Spinner from '../ui/Spinner';
import Badge from '../ui/Badge';
import CustomSelect from '../ui/CustomSelect';
import AddEmailAccountDrawer from './AddEmailAccountDrawer';

interface ManageUserEmailsDrawerProps {
  user: User | null;
  onClose: () => void;
}

const ManageUserEmailsDrawer: React.FC<ManageUserEmailsDrawerProps> = ({ user, onClose }) => {
    const { data: allAccounts, loading: accountsLoading } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    const { data: templates, loading: templatesLoading } = useCollection<SignatureTemplate>('signatureTemplates');
    
    const [userAccounts, setUserAccounts] = useState<ConnectedEmailAccount[]>([]);
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);

    useEffect(() => {
        if (user && allAccounts) {
            setUserAccounts(allAccounts.filter(acc => acc.userId === user.id));
        } else if (!user) {
            setUserAccounts([]);
        }
    }, [user, allAccounts]);

    const handleSaveNewAccount = async (account: ConnectedEmailAccount) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...accountData } = account;
        const addedAccount = await api.addDoc('connectedAccounts', accountData);
        setUserAccounts(prev => [...prev, addedAccount]);
        setIsAddDrawerOpen(false);
    };

    const handleDeleteAccount = async (accountId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta cuenta de correo?')) {
            try {
                await api.deleteDoc('connectedAccounts', accountId);
                setUserAccounts(prev => prev.filter(acc => acc.id !== accountId));
            } catch (error) {
                console.error("Error deleting account:", error);
                alert("Error al eliminar la cuenta.");
            }
        }
    };
    
    const handleAssignTemplate = async (accountId: string, templateId: string) => {
        try {
            await api.updateDoc('connectedAccounts', accountId, { signatureTemplate: templateId });
            setUserAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, signatureTemplate: templateId } : acc));
        } catch (error) {
            console.error("Error updating template:", error);
            alert("Error al actualizar la plantilla.");
        }
    };

    const getStatusColor = (status: ConnectedEmailAccount['status']) => {
        switch(status) {
            case 'Conectado': return 'green';
            case 'Error de autenticación': return 'red';
            case 'Desconectado': return 'gray';
            default: return 'gray';
        }
    };
    
    const templateOptions = useMemo(() => {
        if (!templates) return [{ value: '', name: 'Ninguna' }];
        return [{ value: '', name: 'Ninguna' }, ...templates.map(t => ({ value: t.htmlContent, name: t.name }))];
    }, [templates]);

    const loading = accountsLoading || templatesLoading;

    return (
        <>
            <Drawer isOpen={!!user} onClose={onClose} title={`Gestionar Cuentas de ${user?.name}`} size="lg">
                {loading ? <Spinner /> : (
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Cuentas Conectadas</h4>
                            {userAccounts.length > 0 ? (
                                <ul className="space-y-3">
                                    {userAccounts.map(acc => (
                                        <li key={acc.id} className="p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    {/* App Icon Pattern */}
                                                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                        <span className="material-symbols-outlined text-xl">mail</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{acc.email}</p>
                                                        <Badge text={acc.status} color={getStatusColor(acc.status)} />
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors">
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            </div>
                                            
                                            <div className="pt-3 border-t border-slate-200 dark:border-slate-600">
                                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Plantilla de Firma</label>
                                                <CustomSelect 
                                                    options={templateOptions}
                                                    value={acc.signatureTemplate || ''}
                                                    onChange={(val) => handleAssignTemplate(acc.id, val)}
                                                    buttonClassName="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-500 rounded-lg px-3 py-2"
                                                    placeholder="Seleccionar firma..."
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/20 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 mb-3">
                                        <span className="material-symbols-outlined text-2xl text-slate-400">mail_off</span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Este usuario no tiene cuentas conectadas.</p>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <button onClick={() => setIsAddDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 w-full flex items-center justify-center gap-2 transition-colors">
                                <span className="material-symbols-outlined">add_link</span>
                                Conectar Nueva Cuenta
                            </button>
                        </div>
                    </div>
                )}
            </Drawer>
            <AddEmailAccountDrawer
                isOpen={isAddDrawerOpen}
                onClose={() => setIsAddDrawerOpen(false)}
                onSave={handleSaveNewAccount}
                user={user}
            />
        </>
    );
};

export default ManageUserEmailsDrawer;
