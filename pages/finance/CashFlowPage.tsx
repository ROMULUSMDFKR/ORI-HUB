
import React, { useMemo, useState } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { Invoice, Expense } from '../../types';
import Spinner from '../../components/ui/Spinner';

// Helper components
const FlowKpiCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    }[color] || "bg-slate-100 text-slate-600";

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h4 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
            </div>
        </div>
    );
};

const CashFlowPage: React.FC = () => {
    const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>('invoices');
    const { data: expenses, loading: expensesLoading } = useCollection<Expense>('expenses');
    const [timeRange, setTimeRange] = useState<number>(6); // Months

    const { monthlyData, netBalance, maxAmount } = useMemo(() => {
        if (!invoices || !expenses) return { monthlyData: [], netBalance: 0, maxAmount: 0 };

        const data: { [key: string]: { income: number, expense: number } } = {};
        const monthLabels: string[] = [];
        const now = new Date();

        for (let i = timeRange - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
            monthLabels.push(monthLabel);
            data[monthLabel] = { income: 0, expense: 0 };
        }

        // Calculate date threshold
        const thresholdDate = new Date(now.getFullYear(), now.getMonth() - timeRange + 1, 1);

        invoices.forEach(inv => {
            if (inv.paidAmount > 0) {
                const invDate = new Date(inv.createdAt); 
                if (invDate >= thresholdDate) {
                    const monthLabel = invDate.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
                    if (data[monthLabel]) {
                        data[monthLabel].income += inv.paidAmount;
                    }
                }
            }
        });

        expenses.forEach(exp => {
            const expDate = new Date(exp.date);
            if (expDate >= thresholdDate) {
                 const monthLabel = expDate.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
                 if (data[monthLabel]) {
                     data[monthLabel].expense += exp.amount;
                 }
            }
        });

        const finalData = monthLabels.map(label => ({
            month: label,
            ...data[label],
            net: data[label].income - data[label].expense
        }));

        const net = finalData.reduce((sum, d) => sum + d.net, 0);
        const max = Math.max(...finalData.map(d => Math.max(d.income, d.expense)), 1); // Avoid division by zero

        return { monthlyData: finalData, netBalance: net, maxAmount: max };
    }, [invoices, expenses, timeRange]);

    const loading = invoicesLoading || expensesLoading;

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
             {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Flujo de Caja</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Análisis de liquidez y balance financiero.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex">
                    {[3, 6, 12].map(months => (
                        <button
                            key={months}
                            onClick={() => setTimeRange(months)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${timeRange === months ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            {months} Meses
                        </button>
                    ))}
                </div>
            </div>

             {/* KPIs */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FlowKpiCard title={`Balance Neto (Últimos ${timeRange} meses)`} value={`$${netBalance.toLocaleString('en-US', {minimumFractionDigits: 0})}`} icon="account_balance_wallet" color={netBalance >= 0 ? 'green' : 'blue'} />
                <FlowKpiCard title="Promedio Mensual" value={`$${(netBalance / timeRange).toLocaleString('en-US', {minimumFractionDigits: 0})}`} icon="analytics" color="blue" />
            </div>

            {/* Chart Section */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8">Comportamiento Financiero</h3>
                <div className="flex items-end h-72 space-x-4 sm:space-x-8 pb-4 border-b border-slate-200 dark:border-slate-700 px-4">
                    {monthlyData.map(({ month, income, expense }) => (
                        <div key={month} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            {/* Bars Container */}
                            <div className="flex items-end h-full w-full gap-1 justify-center sm:gap-2">
                                {/* Income Bar */}
                                <div 
                                    className="w-3 sm:w-6 bg-emerald-400 dark:bg-emerald-500 rounded-t-sm transition-all duration-500 hover:bg-emerald-500 dark:hover:bg-emerald-400 relative" 
                                    style={{ height: `${(income / maxAmount) * 100}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        Ing: ${income.toLocaleString()}
                                    </div>
                                </div>
                                {/* Expense Bar */}
                                <div 
                                    className="w-3 sm:w-6 bg-rose-400 dark:bg-rose-500 rounded-t-sm transition-all duration-500 hover:bg-rose-500 dark:hover:bg-rose-400 relative" 
                                    style={{ height: `${(expense / maxAmount) * 100}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        Gas: ${expense.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] sm:text-xs mt-3 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{month}</p>
                        </div>
                    ))}
                </div>
                 <div className="flex justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Ingresos</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Gastos</span>
                    </div>
                </div>
            </div>
            
            {/* Detailed Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                 <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Periodo</th>
                            <th className="px-6 py-4 text-right font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ingresos</th>
                            <th className="px-6 py-4 text-right font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gastos</th>
                            <th className="px-6 py-4 text-right font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Flujo Neto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {monthlyData.map(({ month, income, expense, net }) => (
                            <tr key={month} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 capitalize">{month}</td>
                                <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">${income.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-medium text-rose-600 dark:text-rose-400">${expense.toLocaleString()}</td>
                                <td className={`px-6 py-4 text-right font-bold ${net >= 0 ? 'text-slate-800 dark:text-slate-200' : 'text-red-600'}`}>
                                    ${net.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

export default CashFlowPage;
