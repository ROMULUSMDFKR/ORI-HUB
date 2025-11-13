import React from 'react';
import { Link } from 'react-router-dom';
import { Project, TaskStatus } from '../../types';
import { MOCK_TASKS, MOCK_USERS } from '../../data/mockData';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const projectTasks = MOCK_TASKS.filter(t => t.projectId === project.id);
  const completedTasks = projectTasks.filter(t => t.status === TaskStatus.Hecho).length;
  const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
  
  const getStatusColor = () => {
    switch(project.status) {
      case 'Activo': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300';
      case 'Completado': return 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300';
      case 'En Pausa': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  return (
    <Link to={`/tasks/projects/${project.id}`} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow block">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{project.name}</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {project.status}
        </span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 h-10 overflow-hidden">{project.description}</p>
      
      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Progreso</span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="flex -space-x-2">
            {project.members.map(userId => {
                const user = Object.values(MOCK_USERS).find(u => u.id === userId);
                return user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800" /> : null;
            })}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <span className="font-medium">Vence:</span> {new Date(project.dueDate).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;