import React from 'react';
import { Task, Priority } from '../../types';
import { MOCK_USERS, MOCK_PROJECTS } from '../../data/mockData';
import Badge from '../ui/Badge';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
}

const getPriorityBadgeColor = (priority?: Priority) => {
    switch (priority) {
        case Priority.Alta: return 'red';
        case Priority.Media: return 'yellow';
        case Priority.Baja: return 'gray';
        default: return 'gray';
    }
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart }) => {
  const assignees = task.assignees.map(id => MOCK_USERS[id]).filter(Boolean);
  const project = MOCK_PROJECTS.find(p => p.id === task.projectId);
  
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing mb-4 space-y-3"
    >
      <h4 className="font-bold text-sm text-text-main">{task.title}</h4>

      {project && <Badge text={project.name} color="blue" />}

      <div className="flex justify-between items-center border-t pt-3 mt-2">
        <div className="flex -space-x-2">
            {assignees.map(user => (
                user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-6 h-6 rounded-full border-2 border-white" /> : null
            ))}
        </div>
        <div className="flex items-center space-x-2">
             {task.priority && <Badge text={task.priority} color={getPriorityBadgeColor(task.priority)} />}
            {task.dueAt && (
                <span className={`text-xs font-medium flex items-center ${isOverdue ? 'text-red-600' : 'text-text-secondary'}`}>
                    <span className="material-symbols-outlined text-sm mr-1">event</span>
                    {new Date(task.dueAt).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}
                </span>
            )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
