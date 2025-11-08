import React from 'react';

const ProfilePage: React.FC = () => {
    return (
        <div className="bg-surface p-6 rounded-xl shadow-sm">
            <h1 className="text-2xl font-bold text-on-surface">Mi Perfil</h1>
            <p className="mt-4 text-on-surface-secondary">
                Aquí podrás gestionar la información de tu perfil, cambiar tu contraseña y ajustar tus preferencias personales.
            </p>
        </div>
    );
};

export default ProfilePage;
