
import React, { useState, useMemo, useEffect } from 'react';
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
    // Use local state for accounts to handle updates manually and avoid stale data
    const [accounts, setAccounts] = useState<ConnectedEmailAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    
    const { data: templates, loading: templatesLoading } = useCollection<SignatureTemplate>('signatureTemplates');
    
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<ConnectedEmailAccount | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch accounts whenever the drawer opens for a specific user
    useEffect(() => {
        const fetchAccounts = async () => {
            if (!user) {
                setAccounts([]);
                return;
            }
            
            setLoadingAccounts(true);
            try {
                // Fetch all accounts and filter (or fetch by query if API supported it directly)
                const allData = await api.getCollection('connectedAccounts');
                const userAccs = allData.filter((acc: ConnectedEmailAccount) => acc.userId === user.id);
                setAccounts(userAccs);
            } catch (error) {
                console.error("Error fetching accounts:", error);
            } finally {
                setLoadingAccounts(false);
            }
        };

        fetchAccounts();
    }, [user]);

    const handleSaveAccount = async (account: ConnectedEmailAccount) => {
        const { id, ...accountData } = account;
        try {
            if (editingAccount) {
                // Update existing
                await api.updateDoc('connectedAccounts', editingAccount.id, accountData);
                // Update local list
                setAccounts(prev => prev.map(acc => acc.id === editingAccount.id ? { ...acc, ...accountData, id: editingAccount.id } : acc));
                alert("Cuenta actualizada correctamente.");
            } else {
                // Create new
                const newDoc = await api.addDoc('connectedAccounts', accountData);
                // Update local list
                setAccounts(prev => [...prev, newDoc]);
                alert("Cuenta conectada correctamente.");
            }
            
            setIsAddDrawerOpen(false);
            setEditingAccount(null);
        } catch (e) {
            console.error(e);
            alert("Error al guardar la cuenta.");
        }
    };

    const handleEditClick = (account: ConnectedEmailAccount) => {
        setEditingAccount(account);
        setIsAddDrawerOpen(true);
    };

    const handleAddClick = () => {
        setEditingAccount(null);
        setIsAddDrawerOpen(true);
    };

    const handleDeleteAccount = async (accountId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta cuenta de correo? Tendrás que volver a conectarla.')) {
            setDeletingId(accountId);
            try {
                await api.deleteDoc('connectedAccounts', accountId);
                // Remove from local list immediately
                setAccounts(prev => prev.filter(acc => acc.id !== accountId));
            } catch (error) {
                console.error("Error deleting account:", error);
                alert("Error al eliminar la cuenta. Intenta de nuevo.");
            } finally {
                setDeletingId(null);
            }
        }
    };
    
    const handleAssignTemplate = async (accountId: string, templateId: string) => {
        try {
            await api.updateDoc('connectedAccounts', accountId, { signatureTemplate: templateId });
             // Update local state
            setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, signatureTemplate: templateId } : acc));
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
        return [{ value: '', name: 'Ninguna' }, ...templates.map(t => ({ value: t.id, name: t.name }))];
    }, [templates]);

    const loading = loadingAccounts || templatesLoading;

    return (
        <>
            <Drawer isOpen={!!user} onClose={onClose} title={`Gestionar Cuentas de ${user?.name}`} size="lg">
                {loading ? <Spinner /> : (
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Cuentas Conectadas (Lectura Nylas)</h4>
                            {accounts.length > 0 ? (
                                <ul className="space-y-3">
                                    {accounts.map(acc => (
                                        <li key={acc.id} className="p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl transition-all hover:shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    {/* App Icon Pattern */}
                                                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                        <span className="material-symbols-outlined text-xl">mail</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-800 dark:text-slate-200">{acc.email}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Badge text={acc.status} color={getStatusColor(acc.status)} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { 
                                                            e.preventDefault(); 
                                                            e.stopPropagation(); 
                                                            handleEditClick(acc); 
                                                        }}
                                                        className="p-2 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 transition-colors"
                                                        title="Editar credenciales"
                                                    >
                                                        <span className="material-symbols-outlined text-xl">edit</span>
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { 
                                                            e.preventDefault(); 
                                                            e.stopPropagation(); 
                                                            handleDeleteAccount(acc.id); 
                                                        }}
                                                        disabled={deletingId === acc.id}
                                                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                                        title="Eliminar cuenta"
                                                    >
                                                        {deletingId === acc.id ? (
                                                            <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                                                        ) : (
                                                            <span className="material-symbols-outlined text-xl">delete</span>
                                                        )}
                                                    </button>
                                                </div>
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
                            <button onClick={handleAddClick} className="bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 w-full flex items-center justify-center gap-2 transition-colors">
                                <span className="material-symbols-outlined">add_link</span>
                                Conectar Nueva Cuenta
                            </button>
                        </div>
                    </div>
                )}
            </Drawer>
            <AddEmailAccountDrawer
                isOpen={isAddDrawerOpen}
                onClose={() => { setIsAddDrawerOpen(false); setEditingAccount(null); }}
                onSave={handleSaveAccount}
                user={user}
                initialData={editingAccount}
            />
        </>
    );
};

export default ManageUserEmailsDrawer;
