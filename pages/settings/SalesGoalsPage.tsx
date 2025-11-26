
import React, { useState, useEffect } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { User, SalesGoalSettings, ProductGoal, Product, Unit } from '../../types';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api/firebaseApi';
import CustomSelect from '../../components/ui/CustomSelect';
import { UNITS } from '../../constants';

const SalesGoalsPage: React.FC = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    
    const [goals, setGoals] = useState<ProductGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Users who should have goals (Sales role or Sales Dashboard active)
    const salesUsers = React.useMemo(() => {
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
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Metas de Producto (Volumen)</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Define objetivos mensuales de venta por producto y asígnalos a tu equipo.</p>
                </div>
                <div className="flex gap-2">
                     <button 
                        onClick={handleAddGoal} 
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Agregar Producto
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        Guardar Cambios
                    </button>
                </div>
            </div>

            {goals.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">flag</span>
                    <p className="text-slate-500 dark:text-slate-400">No has configurado ninguna meta de producto.</p>
                    <button onClick={handleAddGoal} className="text-indigo-600 dark:text-indigo-400 font-semibold mt-2 hover:underline">Agregar la primera meta</button>
                </div>
            ) : (
                <div className="space-y-8">
                    {goals.map((goal, index) => {
                         // Explicitly cast values to numbers to avoid TS errors in arithmetic operations
                         const assignedTotal = (Object.values(goal.userTargets || {}) as number[]).reduce((a, b) => a + b, 0);
                         const progress = goal.globalMonthlyTarget > 0 ? (assignedTotal / goal.globalMonthlyTarget) * 100 : 0;
                         const isOverAssigned = assignedTotal > goal.globalMonthlyTarget;

                         return (
                            <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                {/* Header Card */}
                                <div className="p-6 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Producto Objetivo</label>
                                            <CustomSelect 
                                                options={productOptions} 
                                                value={goal.productId} 
                                                onChange={(val) => handleGoalChange(goal.id, 'productId', val)}
                                                placeholder="Seleccionar producto..."
                                                buttonClassName="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm text-left"
                                            />
                                        </div>
                                        <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meta Global Mensual</label>
                                             <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    value={goal.globalMonthlyTarget} 
                                                    onChange={(e) => handleGoalChange(goal.id, 'globalMonthlyTarget', parseFloat(e.target.value) || 0)}
                                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm font-bold"
                                                />
                                                <div className="w-24">
                                                     <CustomSelect 
                                                        options={unitOptions} 
                                                        value={goal.unit} 
                                                        onChange={(val) => handleGoalChange(goal.id, 'unit', val)}
                                                        buttonClassName="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-2 text-sm text-center"
                                                    />
                                                </div>
                                             </div>
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-500">Asignado a Vendedores</span>
                                                <span className={isOverAssigned ? 'text-red-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                                                    {assignedTotal.toLocaleString()} / {goal.globalMonthlyTarget.toLocaleString()} {goal.unit}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                                <div className={`h-2 rounded-full transition-all duration-500 ${isOverAssigned ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveGoal(goal.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>

                                {/* User Allocation Table */}
                                <div className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                            <tr>
                                                <th className="px-6 py-3 w-1/2">Vendedor</th>
                                                <th className="px-6 py-3 w-1/2 text-right">Cuota Individual ({goal.unit})</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {salesUsers.map(user => (
                                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                    <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-3">
                                                        <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full bg-slate-200" />
                                                        {user.name}
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <input 
                                                            type="number" 
                                                            value={goal.userTargets?.[user.id] || 0} 
                                                            onChange={(e) => handleUserTargetChange(goal.id, user.id, e.target.value)}
                                                            className="w-32 text-right bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 focus:ring-indigo-500 transition-colors"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
