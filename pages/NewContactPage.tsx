import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contact, Company } from '../types';
import { api } from '../api/firebaseApi';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import CustomSelect from '../components/ui/CustomSelect';

// --- Reusable Components (Local for simplicity, but could be moved) ---
const FormBlock: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: string }> = ({ title, children, className, icon }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-6">{children}</div>
    </div>
);

const Input: React.FC<{ label: string; value: string | number; onChange: (val: any) => void; type?: string, required?: boolean, placeholder?: string, icon?: string }> = ({ label, value, onChange, type = 'text', required=false, placeholder, icon }) => (
    <div>
        <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {icon && <span className="material-symbols-outlined text-sm mr-1 text-slate-400">{icon}</span>}
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
        />
    </div>
);

const NewContactPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');

    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [department, setDepartment] = useState('');
    const [birthday, setBirthday] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [notes, setNotes] = useState('');
    const [companyId, setCompanyId] = useState('');
    
    const [emails, setEmails] = useState<string[]>(['']);
    const [phones, setPhones] = useState<string[]>(['']);
    
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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

    const handleSubmit = async () => {
        if (!name.trim()) {
            showToast('warning', 'El nombre es obligatorio.');
            return;
        }

        setIsSaving(true);
        try {
            const cleanEmails = emails.map(e => e.trim()).filter(Boolean);
            const cleanPhones = phones.map(p => p.trim()).filter(Boolean);

            const contactData: Contact = {
                id: `contact-${Date.now()}`,
                name: name.trim(),
                role: role.trim(),
                department: department.trim(),
                birthday: birthday,
                linkedin: linkedin.trim(),
                notes: notes.trim(),
                tags: tags,
                email: cleanEmails[0] || '', // Primary email
                phone: cleanPhones[0] || '', // Primary phone
                emails: cleanEmails,
                phones: cleanPhones,
                companyId: companyId,
                ownerId: currentUser?.id || 'user-1',
            };

            await api.addDoc('contacts', contactData);
            showToast('success', 'Contacto creado exitosamente.');
            navigate('/crm/contacts/list');
        } catch (error) {
            console.error("Error saving contact:", error);
            showToast('error', 'Error al guardar el contacto.');
        } finally {
            setIsSaving(false);
        }
    };

    const companyOptions = (companies || []).map(c => ({ value: c.id, name: c.shortName || c.name }));

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nuevo Contacto</h2>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/crm/contacts/list')} disabled={isSaving} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Contacto
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Identity & Professional Info */}
                <div className="lg:col-span-5 space-y-6">
                    <FormBlock title="Identidad" icon="person">
                        <div className="flex flex-col items-center mb-6">
                            <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                                <span className="material-symbols-outlined text-5xl">person</span>
                            </div>
                            <p className="text-xs text-slate-500">Foto de perfil (opcional)</p>
                        </div>
                        <Input label="Nombre Completo" value={name} onChange={setName} required placeholder="Ej: Juan Pérez" />
                        <div className="pt-2">
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Empresa Asociada</label>
                             <CustomSelect 
                                options={[{value: '', name: 'Sin empresa'}, ...companyOptions]} 
                                value={companyId} 
                                onChange={setCompanyId} 
                                placeholder={companiesLoading ? "Cargando..." : "Seleccionar empresa..."}
                                enableSearch
                             />
                        </div>
                    </FormBlock>

                    <FormBlock title="Información Profesional" icon="work">
                        <div className="grid grid-cols-1 gap-4">
                            <Input label="Cargo / Puesto" value={role} onChange={setRole} placeholder="Ej: Gerente de Compras" icon="badge" />
                            <Input label="Departamento" value={department} onChange={setDepartment} placeholder="Ej: Logística, Finanzas" icon="apartment" />
                        </div>
                    </FormBlock>
                </div>

                {/* Right Column: Contact & Details */}
                <div className="lg:col-span-7 space-y-6">
                    <FormBlock title="Canales de Contacto" icon="perm_contact_calendar">
                        <div className="space-y-4">
                            {/* Emails */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Correos Electrónicos</label>
                                {emails.map((email, index) => (
                                    <div key={index} className="flex gap-2 mb-2 group">
                                        <div className="relative flex-1">
                                            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">mail</span>
                                            <input 
                                                type="email" 
                                                value={email} 
                                                onChange={(e) => handleEmailChange(index, e.target.value)}
                                                className="w-full pl-9 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                                <button onClick={handleAddEmail} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center hover:underline">
                                    <span className="material-symbols-outlined text-sm mr-1">add</span> Agregar otro correo
                                </button>
                            </div>

                            {/* Phones */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Teléfonos</label>
                                {phones.map((phone, index) => (
                                    <div key={index} className="flex gap-2 mb-2 group">
                                        <div className="relative flex-1">
                                            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">call</span>
                                            <input 
                                                type="tel" 
                                                value={phone} 
                                                onChange={(e) => handlePhoneChange(index, e.target.value)}
                                                className="w-full pl-9 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                                <button onClick={handleAddPhone} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center hover:underline">
                                    <span className="material-symbols-outlined text-sm mr-1">add</span> Agregar otro teléfono
                                </button>
                            </div>
                        </div>
                    </FormBlock>

                    <FormBlock title="Detalles Adicionales" icon="extension">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="LinkedIn Profile" value={linkedin} onChange={setLinkedin} placeholder="linkedin.com/in/usuario" icon="link" />
                            <Input label="Cumpleaños" type="date" value={birthday} onChange={setBirthday} icon="cake" />
                        </div>
                        
                        <div className="mt-4">
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Etiquetas</label>
                             <div className="flex flex-wrap gap-2 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 min-h-[42px] items-center">
                                {tags.map(tag => (
                                    <span key={tag} className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs flex items-center gap-1">
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100">&times;</button>
                                    </span>
                                ))}
                                <input 
                                    type="text" 
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    className="bg-transparent outline-none text-sm flex-grow min-w-[100px]"
                                    placeholder="Escribe y presiona Enter..."
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas Privadas</label>
                            <textarea 
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                                placeholder="Preferencias, detalles personales, etc."
                            />
                        </div>
                    </FormBlock>
                </div>
            </div>
        </div>
    );
};

export default NewContactPage;