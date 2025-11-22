
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
import InvitationLinkModal from '../../components/ui/InvitationLinkModal';

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo *</label>
                        <input 
                            type="text" 
                            value={newUser.name} 
                            onChange={e => handleChange('name', e.target.value)} 
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico *</label>
                        <input 
                            type="email" 
                            value={newUser.email} 
                            onChange={e => handleChange('email', e.target.value)} 
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                        />
                    </div>
                    
                    <div>
                        <CustomSelect 
                            label="Rol del Usuario *"
                            options={roles.map(r => ({ value: r.id, name: r.name }))}
                            value={newUser.roleId}
                            onChange={val => handleChange('roleId', val)}
                        />
                    </div>
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
                
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                    <p className="text-sm text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
                        <span className="material-symbols-outlined text-lg">info</span>
                        Se generará un enlace de invitación único que deberás compartir con el usuario para que active su cuenta.
                    </p>
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={isCreating} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                        {isCreating ? 'Generando...' : 'Generar Invitación'}
                    </button>
                </div>
            </div>
        </Drawer>
    );
};


const UserManagementPage: React.FC = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { data: roles, loading: rolesLoading } = useCollection<Role>('roles');
    
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const navigate = useNavigate();

    const loading = usersLoading || teamsLoading || companiesLoading || rolesLoading;

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

    const handleUserAction = async (action: string, userId: string) => {
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
             const user = users?.find(u => u.id === userId);
             if (user) {
                 try {
                    await api.sendActivationEmail(user.email);
                    alert(`Correo de restablecimiento enviado a ${user.email}`);
                 } catch(e) {
                     console.error(e);
                     alert('Error al enviar correo.');
                 }
             }
        } else if (action === 'toggle-active') {
             const user = users?.find(u => u.id === userId);
             if(user) {
                 await api.updateDoc('users', userId, { isActive: !user.isActive });
             }
        } else {
            console.log("Action:", action, userId);
        }
    };

    const columns = [
        {
            header: 'Usuario',
            accessor: (user: User) => (
                <div className="flex items-center">
                    <img src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} alt="" className="h-8 w-8 rounded-full mr-3" />
                    <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Rol',
            accessor: (user: User) => {
                // Prioritize finding the role object by ID to get the latest name
                const roleObj = roles?.find(r => r.id === user.roleId);
                const roleName = roleObj ? roleObj.name : (user.roleName || user.role || 'Sin Rol');
                
                let color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' = 'gray';
                if (roleName === 'Admin') color = 'red';
                if (roleName === 'Ventas') color = 'green';
                if (roleName === 'Logística') color = 'blue';

                return <Badge text={roleName} color={color} />;
            }
        },
        {
            header: 'Equipo',
            accessor: (user: User) => {
                const team = teams?.find(t => t.id === user.teamId);
                return team ? (
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined !text-sm text-slate-400">groups</span>
                        {team.name}
                    </span>
                ) : <span className="text-slate-400 text-sm">-</span>;
            }
        },
        {
            header: 'Estado',
            accessor: (user: User) => <Badge text={user.isActive ? 'Activo' : 'Inactivo'} color={user.isActive ? 'green' : 'gray'} />
        },
        {
            header: 'Acciones',
            accessor: (user: User) => (
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => navigate(`/settings/users/${user.id}/edit`)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Editar</button>
                    <DropdownMenu user={user} onSelectAction={handleUserAction} />
                </div>
            ),
            className: 'text-right'
        }
    ];

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Usuarios</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona el acceso, los roles y la asignación de equipos de tu organización.</p>
                </div>
                <button onClick={() => setIsDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined mr-2">person_add</span>
                    Invitar Usuario
                </button>
            </div>

            <Table columns={columns} data={users || []} />
            
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
        </div>
    );
};

export default UserManagementPage;
