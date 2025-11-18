
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import { COUNTRIES } from '../constants';
import CustomSelect from '../components/ui/CustomSelect';
import Spinner from '../components/ui/Spinner';
import ImageCropperModal from '../components/ui/ImageCropperModal';
import { updatePassword } from 'firebase/auth';
import { auth } from '../firebase';

interface OnboardingPageProps {
    onComplete: () => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nickname, setNickname] = useState('');
    const [birthday, setBirthday] = useState('');
    const [interests, setInterests] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('');
    
    // Password fields for first-time setup
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
    const [isUploading, setIsUploading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);


    const handleAvatarClick = () => avatarInputRef.current?.click();

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageToCrop(reader.result as string);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleCropComplete = (croppedBlob: Blob | null) => {
        setIsCropperOpen(false);
        if (croppedBlob) {
            const file = new File([croppedBlob], "avatar.png", { type: "image/png" });
            setAvatarFile(file);
            if (avatarPreview) {
                URL.revokeObjectURL(avatarPreview);
            }
            setAvatarPreview(URL.createObjectURL(croppedBlob));
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            alert("No se ha encontrado un usuario autenticado.");
            navigate('/login');
            return;
        }

        // Validate Passwords
        if (newPassword.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        setIsUploading(true);

        const currentUserId = user.id; 
        let avatarUrl = user.avatarUrl;

        try {
            // 1. Update Auth Password
            if (auth.currentUser) {
                await updatePassword(auth.currentUser, newPassword);
            } else {
                throw new Error("No auth session found to update password.");
            }

            // 2. Upload Avatar if changed
            if (avatarFile) {
                avatarUrl = await api.uploadFile(avatarFile, `avatars/${currentUserId}`);
            }
            
            // 3. Update Firestore Profile
            const userUpdates = {
                name: `${firstName} ${lastName}`.trim(),
                fullName: `${firstName} ${lastName}`.trim(),
                nickname,
                birthday,
                interests,
                phone,
                country,
                avatarUrl,
                hasCompletedOnboarding: true, // Mark as complete
            };

            await api.updateDoc('users', currentUserId, userUpdates);

            // 4. Create Birthday Event
            if (birthday) {
                const birthdayEvent = {
                    id: `bday-${currentUserId}`,
                    userId: currentUserId,
                    name: nickname || firstName,
                    date: birthday,
                };
                await api.setDoc('birthdays', birthdayEvent.id, birthdayEvent);
            }
            
            setIsUploading(false);
            onComplete();

        } catch (error: any) {
            console.error("Error during onboarding submit:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("Por seguridad, necesitamos que inicies sesión nuevamente antes de cambiar tu contraseña.");
            } else {
                alert("Hubo un error al guardar tu perfil. Por favor, intenta de nuevo.");
            }
            setIsUploading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
                <div className="w-full max-w-lg">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-center">
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">¡Bienvenido a ORI!</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Configura tu contraseña y perfil para comenzar.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                            
                            {/* Avatar Section */}
                            <div className="flex justify-center">
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    ref={avatarInputRef}
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                                <div 
                                    className="relative group cursor-pointer"
                                    onClick={handleAvatarClick}
                                    title="Cambiar foto de perfil"
                                >
                                    {avatarPreview ? (
                                        <img 
                                            src={avatarPreview} 
                                            alt="Avatar" 
                                            className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-sm" 
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-sm">
                                            <span className="material-symbols-outlined text-5xl text-white">person</span>
                                        </div>
                                    )}
                                    
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined text-white">edit</span>
                                    </div>
                                </div>
                            </div>

                            {/* Password Section - Mandatory */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-3">Establecer Contraseña Definitiva</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Nueva Contraseña</label>
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 w-full p-2 text-sm border rounded" required placeholder="Mínimo 6 caracteres"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Confirmar Contraseña</label>
                                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 w-full p-2 text-sm border rounded" required/>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre(s)</label>
                                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 w-full p-2 border rounded" required/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Apellido(s)</label>
                                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 w-full p-2 border rounded" required/>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">¿Cómo te gusta que te digan?</label>
                                    <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Ej. Alex" className="mt-1 w-full p-2 border rounded"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Cumpleaños</label>
                                    <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="mt-1 w-full p-2 border rounded"/>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Número de Teléfono</label>
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 55..." className="mt-1 w-full p-2 border rounded"/>
                                </div>
                                <CustomSelect label="País de Ubicación" options={COUNTRIES} value={country} onChange={setCountry} placeholder="Selecciona un país..."/>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Intereses o Pasatiempos</label>
                                <textarea value={interests} onChange={e => setInterests(e.target.value)} rows={3} placeholder="Ej. Viajar, leer, deportes..." className="mt-1 w-full p-2 border rounded"/>
                            </div>
                            
                            <div className="pt-4">
                                <button type="submit" disabled={isUploading} className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center disabled:opacity-50">
                                    {isUploading && <span className="material-symbols-outlined animate-spin mr-2 !text-base">progress_activity</span>}
                                    {isUploading ? 'Guardando...' : 'Completar Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {imageToCrop && (
                <ImageCropperModal
                    isOpen={isCropperOpen}
                    onClose={() => setIsCropperOpen(false)}
                    imageSrc={imageToCrop}
                    onCrop={handleCropComplete}
                />
            )}
        </>
    );
};

export default OnboardingPage;
