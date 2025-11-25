
import React, { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import { Contact } from '../../types';

interface ContactDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (contact: Contact) => void;
    initialContact?: Partial<Contact> | null;
    isPrimary?: boolean; // To show extra options if editing primary
}

const ContactDrawer: React.FC<ContactDrawerProps> = ({ isOpen, onClose, onSave, initialContact, isPrimary = false }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [emails, setEmails] = useState<string[]>(['']);
    const [phones, setPhones] = useState<string[]>(['']);
    
    useEffect(() => {
        if (isOpen) {
            if (initialContact) {
                setName(initialContact.name || '');
                setRole(initialContact.role || '');
                
                // Handle multiple emails/phones or fallback to single
                const initialEmails = initialContact.emails && initialContact.emails.length > 0 
                    ? initialContact.emails 
                    : (initialContact.email ? [initialContact.email] : ['']);
                
                const initialPhones = initialContact.phones && initialContact.phones.length > 0 
                    ? initialContact.phones 
                    : (initialContact.phone ? [initialContact.phone] : ['']);
                    
                setEmails(initialEmails);
                setPhones(initialPhones);
            } else {
                // Reset
                setName('');
                setRole('');
                setEmails(['']);
                setPhones(['']);
            }
        }
    }, [isOpen, initialContact]);

    const handleAddEmail = () => setEmails([...emails, '']);
    const handleRemoveEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index));
    const handleEmailChange = (index: number, value: string) => {
        const newEmails = [...emails];
        newEmails[index] = value;
        setEmails(newEmails);
    };

    const handleAddPhone = () => setPhones([...phones, '']);
    const handleRemovePhone = (index: number) => setPhones(phones.filter((_, i) => i !== index));
    const handlePhoneChange = (index: number, value: string) => {
        const newPhones = [...phones];
        newPhones[index] = value;
        setPhones(newPhones);
    };

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('El nombre es obligatorio');
            return;
        }
        
        const cleanEmails = emails.map(e => e.trim()).filter(Boolean);
        const cleanPhones = phones.map(p => p.trim()).filter(Boolean);

        const contactData: Contact = {
            id: initialContact?.id || `contact-${Date.now()}`, // Generate temp ID if new
            name: name.trim(),
            role: role.trim(),
            email: cleanEmails[0] || '', // Legacy support
            phone: cleanPhones[0] || '', // Legacy support
            emails: cleanEmails,
            phones: cleanPhones,
            companyId: initialContact?.companyId,
            ownerId: initialContact?.ownerId || 'user-1', // Default owner if missing
        };

        onSave(contactData);
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={initialContact ? (isPrimary ? 'Editar Contacto Principal' : 'Editar Contacto') : 'Nuevo Contacto'}>
            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="w-full bg-slate-100 dark:bg-slate-700 border-transparent rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Ej: Juan Pérez"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cargo / Puesto</label>
                    <input 
                        type="text" 
                        value={role} 
                        onChange={(e) => setRole(e.target.value)} 
                        className="w-full bg-slate-100 dark:bg-slate-700 border-transparent rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Ej: Gerente de Compras"
                    />
                </div>

                {/* Dynamic Emails */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Correos Electrónicos</label>
                    <div className="space-y-2">
                        {emails.map((email, index) => (
                            <div key={index} className="flex gap-2">
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => handleEmailChange(index, e.target.value)}
                                    className="flex-1 bg-slate-100 dark:bg-slate-700 border-transparent rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="correo@ejemplo.com"
                                />
                                {emails.length > 1 && (
                                    <button onClick={() => handleRemoveEmail(index)} className="p-2 text-slate-400 hover:text-red-500">
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                )}
                            </div>
                        ))}
                        <button onClick={handleAddEmail} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center mt-1">
                            <span className="material-symbols-outlined text-sm mr-1">add</span> Añadir otro correo
                        </button>
                    </div>
                </div>

                {/* Dynamic Phones */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Teléfonos</label>
                    <div className="space-y-2">
                        {phones.map((phone, index) => (
                            <div key={index} className="flex gap-2">
                                <input 
                                    type="tel" 
                                    value={phone} 
                                    onChange={(e) => handlePhoneChange(index, e.target.value)}
                                    className="flex-1 bg-slate-100 dark:bg-slate-700 border-transparent rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="+52 55..."
                                />
                                {phones.length > 1 && (
                                    <button onClick={() => handleRemovePhone(index)} className="p-2 text-slate-400 hover:text-red-500">
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                )}
                            </div>
                        ))}
                        <button onClick={handleAddPhone} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center mt-1">
                            <span className="material-symbols-outlined text-sm mr-1">add</span> Añadir otro teléfono
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    Cancelar
                </button>
                <button onClick={handleSubmit} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
                    Guardar Contacto
                </button>
            </div>
        </Drawer>
    );
};

export default ContactDrawer;
