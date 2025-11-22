
import React, { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import CustomSelect from '../ui/CustomSelect';
import { FreightPricingRule } from '../../types';
import { useCollection } from '../../hooks/useCollection';

interface NewFreightRuleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Omit<FreightPricingRule, 'id'>) => void;
}

const NewFreightRuleDrawer: React.FC<NewFreightRuleDrawerProps> = ({ isOpen, onClose, onSave }) => {
    const initialState = {
        origin: '',
        destination: '',
        minWeightKg: 0,
        maxWeightKg: 0,
        pricePerKg: 0,
        flatRate: 0,
    };
    const [rule, setRule] = useState(initialState);
    const { data: locations } = useCollection<any>('locations');

    useEffect(() => {
        if (!isOpen) {
            setRule(initialState);
        }
    }, [isOpen]);

    const handleChange = (field: keyof typeof rule, value: string | number) => {
        setRule(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!rule.origin || !rule.destination || rule.maxWeightKg <= rule.minWeightKg) {
            alert('Por favor, completa los campos correctamente. El peso máximo debe ser mayor al mínimo.');
            return;
        }
        onSave({ ...rule, active: true });
    };

    const originOptions = (locations || []).map((loc: any) => ({ value: loc.name, name: loc.name }));

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Añadir Nueva Regla de Flete">
            <div className="space-y-4">
                <CustomSelect
                    label="Origen *"
                    options={originOptions}
                    value={rule.origin}
                    onChange={val => handleChange('origin', val)}
                />
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Destino *</label>
                    <input type="text" value={rule.destination} onChange={e => handleChange('destination', e.target.value)} placeholder="Ej: Monterrey, NL" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Peso Mín. (kg)</label>
                        <input type="number" value={rule.minWeightKg} onChange={e => handleChange('minWeightKg', Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Peso Máx. (kg)</label>
                        <input type="number" value={rule.maxWeightKg} onChange={e => handleChange('maxWeightKg', Number(e.target.value))} />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Precio por Kg</label>
                        <input type="number" step="0.01" value={rule.pricePerKg} onChange={e => handleChange('pricePerKg', Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tarifa Fija</label>
                        <input type="number" step="0.01" value={rule.flatRate} onChange={e => handleChange('flatRate', Number(e.target.value))} />
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Regla</button>
            </div>
        </Drawer>
    );
};

export default NewFreightRuleDrawer;
