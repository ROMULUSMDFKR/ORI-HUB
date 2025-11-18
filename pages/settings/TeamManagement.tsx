
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { Team, User } from '../../types';
import { api } from '../../api/firebaseApi';
import Spinner from '../../components/ui/Spinner';

const TeamActionsMenu: React.FC<{ team: Team; onDelete: (teamId: string) => void }> = ({ team, onDelete }) => {
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
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 -mt-2 -mr-2">
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">more_vert</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-10 border border-slate-200 dark:border-slate-700 py-1">
                    <ul>
                        <li><button className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><span className="material-symbols-outlined mr-3 text-base">edit</span>Editar</button></li>
                        <li><button onClick={() => onDelete(team.id)} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><span className="material-symbols-outlined mr-3 text-base">delete</span>Eliminar</button></li>
                    </ul>
                </div>
            )}
        </div>
    );
};


const TeamCard: React.FC<{ team: Team, usersMap: Map<string, User>, onDelete: (teamId: string) => void }> = ({ team, usersMap, onDelete }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{team.name}</h3>
                <TeamActionsMenu team={team} onDelete={onDelete} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 min-h-[40px]">{team.description}</p>

            <div className="mt-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex -space-x-2">
                    {team.members.map(userId => {
                        const user = usersMap.get(userId);
                        return user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800" /> : null;
                    })}
                </div>
                 <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{team.members.length} miembro(s)</span>
            </div>
        </div>
    );
};

const TeamManagement: React.FC = () => {
    const { data: initialTeams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const [teams, setTeams] = useState<Team[] | null>(null);
    
    useEffect(() => {
        if (initialTeams) {
            setTeams(initialTeams);
        }
    }, [initialTeams]);

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

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
                alert('Equipo eliminado.');
            } catch (error) {
                console.error("Error deleting team:", error);
                alert("No se pudo eliminar el equipo.");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Equipos</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Organiza a tus usuarios en equipos para una mejor colaboración.</p>
                </div>
                <button onClick={() => alert('Abriendo modal para crear equipo...')} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Crear Equipo
                </button>
            </div>

            {teamsLoading || usersLoading ? (
                 <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(teams || []).map(team => <TeamCard key={team.id} team={team} usersMap={usersMap || new Map()} onDelete={handleDeleteTeam} />)}
                </div>
            )}
        </div>
    );
};

export default TeamManagement;
