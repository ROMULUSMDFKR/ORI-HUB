import React, { useState, useEffect } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { api } from '../../api/firebaseApi';
import { SignatureTemplate } from '../../types';
import Spinner from '../../components/ui/Spinner';

const companies = [
  { id: 'puredef', name: 'Puredef' },
  { id: 'tradeaitirik', name: 'Trade Aitirik' },
  { id: 'santzer', name: 'Santzer' },
];

const initialHtmlTemplate = (year: number, companyName: string) => `
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
    <tbody>
      <tr>
        <td align="center" style="font-family: Arial, sans-serif; font-size: 12px; color: #64748b; line-height: 1.5;">
          <p style="margin: 0 0 8px 0;"><strong>${companyName}</strong></p>
          <p style="margin: 0;">123 Business Rd, Suite 456, Mexico City, 01000</p>
          <p style="margin: 16px 0;">
            <a href="#" style="color: #4f46e5; text-decoration: none;">Darse de baja</a>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            <a href="#" style="color: #4f46e5; text-decoration: none;">Términos y Condiciones</a>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            <a href="#" style="color: #4f46e5; text-decoration: none;">Política de Privacidad</a>
          </p>
          <p style="margin: 0;">
            © ${year} ${companyName}. Todos los derechos reservados.
          </p>
        </td>
      </tr>
    </tbody>
  </table>
`;

const EmailAppearancePage: React.FC = () => {
    const { data: fetchedTemplates, loading } = useCollection<SignatureTemplate>('emailFooters');
    const [templates, setTemplates] = useState<SignatureTemplate[]>([]);
    const [activeTab, setActiveTab] = useState(companies[0].id);

    useEffect(() => {
        const runSeed = async () => {
            console.log("No email footers found, seeding initial data...");
            const seedData = companies.map(company => ({
                id: company.id,
                name: company.name,
                htmlContent: initialHtmlTemplate(new Date().getFullYear(), company.name).trim()
            }));
            try {
                for (const template of seedData) {
                    await api.setDoc('emailFooters', template.id, template);
                }
                setTemplates(seedData);
            } catch (e) {
                console.error("Failed to seed email footers", e);
            }
        };

        if (!loading) {
            if (fetchedTemplates && fetchedTemplates.length > 0) {
                setTemplates(fetchedTemplates);
            } else {
                runSeed();
            }
        }
    }, [fetchedTemplates, loading]);

    const activeTemplate = templates.find(t => t.id === activeTab);

    const handleContentChange = (newHtml: string) => {
        setTemplates(prevTemplates => 
            prevTemplates.map(t => t.id === activeTab ? { ...t, htmlContent: newHtml } : t)
        );
    };

    const handleSave = async () => {
        if (!activeTemplate) return;
        try {
            const templateToSave = templates.find(t => t.id === activeTemplate.id);
            if (!templateToSave) return;
            
            await api.setDoc('emailFooters', templateToSave.id, templateToSave);
            alert(`Pie de correo para ${templateToSave.name} guardado con éxito.`);
        } catch (error) {
            console.error("Error saving email footer:", error);
            alert("No se pudo guardar el pie de correo.");
        }
    };

    if (loading && templates.length === 0) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center">
                <button
                    onClick={handleSave}
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors"
                >
                    <span className="material-symbols-outlined mr-2">save</span>
                    Guardar Cambios
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {companies.map(company => (
                        <button
                            key={company.id}
                            onClick={() => setActiveTab(company.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === company.id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            {company.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Editor and Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ height: 'calc(100vh - 16rem)' }}>
                {/* Editor */}
                <div className="flex flex-col bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Editor HTML</h3>
                    <textarea
                        value={activeTemplate?.htmlContent || ''}
                        onChange={(e) => handleContentChange(e.target.value)}
                        className="w-full flex-1 font-mono text-sm border-slate-300 dark:border-slate-600 rounded-lg p-3 resize-none bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                        spellCheck="false"
                    />
                </div>
                {/* Preview */}
                <div className="flex flex-col bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                     <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Vista Previa</h3>
                     <div className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900">
                        <iframe
                            srcDoc={`<html><body style="font-family: sans-serif; background-color: #f1f5f9; padding: 20px;">${activeTemplate?.htmlContent || ''}</body></html>`}
                            title="Vista previa del pie de correo"
                            className="w-full h-full border-0"
                            sandbox="allow-same-origin"
                        />
                     </div>
                </div>
            </div>
        </div>
    );
};

export default EmailAppearancePage;