
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { useDoc } from '../hooks/useDoc';
import { User, Team, Company, Role } from '../types';
import Spinner from '../components/ui/Spinner';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import { api } from '../api/firebaseApi';
import CustomSelect from '../components/ui/CustomSelect';
import PermissionsEditor from '../components/settings/PermissionsEditor';
import { getDefaultPermissions } from '../constants';

const EditUserPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: user, loading: userLoading, error } = useDoc<User>('users', id || '');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { data: roles, loading: rolesLoading } = useCollection<Role>('roles');
    
    const [editedUser, setEditedUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Role['permissions']>(getDefaultPermissions());
    
    // Load initial user data
    useEffect(() => {
        if (user) {
            setEditedUser(user);
            if (user.permissions) {
                setPermissions(user.permissions);
            } else if (user.roleId && roles) {
                // Fallback: if user has no permissions blob, grab from role
                const role = roles.find(r => r.id === user.roleId);
                if (role) setPermissions(role.permissions);
            }
        }
    }, [user, roles]);

    const handleFieldChange = (field: keyof User, value: any) => {
        setEditedUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, [field]: value };
            
            if (field === 'roleId' && roles) {
                const newRole = roles.find(r => r.id === value);
                if (newRole) {
                    setPermissions(newRole.permissions);
                }
            }
            
            return updated;
        });
    };

    const handleDashboardToggle = (dashboardType: 'sales' | 'logistics' | 'finance' | 'admin') => {
        setEditedUser(prev => {
            if (!prev) return null;
            const currentDashboards = prev.activeDashboards || [];
            const isActive = currentDashboards.includes(dashboardType);
            
            const newDashboards = isActive 
                ? currentDashboards.filter(d => d !== dashboardType)
                : [...currentDashboards, dashboardType];
            
            return { ...prev, activeDashboards: newDashboards };
        });
    };
    
    const handleSave = async () => {
        if (!editedUser) return;
        try {
            const selectedRole = roles?.find(r => r.id === editedUser.roleId);
            
            const userToSave = {
                ...editedUser,
                role: selectedRole ? selectedRole.name : editedUser.role, 
                roleName: selectedRole ? selectedRole.name : editedUser.roleName,
                permissions: permissions 
            };
            
            await api.updateDoc('users', editedUser.id, userToSave);
            alert("Usuario y permisos guardados con éxito.");
            navigate('/settings/users');
        } catch (error) {
            console.error("Error saving user:", error);
            alert("Hubo un error al guardar los cambios.");
        }
    };

    const loading = userLoading || teamsLoading || companiesLoading || rolesLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !editedUser) return <div className="text-center p-12">Usuario no encontrado</div>;

    const roleOptions = (roles || []).map(r => ({ value: r.id, name: r.name }));
    const teamOptions = (teams || []).map(t => ({ value: t.id, name: t.name }));
    const companyOptions = (companies || []).map(c => ({ value: c.id, name: c.shortName || c.name }));

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Editar Usuario</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{user?.name}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/settings/users')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-5 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors">
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500">person</span>
                    Información General
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">badge</span>
                            </div>
                            <input 
                                type="text" 
                                value={editedUser.name} 
                                onChange={e => handleFieldChange('name', e.target.value)} 
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
                         <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">email</span>
                            </div>
                            <input 
                                type="email" 
                                value={editedUser.email} 
                                onChange={e => handleFieldChange('email', e.target.value)} 
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <CustomSelect 
                            label="Rol (Plantilla)" 
                            options={roleOptions} 
                            value={editedUser.roleId || ''} 
                            onChange={val => handleFieldChange('roleId', val)} 
                        />
                        <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined !text-sm">info</span>
                            Al cambiar el rol, se actualizarán los permisos base.
                        </p>
                    </div>

                    <div>
                        <CustomSelect 
                            label="Equipo" 
                            options={[{value: '', name: 'Sin equipo'}, ...teamOptions]} 
                            value={editedUser.teamId || ''} 
                            onChange={val => handleFieldChange('teamId', val)} 
                        />
                    </div>

                    <div className="md:col-span-2">
                         <CustomSelect 
                            label="Empresa Asignada" 
                            options={[{value: '', name: 'Sin empresa'}, ...companyOptions]} 
                            value={editedUser.companyId || ''} 
                            onChange={val => handleFieldChange('companyId', val)} 
                        />
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-between mt-8">
                    <div className="flex items-center gap-3">
                         <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${editedUser.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                             <span className="material-symbols-outlined text-xl">{editedUser.isActive ? 'check_circle' : 'block'}</span>
                        </div>
                        <div>
                            <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">Acceso al Sistema</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{editedUser.isActive ? 'El usuario puede iniciar sesión' : 'El acceso está revocado'}</span>
                        </div>
                    </div>
                    <ToggleSwitch enabled={editedUser.isActive} onToggle={() => handleFieldChange('isActive', !editedUser.isActive)} />
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                     <span className="material-symbols-outlined text-indigo-500">dashboard</span>
                     Personalización del Dashboard
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Selecciona qué paneles verá este usuario en su pantalla de inicio "Hoy".</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${editedUser.activeDashboards?.includes('sales') ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Ventas</span>
                            <span className="text-xs text-slate-500">KPIs, Metas, Pipeline</span>
                        </div>
                        <ToggleSwitch enabled={editedUser.activeDashboards?.includes('sales') || false} onToggle={() => handleDashboardToggle('sales')} />
                    </div>
                    
                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${editedUser.activeDashboards?.includes('logistics') ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Logística</span>
                            <span className="text-xs text-slate-500">Entregas, Rutas</span>
                        </div>
                        <ToggleSwitch enabled={editedUser.activeDashboards?.includes('logistics') || false} onToggle={() => handleDashboardToggle('logistics')} />
                    </div>
                    
                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${editedUser.activeDashboards?.includes('finance') ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Finanzas</span>
                            <span className="text-xs text-slate-500">Cobranza, Flujo</span>
                        </div>
                        <ToggleSwitch enabled={editedUser.activeDashboards?.includes('finance') || false} onToggle={() => handleDashboardToggle('finance')} />
                    </div>
                </div>
            </div>
            
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                     <span className="material-symbols-outlined text-indigo-500">lock_person</span>
                     Permisos Específicos
                </h3>
                <PermissionsEditor permissions={permissions} setPermissions={setPermissions} />
            </div>
        </div>
    );
};

export default EditUserPage;
