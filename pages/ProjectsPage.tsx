import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Project, Task, User } from '../types';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ProjectCard from '../components/tasks/ProjectCard';
import { Link, useNavigate } from 'react-router-dom';

const ProjectsPage: React.FC = () => {
  const { data: projects, loading: pLoading, error: pError } = useCollection<Project>('projects');
  const { data: tasks, loading: tLoading, error: tError } = useCollection<Task>('tasks');
  const { data: users, loading: uLoading, error: uError } = useCollection<User>('users');
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');

  const loading = pLoading || tLoading || uLoading;
  const error = pError || tError || uError;

  const filteredProjects = useMemo(() => {
      if (!projects) return [];
      return projects.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [projects, searchTerm]);

  const renderContent = () => {
    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
    if (error) return <p className="text-center text-red-500 py-12">Error al cargar los proyectos.</p>;
    
    if (!projects || projects.length === 0) {
        return (
            <EmptyState
                icon="workspaces"
                title="No hay proyectos"
                message="Crea tu primer proyecto para agrupar tareas y colaborar con tu equipo."
                actionText="Crear Proyecto"
                onAction={() => navigate('/tasks/projects/new')}
            />
        );
    }

    if (filteredProjects.length === 0) {
        return (
             <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">search_off</span>
                <p className="text-slate-500 dark:text-slate-400">No se encontraron proyectos que coincidan con tu búsqueda.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
                <ProjectCard 
                    key={project.id} 
                    project={project} 
                    tasks={tasks || []} 
                    users={users || []} 
                />
            ))}
        </div>
    );
  };
  
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Proyectos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Supervisa las iniciativas estratégicas y el progreso del equipo.</p>
        </div>
        <Link 
          to="/tasks/projects/new"
          className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors"
        >
            <span className="material-symbols-outlined">add_box</span>
            Nuevo Proyecto
        </Link>
      </div>

      {/* Toolbar with Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
           <div className="relative w-full md:w-96">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                </div>
                <input
                    type="text"
                    placeholder="Buscar proyectos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
            </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default ProjectsPage;