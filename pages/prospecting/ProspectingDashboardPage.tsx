
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Candidate, CandidateStatus, ImportHistory, User } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import FilterButton from '../../components/ui/FilterButton';

// --- Reusable UI Components ---

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
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

const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulative = 0;
  
    return (
      <div className="flex items-center gap-8">
        <div className="relative w-36 h-36 flex-shrink-0">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="3" className="dark:stroke-slate-700"></circle>
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
                        className="transition-all duration-1000 ease-out"
                    ></circle>
                );
            })}
          </svg>
           <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-800 dark:text-slate-200">{total}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</span>
            </div>
        </div>
        <div className="space-y-3 flex-1">
          {data.map(item => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
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

    const [period, setPeriod] = useState('this_month');

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
    
    const periodOptions = [
        { value: 'this_month', label: 'Este Mes' },
        { value: 'last_month', label: 'Mes Pasado' },
        { value: 'this_year', label: 'Este Año' },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard de Prospección</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor de adquisición de candidatos y eficiencia de importación.</p>
                </div>
                <div className="flex items-center gap-3">
                    <FilterButton 
                        label="Periodo" 
                        options={periodOptions} 
                        selectedValue={period} 
                        onSelect={setPeriod} 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total de Candidatos" value={kpiData.total.toLocaleString()} icon="groups" color="indigo" />
                <KpiCard title="Pendientes de Revisión" value={kpiData.pending.toLocaleString()} icon="pending" color="amber" />
                <KpiCard title="Aprobados (Mes)" value={kpiData.approvedThisMonth.toLocaleString()} icon="check_circle" color="emerald" />
                <KpiCard title="Nuevos (Mes)" value={kpiData.newThisMonth.toLocaleString()} icon="group_add" color="blue" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                         <span className="material-symbols-outlined text-indigo-500">pie_chart</span>
                         Estado de Candidatos
                    </h3>
                    <DonutChart data={statusDistribution} />
                </div>
                
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">history</span>
                            Importaciones Recientes
                        </h3>
                        <Link to="/prospecting/history" className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Ver historial</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <tr>
                                    <th className="p-3 rounded-l-lg">Fecha</th>
                                    <th className="p-3">Criterio</th>
                                    <th className="p-3 text-center">Nuevos</th>
                                    <th className="p-3 text-center">Omitidos</th>
                                    <th className="p-3 rounded-r-lg">Usuario</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {recentHistory.map(h => (
                                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="p-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">{new Date(h.importedAt).toLocaleDateString()}</td>
                                        <td className="p-3 truncate max-w-xs text-slate-600 dark:text-slate-400">{h.searchCriteria.searchTerms[0]}...</td>
                                        <td className="p-3 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">{h.newCandidates}</span></td>
                                        <td className="p-3 text-center text-slate-500">{h.duplicatesSkipped}</td>
                                        <td className="p-3 text-slate-600 dark:text-slate-300">{usersMap.get(h.importedById) || 'Sistema'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">new_releases</span>
                        Candidatos Recién Añadidos
                    </h3>
                    <Link to="/prospecting/candidates" className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Ir a Candidatos</Link>
                </div>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {recentCandidates.map(candidate => (
                        <li key={candidate.id} className="py-3">
                            <Link to={`/prospecting/candidates/${candidate.id}`} className="flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 p-3 rounded-xl transition-all group">
                                <div className="flex items-center gap-4">
                                    {/* App Icon Pattern */}
                                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 dark:group-hover:bg-indigo-900/30 dark:group-hover:text-indigo-400 transition-colors">
                                         <span className="material-symbols-outlined text-xl">person</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{candidate.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{candidate.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-slate-400 hidden sm:block">{new Date(candidate.importedAt).toLocaleDateString()}</span>
                                    <Badge text={candidate.status} />
                                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ProspectingDashboardPage;
