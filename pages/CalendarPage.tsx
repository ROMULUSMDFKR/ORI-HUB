import React, { useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Task } from '../types';
import Spinner from '../components/ui/Spinner';
import { Link } from 'react-router-dom';

const CalendarPage: React.FC = () => {
    const { data: tasks, loading, error } = useCollection<Task>('tasks');
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay(); // 0 = Sunday, 1 = Monday...
    const daysInMonth = endOfMonth.getDate();

    const tasksByDate: { [key: string]: Task[] } = (tasks || []).reduce((acc, task) => {
        if (task.dueAt) {
            const date = new Date(task.dueAt).toDateString();
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(task);
        }
        return acc;
    }, {} as { [key: string]: Task[] });

    const calendarDays = [];
    for (let i = 0; i < startDay; i++) {
        calendarDays.push(<div key={`empty-start-${i}`} className="border-r border-b p-2 h-32"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateString = date.toDateString();
        const dayTasks = tasksByDate[dateString] || [];

        calendarDays.push(
            <div key={day} className="border-r border-b p-2 h-32 overflow-y-auto">
                <div className="font-semibold text-sm">{day}</div>
                <div className="space-y-1 mt-1">
                    {dayTasks.map(task => (
                        <Link to={`/tasks?view=board`} key={task.id} className="block bg-blue-100 text-blue-800 text-xs p-1 rounded hover:bg-blue-200 truncate">
                           {task.title}
                        </Link>
                    ))}
                </div>
            </div>
        );
    }
    const remainingCells = 7 - (calendarDays.length % 7);
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        calendarDays.push(<div key={`empty-end-${i}`} className="border-r border-b p-2 h-32"></div>);
      }
    }


    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                     <h2 className="text-2xl font-bold text-text-main">Calendario</h2>
                     <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span className="text-lg font-semibold w-40 text-center">
                        {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
                <button
                    onClick={() => setCurrentDate(new Date())}
                    className="bg-white border border-gray-300 text-text-main font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50"
                >
                    Hoy
                </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                {loading ? <div className="flex justify-center p-12"><Spinner /></div> :
                 error ? <p className="text-red-500 p-12 text-center">Error al cargar tareas.</p> : (
                    <>
                        <div className="grid grid-cols-7 text-center font-semibold text-sm border-b">
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                                <div key={day} className="py-3">{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {calendarDays}
                        </div>
                    </>
                 )}
            </div>
        </div>
    );
};

export default CalendarPage;
