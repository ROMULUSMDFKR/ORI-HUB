import React, { useState, useEffect } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { api } from '../../api/firebaseApi';
import { SignatureTemplate } from '../../types';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const defaultHtmlTemplate = `
<div style="font-family: Arial, sans-serif; color: #333; margin-top: 20px;">
  <p>Saludos cordiales,</p>
  <p><strong>{{name}}</strong><br>
  <span style="color: #666;">{{role}}</span><br>
  <a href="mailto:{{email}}" style="color: #4f46e5; text-decoration: none;">{{email}}</a>
  </p>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
  <p style="font-size: 12px; color: #999;">
    Este mensaje es confidencial. Si usted no es el destinatario, por favor notifíquelo y elimínelo.
  </p>
</div>
`;

const EmailAppearancePage: React.FC = () => {
    const { data: templates, loading } = useCollection<SignatureTemplate>('signatureTemplates');
    
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Select first template on load if none selected
    useEffect(() => {
        if (!loading && templates && templates.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(templates[0].id);
        }
    }, [templates, loading, selectedTemplateId]);

    // Sync local state when selection changes
    useEffect(() => {
        const selected = templates?.find(t => t.id === selectedTemplateId);
        if (selected) {
            setName(selected.name);
            setHtmlContent(selected.htmlContent || '');
        } else if (selectedTemplateId === 'new') {
            setName('Nueva Plantilla');
            setHtmlContent(defaultHtmlTemplate);
        }
    }, [selectedTemplateId, templates]);

    const handleCreate = () => {
        setSelectedTemplateId('new');
    };

    const handleSave = async () => {
        if (!name.trim()) {
            alert('El nombre de la plantilla es obligatorio.');
            return;
        }
        setIsSaving(true);
        try {
            if (selectedTemplateId === 'new') {
                 const newTemplate = {
                    name,
                    htmlContent
                };
                const doc = await api.addDoc('signatureTemplates', newTemplate);
                setSelectedTemplateId(doc.id);
            } else if (selectedTemplateId) {
                await api.updateDoc('signatureTemplates', selectedTemplateId, { name, htmlContent });
            }
            alert('Plantilla guardada correctamente.');
        } catch (error) {
            console.error("Error saving template:", error);
            alert("No se pudo guardar la plantilla.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedTemplateId || selectedTemplateId === 'new') {
             setSelectedTemplateId(null);
             return;
        }
        if (!confirm('¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.')) return;
        
        try {
            await api.deleteDoc('signatureTemplates', selectedTemplateId);
            setSelectedTemplateId(null); 
        } catch (error) {
            console.error("Error deleting template:", error);
            alert("No se pudo eliminar la plantilla.");
        }
    };

    // Generate preview with dummy data
    const previewHtml = htmlContent
        .replace(/{{name}}/g, 'Roberto Ortega')
        .replace(/{{role}}/g, 'Gerente de Ventas')
        .replace(/{{email}}/g, 'roberto@ejemplo.com')
        .replace(/{{phone}}/g, '+52 55 1234 5678');

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Diseña y estandariza las firmas de correo para todo tu equipo.
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 gap-6 min-h-0 overflow-hidden">
                {/* Sidebar List */}
                <div className="w-full lg:w-80 flex-shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Mis Plantillas</h3>
                        <button
                            onClick={handleCreate}
                            className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
                            title="Nueva Plantilla"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {templates && templates.length > 0 ? (
                            templates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplateId(template.id)}
                                    className={`w-full text-left p-3 rounded-xl text-sm font-medium transition-all border ${
                                        selectedTemplateId === template.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20'
                                            : 'bg-white dark:bg-slate-700/50 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* App Icon Pattern */}
                                        <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${selectedTemplateId === template.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-600 dark:text-slate-300'}`}>
                                            <span className="material-symbols-outlined text-xl">wysiwyg</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`truncate font-semibold ${selectedTemplateId === template.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-200'}`}>{template.name}</p>
                                            <p className="text-xs text-slate-400 truncate">HTML Personalizado</p>
                                        </div>
                                        {selectedTemplateId === template.id && (
                                            <span className="material-symbols-outlined text-indigo-500 text-lg">chevron_right</span>
                                        )}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                <span className="material-symbols-outlined text-3xl mb-2">draft</span>
                                <p className="text-sm">No hay plantillas.</p>
                            </div>
                        )}
                        {selectedTemplateId === 'new' && (
                             <button
                                className="w-full text-left p-3 rounded-xl text-sm font-medium transition-all border bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600">
                                        <span className="material-symbols-outlined text-xl">edit_square</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-indigo-900 dark:text-indigo-100">Nueva Plantilla...</p>
                                        <p className="text-xs text-indigo-400 truncate">Editando</p>
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-hidden">
                    {selectedTemplateId ? (
                        <div className="flex flex-col h-full gap-6 overflow-y-auto pr-2">
                            
                            {/* Config Panel */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex-shrink-0">
                                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                                    <div className="flex-1 w-full">
                                        {/* Input Safe Pattern */}
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la Plantilla</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">badge</span>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                                placeholder="Ej: Firma Corporativa 2024"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 w-full md:w-auto">
                                        <button 
                                            onClick={handleDelete}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                            <span className="hidden sm:inline">{selectedTemplateId === 'new' ? 'Cancelar' : 'Eliminar'}</span>
                                        </button>
                                        <button 
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                        >
                                            {isSaving ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">save</span>}
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
                                {/* Code Editor */}
                                <div className="flex flex-col bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-sm">
                                    <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Código HTML</h3>
                                        <div className="flex gap-2">
                                            <span title="Nombre" className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 cursor-help">{'{{name}}'}</span>
                                            <span title="Rol" className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 cursor-help">{'{{role}}'}</span>
                                            <span title="Email" className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 cursor-help">{'{{email}}'}</span>
                                        </div>
                                    </div>
                                    <textarea
                                        value={htmlContent}
                                        onChange={(e) => setHtmlContent(e.target.value)}
                                        className="flex-1 w-full p-4 font-mono text-xs leading-relaxed bg-slate-900 text-green-400 resize-none focus:outline-none"
                                        placeholder="<div>Tu código HTML aquí...</div>"
                                        spellCheck="false"
                                    />
                                </div>

                                {/* Preview */}
                                <div className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                    <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vista Previa</h3>
                                        <span className="material-symbols-outlined text-slate-400 text-lg">visibility</span>
                                    </div>
                                    <div className="flex-1 p-6 bg-white overflow-auto flex items-center justify-center">
                                         <div className="w-full border border-dashed border-slate-200 rounded p-4">
                                             <iframe
                                                srcDoc={`
                                                    <html>
                                                        <head><style>body { margin: 0; font-family: sans-serif; color: #334155; }</style></head>
                                                        <body>${previewHtml}</body>
                                                    </html>
                                                `}
                                                title="Vista previa"
                                                className="w-full h-full min-h-[300px] border-0 pointer-events-none"
                                                sandbox="allow-same-origin"
                                            />
                                         </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center h-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <EmptyState 
                                icon="edit_document" 
                                title="Selecciona una plantilla" 
                                message="Elige una plantilla de la lista para editarla o crea una nueva para personalizar las firmas de tu equipo." 
                                actionText="Crear Plantilla"
                                onAction={handleCreate}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailAppearancePage;