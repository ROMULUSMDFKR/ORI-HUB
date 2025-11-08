import React from 'react';
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
      case 'Activo': return 'bg-blue-100 text-blue-800';
      case 'Completado': return 'bg-green-100 text-green-800';
      case 'En Pausa': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-lg text-text-main">{project.name}</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {project.status}
        </span>
      </div>
      <p className="text-sm text-text-secondary mt-2 h-10 overflow-hidden">{project.description}</p>
      
      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">Progreso</span>
          <span className="text-xs font-medium text-gray-700">{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center border-t pt-4">
        <div className="flex -space-x-2">
            {project.members.map(userId => {
                const user = MOCK_USERS[userId];
                return user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-8 h-8 rounded-full border-2 border-white" /> : null;
            })}
        </div>
        <div className="text-sm text-text-secondary">
          <span className="font-medium">Vence:</span> {new Date(project.dueDate).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
