import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, MOCK_USERS } from '../data/mockData';

interface OnboardingPageProps {
    onComplete: () => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [nickname, setNickname] = useState('');
    const [birthday, setBirthday] = useState('');
    const [interests, setInterests] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // In a real app, you'd get the current user's ID from context/auth state
        const currentUserId = 'user-1'; 
        const currentUser = MOCK_USERS[currentUserId];

        // Simulate updating user profile
        const userUpdates = {
            fullName,
            nickname,
            birthday,
            interests,
        };
        await api.updateDoc('users', currentUserId, userUpdates);

        // Simulate adding birthday to calendar
        if (birthday) {
            const birthdayEvent = {
                id: `bday-${currentUserId}`,
                userId: currentUserId,
                name: nickname || fullName.split(' ')[0],
                date: birthday, // YYYY-MM-DD
            };
            await api.addDoc('birthdays', birthdayEvent);
        }
        
        console.log("Onboarding complete, data saved:", { userUpdates });
        
        onComplete();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
            <div className="w-full max-w-lg">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">¡Bienvenido a ORI!</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Vamos a completar tu perfil para personalizar tu experiencia.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre Completo</label>
                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1"/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">¿Cómo te gusta que te digan?</label>
                                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Ej. Alex" className="mt-1"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Cumpleaños</label>
                                <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="mt-1"/>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Intereses o Pasatiempos</label>
                            <textarea value={interests} onChange={e => setInterests(e.target.value)} rows={3} placeholder="Ej. Viajar, leer, deportes..." className="mt-1"/>
                        </div>
                        
                        <div className="pt-4">
                            <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Guardar y Continuar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;
