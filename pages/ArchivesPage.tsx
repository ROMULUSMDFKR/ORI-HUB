
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { ArchiveFile, User } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';

// Helper to format bytes into a human-readable string
const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper to get a file icon based on extension
const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf': return 'picture_as_pdf';
        case 'doc':
        case 'docx': return 'description';
        case 'xls':
        case 'xlsx': return 'receipt_long';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif': return 'image';
        default: return 'article';
    }
};

const KpiCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${color.replace('text-', 'bg-').replace('600', '100')} dark:bg-opacity-20`}>
            <span className={`material-symbols-outlined text-2xl ${color}`}>{icon}</span>
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
        </div>
    </div>
);

const ArchivesPage: React.FC = () => {
    const { data: initialFiles, loading: filesLoading, error } = useCollection<ArchiveFile>('archives');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const [files, setFiles] = useState<ArchiveFile[] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { user: currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u.name]));
    }, [users]);

    useEffect(() => {
        if (initialFiles) {
            setFiles(initialFiles);
        }
    }, [initialFiles]);

    const filteredFiles = useMemo(() => {
        if (!files) return [];
        return files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [files, searchTerm]);

    const stats = useMemo(() => {
        if (!files) return { count: 0, size: 0 };
        const totalSize = files.reduce((acc, curr) => acc + curr.size, 0);
        return {
            count: files.length,
            size: totalSize
        };
    }, [files]);

    const handleDelete = async (fileToDelete: ArchiveFile) => {
        if (!currentUser) {
            alert('Debes iniciar sesión para eliminar archivos.');
            return;
        }

        if (currentUser.role !== 'Admin' && currentUser.id !== fileToDelete.uploadedById) {
            alert('No tienes permiso para eliminar este archivo. Solo el propietario o un administrador pueden hacerlo.');
            return;
        }
        
        if (window.confirm(`¿Estás seguro de que quieres eliminar el archivo "${fileToDelete.name}"? Esta acción no se puede deshacer.`)) {
            try {
                await api.deleteFile(fileToDelete);
                setFiles(prev => prev!.filter(f => f.id !== fileToDelete.id));
                alert('Archivo eliminado con éxito.');
            } catch (error) {
                console.error("Error al eliminar el archivo:", error);
                alert("No se pudo eliminar el archivo. Intenta de nuevo.");
            }
        }
    };
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentUser) return;

        setIsUploading(true);
        try {
            const downloadURL = await api.uploadFile(file, 'archives');
            
            const newArchiveFile: Omit<ArchiveFile, 'id'> = {
                name: file.name,
                size: file.size,
                url: downloadURL,
                lastModified: new Date().toISOString(),
                tags: [],
                uploadedById: currentUser.id,
            };
            
            const addedFile = await api.addDoc('archives', newArchiveFile);
            setFiles(prev => prev ? [addedFile, ...prev] : [addedFile]);

            alert(`Archivo "${file.name}" subido con éxito.`);

        } catch (uploadError) {
            console.error("Error al subir el archivo:", uploadError);
            alert("Hubo un error al subir el archivo. Revisa la consola para más detalles.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const columns = [
        {
            header: 'Nombre',
            accessor: (file: ArchiveFile) => (
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3 shrink-0">
                         <span className="material-symbols-outlined text-indigo-500 dark:text-indigo-400">{getFileIcon(file.name)}</span>
                    </div>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">{file.name}</a>
                </div>
            )
        },
        {
            header: 'Tamaño',
            accessor: (file: ArchiveFile) => <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">{formatBytes(file.size)}</span>
        },
        {
            header: 'Última Modificación',
            accessor: (file: ArchiveFile) => <span className="text-slate-600 dark:text-slate-300">{new Date(file.lastModified).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        },
        {
            header: 'Subido por',
            accessor: (file: ArchiveFile) => <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">{usersMap.get(file.uploadedById) || 'Desconocido'}</span>
        },
        {
            header: 'Acciones',
            accessor: (file: ArchiveFile) => (
                <div className="flex justify-end space-x-2">
                    <a href={file.url} download={file.name} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Descargar">
                        <span className="material-symbols-outlined text-xl">download</span>
                    </a>
                    <button onClick={() => handleDelete(file)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Eliminar">
                        <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                </div>
            ),
            className: 'text-right'
        },
    ];

    const renderContent = () => {
        if (filesLoading || usersLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar los archivos.</p>;
        if (!files || files.length === 0) {
            return (
                <EmptyState
                    icon="folder_open"
                    title="No hay archivos"
                    message="Sube tu primer archivo para comenzar a gestionar tus documentos."
                    actionText="Subir Archivo"
                    onAction={handleUploadClick}
                />
            );
        }
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table columns={columns} data={filteredFiles} />
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Total Archivos" value={stats.count.toLocaleString()} icon="description" color="text-blue-600" />
                <KpiCard title="Espacio Usado" value={formatBytes(stats.size)} icon="cloud" color="text-purple-600" />
                 {/* Upload Action Card */}
                 <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-xl shadow-md text-white flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg">Nuevo Archivo</h3>
                        <p className="text-indigo-100 text-sm mt-1">Sube documentos al repositorio.</p>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button 
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="bg-white text-indigo-600 p-3 rounded-full shadow-lg hover:bg-indigo-50 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         {isUploading ? (
                            <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined text-2xl">upload_file</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0">search</span>
                    <input 
                        type="text"
                        placeholder="Buscar archivos..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-slate-500 dark:placeholder-slate-400"
                    />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                   Mostrando {filteredFiles.length} de {files?.length || 0} archivos
                </p>
            </div>

            {renderContent()}
        </div>
    );
};

export default ArchivesPage;
