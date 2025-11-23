
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
    const [department, setDepartment] = useState('');
    const [birthday, setBirthday] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    
    const [emails, setEmails] = useState<string[]>(['']);
    const [phones, setPhones] = useState<string[]>(['']);
    
    useEffect(() => {
        if (isOpen) {
            if (initialContact) {
                setName(initialContact.name || '');
                setRole(initialContact.role || '');
                setDepartment(initialContact.department || '');
                setBirthday(initialContact.birthday || '');
                setLinkedin(initialContact.linkedin || '');
                setNotes(initialContact.notes || '');
                setTags(initialContact.tags || []);
                
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
                setDepartment('');
                setBirthday('');
                setLinkedin('');
                setNotes('');
                setTags([]);
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
    
    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
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
            department: department.trim(),
            birthday: birthday,
            linkedin: linkedin.trim(),
            notes: notes.trim(),
            tags: tags,
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
        <Drawer isOpen={isOpen} onClose={onClose} title={initialContact ? (isPrimary ? 'Editar Contacto Principal' : 'Editar Contacto') : 'Nuevo Contacto'} size="lg">
            <div className="space-y-8">
                
                {/* Seccion Identidad */}
                <div className="flex gap-5 items-center bg-white dark:bg-slate-800 p-1">
                     <div className="flex-shrink-0 relative group cursor-pointer">
                        <div className="h-20 w-20 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border-2 border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-indigo-500 dark:text-indigo-300 shadow-sm group-hover:border-indigo-400 transition-colors">
                            {name ? <span className="text-2xl font-bold">{name.substring(0,2).toUpperCase()}</span> : <span className="material-symbols-outlined text-4xl">person_add</span>}
                        </div>
                        <div className="absolute bottom-0 right-0 bg-white dark:bg-slate-700 rounded-full p-1 border border-slate-200 dark:border-slate-600 shadow-sm">
                             <span className="material-symbols-outlined text-xs text-slate-500 block">edit</span>
                        </div>
                     </div>
                     <div className="flex-1">
                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 ml-1">Nombre Completo <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-700 px-2 py-2 text-lg font-semibold text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none transition-colors placeholder-slate-300"
                            placeholder="Ej: Juan Pérez"
                        />
                     </div>
                </div>

                {/* Seccion Profesional */}
                <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-600 pb-2">
                        <span className="material-symbols-outlined text-indigo-500">badge</span>
                        Información Profesional
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Cargo / Puesto</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">work</span>
                                <input 
                                    type="text" 
                                    value={role} 
                                    onChange={(e) => setRole(e.target.value)} 
                                    className="w-full pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="Ej: Gerente de Compras"
                                />
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Departamento</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">apartment</span>
                                <input 
                                    type="text" 
                                    value={department} 
                                    onChange={(e) => setDepartment(e.target.value)} 
                                    className="w-full pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="Ej: Logística"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seccion Vías de Contacto */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="material-symbols-outlined text-indigo-500">perm_contact_calendar</span>
                        Canales de Contacto
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Dynamic Emails */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase">Correos Electrónicos</label>
                            <div className="space-y-2">
                                {emails.map((email, index) => (
                                    <div key={index} className="flex gap-2 group">
                                        <div className="relative flex-1">
                                            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm group-focus-within:text-indigo-500">mail</span>
                                            <input 
                                                type="email" 
                                                value={email} 
                                                onChange={(e) => handleEmailChange(index, e.target.value)}
                                                className="w-full pl-9 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                placeholder="correo@ejemplo.com"
                                            />
                                        </div>
                                        {emails.length > 1 && (
                                            <button onClick={() => handleRemoveEmail(index)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={handleAddEmail} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center mt-2 hover:underline ml-1">
                                    <span className="material-symbols-outlined text-sm mr-1">add</span> Agregar otro correo
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Phones */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase">Teléfonos</label>
                            <div className="space-y-2">
                                {phones.map((phone, index) => (
                                    <div key={index} className="flex gap-2 group">
                                        <div className="relative flex-1">
                                            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm group-focus-within:text-indigo-500">call</span>
                                            <input 
                                                type="tel" 
                                                value={phone} 
                                                onChange={(e) => handlePhoneChange(index, e.target.value)}
                                                className="w-full pl-9 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                placeholder="+52 55..."
                                            />
                                        </div>
                                        {phones.length > 1 && (
                                            <button onClick={() => handleRemovePhone(index)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={handleAddPhone} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center mt-2 hover:underline ml-1">
                                    <span className="material-symbols-outlined text-sm mr-1">add</span> Agregar otro teléfono
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seccion Detalles Adicionales */}
                <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-600 pb-2">
                        <span className="material-symbols-outlined text-indigo-500">extension</span>
                        Detalles Adicionales
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">LinkedIn</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-blue-600 dark:text-blue-400 font-bold text-xs">in/</span>
                                <input 
                                    type="text" 
                                    value={linkedin} 
                                    onChange={(e) => setLinkedin(e.target.value)} 
                                    className="w-full pl-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="usuario-perfil"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Cumpleaños</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">cake</span>
                                <input 
                                    type="date" 
                                    value={birthday} 
                                    onChange={(e) => setBirthday(e.target.value)} 
                                    className="w-full pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="mb-4">
                         <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Etiquetas (Tags)</label>
                         <div className="flex flex-wrap gap-2 p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[42px] items-center focus-within:ring-2 focus-within:ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900">
                            {tags.map(tag => (
                                <span key={tag} className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
                                    {tag}
                                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100 focus:outline-none flex items-center"><span className="material-symbols-outlined text-[10px]">close</span></button>
                                </span>
                            ))}
                            <input 
                                type="text" 
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                className="flex-grow bg-transparent outline-none text-sm min-w-[80px] placeholder-slate-400"
                                placeholder={tags.length === 0 ? "Escribe y presiona Enter..." : ""}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Notas Privadas</label>
                        <textarea 
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="Detalles clave, preferencias personales, horario de contacto..."
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-300 dark:border-slate-600">
                    Cancelar
                </button>
                <button onClick={handleSubmit} className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">save</span>
                    Guardar Contacto
                </button>
            </div>
        </Drawer>
    );
};

export default ContactDrawer;
