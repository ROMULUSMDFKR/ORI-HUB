
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDoc } from '../../hooks/useDoc';
import { useCollection } from '../../hooks/useCollection';
import { User, ConnectedEmailAccount, SignatureTemplate } from '../../types';
import { api } from '../../api/firebaseApi';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import AddEmailAccountDrawer from '../../components/settings/AddEmailAccountDrawer';
import SignatureEditorDrawer from '../../components/settings/SignatureEditorDrawer';
import { useToast } from '../../hooks/useToast';

const ManageUserEmailsPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    // Data Fetching
    const { data: user, loading: userLoading } = useDoc<User>('users', userId || '');
    const { data: allAccounts, loading: accountsLoading } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: templates } = useCollection<SignatureTemplate>('signatureTemplates');

    // Local UI State
    const [localAccounts, setLocalAccounts] = useState<ConnectedEmailAccount[]>([]);
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [editingSignatureAccount, setEditingSignatureAccount] = useState<ConnectedEmailAccount | null>(null);
    
    // Track actions in progress
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Sync local state when initial data loads
    useEffect(() => {
        if (allAccounts && userId) {
            setLocalAccounts(allAccounts.filter(acc => acc.userId === userId));
        }
    }, [allAccounts, userId]);

    const handleSaveNewAccount = async (account: ConnectedEmailAccount) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...accountData } = account;
        try {
            // api.addDoc returns the new object with the generated ID
            const newAccount = await api.addDoc('connectedAccounts', accountData);
            
            // Update local state immediately
            setLocalAccounts(prev => [...prev, newAccount]);
            
            setIsAddDrawerOpen(false);
            showToast('success', 'Cuenta conectada correctamente.');
        } catch (error) {
            console.error("Error adding account:", error);
            showToast('error', 'No se pudo conectar la cuenta.');
        }
    };

    const handleDeleteAccount = async (e: React.MouseEvent, accountId: string) => {
        // Prevent bubbling
        e.preventDefault();
        e.stopPropagation();

        if (window.confirm('¿Estás seguro de que quieres eliminar esta cuenta de correo? Se detendrá la sincronización de correos.')) {
            // Mark as processing
            setProcessingIds(prev => new Set(prev).add(accountId));

            try {
                await api.deleteDoc('connectedAccounts', accountId);
                
                // Update local state immediately
                setLocalAccounts(prev => prev.filter(acc => acc.id !== accountId));
                
                showToast('success', 'Cuenta desconectada y eliminada.');
            } catch (error) {
                console.error("Error deleting account:", error);
                showToast('error', 'Error al eliminar la cuenta. Intenta de nuevo.');
            } finally {
                setProcessingIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(accountId);
                    return newSet;
                });
            }
        }
    };

    const handleUpdateSignature = async (accountId: string, newTemplate: string) => {
         try {
            await api.updateDoc('connectedAccounts', accountId, { signatureTemplate: newTemplate });
            // Update local state
            setLocalAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, signatureTemplate: newTemplate } : acc));
            showToast('success', 'Firma actualizada.');
        } catch (error) {
            console.error("Error updating signature:", error);
            showToast('error', 'Error al actualizar la firma.');
        }
    };

    const loading = userLoading || accountsLoading;

    if (loading) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    if (!user) return <div className="text-center p-12">Usuario no encontrado</div>;

    const getStatusColor = (status: ConnectedEmailAccount['status']) => {
        switch(status) {
            case 'Conectado': return 'green';
            case 'Error de autenticación': return 'red';
            case 'Desconectado': return 'gray';
            default: return 'gray';
        }
    }

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-8">
            {/* Breadcrumb & Header */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Link to="/settings/email-accounts" className="hover:text-indigo-600 dark:hover:text-indigo-400">Cuentas de Correo</Link>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">Gestión de {user.name}</span>
                </div>
                
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-6">
                        <img 
                            src={user.avatarUrl} 
                            alt={user.name} 
                            className="w-20 h-20 rounded-full object-cover border-4 border-indigo-50 dark:border-indigo-900/20" 
                        />
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{user.name}</h1>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">badge</span> {user.role}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">email</span> {user.email}</span>
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:block">
                         <div className="text-right">
                            <p className="text-xs font-bold uppercase text-slate-400 mb-1">Total Cuentas</p>
                            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{localAccounts.length}</p>
                         </div>
                    </div>
                </div>
            </div>

            {/* Accounts Grid */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500">hub</span> Cuentas Conectadas
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {localAccounts.map(account => {
                        const isProcessing = processingIds.has(account.id);
                        return (
                            <div key={account.id} className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xl">
                                            📧
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm break-all">{account.email}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`w-2 h-2 rounded-full ${account.status === 'Conectado' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                                <span className={`text-xs font-medium ${account.status === 'Conectado' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {account.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeleteAccount(e, account.id)}
                                        className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors z-10 cursor-pointer disabled:opacity-50"
                                        title="Desconectar cuenta"
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <span className="material-symbols-outlined animate-spin text-lg">refresh</span> : <span className="material-symbols-outlined">delete</span>}
                                    </button>
                                </div>
                                
                                <div className="p-5 flex-1 flex flex-col gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Configuración de Firma</p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                                                    {account.signatureTemplate ? 'Plantilla HTML personalizada activa' : 'Sin firma configurada'}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => setEditingSignatureAccount(account)}
                                                className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                                title="Editar firma"
                                            >
                                                <span className="material-symbols-outlined">edit_note</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Account Button Card */}
                    <button 
                        onClick={() => setIsAddDrawerOpen(true)}
                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group min-h-[200px]"
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800">
                            <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">add</span>
                        </div>
                        <p className="font-bold text-slate-600 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Conectar Nueva Cuenta</p>
                        <p className="text-xs text-slate-400 mt-1">IMAP / SMTP</p>
                    </button>
                </div>
            </div>
            
            {/* Modals & Drawers */}
            <AddEmailAccountDrawer
                isOpen={isAddDrawerOpen}
                onClose={() => setIsAddDrawerOpen(false)}
                onSave={handleSaveNewAccount}
                user={user}
            />
            
            {editingSignatureAccount && (
                <SignatureEditorDrawer 
                    user={user}
                    account={editingSignatureAccount}
                    onClose={() => setEditingSignatureAccount(null)}
                    onSave={handleUpdateSignature}
                />
            )}
        </div>
    );
};

export default ManageUserEmailsPage;
