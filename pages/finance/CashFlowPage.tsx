import React, { useMemo } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { Invoice, Expense } from '../../types';
import Spinner from '../../components/ui/Spinner';

const CashFlowPage: React.FC = () => {
    const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>('invoices');
    const { data: expenses, loading: expensesLoading } = useCollection<Expense>('expenses');

    const { monthlyData, netBalance, maxAmount } = useMemo(() => {
        if (!invoices || !expenses) return { monthlyData: [], netBalance: 0, maxAmount: 0 };

        const data: { [key: string]: { income: number, expense: number } } = {};
        const monthLabels: string[] = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
            monthLabels.push(monthLabel);
            data[monthLabel] = { income: 0, expense: 0 };
        }

        invoices.forEach(inv => {
            if (inv.paidAmount > 0) {
                const invDate = new Date(inv.createdAt); // Approximation
                const monthLabel = invDate.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
                if (data[monthLabel]) {
                    data[monthLabel].income += inv.paidAmount;
                }
            }
        });

        expenses.forEach(exp => {
            const expDate = new Date(exp.date);
            const monthLabel = expDate.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
            if (data[monthLabel]) {
                data[monthLabel].expense += exp.amount;
            }
        });

        const finalData = monthLabels.map(label => ({
            month: label,
            ...data[label],
            net: data[label].income - data[label].expense
        }));

        const net = finalData.reduce((sum, d) => sum + d.net, 0);
        const max = Math.max(...finalData.map(d => Math.max(d.income, d.expense)));

        return { monthlyData: finalData, netBalance: net, maxAmount: max };
    }, [invoices, expenses]);

    const loading = invoicesLoading || expensesLoading;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-on-surface">Flujo de Caja</h1>

            {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
                <>
                    <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
                        <p className="text-sm font-semibold text-on-surface-secondary">Balance Neto (Últimos 6 meses)</p>
                        <p className={`text-4xl font-bold mt-1 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${netBalance.toLocaleString('en-US', {minimumFractionDigits: 0})}
                        </p>
                    </div>

                    <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
                        <h3 className="text-lg font-semibold mb-4">Ingresos vs. Gastos (Últimos 6 meses)</h3>
                        <div className="flex items-end h-64 space-x-4 border-l border-b border-border p-4">
                            {monthlyData.map(({ month, income, expense }) => (
                                <div key={month} className="flex-1 flex flex-col items-center justify-end h-full">
                                    <div className="flex items-end h-full w-full gap-1 justify-center">
                                         <div 
                                            className="w-1/2 bg-green-400 rounded-t-sm hover:bg-green-500" 
                                            style={{ height: `${maxAmount > 0 ? (income / maxAmount) * 100 : 0}%` }}
                                            title={`Ingresos: $${income.toLocaleString()}`}
                                        ></div>
                                         <div 
                                            className="w-1/2 bg-red-400 rounded-t-sm hover:bg-red-500" 
                                            style={{ height: `${maxAmount > 0 ? (expense / maxAmount) * 100 : 0}%` }}
                                            title={`Gastos: $${expense.toLocaleString()}`}
                                        ></div>
                                    </div>
                                    <p className="text-xs mt-2 text-center text-on-surface-secondary capitalize">{month}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-surface rounded-xl shadow-sm border border-border">
                         <table className="min-w-full text-sm">
                            <thead className="bg-background"><tr>
                                <th className="p-3 text-left font-semibold text-on-surface-secondary">Mes</th>
                                <th className="p-3 text-right font-semibold text-on-surface-secondary">Ingresos</th>
                                <th className="p-3 text-right font-semibold text-on-surface-secondary">Gastos</th>
                                <th className="p-3 text-right font-semibold text-on-surface-secondary">Flujo Neto</th>
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                                {monthlyData.map(({ month, income, expense, net }) => (
                                    <tr key={month}>
                                        <td className="p-3 font-medium capitalize">{month}</td>
                                        <td className="p-3 text-right text-green-600">${income.toLocaleString()}</td>
                                        <td className="p-3 text-right text-red-600">${expense.toLocaleString()}</td>
                                        <td className={`p-3 text-right font-semibold ${net >= 0 ? 'text-on-surface' : 'text-red-600'}`}>${net.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default CashFlowPage;
