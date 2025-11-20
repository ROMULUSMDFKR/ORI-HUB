
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Candidate, CandidateStatus, ImportHistory, User } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

// --- Reusable UI Components ---

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-4xl font-bold mt-2 text-slate-800 dark:text-slate-200">{value}</p>
        </div>
        <span className="material-symbols-outlined text-3xl text-indigo-500">{icon}</span>
      </div>
    </div>
);

const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulative = 0;
  
    return (
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="3"></circle>
            {data.map(item => {
                if (item.value === 0) return null;
                const percentage = (item.value / total) * 100;
                const offset = cumulative;
                cumulative += percentage;
                return (
                    <circle
                        key={item.label}
                        cx="18" cy="18" r="15.91549430918954"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="3"
                        strokeDasharray={`${percentage} ${100 - percentage}`}
                        strokeDashoffset={`-${offset}`}
                        transform="rotate(-90 18 18)"
                    ></circle>
                );
            })}
          </svg>
           <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{total}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
            </div>
        </div>
        <div className="space-y-2">
          {data.map(item => (
            <div key={item.label} className="flex items-center text-sm">
              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
              <span className="font-medium text-slate-600 dark:text-slate-400">{item.label}:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 ml-1">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
};


const ProspectingDashboardPage: React.FC = () => {
    const { data: candidates, loading: cLoading } = useCollection<Candidate>('candidates');
    // Ensure optional chaining to avoid crashes if activityLog is missing
    const safeCandidates = useMemo(() => candidates?.map(c => ({
        ...c,
        activityLog: c.activityLog || []
    })) || [], [candidates]);

    const { data: importHistory, loading: hLoading } = useCollection<ImportHistory>('importHistory');
    const { data: users, loading: uLoading } = useCollection<User>('users');

    const loading = cLoading || hLoading || uLoading;
    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);

    const kpiData = useMemo(() => {
        if (!safeCandidates || !importHistory) return null;
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const isThisMonth = (isoDate: string) => {
            const date = new Date(isoDate);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        };

        const approvedThisMonth = safeCandidates.filter(c => 
            c.status === CandidateStatus.Aprobado && 
            c.activityLog?.some((log: any) => 
                log.type === 'Cambio de Estado' && log.description.includes('Aprobado') && isThisMonth(log.createdAt)
            )
        ).length;

        const newThisMonth = importHistory
            .filter(h => isThisMonth(h.importedAt))
            .reduce((sum, h) => sum + h.newCandidates, 0);

        return {
            total: safeCandidates.length,
            pending: safeCandidates.filter(c => c.status === CandidateStatus.Pendiente).length,
            approvedThisMonth: approvedThisMonth,
            newThisMonth: newThisMonth,
        };
    }, [safeCandidates, importHistory]);
    
    const statusDistribution = useMemo(() => {
        if (!safeCandidates) return [];
        const counts = safeCandidates.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
        }, {} as Record<CandidateStatus, number>);

        return [
            { label: 'Pendiente', value: counts[CandidateStatus.Pendiente] || 0, color: '#f59e0b' },
            { label: 'Aprobado', value: counts[CandidateStatus.Aprobado] || 0, color: '#10b981' },
            { label: 'Rechazado', value: counts[CandidateStatus.Rechazado] || 0, color: '#6b7280' },
            { label: 'Lista Negra', value: counts[CandidateStatus.ListaNegra] || 0, color: '#ef4444' },
        ];
    }, [safeCandidates]);
    
    const recentHistory = useMemo(() => 
        (importHistory || []).sort((a,b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()).slice(0, 5)
    , [importHistory]);
    
    const recentCandidates = useMemo(() => 
        (safeCandidates || []).sort((a,b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()).slice(0, 5)
    , [safeCandidates]);

    if (loading || !kpiData) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total de Candidatos" value={kpiData.total} icon="groups" />
                <KpiCard title="Pendientes de Revisión" value={kpiData.pending} icon="pending" />
                <KpiCard title="Aprobados este Mes" value={kpiData.approvedThisMonth} icon="check_circle" />
                <KpiCard title="Nuevos este Mes" value={kpiData.newThisMonth} icon="group_add" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Estado de Candidatos</h3>
                    <DonutChart data={statusDistribution} />
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Historial de Importaciones Recientes</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-slate-500 dark:text-slate-400 uppercase"><tr>
                                <th className="p-2">Fecha</th><th className="p-2">Criterio</th><th className="p-2">Nuevos</th><th className="p-2">Omitidos</th><th className="p-2">Usuario</th>
                            </tr></thead>
                            <tbody>
                                {recentHistory.map(h => (
                                    <tr key={h.id} className="border-t border-slate-200 dark:border-slate-700">
                                        <td className="p-2 whitespace-nowrap">{new Date(h.importedAt).toLocaleDateString()}</td>
                                        <td className="p-2 truncate max-w-xs">{h.searchCriteria.searchTerms[0]}...</td>
                                        <td className="p-2 text-green-600 font-semibold">{h.newCandidates}</td>
                                        <td className="p-2">{h.duplicatesSkipped}</td>
                                        <td className="p-2">{usersMap.get(h.importedById)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Candidatos Recién Añadidos</h3>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {recentCandidates.map(candidate => (
                        <li key={candidate.id} className="py-3">
                            <Link to={`/prospecting/candidates/${candidate.id}`} className="flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-md">
                                <div>
                                    <p className="font-semibold text-indigo-600 dark:text-indigo-400">{candidate.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{candidate.address}</p>
                                </div>
                                <Badge text={candidate.status} />
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ProspectingDashboardPage;
