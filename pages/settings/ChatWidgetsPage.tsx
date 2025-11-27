
import React, { useState, useEffect } from 'react';
import { api } from '../../api/firebaseApi';
import { ChatWidgetConfig } from '../../types';
import Spinner from '../../components/ui/Spinner';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { useToast } from '../../hooks/useToast';
import CustomSelect from '../../components/ui/CustomSelect';

// --- PREVIEW COMPONENT ---
const WidgetPreview: React.FC<{ config: Partial<ChatWidgetConfig> }> = ({ config }) => {
    const isRight = config.position !== 'bottom-left';
    const brandColor = config.brandColor || '#6366f1';
    
    // Helper to convert hex to RGB for opacity handling if needed, though simple style is used here
    
    return (
        <div className="relative w-full h-[600px] bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner flex flex-col">
            {/* Fake Browser Header */}
            <div className="h-8 bg-slate-200 dark:bg-slate-800 flex items-center px-3 gap-1.5 border-b border-slate-300 dark:border-slate-700">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                <div className="ml-4 flex-1 h-5 bg-white dark:bg-slate-700 rounded text-[10px] flex items-center px-2 text-slate-400">
                    {config.websiteUrl || 'https://tusitio.com'}
                </div>
            </div>

            {/* Mock Website Content */}
            <div className="flex-1 relative p-8">
                {/* Background blur effect simulation */}
                <div className="absolute inset-0 opacity-10 pointer-events-none flex flex-col gap-4 p-8">
                    <div className="h-32 bg-slate-400 rounded-lg w-full"></div>
                    <div className="flex gap-4">
                        <div className="h-40 bg-slate-400 rounded-lg flex-1"></div>
                        <div className="h-40 bg-slate-400 rounded-lg flex-1"></div>
                    </div>
                     <div className="h-60 bg-slate-400 rounded-lg w-full"></div>
                </div>

                {/* THE WIDGET MOCKUP */}
                <div className={`absolute bottom-6 ${isRight ? 'right-6' : 'left-6'} flex flex-col items-end gap-4 transition-all duration-500`}>
                    
                    {/* Chat Window Mock (Initially hidden or open state simulation, keeping open for visual context) */}
                    <div className="w-[320px] h-[450px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 transition-all duration-300 animate-fade-in-up mb-2">
                        {/* Header */}
                        <div className="p-4 text-white flex items-center gap-3" style={{ backgroundColor: brandColor }}>
                            {config.logoUrl ? (
                                <img src={config.logoUrl} alt="Logo" className="w-8 h-8 rounded-full bg-white/20 object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                     <span className="material-symbols-outlined text-lg">smart_toy</span>
                                </div>
                            )}
                            <div>
                                <h4 className="font-bold text-sm">Asistente Virtual</h4>
                                <p className="text-[10px] opacity-90 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> En línea</p>
                            </div>
                             <div className="ml-auto opacity-80">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </div>
                        </div>
                        
                        {/* Body */}
                        <div className="flex-1 bg-slate-50 p-4 space-y-4 relative">
                             {/* Messages */}
                             <div className="flex items-start gap-2">
                                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px]" style={{ backgroundColor: brandColor }}>AI</div>
                                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-600 border border-slate-100">
                                      {config.welcomeMessage || 'Hola, ¿en qué puedo ayudarte?'}
                                  </div>
                             </div>
                             
                             {/* User input area */}
                             <div className="absolute bottom-0 left-0 w-full p-3 bg-white border-t border-slate-100">
                                 <div className="bg-slate-100 rounded-full px-4 py-2 text-xs text-slate-400 flex justify-between items-center">
                                     <span>Escribe un mensaje...</span>
                                     <span className="material-symbols-outlined text-sm" style={{ color: brandColor }}>send</span>
                                 </div>
                                 <p className="text-[9px] text-center text-slate-400 mt-1">Powered by ORI CRM</p>
                             </div>
                        </div>
                    </div>

                    {/* Launcher Container */}
                    <div className="relative flex items-center">
                        
                        {/* CTA Label / Tooltip */}
                        {config.ctaText && (
                            <div className={`absolute bottom-2 ${isRight ? 'right-16' : 'left-16'} whitespace-nowrap transition-all duration-300`}>
                                <div className="bg-white text-slate-800 text-sm font-medium px-4 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2 animate-bounce-slow">
                                    <span>👋</span>
                                    {config.ctaText}
                                    {/* Arrow/Caret */}
                                    <div 
                                        className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white transform rotate-45 ${isRight ? '-right-1' : '-left-1'}`}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {/* Launcher Button with Pulse */}
                        <div className="relative">
                            {/* Pulse Ring */}
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: brandColor }}></span>
                            
                            {/* Button */}
                            <div 
                                className="relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer transition-transform hover:scale-110 z-10"
                                style={{ backgroundColor: brandColor }}
                            >
                                <span className="material-symbols-outlined text-2xl">{config.launcherIcon || 'chat'}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};


const ChatWidgetsPage: React.FC = () => {
    const [widgets, setWidgets] = useState<ChatWidgetConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // Initial State with defaults for new fields
    const defaultWidgetState: Partial<ChatWidgetConfig> = {
        name: '',
        websiteUrl: '',
        brandColor: '#6366f1',
        welcomeMessage: '¡Hola! Soy el asistente virtual de Trade Aitirik. ¿En qué puedo ayudarte?',
        aiPersonality: 'Eres un asistente de ventas servicial. Tu objetivo es calificar al cliente y obtener su correo electrónico.',
        isActive: true,
        position: 'bottom-right',
        launcherIcon: 'chat',
        ctaText: '¡Estamos en línea!'
    };

    const [currentWidget, setCurrentWidget] = useState<Partial<ChatWidgetConfig>>(defaultWidgetState);
    const { showToast } = useToast();

    // Simulate fetching data
    useEffect(() => {
        setTimeout(() => {
            setWidgets([
                {
                    id: 'w-1',
                    name: 'Web Principal',
                    websiteUrl: 'https://tradeaitirik.com.mx',
                    brandColor: '#6366f1',
                    welcomeMessage: '¡Hola! Bienvenido a Trade Aitirik.',
                    aiPersonality: 'Sales assistant',
                    isActive: true,
                    createdById: 'admin',
                    position: 'bottom-right',
                    launcherIcon: 'forum',
                    ctaText: '¡Estamos en línea!'
                }
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    const handleEdit = (widget: ChatWidgetConfig) => {
        setCurrentWidget(widget);
        setIsEditing(true);
    };

    const handleCreate = () => {
        setCurrentWidget(defaultWidgetState);
        setIsEditing(true);
    };

    const handleSave = () => {
        // In real app: Save to Firestore
        showToast('success', 'Widget guardado exitosamente.');
        setIsEditing(false);
    };
    
    const generateSnippet = (widgetId: string) => {
        return `
<!-- ORI Chat Widget -->
<script>
  (function() {
    // Tracking Logic
    function getVisitorId() {
        let vid = localStorage.getItem('ori_visitor_id');
        if (!vid) {
            vid = 'vis-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
            localStorage.setItem('ori_visitor_id', vid);
        }
        return vid;
    }

    window.oriConfig = {
      widgetId: "${widgetId}",
      visitorId: getVisitorId(), // Identifies returning users
      apiBase: "https://api.ori-crm.com/v1/chat" 
    };
  })();
</script>
<script src="https://cdn.ori-crm.com/widget.js" async></script>
<!-- End ORI Chat Widget -->
        `.trim();
    };

    const copySnippet = (id: string) => {
        navigator.clipboard.writeText(generateSnippet(id));
        showToast('success', 'Código copiado al portapapeles.');
    }

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    if (isEditing) {
        return (
            <div className="max-w-6xl mx-auto pb-20">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {currentWidget.id ? 'Editar Widget' : 'Nuevo Widget'}
                    </h1>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(false)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                        <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                            <span className="material-symbols-outlined">save</span> Guardar Widget
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* LEFT COLUMN: CONFIGURATION */}
                    <div className="space-y-6">
                        
                        {/* 1. General Config */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">settings</span> Configuración Básica
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Widget</label>
                                    <input type="text" value={currentWidget.name} onChange={e => setCurrentWidget({...currentWidget, name: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" placeholder="Ej: Landing Page 2024" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sitio Web (Dominio)</label>
                                    <input type="text" value={currentWidget.websiteUrl} onChange={e => setCurrentWidget({...currentWidget, websiteUrl: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" placeholder="https://tusitio.com" />
                                </div>
                            </div>
                        </div>

                        {/* 2. Appearance & Design */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-pink-500">palette</span> Apariencia y Diseño
                            </h3>
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color de Marca</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={currentWidget.brandColor} onChange={e => setCurrentWidget({...currentWidget, brandColor: e.target.value})} className="h-10 w-full rounded cursor-pointer border border-slate-300 dark:border-slate-600 p-1 bg-white dark:bg-slate-900" />
                                        </div>
                                    </div>
                                    <div>
                                        <CustomSelect 
                                            label="Posición"
                                            options={[{value: 'bottom-right', name: 'Derecha Abajo'}, {value: 'bottom-left', name: 'Izquierda Abajo'}]}
                                            value={currentWidget.position || 'bottom-right'}
                                            onChange={val => setCurrentWidget({...currentWidget, position: val as any})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Icono del Launcher</label>
                                    <div className="flex gap-3">
                                        {['chat', 'forum', 'support_agent', 'mail', 'smart_toy'].map(icon => (
                                            <button
                                                key={icon}
                                                onClick={() => setCurrentWidget({...currentWidget, launcherIcon: icon})}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${currentWidget.launcherIcon === icon ? 'bg-indigo-100 border-indigo-500 text-indigo-600 ring-2 ring-indigo-200' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                <span className="material-symbols-outlined">{icon}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Texto de Llamada a la Acción (CTA)</label>
                                    <input 
                                        type="text" 
                                        value={currentWidget.ctaText || ''} 
                                        onChange={e => setCurrentWidget({...currentWidget, ctaText: e.target.value})} 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" 
                                        placeholder="Ej: ¡Estamos en línea!"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Aparece junto al botón flotante para invitar al usuario.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mensaje de Bienvenida</label>
                                    <input type="text" value={currentWidget.welcomeMessage} onChange={e => setCurrentWidget({...currentWidget, welcomeMessage: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL del Logo (Opcional)</label>
                                    <input type="text" value={currentWidget.logoUrl || ''} onChange={e => setCurrentWidget({...currentWidget, logoUrl: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" placeholder="https://..." />
                                </div>
                            </div>
                        </div>

                        {/* 3. AI Behavior */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-purple-500">psychology</span>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Comportamiento IA</h3>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instrucciones del Sistema (Prompt)</label>
                                <textarea 
                                    rows={5} 
                                    value={currentWidget.aiPersonality} 
                                    onChange={e => setCurrentWidget({...currentWidget, aiPersonality: e.target.value})}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100"
                                    placeholder="Define cómo debe comportarse la IA..."
                                />
                                <p className="text-xs text-slate-500 mt-1">Define el tono, objetivo y restricciones del agente.</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: LIVE PREVIEW */}
                    <div className="lg:sticky lg:top-6 self-start">
                        <div className="mb-4 flex items-center justify-between">
                             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Vista Previa en Vivo</h3>
                             <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Actualización en tiempo real</span>
                        </div>
                        <WidgetPreview config={currentWidget} />
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Widgets de Chat</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Configura los chatbots para tus sitios web externos.</p>
                </div>
                <button onClick={handleCreate} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span> Nuevo Widget
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {widgets.map(widget => (
                    <div key={widget.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:shadow-md">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{widget.name}</h3>
                                <div className={`px-2 py-0.5 rounded text-xs font-bold ${widget.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {widget.isActive ? 'Activo' : 'Inactivo'}
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">language</span>
                                {widget.websiteUrl}
                            </p>
                        </div>

                        <div className="w-full md:w-1/2 bg-slate-900 rounded-lg p-4 relative group">
                            <p className="text-xs text-slate-400 mb-2 font-mono">Código de Inserción (Pegar en &lt;body&gt;)</p>
                            <code className="text-xs text-green-400 font-mono block overflow-x-auto whitespace-pre bg-black/30 p-2 rounded border border-slate-700">
                                {generateSnippet(widget.id).split('\n')[4]}...
                            </code>
                            <button 
                                onClick={() => copySnippet(widget.id)}
                                className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <span className="material-symbols-outlined !text-sm">content_copy</span> Copiar
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => handleEdit(widget)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Editar configuración">
                                <span className="material-symbols-outlined">settings</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-6">
                <h3 className="font-bold text-indigo-800 dark:text-indigo-200 mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined">info</span>
                    ¿Cómo instalar en HostGator / WordPress?
                </h3>
                <ol className="list-decimal list-inside text-sm text-indigo-700 dark:text-indigo-300 space-y-2">
                    <li>Copia el código del widget que deseas instalar.</li>
                    <li>Ve a tu panel de administración de WordPress o cPanel.</li>
                    <li>Si usas WordPress, instala el plugin "Insert Headers and Footers" o edita el archivo <code>footer.php</code> de tu tema.</li>
                    <li>Pega el código justo antes de la etiqueta de cierre <code>&lt;/body&gt;</code>.</li>
                    <li>¡Listo! El chat aparecerá automáticamente y la IA comenzará a responder.</li>
                </ol>
            </div>
        </div>
    );
};

export default ChatWidgetsPage;
