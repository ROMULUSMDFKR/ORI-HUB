import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { User, Team, Company } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';

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

const InviteUserDrawer: React.FC<{ isOpen: boolean; onClose: () => void; teams: Team[]; companies: Company[]; onInvite: (newUser: Omit<User, 'id' | 'isActive' | 'avatarUrl'>) => void }> = ({ isOpen, onClose, teams, companies, onInvite }) => {
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Ventas' as User['role'], teamId: '', companyId: ''});

    const handleInvite = () => {
        if (newUser.email && newUser.name) {
            onInvite(newUser);
            onClose();
            setNewUser({ name: '', email: '', role: 'Ventas', teamId: '', companyId: '' });
        } else {
            alert('Por favor, completa el nombre y el email.');
        }
    };
    
    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Invitar Nuevo Usuario">
             <div className="flex flex-col h-full">
                <div className="flex-1 p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                        <input type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} placeholder="nombre@empresa.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                        <input type="text" value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Rol</label>
                        <select value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value as User['role']}))}>
                            <option>Ventas</option>
                            <option>Logística</option>
                            <option>Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Equipo</label>
                        <select value={newUser.teamId} onChange={e => setNewUser(p => ({...p, teamId: e.target.value}))}>
                            <option value="">Asignar después</option>
                            {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Empresa</label>
                        <select value={newUser.companyId} onChange={e => setNewUser(p => ({...p, companyId: e.target.value}))}>
                            <option value="">Asignar después</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.shortName || c.name}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleInvite} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Enviar Invitación</button>
                </div>
            </div>
        </Drawer>
    )
}


const UserManagement: React.FC = () => {
    const { data: initialUsers, loading: usersLoading } = useCollection<User>('users');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const [users, setUsers] = useState<User[] | null>(null);
    const navigate = useNavigate();

    const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false);

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
    
    const handleEditUser = (userId: string) => {
        navigate(`/settings/users/${userId}/edit`);
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
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
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
                    <button onClick={() => handleEditUser(user.id)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><span className="material-symbols-outlined text-slate-500 dark:text-slate-400">edit</span></button>
                    <DropdownMenu user={user} onSelectAction={handleAction} />
                </div>
            ),
            className: 'text-right'
        }
    ];
    
    const loading = usersLoading || teamsLoading || companiesLoading || !users;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Usuarios y Permisos</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona quién tiene acceso a tu espacio de trabajo.</p>
                </div>
                <button onClick={() => setIsInviteDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Invitar Usuario
                </button>
            </div>
            
            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <Table columns={columns} data={users || []} />
            )}

            <InviteUserDrawer
                isOpen={isInviteDrawerOpen}
                onClose={() => setIsInviteDrawerOpen(false)}
                teams={teams || []}
                companies={companies || []}
                onInvite={handleInviteUser}
            />
        </div>
    );
};

export default UserManagement;