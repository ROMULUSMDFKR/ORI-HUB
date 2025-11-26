
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDoc } from '../../hooks/useDoc';
import { Role } from '../../types';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api/firebaseApi';
import PermissionsEditor from '../../components/settings/PermissionsEditor';
import { getDefaultPermissions } from '../../constants';

const EditRolePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const { data: initialRole, loading, error } = useDoc<Role>('roles', isNew ? '' : id || '');

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [permissions, setPermissions] = useState<Role['permissions']>(getDefaultPermissions());

    useEffect(() => {
        if (!isNew && initialRole) {
            setName(initialRole.name);
            setDescription(initialRole.description);
            setPermissions(initialRole.permissions);
        } else if (isNew) {
            // Reset for new role creation
            setName('');
            setDescription('');
            setPermissions(getDefaultPermissions());
        }
    }, [initialRole, isNew, id]);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('El nombre del rol es obligatorio.');
            return;
        }

        const roleData = {
            name,
            description,
            permissions,
        };

        try {
            if (isNew) {
                await api.addDoc('roles', roleData);
                alert('Rol creado con éxito.');
            } else if (id) {
                await api.updateDoc('roles', id, roleData);
                alert('Rol actualizado con éxito.');
            }
            navigate('/settings/roles');
        } catch (err) {
            console.error('Error saving role:', err);
            alert('No se pudo guardar el rol.');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!isNew && error) return <div className="text-center p-12">Rol no encontrado</div>;

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {isNew ? 'Crear Nuevo Rol' : `Editar Rol: ${initialRole?.name}`}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Define los permisos y el alcance de datos para este grupo de usuarios.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/settings/roles')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-5 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors">
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                     <span className="material-symbols-outlined text-indigo-500">badge</span>
                     Información Básica
                </h3>
                
                <div className="grid grid-cols-1 gap-6">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Rol <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">shield_person</span>
                            </div>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                placeholder="Ej. Gerente de Ventas"
                            />
                        </div>
                    </div>

                    {/* Description Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">description</span>
                            </div>
                            <input 
                                type="text" 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                placeholder="Describe el propósito de este rol..."
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            <div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                     <span className="material-symbols-outlined text-indigo-500">lock_open</span>
                     Configuración de Permisos
                </h3>
                <PermissionsEditor permissions={permissions} setPermissions={setPermissions} />
            </div>
        </div>
    );
};

export default EditRolePage;
