
import React, { useState, useEffect, useMemo } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { User, SalesGoalSettings, ProductGoal, Product, Unit } from '../../types';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api/firebaseApi';
import CustomSelect from '../../components/ui/CustomSelect';
import { UNITS } from '../../constants';

// --- Helper Components ---

// KPI Card following "App Icon Pattern"
const GoalKpiCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
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

const SalesGoalsPage: React.FC = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    
    const [goals, setGoals] = useState<ProductGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Users who should have goals (Sales role or Sales Dashboard active)
    const salesUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(u => 
            u.role === 'Ventas' || 
            u.activeDashboards?.includes('sales') || 
            u.role === 'Admin'
        );
    }, [users]);

    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const settings = await api.getDoc('settings', 'salesGoals');
                if (settings && settings.goals) {
                    setGoals(settings.goals);
                } else {
                    // Backward compatibility or init
                    setGoals([]);
                }
            } catch (error) {
                console.error("Error fetching sales goals:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGoals();
    }, []);

    // Stats Calculation
    const stats = useMemo(() => {
        const totalProducts = goals.length;
        // Sum global targets (assuming generic units for simple sum or mixed, strictly this should be per unit)
        const totalGlobalVolume = goals.reduce((sum, g) => sum + (g.globalMonthlyTarget || 0), 0);
        
        const totalAssignedVolume = goals.reduce((sum, g) => {
             const goalAssigned = (Object.values(g.userTargets || {}) as number[]).reduce((a, b) => a + b, 0);
             return sum + goalAssigned;
        }, 0);

        // Coverage percentage
        const coverage = totalGlobalVolume > 0 ? (totalAssignedVolume / totalGlobalVolume) * 100 : 0;

        return {
            totalProducts,
            totalGlobalVolume,
            totalAssignedVolume,
            coverage
        };
    }, [goals]);

    const handleAddGoal = () => {
        const newGoal: ProductGoal = {
            id: `goal-${Date.now()}`,
            productId: '',
            unit: 'ton',
            globalMonthlyTarget: 0,
            userTargets: {}
        };
        setGoals([...goals, newGoal]);
    };

    const handleRemoveGoal = (goalId: string) => {
        if (confirm('¿Estás seguro de eliminar esta meta de producto?')) {
            setGoals(prev => prev.filter(g => g.id !== goalId));
        }
    };

    const handleGoalChange = (goalId: string, field: keyof ProductGoal, value: any) => {
        setGoals(prev => prev.map(g => {
            if (g.id !== goalId) return g;
            const updated = { ...g, [field]: value };
            
            // If changing product ID, try to auto-set unit and name
            if (field === 'productId' && products) {
                const prod = products.find(p => p.id === value);
                if (prod) {
                    updated.productName = prod.name;
                    updated.unit = prod.unitDefault;
                }
            }
            return updated;
        }));
    };

    const handleUserTargetChange = (goalId: string, userId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setGoals(prev => prev.map(g => {
            if (g.id !== goalId) return g;
            return {
                ...g,
                userTargets: {
                    ...g.userTargets,
                    [userId]: numValue
                }
            };
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const settingsData: SalesGoalSettings = {
                id: 'salesGoals',
                goals: goals,
                updatedAt: new Date().toISOString()
            };
            await api.setDoc('settings', 'salesGoals', settingsData);
            alert('Metas actualizadas correctamente.');
        } catch (error) {
            console.error("Error saving goals:", error);
            alert('Error al guardar las metas.');
        } finally {
            setSaving(false);
        }
    };

    if (usersLoading || loading || productsLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

    const productOptions = (products || []).map(p => ({ value: p.id, name: p.name }));
    const unitOptions = UNITS.map(u => ({ value: u, name: u }));

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Metas Comerciales</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Define objetivos mensuales de venta por producto y asígnalos a tu equipo.</p>
                </div>
                <div className="flex gap-3">
                     <button 
                        onClick={handleAddGoal} 
                        className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-5 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">add_circle</span>
                        Agregar Producto
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span> : <span className="material-symbols-outlined text-xl">save</span>}
                        Guardar Cambios
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <GoalKpiCard title="Productos con Meta" value={stats.totalProducts.toString()} icon="inventory_2" color="indigo" />
                <GoalKpiCard title="Volumen Global" value={stats.totalGlobalVolume.toLocaleString()} icon="flag" color="blue" />
                <GoalKpiCard title="Cobertura Asignada" value={`${stats.coverage.toFixed(1)}%`} icon="pie_chart" color={stats.coverage >= 100 ? "emerald" : "amber"} />
            </div>

            {goals.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-indigo-400">flag</span>
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay metas configuradas</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                        Comienza agregando un producto para establecer sus objetivos globales e individuales.
                    </p>
                    <button onClick={handleAddGoal} className="mt-6 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                        Agregar primera meta
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {goals.map((goal, index) => {
                         // Explicitly cast values to numbers to avoid TS errors in arithmetic operations
                         const assignedTotal = (Object.values(goal.userTargets || {}) as number[]).reduce((a, b) => a + b, 0);
                         const progress = goal.globalMonthlyTarget > 0 ? (assignedTotal / goal.globalMonthlyTarget) * 100 : 0;
                         const isOverAssigned = assignedTotal > goal.globalMonthlyTarget;
                         const progressColor = isOverAssigned ? 'bg-amber-500' : (progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500');

                         return (
                            <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-shadow hover:shadow-md">
                                {/* Header Card */}
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-end">
                                            
                                            {/* Product Selector */}
                                            <div className="md:col-span-4">
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Producto Objetivo</label>
                                                <CustomSelect 
                                                    options={productOptions} 
                                                    value={goal.productId} 
                                                    onChange={(val) => handleGoalChange(goal.id, 'productId', val)}
                                                    placeholder="Seleccionar producto..."
                                                />
                                            </div>
                                            
                                            {/* Global Target - Safe Pattern */}
                                            <div className="md:col-span-4">
                                                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Meta Global Mensual</label>
                                                 <div className="flex gap-3">
                                                    <div className="relative flex-1">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">flag</span>
                                                        </div>
                                                        <input 
                                                            type="number" 
                                                            value={goal.globalMonthlyTarget} 
                                                            onChange={(e) => handleGoalChange(goal.id, 'globalMonthlyTarget', parseFloat(e.target.value) || 0)}
                                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div className="w-32">
                                                         <CustomSelect 
                                                            options={unitOptions} 
                                                            value={goal.unit} 
                                                            onChange={(val) => handleGoalChange(goal.id, 'unit', val)}
                                                        />
                                                    </div>
                                                 </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="md:col-span-4 pb-1">
                                                <div className="flex justify-between text-xs mb-2">
                                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Asignado a Vendedores</span>
                                                    <span className={`font-bold ${isOverAssigned ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {assignedTotal.toLocaleString()} / {goal.globalMonthlyTarget.toLocaleString()} {goal.unit}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor}`} 
                                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Delete Action */}
                                        <button 
                                            onClick={() => handleRemoveGoal(goal.id)} 
                                            className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors"
                                            title="Eliminar Meta"
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    </div>
                                </div>

                                {/* User Allocation Table */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4">
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-6 py-3 font-semibold">Vendedor</th>
                                                    <th className="px-6 py-3 font-semibold text-right">Cuota Individual ({goal.unit})</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {salesUsers.map(user => (
                                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-slate-200 object-cover" />
                                                                <span className="font-medium text-slate-700 dark:text-slate-300">{user.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            {/* Input Safe Pattern within table */}
                                                            <div className="relative inline-block w-40">
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                    <span className="material-symbols-outlined h-4 w-4 text-gray-400">target</span>
                                                                </div>
                                                                <input 
                                                                    type="number" 
                                                                    value={goal.userTargets?.[user.id] || 0} 
                                                                    onChange={(e) => handleUserTargetChange(goal.id, user.id, e.target.value)}
                                                                    className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm text-right bg-white dark:bg-slate-900 dark:text-slate-100 font-medium"
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                         );
                    })}
                </div>
            )}
        </div>
    );
};

export default SalesGoalsPage;
