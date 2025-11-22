
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDoc } from '../../hooks/useDoc';
import { SignatureTemplate } from '../../types';
import { api } from '../../data/mockData';
import Spinner from '../../components/ui/Spinner';

// --- TYPES AND CONFIGS ---

type ElementType = 'heading' | 'text' | 'button' | 'image' | 'spacer' | 'columns';

interface StyleProps {
    color?: string;
    backgroundColor?: string;
    fontSize?: string; // in px
    textAlign?: 'left' | 'center' | 'right';
    padding?: string; // All sides, e.g., '10px'
    paddingTop?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
    fontWeight?: 'normal' | 'bold';
    lineHeight?: string;
    borderRadius?: string; // in px
    textDecoration?: string;
    maxWidth?: string;
    height?: string;
    border?: string;
    verticalAlign?: 'top' | 'middle' | 'bottom';
    display?: string;
}

interface Element {
    id: string;
    type: ElementType;
    content?: string; // For text, heading, button label
    props: {
        src?: string;
        href?: string;
        height?: number; // for spacer
        styles: StyleProps;
        containerStyles: StyleProps;
    };
    // For columns
    columnCount?: number;
    columns?: Element[][];
}

const COMPONENT_CONFIG: Record<ElementType, Omit<Element, 'id'>> = {
    heading: { type: 'heading', content: 'Título Principal', props: { styles: { fontSize: '28px', fontWeight: 'bold', color: '#1e293b', textAlign: 'left' }, containerStyles: { padding: '10px 20px' }}},
    text: { type: 'text', content: 'Este es un párrafo de texto. Puedes editarlo para añadir tu propio contenido y darle estilo.', props: { styles: { fontSize: '16px', color: '#475569', lineHeight: '1.5' }, containerStyles: { padding: '10px 20px' }}},
    button: { type: 'button', content: 'Botón de Acción', props: { href: '#', styles: { backgroundColor: '#4f46e5', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }, containerStyles: { padding: '10px 20px', textAlign: 'left' }}},
    image: { type: 'image', props: { src: 'https://via.placeholder.com/600x100', href: '', styles: { maxWidth: '100%', height: 'auto', display: 'block' }, containerStyles: { padding: '0px' }}},
    spacer: { type: 'spacer', props: { height: 20, styles: {}, containerStyles: {} } },
    columns: { type: 'columns', columnCount: 2, columns: [[], []], props: { styles: {}, containerStyles: { padding: '10px' }}},
};


// --- DRAG-AND-DROP BUILDER COMPONENTS ---

const DraggableComponent: React.FC<{ type: ElementType, name: string, icon: string }> = ({ type, name, icon }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        // Sending simple string data, safe from circular refs
        e.dataTransfer.setData('application/json', JSON.stringify({ type }));
    };
    return (
        <div draggable onDragStart={handleDragStart} className="flex items-center gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-700 cursor-grab active:cursor-grabbing">
            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">{icon}</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{name}</span>
        </div>
    );
};

