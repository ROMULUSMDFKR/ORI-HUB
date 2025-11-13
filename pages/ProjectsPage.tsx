import React from 'react';
import { useCollection } from '../hooks/useCollection';
import { Project } from '../types';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ProjectCard from '../components/tasks/ProjectCard';
import { Link, useNavigate } from 'react-router-dom';

const ProjectsPage: React.FC = () => {
  const { data: projects, loading, error } = useCollection<Project>('projects');
  const navigate = useNavigate();
  
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
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => <ProjectCard key={project.id} project={project} />)}
        </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Proyectos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Supervisa las iniciativas y el progreso del equipo.</p>
        </div>
        <Link 
          to="/tasks/projects/new"
          className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
            <span className="material-symbols-outlined mr-2">add</span>
            Nuevo Proyecto
        </Link>
      </div>

      {renderContent()}
    </div>
  );
};

export default ProjectsPage;