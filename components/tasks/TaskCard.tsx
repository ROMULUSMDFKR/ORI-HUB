import React from 'react';
import { Task, Priority, User, Project } from '../../types';
import Badge from '../ui/Badge';

interface TaskCardProps {
  task: Task;
  usersMap: Map<string, User>;
  projectsMap: Map<string, Project>;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onClick: () => void;
}

const getPriorityBadgeColor = (priority?: Priority) => {
    switch (priority) {
        case Priority.Alta: return 'red';
        case Priority.Media: return 'yellow';
        case Priority.Baja: return 'gray';
        default: return 'gray';
    }
};

const TaskCard: React.FC<TaskCardProps> = ({ task, usersMap, projectsMap, onDragStart, onClick }) => {
  const assignees = task.assignees.map(id => usersMap.get(id)).filter(Boolean);
  const project = task.projectId ? projectsMap.get(task.projectId) : null;
  
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();

  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={(e) => onDragStart(e, task.id)}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-700/50"
    >
      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{task.title}</h4>

      <div className="flex flex-wrap gap-1">
        {project && <Badge text={project.name} color="blue" />}
        {task.tags?.map(tag => <Badge key={tag} text={tag} />)}
      </div>

      <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
        <div className="flex -space-x-2">
            {assignees.map(user => (
                user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800" /> : null
            ))}
        </div>
        <div className="flex items-center space-x-2 text-xs">
             {totalSubtasks > 0 && (
                <span className="font-medium flex items-center text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-sm mr-1">check_box</span>
                    {completedSubtasks}/{totalSubtasks}
                </span>
             )}
             {task.priority && <Badge text={task.priority} color={getPriorityBadgeColor(task.priority)} />}
            {task.dueAt && (
                <span className={`font-medium flex items-center ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
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