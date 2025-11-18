import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Role } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { api } from '../../api/firebaseApi';

const RoleManagementPage: React.FC = () => {
    const { data: initialRoles, loading, error } = useCollection<Role>('roles');
    const [roles, setRoles] = useState<Role[] | null>(initialRoles);
    const navigate = useNavigate();

    React.useEffect(() => {
        setRoles(initialRoles);
    }, [initialRoles]);

    const handleDeleteRole = async (roleId: string, roleName: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el rol "${roleName}"? Esta acción no se puede deshacer.`)) {
            try {
                await api.deleteDoc('roles', roleId);
                setRoles(prev => prev!.filter(r => r.id !== roleId));
                alert('Rol eliminado con éxito.');
            } catch (err) {
                console.error("Error deleting role:", err);
                alert('No se pudo eliminar el rol. Asegúrate de que no haya usuarios asignados a este rol.');
            }
        }
    };

    const columns = [
        {
            header: 'Nombre del Rol',
            accessor: (role: Role) => <span className="font-medium text-slate-800 dark:text-slate-200">{role.name}</span>,
        },
        {
            header: 'Descripción',
            accessor: (role: Role) => <span className="text-sm text-slate-500 dark:text-slate-400">{role.description}</span>,
        },
        {
            header: 'Acciones',
            accessor: (role: Role) => (
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => navigate(`/settings/roles/${role.id}/edit`)} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        Editar
                    </button>
                    <button onClick={() => handleDeleteRole(role.id, role.name)} className="p-2 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                        <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                </div>
            ),
            className: 'text-right',
        },
    ];

    const renderContent = () => {
        if (loading) return <Spinner />;
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
        return <Table columns={columns} data={roles} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Roles y Permisos</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Crea y gestiona los roles para controlar el acceso en la plataforma.</p>
                </div>
                <button onClick={() => navigate('/settings/roles/new/edit')} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Crear Rol
                </button>
            </div>
            {renderContent()}
        </div>
    );
};

export default RoleManagementPage;