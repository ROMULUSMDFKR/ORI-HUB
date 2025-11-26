import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Role } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { api } from '../../api/firebaseApi';

// KPI Card following "App Icon Pattern"
const RoleKpiCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
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

const RoleManagementPage: React.FC = () => {
    const { data: initialRoles, loading, error } = useCollection<Role>('roles');
    const [roles, setRoles] = useState<Role[] | null>(null);
    const [filter, setFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (initialRoles) {
            setRoles(initialRoles);
        }
    }, [initialRoles]);

    const handleDeleteRole = async (roleId: string, roleName: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el rol "${roleName}"? Esta acción no se puede deshacer.`)) {
            try {
                await api.deleteDoc('roles', roleId);
                setRoles(prev => prev ? prev.filter(r => r.id !== roleId) : null);
            } catch (err) {
                console.error("Error deleting role:", err);
                alert('No se pudo eliminar el rol. Asegúrate de que no haya usuarios asignados a este rol.');
            }
        }
    };

    const filteredRoles = useMemo(() => {
        if (!roles) return [];
        return roles.filter(role => 
            role.name.toLowerCase().includes(filter.toLowerCase()) ||
            role.description.toLowerCase().includes(filter.toLowerCase())
        );
    }, [roles, filter]);

    const stats = useMemo(() => {
        if (!roles) return { total: 0, adminAccess: 0, restricted: 0 };
        return {
            total: roles.length,
            adminAccess: roles.filter(r => r.permissions.dataScope === 'all').length,
            restricted: roles.filter(r => r.permissions.dataScope !== 'all').length
        };
    }, [roles]);

    const columns = [
        {
            header: 'Rol',
            accessor: (role: Role) => (
                <div className="flex items-center gap-3">
                    {/* App Icon Pattern for Role Avatar */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        <span className="material-symbols-outlined text-xl">badge</span>
                    </div>
                    <div>
                         <p className="font-bold text-slate-900 dark:text-slate-100">{role.name}</p>
                    </div>
                </div>
            ),
        },
        {
            header: 'Descripción',
            accessor: (role: Role) => <span className="text-sm text-slate-500 dark:text-slate-400">{role.description}</span>,
        },
        {
            header: 'Alcance de Datos',
            accessor: (role: Role) => {
                const scopeLabels = { all: 'Global', team: 'Equipo', own: 'Propio' };
                const colorClass = role.permissions.dataScope === 'all' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
                return (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                        {scopeLabels[role.permissions.dataScope] || role.permissions.dataScope}
                    </span>
                );
            }
        },
        {
            header: 'Acciones',
            accessor: (role: Role) => (
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => navigate(`/settings/roles/${role.id}/edit`)} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Editar">
                         <span className="material-symbols-outlined text-xl">edit_square</span>
                    </button>
                    <button onClick={() => handleDeleteRole(role.id, role.name)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors" title="Eliminar">
                        <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                </div>
            ),
            className: 'text-right',
        },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-red-500">Error al cargar los roles.</p>;
        if (!roles || roles.length === 0) {
            return (
                <EmptyState
                    icon="admin_panel_settings"
                    title="No hay roles creados"
                    message="Crea tu primer rol para empezar a definir los permisos de tus usuarios."
                    actionText="Crear Rol"
                    onAction={() => navigate('/settings/roles/new/edit')}
                />
            );
        }
        return <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"><Table columns={columns} data={filteredRoles} /></div>;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Crea y gestiona los roles para controlar el acceso en la plataforma.</p>
                </div>
                <button 
                    onClick={() => navigate('/settings/roles/new/edit')} 
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 font-semibold"
                >
                    <span className="material-symbols-outlined">add_moderator</span>
                    Crear Rol
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <RoleKpiCard title="Total Roles" value={stats.total} icon="shield_person" color="indigo" />
                <RoleKpiCard title="Acceso Global" value={stats.adminAccess} icon="public" color="purple" />
                <RoleKpiCard title="Acceso Restringido" value={stats.restricted} icon="lock_person" color="emerald" />
            </div>

            {/* Search & Table */}
             <div className="space-y-4">
                {/* Input Safe Pattern */}
                <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar roles por nombre..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                </div>
                
                {renderContent()}
             </div>
        </div>
    );
};

export default RoleManagementPage;