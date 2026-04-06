import { SummaryCard } from './SummaryCard';
import { Task } from '../types';

export function TaskDashboardSummary({ tasks }: { tasks: Task[] }) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const activeTasks = tasks.filter(t => t.status !== 'done');
  
  const counts = {
    total: activeTasks.length,
    overdue: activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < today).length,
    today: activeTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= today && d < tomorrow;
    }).length,
    upcoming: activeTasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) >= tomorrow;
    }).length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'done').length,
    nearOverdue: activeTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= now && d <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }).length
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <SummaryCard label="Total Ativas" count={counts.total} color="bg-slate-100" />
      <SummaryCard label="Atrasadas" count={counts.overdue} color="bg-red-100" />
      <SummaryCard label="Hoje" count={counts.today} color="bg-blue-100" />
      <SummaryCard label="Em Progresso" count={counts.inProgress} color="bg-amber-100" />
    </div>
  );
}
