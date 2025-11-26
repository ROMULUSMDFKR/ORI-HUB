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
        <div className="h-full flex flex-col space-y-6">
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Plantillas de Firma</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Diseña plantillas HTML para las firmas de correo de tu equipo.
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors"
                >
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Plantilla
                </button>
            </div>

            <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
                {/* Sidebar List */}
                <div className="w-64 flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Mis Plantillas</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {templates && templates.length > 0 ? (
                            templates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplateId(template.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group ${
                                        selectedTemplateId === template.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="truncate">{template.name}</span>
                                    {selectedTemplateId === template.id && (
                                        <span className="material-symbols-outlined text-base">chevron_right</span>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-slate-500">
                                No hay plantillas. Crea una para empezar.
                            </div>
                        )}
                        {selectedTemplateId === 'new' && (
                             <button
                                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                            >
                                <span className="truncate italic">Nueva Plantilla...</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
                    {selectedTemplateId ? (
                        <>
                            {/* Name Input & Actions */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                                <div className="flex-1 mr-4">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Plantilla</label>
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-transparent text-lg font-bold text-slate-800 dark:text-slate-200 border-none focus:ring-0 p-0 placeholder-slate-400"
                                        placeholder="Ej: Firma Corporativa"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleDelete}
                                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {selectedTemplateId === 'new' ? 'Cancelar' : 'Eliminar'}
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                    >
                                        {isSaving ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">save</span>}
                                        Guardar
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                                {/* Code Editor */}
                                <div className="flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Editor HTML</h3>
                                        <div className="text-xs text-slate-500 flex gap-2">
                                            <span title="Nombre del usuario" className="cursor-help bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{{name}}'}</span>
                                            <span title="Rol / Puesto" className="cursor-help bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{{role}}'}</span>
                                            <span title="Email" className="cursor-help bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{{email}}'}</span>
                                            <span title="Teléfono" className="cursor-help bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{{phone}}'}</span>
                                        </div>
                                    </div>
                                    <textarea
                                        value={htmlContent}
                                        onChange={(e) => setHtmlContent(e.target.value)}
                                        className="flex-1 w-full p-4 font-mono text-xs leading-relaxed bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-300 resize-none focus:outline-none"
                                        placeholder="<div>Tu código HTML aquí...</div>"
                                        spellCheck="false"
                                    />
                                </div>

                                {/* Preview */}
                                <div className="flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Vista Previa</h3>
                                    </div>
                                    <div className="flex-1 p-4 bg-white overflow-auto">
                                         <iframe
                                            srcDoc={`
                                                <html>
                                                    <head><style>body { margin: 0; font-family: sans-serif; }</style></head>
                                                    <body>${previewHtml}</body>
                                                </html>
                                            `}
                                            title="Vista previa"
                                            className="w-full h-full border-0 pointer-events-none"
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
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