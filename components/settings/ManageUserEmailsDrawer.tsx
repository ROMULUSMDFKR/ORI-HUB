import React, { useState, useEffect, useMemo } from 'react';
import { User, ConnectedEmailAccount, SignatureTemplate } from '../../types';
import { useCollection } from '../../hooks/useCollection';
import { api } from '../../data/mockData';
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
        await api.addDoc('connectedAccounts', account);
        setUserAccounts(prev => [...prev, account]);
        setIsAddDrawerOpen(false);
    };

    const handleDeleteAccount = async (accountId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta cuenta de correo?')) {
            // In a real app, call api.deleteDoc
            setUserAccounts(prev => prev.filter(acc => acc.id !== accountId));
        }
    };
    
    const handleAssignTemplate = async (accountId: string, templateId: string) => {
        await api.updateDoc('connectedAccounts', accountId, { signatureTemplate: templateId });
        setUserAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, signatureTemplate: templateId } : acc));
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
                            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Cuentas Conectadas</h4>
                            {userAccounts.length > 0 ? (
                                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {userAccounts.map(acc => (
                                        <li key={acc.id} className="py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{acc.email}</p>
                                                <Badge text={acc.status} color={getStatusColor(acc.status)} />
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                                                <div className="flex-grow">
                                                    <CustomSelect 
                                                        options={templateOptions}
                                                        value={acc.signatureTemplate || ''}
                                                        onChange={(val) => handleAssignTemplate(acc.id, val)}
                                                        buttonClassName="w-full text-xs"
                                                        placeholder="Asignar firma..."
                                                    />
                                                </div>
                                                <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                                                    <span className="material-symbols-outlined !text-base">delete</span>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">Este usuario no tiene cuentas conectadas.</p>
                            )}
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Añadir Nueva Cuenta</h4>
                            <button onClick={() => setIsAddDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 w-full flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">add</span>
                                Conectar una cuenta de correo
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