const RenderElement: React.FC<{
    element: Element;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onDrop: (e: React.DragEvent, parentId: string, columnIndex: number) => void;
}> = ({ element, isSelected, onClick, onDelete, onDrop }) => {
    const { type, content, props, columns, columnCount } = element;

    const ElementWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
        <div onClick={onClick} className={`relative p-1 cursor-pointer hover:ring-2 hover:ring-indigo-400 ${isSelected ? 'ring-2 ring-indigo-600' : ''}`}>
            {children}
            {isSelected && (
                <button onClick={onDelete} className="absolute top-0 right-0 -mt-3 -mr-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10">
                    <span className="material-symbols-outlined !text-sm">delete</span>
                </button>
            )}
        </div>
    );
    
    if (type === 'columns') {
        return (
            <ElementWrapper>
                <table border={0} cellPadding="0" cellSpacing="0" width="100%">
                    <tbody>
                        <tr>
                            {columns?.map((col, colIndex) => (
                                <td key={colIndex} width={`${100 / (columnCount || 1)}%`} style={{ verticalAlign: 'top', padding: '0 5px' }}>
                                    <div 
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={(e) => onDrop(e, element.id, colIndex)}
                                        className="min-h-[50px] border-2 border-dashed border-transparent hover:border-indigo-400"
                                    >
                                        {col.map(el => (
                                             <div key={el.id} style={el.props.containerStyles}>
                                                <RenderElement 
                                                    element={el} 
                                                    isSelected={isSelected} // This is incorrect, but we select the whole column block for now
                                                    onClick={(e) => { e.stopPropagation(); /* TODO: select child element */ }}
                                                    onDelete={(e) => { e.stopPropagation(); /* TODO: delete child element */ }}
                                                    onDrop={onDrop}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </ElementWrapper>
        );
    }


    switch (type) {
        case 'heading': return <ElementWrapper><h1 style={props.styles}>{content}</h1></ElementWrapper>;
        case 'text': return <ElementWrapper><p style={props.styles}>{content}</p></ElementWrapper>;
        case 'button': return <ElementWrapper><a href={props.href} style={{ ...props.styles, display: 'inline-block' }}>{content}</a></ElementWrapper>;
        case 'image': return <ElementWrapper><img src={props.src} style={props.styles} alt="placeholder"/></ElementWrapper>;
        case 'spacer': return <ElementWrapper><div style={{ height: `${props.height}px` }}></div></ElementWrapper>;
        default: return null;
    }
};

const PropertiesPanel: React.FC<{ element: Element | null; onUpdate: (id: string, newProps: Partial<Element> | { props: Element['props'] }) => void }> = ({ element, onUpdate }) => {
    if (!element) return <div className="p-4 text-sm text-slate-500">Selecciona un elemento para editar sus propiedades.</div>;
    
    const updateProp = (prop: string, value: any) => {
        const [key, subkey] = prop.split('.');
        if (key === 'styles' || key === 'containerStyles') {
            onUpdate(element.id, { props: { ...element.props, [key]: { ...element.props[key], [subkey]: value }}});
        } else if (key === 'content') {
            onUpdate(element.id, { content: value });
        } else if (key === 'columnCount') {
            const newCount = Number(value);
            const newColumns = Array.from({ length: newCount }, (_, i) => element.columns?.[i] || []);
            // Move orphaned elements to the last column
            if(newCount < (element.columnCount || 0)){
                for (let i = newCount; i < (element.columnCount || 0); i++){
                    newColumns[newCount - 1].push(...(element.columns?.[i] || []));
                }
            }
            onUpdate(element.id, { columnCount: newCount, columns: newColumns });
        } else {
            onUpdate(element.id, { props: { ...element.props, [prop]: value }});
        }
    };
    
    return (
        <div className="p-4 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{element.type}</h3>
            
            {['heading', 'text'].includes(element.type) && <Input label="Contenido" type="textarea" value={element.content || ''} onChange={(val) => updateProp('content', val)} />}
            {element.type === 'button' && <Input label="Texto del botón" value={element.content || ''} onChange={(val) => updateProp('content', val)} />}
            {element.type === 'button' && <Input label="URL del enlace" value={element.props.href || ''} onChange={(val) => updateProp('href', val)} />}
            {element.type === 'image' && <Input label="URL de la imagen" value={element.props.src || ''} onChange={(val) => updateProp('src', val)} />}
            {element.type === 'spacer' && <Input label="Altura (px)" type="number" value={element.props.height || 0} onChange={(val) => updateProp('height', Number(val))} />}

            {element.type === 'columns' && <Select label="Número de columnas" value={element.columnCount || 2} onChange={(val) => updateProp('columnCount', val)} options={['2', '3', '4']} />}

            <Section title="Estilos">
                {['heading', 'text', 'button'].includes(element.type) && <Input label="Color de texto" type="color" value={element.props.styles.color || '#000000'} onChange={(val) => updateProp('styles.color', val)} />}
                {element.type === 'button' && <Input label="Color de fondo" type="color" value={element.props.styles.backgroundColor || '#4f46e5'} onChange={(val) => updateProp('styles.backgroundColor', val)} />}
                {['heading', 'text'].includes(element.type) && <Input label="Tamaño de fuente (px)" type="number" value={parseInt(element.props.styles.fontSize || '16')} onChange={(val) => updateProp('styles.fontSize', `${val}px`)} />}
                {['heading', 'text'].includes(element.type) && <Select label="Alineación" value={element.props.styles.textAlign || 'left'} onChange={(val) => updateProp('styles.textAlign', val)} options={['left', 'center', 'right']} />}
            </Section>
             <Section title="Contenedor">
                <Input label="Relleno (Padding)" value={element.props.containerStyles.padding || '10px 20px'} onChange={(val) => updateProp('containerStyles.padding', val)} />
            </Section>
        </div>
    );
};

const Input: React.FC<{label:string, value: any, onChange: (v:any)=>void, type?:string}> = ({label, value, onChange, type='text'}) => (
    <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
        {type==='textarea' ? <textarea value={value} onChange={e=>onChange(e.target.value)} className="w-full mt-1"/> : <input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full mt-1"/>}
    </div>
);
const Select: React.FC<{label:string, value: any, onChange: (v:any)=>void, options: string[]}> = ({label, value, onChange, options}) => (
    <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
        <select value={value} onChange={e=>onChange(e.target.value)} className="w-full mt-1">{options.map(o=><option key={o} value={o}>{o}</option>)}</select>
    </div>
);
const Section: React.FC<{title:string, children: React.ReactNode}> = ({title, children}) => (<div className="border-t border-slate-200 dark:border-slate-700 pt-4"><h4 className="text-xs font-bold uppercase text-slate-400 mb-2">{title}</h4><div className="space-y-2">{children}</div></div>);

const SignatureTemplateBuilderPage: React.FC = () => {
    const { templateId } = useParams<{ templateId: string }>();
    const navigate = useNavigate();
    const isNew = !templateId;

    const { data: template, loading, error } = useDoc<SignatureTemplate>('signatureTemplates', isNew ? '' : templateId || '');
    
    const [templateName, setTemplateName] = useState('');
    const [elements, setElements] = useState<Element[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

    useEffect(() => {
        if (!isNew && template) {
            setTemplateName(template.name);
            alert('La edición de plantillas existentes reiniciará el lienzo. En una aplicación real, el contenido se cargaría aquí.');
        } else {
             setTemplateName('Nueva Plantilla');
             setElements([]);
        }
    }, [template, isNew]);

    const handleSave = async () => {
        if (!templateName.trim()) {
            alert('El nombre de la plantilla es obligatorio.');
            return;
        }
        const finalHtml = generateHtml(elements);
        
        if (isNew) {
            const newTemplate = { id: `template-${Date.now()}`, name: templateName, htmlContent: finalHtml };
            await api.addDoc('signatureTemplates', newTemplate);
        } else if (templateId) {
            await api.updateDoc('signatureTemplates', templateId, { name: templateName, htmlContent: finalHtml });
        }
        
        alert('Plantilla guardada con éxito.');
        navigate('/settings/signature-templates');
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, parentId: string | null = null, columnIndex: number = 0) => {
        e.preventDefault();
        e.stopPropagation();
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        const type = data.type as ElementType;
        
        const config = COMPONENT_CONFIG[type];
        
        // Safe shallow copy of props to avoid circular reference issues with JSON.stringify/parse deep cloning hacks
        const safeProps = {
            ...config.props,
            styles: { ...config.props.styles },
            containerStyles: { ...config.props.containerStyles }
        };

        const newElement: Element = {
            id: `el-${Date.now()}`,
            type: config.type,
            content: config.content,
            props: safeProps,
            columnCount: config.columnCount,
            // Ensure new array references for columns
            columns: config.columns ? [[], []] : undefined 
        };
        
        if (parentId) { // Dropped inside a column
            setElements(prev => prev.map(el => {
                if (el.id === parentId && el.type === 'columns' && el.columns) {
                    const newColumns = [...el.columns];
                    newColumns[columnIndex] = [...newColumns[columnIndex], newElement];
                    return { ...el, columns: newColumns };
                }
                return el;
            }));
        } else { // Dropped in the root canvas
            setElements(prev => [...prev, newElement]);
        }
        setSelectedElementId(newElement.id);
    };

    const handleUpdateElement = (id: string, newProps: Partial<Element> | { props: Element['props'] }) => {
        const updateRecursively = (els: Element[]): Element[] => {
            return els.map(el => {
                if (el.id === id) return { ...el, ...newProps };
                if (el.columns) {
                    return { ...el, columns: el.columns.map(col => updateRecursively(col)) };
                }
                return el;
            });
        };
        setElements(updateRecursively);
    };

    const handleDeleteElement = (id: string) => {
        const deleteRecursively = (els: Element[]): Element[] => {
            return els.filter(el => {
                if (el.id === id) return false;
                if (el.columns) {
                    el.columns = el.columns.map(col => deleteRecursively(col));
                }
                return true;
            });
        };
        setElements(deleteRecursively);
        if (selectedElementId === id) setSelectedElementId(null);
    };
    
    const generateRowsHtml = (elementsToRender: Element[]): string => {
        return elementsToRender.map(el => {
            const containerStyles = Object.entries(el.props.containerStyles || {}).map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(';');
            
            if (el.type === 'columns') {
                const columnWidth = 100 / (el.columnCount || 2);
                const columnsHtml = (el.columns || []).map(columnElements => {
                    const innerRows = generateRowsHtml(columnElements);
                    return `<td width="${columnWidth}%" valign="top" style="padding: 0 5px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tbody>${innerRows}</tbody>
                                </table>
                            </td>`;
                }).join('');
                return `<tr><td style="${containerStyles}"><table width="100%" border="0" cellspacing="0" cellpadding="0"><tbody><tr>${columnsHtml}</tr></tbody></table></td></tr>`;
            }

            const elStyles = Object.entries(el.props.styles || {}).map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(';');
            let elementHtml = '';
            switch(el.type) {
                case 'heading': elementHtml = `<h1 style="${elStyles}">${el.content}</h1>`; break;
                case 'text': elementHtml = `<p style="${elStyles}">${el.content}</p>`; break;
                case 'button': elementHtml = `<table border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="border-radius:8px;background:${el.props.styles.backgroundColor||'#4f46e5'};"><a href="${el.props.href}" target="_blank" style="${elStyles};border:1px solid ${el.props.styles.backgroundColor||'#4f46e5'};display:inline-block;font-family:sans-serif;font-size:13px;font-weight:bold;line-height:120%;margin:0;text-decoration:none;text-transform:none;">${el.content}</a></td></tr></table>`; break;
                case 'image': elementHtml = `<img src="${el.props.src}" style="${elStyles}" width="100%" />`; break;
                case 'spacer': elementHtml = `<div style="height:${el.props.height}px;line-height:${el.props.height}px;">&#8202;</div>`; break;
            }
            return `<tr><td style="${containerStyles}">${elementHtml}</td></tr>`;
        }).join('');
    };

    const generateHtml = (elementsToRender: Element[]): string => {
        const body = generateRowsHtml(elementsToRender);
        return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:0;}p,h1,h2{margin:0;}</style></head><body style="background-color:#f1f5f9;"><center><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;width:100%;max-width:600px;"><tbody>${body}</tbody></table></center></body></html>`;
    };

    const selectedElement = useMemo(() => {
        const findRecursively = (els: Element[], id: string): Element | null => {
            for (const el of els) {
                if (el.id === id) return el;
                if (el.columns) {
                    for (const col of el.columns) {
                        const found = findRecursively(col, id);
                        if (found) return found;
                    }
                }
            }
            return null;
        };
        return selectedElementId ? findRecursively(elements, selectedElementId) : null;
    }, [selectedElementId, elements]);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!isNew && error) return <div className="text-center p-12">No se encontró la plantilla.</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)]">
             <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <div>
                    <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} className="text-xl font-bold bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md p-1 -m-1" />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                        <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-md ${previewMode === 'desktop' ? 'bg-white dark:bg-slate-800 shadow' : ''}`}><span className="material-symbols-outlined">desktop_windows</span></button>
                        <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-md ${previewMode === 'mobile' ? 'bg-white dark:bg-slate-800 shadow' : ''}`}><span className="material-symbols-outlined">smartphone</span></button>
                    </div>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Plantilla</button>
                </div>
            </div>

            <div className="flex-grow grid grid-cols-12 gap-4 min-h-0">
                {/* Component Panel */}
                <div className="col-span-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 overflow-y-auto">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Componentes</h2>
                    <DraggableComponent type="heading" name="Título" icon="title" />
                    <DraggableComponent type="text" name="Texto" icon="article" />
                    <DraggableComponent type="button" name="Botón" icon="smart_button" />
                    <DraggableComponent type="image" name="Imagen" icon="image" />
                    <DraggableComponent type="spacer" name="Espaciador" icon="height" />
                    <DraggableComponent type="columns" name="Columnas" icon="view_column" />
                </div>

                {/* Canvas */}
                <div className="col-span-6 bg-slate-100 dark:bg-slate-900 rounded-lg p-4 overflow-y-auto" onDragOver={e => e.preventDefault()} onDrop={(e) => handleDrop(e)}>
                    <div className={`${previewMode === 'mobile' ? 'w-[375px]' : 'w-full'} max-w-[600px] mx-auto bg-white dark:bg-slate-800 shadow-lg`}>
                        {elements.map(el => (
                            <div key={el.id} style={el.props.containerStyles}>
                                <RenderElement 
                                    element={el} 
                                    isSelected={selectedElementId === el.id} 
                                    onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }} 
                                    onDelete={(e) => { e.stopPropagation(); handleDeleteElement(el.id); }}
                                    onDrop={handleDrop}
                                />
                            </div>
                        ))}
                         {elements.length === 0 && (
                            <div className="text-center p-20 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                                <p className="text-slate-500">Arrastra un componente aquí</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Properties Panel */}
                <div className="col-span-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-y-auto">
                    <PropertiesPanel element={selectedElement} onUpdate={handleUpdateElement} />
                </div>
            </div>
        </div>
    );
};

export default SignatureTemplateBuilderPage;
