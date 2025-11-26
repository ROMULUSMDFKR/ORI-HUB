import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { Team, User } from '../../types';
import { api } from '../../api/firebaseApi';
import Spinner from '../../components/ui/Spinner';
import Drawer from '../../components/ui/Drawer';
import UserSelector from '../../components/ui/UserSelector';

// --- Helper Components ---

// KPI Card following "App Icon Pattern"
const TeamKpiCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
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

const TeamActionsMenu: React.FC<{ team: Team; onEdit: () => void; onDelete: () => void }> = ({ team, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">more_vert</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl z-20 border border-slate-200 dark:border-slate-700 py-1 overflow-hidden ring-1 ring-black ring-opacity-5">
                    <ul>
                        <li>
                            <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full text-left flex items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <span className="material-symbols-outlined mr-3 text-lg opacity-70">edit</span>Editar
                            </button>
                        </li>
                        <li>
                            <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full text-left flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <span className="material-symbols-outlined mr-3 text-lg opacity-70">delete</span>Eliminar
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

const TeamCard: React.FC<{ team: Team, usersMap: Map<string, User>, onEdit: () => void, onDelete: () => void }> = ({ team, usersMap, onEdit, onDelete }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    {/* App Icon Pattern */}
                     <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                        <span className="material-symbols-outlined text-2xl">groups</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{team.name}</h3>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                            {team.members.length} miembro{team.members.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                <TeamActionsMenu team={team} onEdit={onEdit} onDelete={onDelete} />
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 min-h-[40px] line-clamp-2">
                {team.description || 'Sin descripción.'}
            </p>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <div className="flex -space-x-2 overflow-hidden py-1">
                    {team.members.length > 0 ? (
                        team.members.slice(0, 5).map(userId => {
                            const user = usersMap.get(userId);
                            return user ? (
                                <img 
                                    key={user.id} 
                                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} 
                                    alt={user.name} 
                                    title={user.name}
                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800 object-cover bg-slate-200" 
                                />
                            ) : null;
                        })
                    ) : (
                        <span className="text-sm text-slate-400 italic">Sin miembros asignados</span>
                    )}
                    {team.members.length > 5 && (
                        <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800 bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-500">
                            +{team.members.length - 5}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TeamDrawer: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (team: Partial<Team>) => void; 
    team?: Team | null;
    users: User[];
}> = ({ isOpen, onClose, onSave, team, users }) => {
    const [formData, setFormData] = useState<Partial<Team>>({
        name: '',
        description: '',
        members: []
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(team ? { ...team } : { name: '', description: '', members: [] });
        }
    }, [isOpen, team]);

    const handleSubmit = () => {
        if (!formData.name?.trim()) {
            alert('El nombre del equipo es obligatorio.');
            return;
        }
        onSave(formData);
    };

    const handleToggleMember = (userId: string) => {
        setFormData(prev => {
            const currentMembers = prev.members || [];
            const newMembers = currentMembers.includes(userId) 
                ? currentMembers.filter(id => id !== userId) 
                : [...currentMembers, userId];
            return { ...prev, members: newMembers };
        });
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={team ? 'Editar Equipo' : 'Nuevo Equipo'}>
            <div className="space-y-6">
                {/* Input Safe Pattern: Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Equipo *</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">group_work</span>
                        </div>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Ej. Ventas Occidente"
                        />
                    </div>
                </div>

                {/* Input Safe Pattern: Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                    <div className="relative">
                        <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">description</span>
                        </div>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Describe el propósito de este equipo..."
                        />
                    </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <UserSelector 
                        label="Miembros del Equipo" 
                        users={users} 
                        selectedUserIds={formData.members || []} 
                        onToggleUser={handleToggleMember} 
                    />
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                        Guardar Equipo
                    </button>
                </div>
            </div>
        </Drawer>
    );
};

const TeamManagement: React.FC = () => {
    const { data: initialTeams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    
    const [teams, setTeams] = useState<Team[] | null>(null);
    const [filter, setFilter] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    
    useEffect(() => {
        if (initialTeams) {
            setTeams(initialTeams);
        }
    }, [initialTeams]);

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

    const stats = useMemo(() => {
        if (!teams) return { totalTeams: 0, totalMembers: 0, avgMembers: 0 };
        const totalMembers = teams.reduce((sum, t) => sum + t.members.length, 0);
        return {
            totalTeams: teams.length,
            totalMembers,
            avgMembers: teams.length > 0 ? Math.round(totalMembers / teams.length) : 0
        };
    }, [teams]);

    const filteredTeams = useMemo(() => {
        if (!teams) return [];
        return teams.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
    }, [teams, filter]);

    const handleSaveTeam = async (teamData: Partial<Team>) => {
        try {
            if (editingTeam) {
                await api.updateDoc('teams', editingTeam.id, teamData);
                setTeams(prev => prev ? prev.map(t => t.id === editingTeam.id ? { ...t, ...teamData } as Team : t) : []);
            } else {
                const newTeam = await api.addDoc('teams', teamData);
                setTeams(prev => prev ? [...prev, newTeam] : [newTeam]);
            }
            setIsDrawerOpen(false);
            setEditingTeam(null);
        } catch (error) {
            console.error("Error saving team:", error);
            alert("Error al guardar el equipo.");
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        const team = teams?.find(t => t.id === teamId);
        if (team && team.members.length > 0) {
            alert('No se puede eliminar un equipo con miembros. Por favor, reasigna los miembros primero.');
            return;
        }

        if (window.confirm(`¿Estás seguro de que quieres eliminar el equipo "${team?.name}"?`)) {
            try {
                await api.deleteDoc('teams', teamId);
                setTeams(prev => prev!.filter(t => t.id !== teamId));
            } catch (error) {
                console.error("Error deleting team:", error);
                alert("No se pudo eliminar el equipo.");
            }
        }
    };

    const openCreate = () => {
        setEditingTeam(null);
        setIsDrawerOpen(true);
    };

    const openEdit = (team: Team) => {
        setEditingTeam(team);
        setIsDrawerOpen(true);
    };

    if (teamsLoading || usersLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Organiza a tus usuarios en equipos para una mejor colaboración.</p>
                </div>
                <button 
                    onClick={openCreate} 
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 font-semibold"
                >
                    <span className="material-symbols-outlined">group_add</span>
                    Crear Equipo
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <TeamKpiCard title="Total Equipos" value={stats.totalTeams} icon="groups" color="indigo" />
                <TeamKpiCard title="Miembros Asignados" value={stats.totalMembers} icon="person_check" color="emerald" />
                <TeamKpiCard title="Promedio por Equipo" value={stats.avgMembers} icon="pie_chart" color="purple" />
            </div>

            {/* Search & Filter */}
            <div className="space-y-4">
                {/* Input Safe Pattern for Search */}
                <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar equipos..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                </div>

                {filteredTeams.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
                            <span className="material-symbols-outlined text-3xl text-slate-400">group_off</span>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No se encontraron equipos</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Intenta ajustar tu búsqueda o crea un nuevo equipo.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredTeams.map(team => (
                            <TeamCard 
                                key={team.id} 
                                team={team} 
                                usersMap={usersMap} 
                                onEdit={() => openEdit(team)} 
                                onDelete={() => handleDeleteTeam(team.id)} 
                            />
                        ))}
                    </div>
                )}
            </div>

            <TeamDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
                onSave={handleSaveTeam} 
                team={editingTeam}
                users={users || []}
            />
        </div>
    );
};

export default TeamManagement;