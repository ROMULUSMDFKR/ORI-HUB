import React from 'react';
import { useCollection } from '../../hooks/useCollection';
import { Team, User } from '../../types';
import { MOCK_USERS } from '../../data/mockData';
import Spinner from '../../components/ui/Spinner';

const TeamCard: React.FC<{ team: Team }> = ({ team }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{team.name}</h3>
                <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 -mt-2 -mr-2"><span className="material-symbols-outlined text-slate-500 dark:text-slate-400">more_vert</span></button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 min-h-[40px]">{team.description}</p>

            <div className="mt-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex -space-x-2">
                    {team.members.map(userId => {
                        const user = MOCK_USERS[userId];
                        return user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800" /> : null;
                    })}
                </div>
                 <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{team.members.length} miembro(s)</span>
            </div>
        </div>
    );
};

const TeamManagement: React.FC = () => {
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');

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

            {teamsLoading ? (
                 <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(teams || []).map(team => <TeamCard key={team.id} team={team} />)}
                </div>
            )}
        </div>
    );
};

export default TeamManagement;