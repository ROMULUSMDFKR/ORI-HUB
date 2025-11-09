import { TaskStatus } from "../types";

export const getOverdueStatus = (dueAt: string | undefined, status: TaskStatus) => {
    if (!dueAt || status === TaskStatus.Hecho) {
        return { isOverdue: false, overdueText: '' };
    }

    const now = new Date();
    const dueDate = new Date(dueAt);
    
    // To compare dates only, ignore time part
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (dueDay.getTime() >= today.getTime()) {
        return { isOverdue: false, overdueText: '' };
    }

    const diffTime = today.getTime() - dueDay.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let overdueText = '';
    if (diffDays === 1) {
        overdueText = 'Vencida ayer';
    } else {
        overdueText = `Vencida hace ${diffDays} días`;
    }

    return { isOverdue: true, overdueText };
};
