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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {isNew ? 'Crear Nuevo Rol' : `Editar Rol: ${initialRole?.name}`}
                </h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/settings/roles')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Cambios</button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Rol</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
            </div>

            <PermissionsEditor permissions={permissions} setPermissions={setPermissions} />
        </div>
    );
};

export default EditRolePage;
