
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
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Editar Usuario: {user?.name}</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/settings/users')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Cambios</button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Información General y Roles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                        <input type="text" value={editedUser.name} onChange={e => handleFieldChange('name', e.target.value)} className="mt-1 w-full"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                        <input type="email" value={editedUser.email} onChange={e => handleFieldChange('email', e.target.value)} className="mt-1 w-full"/>
                    </div>
                    
                    <div>
                        <CustomSelect label="Rol (Plantilla)" options={roleOptions} value={editedUser.roleId || ''} onChange={val => handleFieldChange('roleId', val)} />
                        <p className="text-xs text-slate-500 mt-1">Al cambiar el rol (ej. a "Ventas"), se actualizarán los permisos y el acceso a secciones como Comisiones.</p>
                    </div>
                    <div>
                        <CustomSelect label="Equipo" options={[{value: '', name: 'Sin equipo'}, ...teamOptions]} value={editedUser.teamId || ''} onChange={val => handleFieldChange('teamId', val)} />
                        <p className="text-xs text-slate-500 mt-1">Define el grupo de trabajo (ej. Ventas, Logística).</p>
                    </div>
                    <CustomSelect label="Empresa" options={[{value: '', name: 'Sin empresa'}, ...companyOptions]} value={editedUser.companyId || ''} onChange={val => handleFieldChange('companyId', val)} />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usuario Activo</span>
                    <ToggleSwitch enabled={editedUser.isActive} onToggle={() => handleFieldChange('isActive', !editedUser.isActive)} />
                </div>
            </div>
            
            <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Permisos Específicos</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Puedes personalizar los permisos individuales. Para ver "Comisiones", asegúrate de que el rol tenga acceso a Finanzas o habilítalo aquí manualmente.</p>
                <PermissionsEditor permissions={permissions} setPermissions={setPermissions} />
            </div>
        </div>
    );
};

export default EditUserPage;
