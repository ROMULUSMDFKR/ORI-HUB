import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { useDoc } from '../hooks/useDoc';
import { User, Team, Company, ActivityLog } from '../types';
import Spinner from '../components/ui/Spinner';
import Radio from '../components/ui/Radio';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import { MOCK_DETAILED_USER_ACTIVITY, MOCK_USERS } from '../data/mockData';

const PAGE_PERMISSIONS_CONFIG: Record<string, Record<string, ('view' | 'create' | 'edit' | 'delete')[]>> = {
    'Prospección IA': { 'Candidatos': ['view', 'edit', 'delete'], 'Importar Datos': ['view', 'create'] },
    'Hubs': { 'Prospectos': ['view', 'create', 'edit', 'delete'], 'Muestras': ['view', 'create', 'edit', 'delete'], 'Cotizaciones': ['view', 'create', 'edit', 'delete'], 'Órdenes de Venta': ['view', 'create', 'edit', 'delete'], 'Empresas': ['view', 'create', 'edit', 'delete'] },
    'Productos': { 'Lista de Productos': ['view', 'create', 'edit', 'delete'], 'Categorías': ['view', 'create', 'edit', 'delete'] },
    'Compras': { 'Órdenes de Compra': ['view', 'create', 'edit'], 'Proveedores': ['view', 'create', 'edit', 'delete'] },
    'Inventario': { 'Stock Actual': ['view'], 'Movimientos': ['view', 'create'], 'Alertas': ['view'], 'Ubicaciones': ['view', 'create', 'edit'] },
    'Logística': { 'Entregas': ['view', 'edit'], 'Transportistas': ['view', 'create', 'edit'], 'Precios de Flete': ['view', 'create', 'edit', 'delete'] },
    'Productividad': { 'Tareas': ['view', 'create', 'edit', 'delete'], 'Proyectos': ['view', 'create', 'edit', 'delete'], 'Calendario': ['view'] },
    'Finanzas': { 'Facturación': ['view', 'create', 'edit'], 'Pagos Pendientes': ['view'], 'Pagos Recibidos': ['view'], 'Gastos': ['view', 'create', 'edit'], 'Comisiones': ['view', 'edit'] },
    'Sistema': { 'Archivos': ['view', 'create', 'delete'], 'Auditoría': ['view'] }
};
const ALL_ACTIONS: ('view' | 'create' | 'edit' | 'delete')[] = ['view', 'create', 'edit', 'delete'];
const ACTION_TRANSLATIONS: Record<string, string> = { view: 'Ver', create: 'Crear', edit: 'Editar', delete: 'Eliminar' };

const EditUserPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: user, loading: userLoading, error } = useDoc<User>('users', id || '');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    
    const [editedUser, setEditedUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState('general');
    const [scope, setScope] = useState('team');
    
    useEffect(() => {
        if (user) {
            setEditedUser(user);
        }
    }, [user]);

    const handleFieldChange = (field: keyof User, value: any) => {
        setEditedUser(prev => prev ? { ...prev, [field]: value } : null);
    };
    
    const handleSave = () => {
        // In a real app, you would call an API to save the user
        console.log("Saving user:", editedUser);
        alert("Usuario guardado (ver consola).");
        navigate('/settings');
    };

    const loading = userLoading || teamsLoading || companiesLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !editedUser) return <div className="text-center p-12">Usuario no encontrado</div>;

    const iconMap: Record<ActivityLog['type'], string> = {
        'Llamada': 'call', 'Email': 'email', 'Reunión': 'groups', 'Nota': 'note', 'Vista de Perfil': 'visibility',
        'Análisis IA': 'auto_awesome', 'Cambio de Estado': 'change_circle', 'Sistema': 'dns'
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Editar Usuario: {user?.name}</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/settings')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Cambios</button>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6">
                    {['general', 'permisos', 'actividad'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-6 space-y-6">
                {activeTab === 'general' && (
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm space-y-4 max-w-2xl">
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label><input type="text" value={editedUser.name} onChange={e => handleFieldChange('name', e.target.value)}/></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label><input type="email" value={editedUser.email} onChange={e => handleFieldChange('email', e.target.value)}/></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Rol</label><select value={editedUser.role} onChange={e => handleFieldChange('role', e.target.value)}><option>Admin</option><option>Ventas</option><option>Logística</option></select></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Equipo</label><select value={editedUser.teamId || ''} onChange={e => handleFieldChange('teamId', e.target.value)}><option value="">Sin equipo</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Empresa</label><select value={editedUser.companyId || ''} onChange={e => handleFieldChange('companyId', e.target.value)}><option value="">Sin empresa</option>{companies.map(c => <option key={c.id} value={c.id}>{c.shortName || c.name}</option>)}</select></div>
                        <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usuario Activo</span><ToggleSwitch enabled={editedUser.isActive} onToggle={() => handleFieldChange('isActive', !editedUser.isActive)} /></div>
                    </div>
                )}
                {activeTab === 'permisos' && (
                     <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm"><h4 className="font-semibold text-slate-800 dark:text-slate-200">Alcance de Datos</h4><fieldset className="mt-2 space-y-2"><Radio id="scope-own" name="scope" value="own" checked={scope === 'own'} onChange={setScope}>Ver solo datos propios</Radio><Radio id="scope-team" name="scope" value="team" checked={scope === 'team'} onChange={setScope}>Ver datos del equipo</Radio><Radio id="scope-all" name="scope" value="all" checked={scope === 'all'} onChange={setScope}>Ver todos los datos</Radio></fieldset></div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm"><h4 className="font-semibold text-slate-800 dark:text-slate-200">Permisos por Página</h4><div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"><table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700"><thead className="bg-slate-50 dark:bg-slate-700/50"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-2/5">Página</th>{ALL_ACTIONS.map(action => (<th key={action} scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{ACTION_TRANSLATIONS[action]}</th>))}</tr></thead>{Object.entries(PAGE_PERMISSIONS_CONFIG).map(([moduleName, pages]) => (<tbody key={moduleName} className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700"><tr><td colSpan={5} className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50"><h5 className="text-sm font-bold text-slate-600 dark:text-slate-300">{moduleName}</h5></td></tr>{Object.entries(pages).map(([pageName, availableActions]) => (<tr key={pageName}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{pageName}</td>{ALL_ACTIONS.map(action => {const isActionPossible = availableActions.includes(action); const hasPermission = isActionPossible; return (<td key={action} className="px-6 py-4 whitespace-nowrap text-center"><div className={`flex justify-center ${!isActionPossible ? 'opacity-40 cursor-not-allowed' : ''}`}><ToggleSwitch enabled={hasPermission} onToggle={() => {if (isActionPossible) {console.log(`Toggling ${action} for ${pageName}`);}}}/></div></td>);})}</tr>))}</tbody>))}</table></div></div>
                    </div>
                )}
                {activeTab === 'actividad' && (
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Ejemplo de Actividad del Usuario</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Esta es una lista de muestra con todos los tipos de actividades que se pueden registrar.</p>
                        <ul role="list" className="space-y-4">
                            {MOCK_DETAILED_USER_ACTIVITY.map(log => (
                                <li key={log.id} className="relative flex gap-x-4">
                                    <div className={`absolute left-0 top-0 flex w-8 justify-center -bottom-6 ${log.id === MOCK_DETAILED_USER_ACTIVITY[MOCK_DETAILED_USER_ACTIVITY.length-1].id ? 'h-8' : ''}`}><div className="w-px bg-slate-200 dark:bg-slate-700"></div></div>
                                    <div className="relative flex h-8 w-8 flex-none items-center justify-center bg-white dark:bg-slate-800">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-4 ring-white dark:ring-slate-800"><span className="material-symbols-outlined text-sm text-slate-500 dark:text-slate-400">{iconMap[log.type]}</span></div>
                                    </div>
                                    <div className="flex-auto py-1.5"><p className="text-sm text-slate-500 dark:text-slate-400">{log.description}</p><time dateTime={log.createdAt} className="mt-1 text-xs text-slate-400 dark:text-slate-500">{new Date(log.createdAt).toLocaleString('es-MX', {dateStyle: 'full', timeStyle: 'short'})}</time></div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditUserPage;