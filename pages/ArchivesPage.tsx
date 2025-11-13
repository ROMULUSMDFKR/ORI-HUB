import React, { useState, useRef, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { ArchiveFile } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

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

    useEffect(() => {
        if (initialFiles) {
            setFiles(initialFiles);
        }
    }, [initialFiles]);

    const handleDelete = (fileId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
            setFiles(prev => prev!.filter(f => f.id !== fileId));
        }
    };
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            console.log("Archivo seleccionado:", file);
            alert(`Simulando subida de "${file.name}"`);
            // Here you would typically handle the file upload process
        }
    };


    const columns = [
        {
            header: 'Nombre',
            accessor: (file: ArchiveFile) => (
                <div className="flex items-center">
                    <span className="material-symbols-outlined text-gray-500 dark:text-slate-400 mr-3">{getFileIcon(file.name)}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{file.name}</span>
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
                    <a href={file.url} download className="text-gray-500 hover:text-indigo-600 p-1 rounded-full"><span className="material-symbols-outlined">download</span></a>
                    <button onClick={() => handleDelete(file.id)} className="text-gray-500 hover:text-red-600 p-1 rounded-full"><span className="material-symbols-outlined">delete</span></button>
                </div>
            ),
            className: 'text-right'
        },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
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
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Administrador de Archivos</h2>
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
                  className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">upload_file</span>
                    Subir Archivo
                </button>
            </div>

            {renderContent()}
        </div>
    );
};

export default ArchivesPage;