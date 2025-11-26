import React, { useState, useEffect } from 'react';
import { Supplier, LotStatus } from '../../types';
import Drawer from '../ui/Drawer';
import CustomSelect from '../ui/CustomSelect';
import { api } from '../../api/firebaseApi';

const initialLotState = {
    code: '',
    supplierId: '',
    receptionDate: new Date().toISOString().split('T')[0],
    initialQty: 0,
    unitCost: 0,
    minSellPrice: 0,
    initialLocationId: ''
};

interface AddLotDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newLot: any) => void;
    suppliers: Supplier[];
    locations: any[];
    productSku?: string;
}

const AddLotDrawer: React.FC<AddLotDrawerProps> = ({ isOpen, onClose, onSave, suppliers, locations, productSku }) => {
    const [lot, setLot] = useState(initialLotState);

    useEffect(() => {
        if (isOpen && productSku) {
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const suggestedCode = `${productSku}-${year}${month}${day}`;
            setLot(prev => ({ ...prev, code: suggestedCode }));
        } else if (!isOpen) {
            setLot(initialLotState);
        }
    }, [isOpen, productSku]);

    const handleChange = (field: string, value: any) => {
        setLot(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSave = () => {
        if (lot.code && lot.initialQty > 0 && lot.unitCost >= 0 && lot.minSellPrice >= 0 && lot.initialLocationId) {
             onSave(lot);
        } else {
            alert("Por favor, complete todos los campos requeridos del lote.");
        }
    }
    
    const supplierOptions = (suppliers || []).map(s => ({ value: s.id, name: s.name }));
    const locationOptions = (locations || []).map(l => ({ value: l.id, name: l.name }));

    // Input Safe Pattern classes
    const inputWrapperClass = "relative";
    const inputIconClass = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none";
    const inputFieldClass = "block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm";

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Añadir Nuevo Lote">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código de Lote</label>
                    <div className={inputWrapperClass}>
                        <div className={inputIconClass}>
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">qr_code</span>
                        </div>
                        <input type="text" value={lot.code} onChange={e => handleChange('code', e.target.value)} className={inputFieldClass} />
                    </div>
                </div>
                <CustomSelect label="Proveedor" options={supplierOptions} value={lot.supplierId} onChange={val => handleChange('supplierId', val)} placeholder="Seleccionar..."/>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Recepción</label>
                    <div className={inputWrapperClass}>
                        <div className={inputIconClass}>
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">event</span>
                        </div>
                        <input type="date" value={lot.receptionDate} onChange={e => handleChange('receptionDate', e.target.value)} className={inputFieldClass} />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cantidad</label>
                         <div className={inputWrapperClass}>
                            <div className={inputIconClass}>
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">numbers</span>
                            </div>
                            <input type="number" value={lot.initialQty} onChange={e => handleChange('initialQty', parseFloat(e.target.value) || 0)} className={inputFieldClass} />
                        </div>
                    </div>
                     <CustomSelect label="Ubicación Inicial" options={locationOptions} value={lot.initialLocationId} onChange={val => handleChange('initialLocationId', val)} placeholder="Seleccionar..."/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Costo Unitario</label>
                        <div className={inputWrapperClass}>
                            <div className={inputIconClass}>
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">attach_money</span>
                            </div>
                            <input type="number" value={lot.unitCost} onChange={e => handleChange('unitCost', parseFloat(e.target.value) || 0)} className={inputFieldClass} />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Venta Mín.</label>
                         <div className={inputWrapperClass}>
                            <div className={inputIconClass}>
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">sell</span>
                            </div>
                            <input type="number" value={lot.minSellPrice} onChange={e => handleChange('minSellPrice', parseFloat(e.target.value) || 0)} className={inputFieldClass} />
                        </div>
                    </div>
                </div>
            </div>
             <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">Guardar Lote</button>
            </div>
        </Drawer>
    );
}

export default AddLotDrawer;