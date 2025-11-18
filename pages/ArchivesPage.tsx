import React, { useState, useRef, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { ArchiveFile } from '../types';
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


const ArchivesPage: React.FC = () => {
    const { data: initialFiles, loading, error } = useCollection<ArchiveFile>('archives');
    const [files, setFiles] = useState<ArchiveFile[] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { user: currentUser } = useAuth();

    useEffect(() => {
        if (initialFiles) {
            setFiles(initialFiles);
        }
    }, [initialFiles]);

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
                    <span className="material-symbols-outlined text-gray-500 dark:text-slate-400 mr-3">{getFileIcon(file.name)}</span>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{file.name}</a>
                </div>
            )
        },
        {
            header: 'Tamaño',
            accessor: (file: ArchiveFile) => formatBytes(file.size)
        },
        {
            header: 'Última Modificación',
            accessor: (file: ArchiveFile) => new Date(file.lastModified).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
        },
        {
            header: 'Acciones',
            accessor: (file: ArchiveFile) => (
                <div className="flex space-x-2">
                    <a href={file.url} download={file.name} className="text-gray-500 hover:text-indigo-600 p-1 rounded-full"><span className="material-symbols-outlined">download</span></a>
                    <button onClick={() => handleDelete(file)} className="text-gray-500 hover:text-red-600 p-1 rounded-full"><span className="material-symbols-outlined">delete</span></button>
                </div>
            ),
            className: 'text-right'
        },
    ];

    const renderContent = () => {
        if (loading && !files) return <div className="flex justify-center py-12"><Spinner /></div>;
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
        return <Table columns={columns} data={files} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    {/* Title is now in the main header */}
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona todos los documentos de la organización.</p>
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
                  className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors disabled:bg-indigo-400 disabled:cursor-wait">
                    {isUploading ? (
                        <span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
                    ) : (
                        <span className="material-symbols-outlined mr-2">upload_file</span>
                    )}
                    {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                </button>
            </div>

            {renderContent()}
        </div>
    );
};

export default ArchivesPage;