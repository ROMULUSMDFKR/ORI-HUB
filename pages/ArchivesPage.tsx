
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
        case 'xlsx': 
        case 'csv': return 'table_view';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif': return 'image';
        case 'zip':
        case 'rar': return 'folder_zip';
        default: return 'insert_drive_file';
    }
};

// Helper for file colors (Visual enrichment)
const getFileColor = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
        case 'xls':
        case 'xlsx': 
        case 'csv': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
        case 'doc':
        case 'docx': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
        case 'jpg':
        case 'png':
        case 'jpeg': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
        default: return 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400';
    }
};

const KpiCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 flex-1 transition-all hover:shadow-md">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
             <span className={`material-symbols-outlined text-2xl ${color.replace('bg-', 'text-')}`}>{icon}</span>
        </div>
        <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
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
    
    // UI States
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
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

    // Derived Metrics
    const stats = useMemo(() => {
        if (!files) return { totalFiles: 0, totalSize: '0 Bytes', myFiles: 0 };
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        const myFilesCount = files.filter(f => f.uploadedById === currentUser?.id).length;
        return {
            totalFiles: files.length,
            totalSize: formatBytes(totalSize),
            myFiles: myFilesCount
        };
    }, [files, currentUser]);

    const filteredFiles = useMemo(() => {
        if (!files) return [];
        return files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [files, searchTerm]);

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
                // alert('Archivo eliminado con éxito.'); // Removed alert for cleaner UX, assuming toast exists globally or just UI update
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
            // 1. Subir el archivo a Storage
            const downloadURL = await api.uploadFile(file, 'archives');
            
            const newArchiveFile: Omit<ArchiveFile, 'id'> = {
                name: file.name,
                size: file.size,
                url: downloadURL,
                lastModified: new Date().toISOString(),
                tags: [],
                uploadedById: currentUser.id,
            };
            
            // 2. Guardar la referencia en Firestore Y OBTENER EL DOCUMENTO CON SU ID REAL
            const addedFile = await api.addDoc('archives', newArchiveFile);
            
            // 3. Actualizar el estado local con el documento real de Firestore
            setFiles(prev => prev ? [addedFile, ...prev] : [addedFile]);

            // alert(`Archivo "${file.name}" subido con éxito.`); // Removed for cleaner UX

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
                <div className="flex items-center group">
                    <div className={`p-2 rounded-lg mr-3 ${getFileColor(file.name)}`}>
                        <span className="material-symbols-outlined !text-xl">{getFileIcon(file.name)}</span>
                    </div>
                    <div>
                         <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block truncate max-w-[200px] sm:max-w-xs">
                            {file.name}
                        </a>
                        {/* Optional Tag Placeholder */}
                        {file.tags && file.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                                {file.tags.map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500">{tag}</span>)}
                            </div>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: 'Tamaño',
            accessor: (file: ArchiveFile) => <span className="text-slate-600 dark:text-slate-400 font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{formatBytes(file.size)}</span>
        },
        {
            header: 'Modificado',
            accessor: (file: ArchiveFile) => (
                <div className="flex flex-col text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{new Date(file.lastModified).toLocaleDateString('es-MX')}</span>
                    <span className="text-slate-500">{new Date(file.lastModified).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            )
        },
        {
            header: 'Subido por',
            accessor: (file: ArchiveFile) => (
                <div className="flex items-center gap-2">
                     <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        {(usersMap.get(file.uploadedById) || '?').charAt(0)}
                     </span>
                     <span className="text-slate-600 dark:text-slate-300 text-sm">{usersMap.get(file.uploadedById) || 'Usuario'}</span>
                </div>
            )
        },
        {
            header: 'Acciones',
            accessor: (file: ArchiveFile) => (
                <div className="flex space-x-1 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <a 
                        href={file.url} 
                        download={file.name} 
                        className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-colors"
                        title="Descargar"
                    >
                        <span className="material-symbols-outlined !text-lg">download</span>
                    </a>
                    <button 
                        onClick={() => handleDelete(file)} 
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                        title="Eliminar"
                    >
                        <span className="material-symbols-outlined !text-lg">delete</span>
                    </button>
                </div>
            ),
            className: 'text-right'
        },
    ];

    const renderGridView = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFiles.map(file => (
                <div key={file.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-all group relative flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                        <div className={`p-3 rounded-xl ${getFileColor(file.name)}`}>
                            <span className="material-symbols-outlined !text-3xl">{getFileIcon(file.name)}</span>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                             <a href={file.url} download={file.name} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-indigo-600">
                                <span className="material-symbols-outlined !text-sm">download</span>
                            </a>
                             <button onClick={() => handleDelete(file)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-500 hover:text-red-600">
                                <span className="material-symbols-outlined !text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 mb-2">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 dark:text-slate-200 text-sm hover:text-indigo-600 dark:hover:text-indigo-400 block truncate" title={file.name}>
                            {file.name}
                        </a>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatBytes(file.size)}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] text-slate-400">
                        <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                        <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300">{usersMap.get(file.uploadedById)?.split(' ')[0] || 'User'}</span>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderContent = () => {
        if (filesLoading || usersLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-800">Error al cargar los archivos.</p>;
        if (!files || files.length === 0) {
            return (
                <EmptyState
                    icon="folder_open"
                    title="El repositorio está vacío"
                    message="Sube tu primer archivo para comenzar a gestionar tus documentos corporativos."
                    actionText="Subir Primer Archivo"
                    onAction={handleUploadClick}
                />
            );
        }
        
        if (filteredFiles.length === 0) {
             return (
                <div className="text-center py-20">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">search_off</span>
                    <p className="text-slate-500 dark:text-slate-400">No se encontraron archivos con ese nombre.</p>
                </div>
            );
        }

        return viewMode === 'list' ? <Table columns={columns} data={filteredFiles} /> : renderGridView();
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header & KPIs */}
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Centro de Documentos</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Repositorio centralizado de archivos de la organización.</p>
                    </div>
                     <div className="flex gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button 
                          onClick={handleUploadClick}
                          disabled={isUploading}
                          className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/30 transition-all transform active:scale-95 disabled:bg-indigo-400 disabled:cursor-wait"
                        >
                            {isUploading ? (
                                <span className="material-symbols-outlined mr-2 animate-spin text-xl">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined mr-2 text-xl">cloud_upload</span>
                            )}
                            {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KpiCard title="Total Archivos" value={stats.totalFiles.toString()} icon="folder" color="bg-blue-500" />
                    <KpiCard title="Almacenamiento Usado" value={stats.totalSize} icon="database" color="bg-purple-500" />
                    <KpiCard title="Mis Archivos" value={stats.myFiles.toString()} icon="person" color="bg-amber-500" />
                </div>
            </div>

            {/* Toolbar & Content */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px] flex flex-col">
                 <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar archivos..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>

                    {/* View Toggles */}
                    <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md flex items-center transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                            title="Vista de Lista"
                        >
                            <span className="material-symbols-outlined text-xl">view_list</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md flex items-center transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                            title="Vista de Cuadrícula"
                        >
                            <span className="material-symbols-outlined text-xl">grid_view</span>
                        </button>
                    </div>
                </div>
                
                <div className="p-0 sm:p-4 flex-1 bg-slate-50/30 dark:bg-transparent">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default ArchivesPage;
