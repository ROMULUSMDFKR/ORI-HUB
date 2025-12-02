
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { User, Team, Company, Role } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';
import { api } from '../../api/firebaseApi';
import { getDefaultPermissions } from '../../constants';
import CustomSelect from '../../components/ui/CustomSelect';
import InvitationLinkModal from '../../components/ui/InvitationLinkModal';
import { useToast } from '../../hooks/useToast';

// --- Helper Components ---

// KPI Card following "App Icon Pattern"
const UserKpiCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    }[color] || "bg-slate-100 text-slate-600";

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
            </div>
        </div>
    );
};

const DropdownMenu: React.FC<{ user: User, onSelectAction: (action: string, userId: string) => void }> = ({ user, onSelectAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const actions = [
        { id: 'manual-password', label: 'Cambiar contraseña manualmente', icon: 'lock_reset' },
        { id: 'reset-password', label: 'Enviar restablecimiento de contraseña', icon: 'forward_to_inbox' },
        { id: 'toggle-active', label: user.isActive ? 'Desactivar usuario' : 'Activar usuario', icon: user.isActive ? 'block' : 'check_circle' },
        { id: 'delete', label: 'Eliminar usuario', icon: 'delete', isDestructive: true },
    ];

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} onBlur={() => setTimeout(() => setIsOpen(false), 200)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">more_vert</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl z-20 border border-slate-200 dark:border-slate-700 overflow-hidden ring-1 ring-black ring-opacity-5">
                    <ul className="py-1">
                        {actions.map(action => (
                            <li key={action.id}>
                                <button
                                    onClick={() => { onSelectAction(action.id, user.id); setIsOpen(false); }}
                                    className={`w-full text-left flex items-center px-4 py-3 text-sm transition-colors ${action.isDestructive ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    <span className="material-symbols-outlined mr-3 text-lg opacity-70">{action.icon}</span>
                                    {action.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const CreateUserDrawer: React.FC<{ isOpen: boolean; onClose: () => void; teams: Team[]; companies: Company[]; roles: Role[]; onInvite: (newUser: any) => void }> = ({ isOpen, onClose, teams, companies, roles, onInvite }) => {
    const [newUser, setNewUser] = useState({ name: '', email: '', roleId: '', teamId: '', companyId: '', temporaryPassword: ''});
    const [isCreating, setIsCreating] = useState(false);

    // Set default role
    useEffect(() => {
        if (roles.length > 0 && !newUser.roleId) {
            const salesRole = roles.find(r => r.name === 'Ventas');
            setNewUser(prev => ({ ...prev, roleId: salesRole?.id || '' }));
        }
    }, [roles, newUser.roleId]);

    const handleChange = (field: string, value: string) => {
        setNewUser(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!newUser.name || !newUser.email || !newUser.roleId) {
            alert('Nombre, Email y Rol son obligatorios.');
            return;
        }
        setIsCreating(true);
        onInvite(newUser);
        setIsCreating(false);
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Invitar Nuevo Usuario">
            <div className="space-y-6">
                
                {/* Input Safe Pattern: Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo *</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">badge</span>
                        </div>
                        <input 
                            type="text" 
                            value={newUser.name} 
                            onChange={e => handleChange('name', e.target.value)} 
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Ej. Ana García"
                        />
                    </div>
                </div>

                {/* Input Safe Pattern: Email */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico *</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">mail</span>
                        </div>
                        <input 
                            type="email" 
                            value={newUser.email} 
                            onChange={e => handleChange('email', e.target.value)} 
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="ana@empresa.com"
                        />
                    </div>
                </div>
                
                <div>
                    <CustomSelect 
                        label="Rol del Usuario *"
                        options={roles.map(r => ({ value: r.id, name: r.name }))}
                        value={newUser.roleId}
                        onChange={val => handleChange('roleId', val)}
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <CustomSelect 
                            label="Equipo"
                            options={[{value: '', name: 'Sin equipo'}, ...teams.map(t => ({ value: t.id, name: t.name }))]}
                            value={newUser.teamId}
                            onChange={val => handleChange('teamId', val)}
                        />
                    </div>
                    <div>
                        <CustomSelect 
                            label="Empresa Asignada"
                            options={[{value: '', name: 'Sin empresa'}, ...companies.map(c => ({ value: c.id, name: c.shortName || c.name }))]}
                            value={newUser.companyId}
                            onChange={val => handleChange('companyId', val)}
                        />
                    </div>
                </div>
                
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                             <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">forward_to_inbox</span>
                        </div>
                        <p className="text-sm text-indigo-800 dark:text-indigo-300">
                            Se generará un enlace de invitación único. Deberás compartirlo con el usuario para que configure su contraseña y active su cuenta.
                        </p>
                    </div>
                </div>

                <div className="pt-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={isCreating} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                        {isCreating ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">send</span>}
                        {isCreating ? 'Generando...' : 'Generar Invitación'}
                    </button>
                </div>
            </div>
        </Drawer>
    );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (pass: string) => void; userName: string }> = ({ isOpen, onClose, onSave, userName }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');

    const handleSubmit = () => {
        if (password.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirm) {
            alert('Las contraseñas no coinciden.');
            return;
        }
        onSave(password);
        setPassword('');
        setConfirm('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Cambiar Contraseña para {userName}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nueva Contraseña</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar Contraseña</label>
                         <input 
                            type="password" 
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-700">Cancelar</button>
                        <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Actualizar Contraseña</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const UserManagementPage: React.FC = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { data: roles, loading: rolesLoading } = useCollection<Role>('roles');
    
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);

    const { showToast } = useToast();
    const navigate = useNavigate();

    const loading = usersLoading || teamsLoading || companiesLoading || rolesLoading;

    const stats = useMemo(() => {
        if (!users) return { total: 0, active: 0, inactive: 0 };
        return {
            total: users.length,
            active: users.filter(u => u.isActive).length,
            inactive: users.filter(u => !u.isActive).length
        };
    }, [users]);

    const handleInviteUser = async (newUserData: any) => {
        try {
            // Retrieve permissions from the selected role
            const role = roles?.find(r => r.id === newUserData.roleId);
            const permissions = role ? role.permissions : getDefaultPermissions();
            
            const invitationData = {
                name: newUserData.name,
                email: newUserData.email,
                roleId: newUserData.roleId,
                teamId: newUserData.teamId || null,
                companyId: newUserData.companyId || null,
                permissions: permissions,
            };

            const invitationId = await api.createInvitation(invitationData);
            const link = `${window.location.origin}/#/accept-invitation?token=${invitationId}`;
            
            setInvitationLink(link);
            setIsDrawerOpen(false);

        } catch (error) {
            console.error("Error inviting user:", error);
            alert("No se pudo crear la invitación.");
        }
    };

    const handleChangePassword = async (newPassword: string) => {
        if (!selectedUserForPassword) return;
        try {
            await api.adminUpdateUserPassword(selectedUserForPassword.id, newPassword);
            showToast('success', `Contraseña actualizada correctamente para ${selectedUserForPassword.name}.`);
            setIsPasswordModalOpen(false);
        } catch (e) {
            console.error(e);
            showToast('error', 'Error al actualizar la contraseña.');
        }
    };

    const handleUserAction = async (action: string, userId: string) => {
        const user = users?.find(u => u.id === userId);
        if (!user) return;

        if (action === 'delete') {
             if(window.confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
                 try {
                     await api.deleteDoc('users', userId);
                     alert('Usuario eliminado.');
                 } catch(e) {
                     console.error(e);
                     alert('Error al eliminar usuario.');
                 }
             }
        } else if (action === 'reset-password') {
             try {
                await api.sendActivationEmail(user.email);
                alert(`Correo de restablecimiento enviado a ${user.email}`);
             } catch(e) {
                 console.error(e);
                 alert('Error al enviar correo.');
             }
        } else if (action === 'manual-password') {
             setSelectedUserForPassword(user);
             setIsPasswordModalOpen(true);
        } else if (action === 'toggle-active') {
             await api.updateDoc('users', userId, { isActive: !user.isActive });
        }
    };

    const columns = [
        {
            header: 'Usuario',
            accessor: (user: User) => (
                <div className="flex items-center">
                    <div className="relative flex-shrink-0">
                         <img src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                         <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-800 ${user.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    </div>
                    <div className="ml-4">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Rol',
            accessor: (user: User) => {
                const roleObj = roles?.find(r => r.id === user.roleId);
                const roleName = roleObj ? roleObj.name : (user.roleName || user.role || 'Sin Rol');
                let color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' = 'gray';
                
                if (roleName === 'Admin') color = 'red';
                else if (roleName === 'Ventas') color = 'green';
                else if (roleName === 'Logística') color = 'blue';

                return <Badge text={roleName} color={color} />;
            }
        },
        {
            header: 'Equipo',
            accessor: (user: User) => {
                const team = teams?.find(t => t.id === user.teamId);
                return team ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                        <span className="material-symbols-outlined text-[14px]">groups</span>
                        {team.name}
                    </span>
                ) : <span className="text-slate-400 text-sm">-</span>;
            }
        },
        {
            header: 'Estado',
            accessor: (user: User) => (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                </span>
            )
        },
        {
            header: 'Acciones',
            accessor: (user: User) => (
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => navigate(`/settings/users/${user.id}/edit`)} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Editar usuario">
                        <span className="material-symbols-outlined text-xl">edit_square</span>
                    </button>
                    <DropdownMenu user={user} onSelectAction={handleUserAction} />
                </div>
            ),
            className: 'text-right'
        }
    ];

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Gestiona el acceso, roles y equipos de tu organización.
                    </p>
                </div>
                <button 
                    onClick={() => setIsDrawerOpen(true)} 
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 font-semibold"
                >
                    <span className="material-symbols-outlined">person_add</span>
                    Invitar Usuario
                </button>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <UserKpiCard title="Total Usuarios" value={stats.total} icon="group" color="indigo" />
                <UserKpiCard title="Usuarios Activos" value={stats.active} icon="check_circle" color="green" />
                <UserKpiCard title="Inactivos" value={stats.inactive} icon="person_off" color="amber" />
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table columns={columns} data={users || []} />
            </div>
            
            <CreateUserDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
                teams={teams || []} 
                companies={companies || []}
                roles={roles || []}
                onInvite={handleInviteUser} 
            />
            
            <InvitationLinkModal 
                isOpen={!!invitationLink}
                onClose={() => setInvitationLink(null)}
                link={invitationLink || ''}
            />

            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onSave={handleChangePassword}
                userName={selectedUserForPassword?.name || ''}
            />
        </div>
    );
};

export default UserManagementPage;
