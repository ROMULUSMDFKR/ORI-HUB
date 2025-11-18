

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { User, Team, Company, Role, Invitation } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';
import { api } from '../../api/firebaseApi';
import { getDefaultPermissions } from '../../constants';
import CustomSelect from '../../components/ui/CustomSelect';

// --- Helper Components ---
const DropdownMenu: React.FC<{ user: User, onSelectAction: (action: string, userId: string) => void }> = ({ user, onSelectAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const actions = [
        { id: 'reset-password', label: 'Enviar restablecimiento de contraseña', icon: 'key' },
        { id: 'force-logout', label: 'Forzar cierre de sesión', icon: 'logout' },
        { id: 'toggle-active', label: user.isActive ? 'Desactivar usuario' : 'Activar usuario', icon: user.isActive ? 'block' : 'check_circle' },
        { id: 'delete', label: 'Eliminar usuario', icon: 'delete', isDestructive: true },
    ];

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} onBlur={() => setTimeout(() => setIsOpen(false), 200)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">more_vert</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-10 border border-slate-200 dark:border-slate-700">
                    <ul className="py-1 bg-white dark:bg-slate-800 rounded-lg">
                        {actions.map(action => (
                            <li key={action.id}>
                                <button
                                    onClick={() => { onSelectAction(action.id, user.id); setIsOpen(false); }}
                                    className={`w-full text-left flex items-center px-4 py-2 text-sm ${action.isDestructive ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                >
                                    <span className="material-symbols-outlined mr-3 text-base">{action.icon}</span>
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
            setNewUser(prev => ({ ...prev, roleId: salesRole ? salesRole.id : roles[0].id }));
        }
    }, [roles]);

    const handleCreate = async () => {
        if (newUser.email && newUser.name && newUser.roleId && newUser.temporaryPassword) {
            if (newUser.temporaryPassword.length < 6) {
                alert('La contraseña provisional debe tener al menos 6 caracteres.');
                return;
            }
            setIsCreating(true);
            await onInvite(newUser);
            setIsCreating(false);
            onClose();
            // Reset form
            const salesRole = roles.find(r => r.name === 'Ventas');
            setNewUser({ name: '', email: '', roleId: salesRole ? salesRole.id : roles[0]?.id || '', teamId: '', companyId: '', temporaryPassword: '' });
        } else {
            alert('Por favor, completa todos los campos obligatorios, incluyendo la contraseña provisional.');
        }
    };
    
    const roleOptions = roles.map(r => ({ value: r.id, name: r.name }));
    const teamOptions = [{ value: '', name: 'Asignar después' }, ...teams.map(t => ({ value: t.id, name: t.name }))];
    const companyOptions = [{ value: '', name: 'Asignar después' }, ...companies.map(c => ({ value: c.id, name: c.shortName || c.name }))];

    const inputClasses = "mt-1 block w-full bg-slate-100 dark:bg-slate-700 border-transparent rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none";

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Crear Nuevo Usuario">
             <div className="flex flex-col h-full">
                <div className="flex-1 p-6 space-y-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Crea una cuenta directamente para el usuario. Deberás proporcionarle el email y la contraseña provisional. Al ingresar por primera vez, el sistema le pedirá que configure su perfil y contraseña definitiva.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email *</label>
                        <input 
                            type="email" 
                            value={newUser.email} 
                            onChange={e => setNewUser(p => ({...p, email: e.target.value}))} 
                            placeholder="nombre@empresa.com" 
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre *</label>
                        <input 
                            type="text" 
                            value={newUser.name} 
                            onChange={e => setNewUser(p => ({...p, name: e.target.value}))} 
                            className={inputClasses}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña Provisional *</label>
                        <input 
                            type="text" 
                            value={newUser.temporaryPassword} 
                            onChange={e => setNewUser(p => ({...p, temporaryPassword: e.target.value}))} 
                            placeholder="Mínimo 6 caracteres"
                            className={inputClasses}
                        />
                    </div>
                    
                    <CustomSelect 
                        label="Rol *" 
                        options={roleOptions} 
                        value={newUser.roleId} 
                        onChange={val => setNewUser(p => ({...p, roleId: val}))} 
                    />

                    <CustomSelect 
                        label="Equipo" 
                        options={teamOptions} 
                        value={newUser.teamId} 
                        onChange={val => setNewUser(p => ({...p, teamId: val}))} 
                    />

                    <CustomSelect 
                        label="Empresa" 
                        options={companyOptions} 
                        value={newUser.companyId} 
                        onChange={val => setNewUser(p => ({...p, companyId: val}))} 
                    />
                </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button onClick={onClose} disabled={isCreating} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">Cancelar</button>
                    <button onClick={handleCreate} disabled={isCreating} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {isCreating && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Crear Usuario
                    </button>
                </div>
            </div>
        </Drawer>
    )
}


const UserManagement: React.FC = () => {
    const { data: initialUsers, loading: usersLoading } = useCollection<User>('users');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { data: roles, loading: rolesLoading } = useCollection<Role>('roles');
    const [users, setUsers] = useState<User[] | null>(null);
    const navigate = useNavigate();

    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

    useEffect(() => {
        if (initialUsers) {
            setUsers(initialUsers);
        }
    }, [initialUsers]);

    const teamsMap = React.useMemo(() => {
        if (!teams) return new Map();
        return new Map(teams.map(team => [team.id, team.name]));
    }, [teams]);
    
    const rolesMap = React.useMemo(() => {
        if (!roles) return new Map();
        return new Map(roles.map(r => [r.id, r.name]));
    }, [roles]);

    const getRoleBadgeColor = (roleName: string) => {
        switch (roleName) {
            case 'Admin': return 'red';
            case 'Ventas': return 'blue';
            case 'Logística': return 'yellow';
            default: return 'gray';
        }
    };
    
    const handleEditUser = (userId: string) => {
        navigate(`/settings/users/${userId}/edit`);
    };

    const handleCreateUser = async (newUser: any) => {
        try {
            // Get permissions from role
            const selectedRole = roles?.find(r => r.id === newUser.roleId);
            const defaultPermissions = selectedRole ? selectedRole.permissions : getDefaultPermissions();

            // Conditionally add optional fields
            const userData: Omit<User, 'id'> = {
                name: newUser.name,
                email: newUser.email,
                roleId: newUser.roleId,
                permissions: defaultPermissions,
                isActive: true,
                avatarUrl: '', // Placeholder, overwritten by adminCreateUser
                ...(newUser.teamId ? { teamId: newUser.teamId } : {}),
                ...(newUser.companyId ? { companyId: newUser.companyId } : {})
            };

            await api.adminCreateUser(newUser.email, newUser.temporaryPassword, userData);
            alert(`Usuario ${newUser.name} creado con éxito. Entrégales sus credenciales temporales.`);

        } catch (error: any) {
            console.error("Error creating user:", error);
            if (error.code === 'auth/email-already-in-use') {
                 alert('Error: El correo electrónico ya está en uso.');
            } else {
                 alert(`Error al crear usuario: ${error.message}`);
            }
        }
    };

    const handleAction = async (action: string, userId: string) => {
        if (!users) return;

        switch(action) {
            case 'toggle-active':
                const userToToggle = users.find(u => u.id === userId);
                if (userToToggle) {
                    const newStatus = !userToToggle.isActive;
                    await api.updateDoc('users', userId, { isActive: newStatus });
                    setUsers(users.map(u => u.id === userId ? { ...u, isActive: newStatus } : u));
                }
                break;
            case 'delete':
                if (window.confirm('¿Estás seguro de que quieres eliminar a este usuario? Esta acción es PERMANENTE y también lo eliminará del sistema de autenticación.')) {
                    try {
                        // In a real app, you would have a backend function to delete the Auth user.
                        // For this simulation, we'll just delete the Firestore record.
                        await api.deleteDoc('users', userId);
                        setUsers(users.filter(u => u.id !== userId));
                        alert('Usuario eliminado de la base de datos.');
                    } catch(err) {
                        console.error(err);
                        alert('Error al eliminar el usuario.');
                    }
                }
                break;
            case 'reset-password':
                alert(`(Simulación) Correo para restablecer contraseña enviado al usuario ${userId}.`);
                break;
            case 'force-logout':
                 alert(`(Simulación) Se ha forzado el cierre de sesión para el usuario ${userId}.`);
                break;
            default:
                console.warn(`Acción desconocida: ${action}`);
        }
    };

    const columns = [
        { 
            header: 'Nombre', 
            accessor: (user: User) => (
                <div className="flex items-center">
                    <img className="h-8 w-8 rounded-full object-cover mr-3" src={user.avatarUrl} alt={user.name} />
                    <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                </div>
            )
        },
        { 
            header: 'Rol', 
            accessor: (user: User) => {
                const roleName = rolesMap.get(user.roleId) || user.roleName || user.role || 'Sin Rol';
                return <Badge text={roleName} color={getRoleBadgeColor(roleName)} />;
            } 
        },
        { header: 'Equipo', accessor: (user: User) => user.teamId ? teamsMap.get(user.teamId) || 'N/A' : '-' },
        { 
            header: 'Estado', 
            accessor: (user: User) => <Badge text={user.isActive ? 'Activo' : 'Inactivo'} color={user.isActive ? 'green' : 'gray'} />
        },
        {
            header: 'Acciones',
            accessor: (user: User) => {
                // Check if user is Owner
                if (user.role === 'Owner') return null;
                
                return (
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditUser(user.id)} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                            Editar
                        </button>
                        <DropdownMenu user={user} onSelectAction={handleAction} />
                    </div>
                );
            },
            className: 'text-right'
        }
    ];

    const loading = usersLoading || teamsLoading || companiesLoading || rolesLoading;

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div>
                    {/* Title and description managed by SecondarySidebar and Layout */}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/onboarding')}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        Ver Página de Onboarding
                    </button>
                    <button onClick={() => setIsCreateDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                        <span className="material-symbols-outlined mr-2">person_add</span>
                        Crear Usuario
                    </button>
                </div>
            </div>
            
            {loading ? <Spinner /> : <Table columns={columns} data={users || []} />}

            <CreateUserDrawer 
                isOpen={isCreateDrawerOpen} 
                onClose={() => setIsCreateDrawerOpen(false)} 
                teams={teams || []}
                companies={companies || []}
                roles={roles || []}
                onInvite={handleCreateUser}
            />
        </div>
    );
};

export default UserManagement;
