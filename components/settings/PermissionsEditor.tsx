
import React from 'react';
import { Role } from '../../types';
import Radio from '../ui/Radio';
import ToggleSwitch from '../ui/ToggleSwitch';
import { PAGE_PERMISSIONS_CONFIG, ALL_ACTIONS, ACTION_TRANSLATIONS } from '../../constants';

interface PermissionsEditorProps {
    permissions: Role['permissions'];
    setPermissions: React.Dispatch<React.SetStateAction<Role['permissions']>>;
}

const PermissionsEditor: React.FC<PermissionsEditorProps> = ({ permissions, setPermissions }) => {

    const handleScopeChange = (newScope: 'own' | 'team' | 'all') => {
        setPermissions(prev => ({ ...prev, dataScope: newScope }));
    };

    const handlePermissionToggle = (moduleName: string, pageName: string, action: string) => {
        setPermissions(prev => {
            const newPermissions = { ...prev };
            const newPages = { ...newPermissions.pages };

            if (!newPages[moduleName]) {
                newPages[moduleName] = {};
            } else {
                newPages[moduleName] = { ...newPages[moduleName] };
            }
            
            const currentActions = newPages[moduleName][pageName] || [];
            const hasAction = currentActions.includes(action as any);

            let newActions;
            if (hasAction) {
                newActions = currentActions.filter((a: string) => a !== action);
            } else {
                newActions = [...currentActions, action];
            }

            newPages[moduleName][pageName] = newActions as ('view' | 'create' | 'edit' | 'delete')[];
            
            newPermissions.pages = newPages;

            return newPermissions;
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Alcance de Datos</h4>
                <fieldset className="mt-4 flex items-center space-x-6">
                    <Radio id="scope-own" name="scope" value="own" checked={permissions.dataScope === 'own'} onChange={() => handleScopeChange('own')}>Ver solo datos propios</Radio>
                    <Radio id="scope-team" name="scope" value="team" checked={permissions.dataScope === 'team'} onChange={() => handleScopeChange('team')}>Ver datos del equipo</Radio>
                    <Radio id="scope-all" name="scope" value="all" checked={permissions.dataScope === 'all'} onChange={() => handleScopeChange('all')}>Ver todos los datos</Radio>
                </fieldset>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Permisos por Página</h4>
                <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-2/5">Página</th>
                                {ALL_ACTIONS.map(action => (
                                    <th key={action} scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{ACTION_TRANSLATIONS[action]}</th>
                                ))}
                            </tr>
                        </thead>
                        {Object.entries(PAGE_PERMISSIONS_CONFIG).map(([moduleName, pages]) => (
                            <tbody key={moduleName} className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                <tr>
                                    <td colSpan={5} className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50">
                                        <h5 className="text-sm font-bold text-slate-600 dark:text-slate-300">{moduleName}</h5>
                                    </td>
                                </tr>
                                {Object.entries(pages).map(([pageName, availableActions]) => (
                                    <tr key={pageName}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{pageName}</td>
                                        {ALL_ACTIONS.map(action => {
                                            const isActionPossible = availableActions.includes(action);
                                            const hasPermission = permissions.pages[moduleName]?.[pageName]?.includes(action) ?? false;
                                            return (
                                                <td key={action} className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className="flex justify-center">
                                                        {isActionPossible ? <ToggleSwitch enabled={hasPermission} onToggle={() => handlePermissionToggle(moduleName, pageName, action)} /> : <span className="text-slate-300 dark:text-slate-600">-</span>}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        ))}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PermissionsEditor;
