import React, { useState, useEffect } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { User, Team, AuditLog } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';

const PERMISSIONS_CONFIG = {
    'Prospectos': ['view', 'create', 'edit', 'delete'],
    'Empresas': ['view', 'create', 'edit', 'delete'],
    'Productos': ['view', 'create', 'edit', 'delete'],
    'Inventario': ['view', 'adjust'],
};
type Module = keyof typeof PERMISSIONS_CONFIG;

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
            <button onClick={() => setIsOpen(!isOpen)} onBlur={() => setTimeout(() => setIsOpen(false), 200)} className="p-2 rounded-full hover:bg-background">
                <span className="material-symbols-outlined text-on-surface-secondary">more_vert</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-surface rounded-lg shadow-lg z-10 border border-border">
                    <ul className="py-1">
                        {actions.map(action => (
                            <li key={action.id}>
                                <button
                                    onClick={() => onSelectAction(action.id, user.id)}
                                    className={`w-full text-left flex items-center px-4 py-2 text-sm ${action.isDestructive ? 'text-red-600 hover:bg-red-50' : 'text-on-surface-secondary hover:bg-background'}`}
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

const EditUserDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    teams: Team[];
    onSave: (user: User) => void;
}> = ({ isOpen, onClose, user, teams, onSave }) => {
    const [editedUser, setEditedUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState('general');
    const {data: auditLogs} = useCollection<AuditLog>('auditLogs');

    useEffect(() => {
        if (user) {
            setEditedUser(user);
            setActiveTab('general');
        }
    }, [user]);

    if (!isOpen || !editedUser) return null;
    
    const handleFieldChange = (field: keyof User, value: any) => {
        setEditedUser(prev => prev ? { ...prev, [field]: value } : null);
    };

    const userActivity = (auditLogs || []).filter(log => log.by === editedUser.id).sort((a,b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={`Editar Usuario: ${user?.name}`}>
            <div className="flex flex-col h-full">
                <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-6 px-6">
                        {['general', 'permisos', 'actividad'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-on-surface-secondary hover:text-on-surface'}`}>
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <>
                           <div>
                                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                <input type="text" value={editedUser.name} onChange={e => handleFieldChange('name', e.target.value)} className="mt-1 block w-full border-border rounded-md shadow-sm"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" value={editedUser.email} onChange={e => handleFieldChange('email', e.target.value)} className="mt-1 block w-full border-border rounded-md shadow-sm"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Rol</label>
                                <select value={editedUser.role} onChange={e => handleFieldChange('role', e.target.value)} className="mt-1 block w-full border-border rounded-md shadow-sm">
                                    <option>Admin</option>
                                    <option>Ventas</option>
                                    <option>Logística</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Equipo</label>
                                <select value={editedUser.teamId || ''} onChange={e => handleFieldChange('teamId', e.target.value)} className="mt-1 block w-full border-border rounded-md shadow-sm">
                                    <option value="">Sin equipo</option>
                                    {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Usuario Activo</span>
                                <button type="button" onClick={() => handleFieldChange('isActive', !editedUser.isActive)} className={`${editedUser.isActive ? 'bg-primary' : 'bg-gray-200'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                                    <span className={`${editedUser.isActive ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Permissions Tab */}
                    {activeTab === 'permisos' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-on-surface">Alcance de Datos</h4>
                                <fieldset className="mt-2 space-y-2">
                                    <div className="flex items-center"><input type="radio" name="scope" className="h-4 w-4 text-accent border-border" /><label className="ml-2 text-sm">Ver solo datos propios</label></div>
                                    <div className="flex items-center"><input type="radio" name="scope" className="h-4 w-4 text-accent border-border" defaultChecked /><label className="ml-2 text-sm">Ver datos del equipo</label></div>
                                    <div className="flex items-center"><input type="radio" name="scope" className="h-4 w-4 text-accent border-border" /><label className="ml-2 text-sm">Ver todos los datos</label></div>
                                </fieldset>
                            </div>
                            <div>
                                <h4 className="font-semibold text-on-surface">Permisos por Módulo</h4>
                                <div className="mt-2 space-y-4">
                                    {Object.entries(PERMISSIONS_CONFIG).map(([module, actions]) => (
                                        <div key={module}>
                                            <p className="font-medium text-sm">{module}</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                                                {actions.map(action => (
                                                     <div key={action} className="flex items-center"><input type="checkbox" defaultChecked className="h-4 w-4 text-accent border-border rounded" /><label className="ml-2 text-sm capitalize">{action}</label></div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activity Tab */}
                    {activeTab === 'actividad' && (
                        <ul className="space-y-4">
                            {userActivity.length > 0 ? userActivity.map(log => (
                                <li key={log.id} className="text-sm">
                                    <p><span className="font-semibold">{log.action}</span> en {log.entity} ({log.entityId})</p>
                                    <p className="text-xs text-on-surface-secondary">{new Date(log.at).toLocaleString()}</p>
                                </li>
                            )) : <p className="text-sm text-on-surface-secondary text-center">No hay actividad registrada.</p>}
                        </ul>
                    )}
                </div>

                <div className="p-4 bg-background border-t border-border flex justify-end gap-2">
                    <button onClick={onClose} className="bg-surface border border-border text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={() => onSave(editedUser)} className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Cambios</button>
                </div>
            </div>
        </Drawer>
    );
};

const InviteUserDrawer: React.FC<{ isOpen: boolean; onClose: () => void; teams: Team[], onInvite: (newUser: Omit<User, 'id' | 'isActive' | 'avatarUrl'>) => void }> = ({ isOpen, onClose, teams, onInvite }) => {
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Ventas' as User['role'], teamId: ''});

    const handleInvite = () => {
        if (newUser.email && newUser.name) {
            onInvite(newUser);
            onClose();
            setNewUser({ name: '', email: '', role: 'Ventas', teamId: '' });
        } else {
            alert('Por favor, completa el nombre y el email.');
        }
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Invitar Nuevo Usuario">
             <div className="flex flex-col h-full">
                <div className="flex-1 p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} className="mt-1 block w-full border-border rounded-md shadow-sm" placeholder="nombre@empresa.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input type="text" value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} className="mt-1 block w-full border-border rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Rol</label>
                        <select value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value as User['role']}))} className="mt-1 block w-full border-border rounded-md shadow-sm">
                            <option>Ventas</option>
                            <option>Logística</option>
                            <option>Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Equipo</label>
                        <select value={newUser.teamId} onChange={e => setNewUser(p => ({...p, teamId: e.target.value}))} className="mt-1 block w-full border-border rounded-md shadow-sm">
                            <option value="">Asignar después</option>
                            {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="p-4 bg-background border-t border-border flex justify-end gap-2">
                    <button onClick={onClose} className="bg-surface border border-border text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleInvite} className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg shadow-sm">Enviar Invitación</button>
                </div>
            </div>
        </Drawer>
    )
}


const UserManagement: React.FC = () => {
    const { data: initialUsers, loading: usersLoading } = useCollection<User>('users');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const [users, setUsers] = useState<User[] | null>(null);

    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        if (initialUsers) {
            setUsers(initialUsers);
        }
    }, [initialUsers]);

    const teamsMap = React.useMemo(() => {
        if (!teams) return new Map();
        return new Map(teams.map(team => [team.id, team.name]));
    }, [teams]);

    const getRoleBadgeColor = (role: User['role']) => {
        switch (role) {
            case 'Admin': return 'red';
            case 'Ventas': return 'blue';
            case 'Logística': return 'yellow';
            default: return 'gray';
        }
    };
    
    const handleOpenEditDrawer = (user: User) => {
        setSelectedUser(user);
        setIsEditDrawerOpen(true);
    };

    const handleSaveUser = (updatedUser: User) => {
        setUsers(prev => prev!.map(u => u.id === updatedUser.id ? updatedUser : u));
        setIsEditDrawerOpen(false);
    };
    
    const handleInviteUser = (newUser: Omit<User, 'id' | 'isActive' | 'avatarUrl'>) => {
        const userToAdd: User = {
            ...newUser,
            id: `user-${Date.now()}`,
            isActive: true,
            avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
        };
        setUsers(prev => [...(prev || []), userToAdd]);
    };
    
    const handleAction = (action: string, userId: string) => {
        if (!users) return;

        switch(action) {
            case 'toggle-active':
                setUsers(users.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
                break;
            case 'delete':
                if (window.confirm('¿Estás seguro de que quieres eliminar a este usuario? Esta acción no se puede deshacer.')) {
                    setUsers(users.filter(u => u.id !== userId));
                }
                break;
            case 'reset-password':
                alert(`Se ha enviado un correo para restablecer la contraseña al usuario ${userId}.`);
                break;
            case 'force-logout':
                alert(`Se ha forzado el cierre de sesión para el usuario ${userId}.`);
                break;
        }
    }

    const columns = [
        {
            header: 'Usuario',
            accessor: (user: User) => (
                <div className="flex items-center">
                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full mr-4" />
                    <div>
                        <p className="font-semibold text-on-surface">{user.name}</p>
                        <p className="text-sm text-on-surface-secondary">{user.email}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Rol',
            accessor: (user: User) => <Badge text={user.role} color={getRoleBadgeColor(user.role)} />
        },
        {
            header: 'Equipo',
            accessor: (user: User) => user.teamId ? teamsMap.get(user.teamId) || 'N/A' : '-'
        },
        {
            header: 'Estado',
            accessor: (user: User) => <Badge text={user.isActive ? 'Activo' : 'Inactivo'} color={user.isActive ? "green" : "gray"} />
        },
        {
            header: 'Acciones',
            accessor: (user: User) => (
                <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => handleOpenEditDrawer(user)} className="p-2 rounded-full hover:bg-background"><span className="material-symbols-outlined text-on-surface-secondary">edit</span></button>
                    <DropdownMenu user={user} onSelectAction={handleAction} />
                </div>
            ),
            className: 'text-right'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Usuarios y Permisos</h2>
                    <p className="text-on-surface-secondary mt-1">Gestiona quién tiene acceso a tu espacio de trabajo.</p>
                </div>
                <button onClick={() => setIsInviteDrawerOpen(true)} className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Invitar Usuario
                </button>
            </div>
            
            {usersLoading || teamsLoading || !users ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <Table columns={columns} data={users || []} />
            )}

            <EditUserDrawer
                isOpen={isEditDrawerOpen}
                onClose={() => setIsEditDrawerOpen(false)}
                user={selectedUser}
                teams={teams || []}
                onSave={handleSaveUser}
            />
            <InviteUserDrawer
                isOpen={isInviteDrawerOpen}
                onClose={() => setIsInviteDrawerOpen(false)}
                teams={teams || []}
                onInvite={handleInviteUser}
            />
        </div>
    );
};

export default UserManagement;