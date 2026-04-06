import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  GraduationCap, 
  Bell, 
  ChevronRight, 
  MoreVertical 
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
  onToggle: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onUpdateStatus?: (status: TaskStatus) => void;
  onEdit?: () => void;
  onConfigureReminder?: () => void;
  onAddNote?: () => void;
}

export function TaskCard({ task, onToggle, onDelete, onUpdateStatus, onEdit, onConfigureReminder, onAddNote }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusInfo = () => {
    if (task.source !== 'classroom') return null;
    
    const status = task.submissionStatus;
    if (status === 'TURNED_IN') return { label: 'Entregue', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> };
    if (status === 'RETURNED') return { label: 'Devolvido', color: 'bg-blue-100 text-blue-700', icon: <RefreshCw className="w-3 h-3" /> };
    if (status === 'RECLAIMED_BY_STUDENT') return { label: 'Retomado', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> };
    return { label: 'Pendente', color: 'bg-slate-100 text-slate-700', icon: <AlertCircle className="w-3 h-3" /> };
  };

  const statusInfo = getStatusInfo();

  const isNearOverdue = useMemo(() => {
    if (task.completed || task.status === 'done') return false;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours > 0 && hours <= 24;
  }, [task.dueDate, task.completed, task.status]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all",
        (task.completed || task.status === 'done') && "opacity-60",
        isNearOverdue && "border-amber-200 bg-amber-50/20 shadow-amber-50"
      )}
    >
      <button 
        onClick={onToggle}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
          (task.completed || task.status === 'done') ? "bg-green-500 border-green-500 text-white" : "border-slate-300 hover:border-blue-500",
          isNearOverdue && !(task.completed || task.status === 'done') && "border-amber-400"
        )}
      >
        {(task.completed || task.status === 'done') && <CheckCircle2 className="w-4 h-4" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2">
          {/* 1st: Subject (Category) */}
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium truncate max-w-[120px]">
            {task.category}
          </span>

          {/* 2nd: Activity of the subject (Task Title) */}
          <h3 className={cn("font-semibold line-clamp-3", (task.completed || task.status === 'done') && "line-through text-slate-400")}>
            {task.title.replace(/^\[(ALUNO|PROF)\]\s*/i, '')}
          </h3>
          
          {/* 3rd: Status and Deadline */}
          {task.source === 'classroom' && statusInfo && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1",
              statusInfo.color
            )}>
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          )}

          {task.hasDueDate && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1",
              isNearOverdue && !(task.completed || task.status === 'done') ? "bg-amber-100 text-amber-700 animate-pulse" : 
              task.priority === 'high' ? "bg-red-50 text-red-600" : 
              task.priority === 'medium' ? "bg-amber-50 text-amber-600" : 
              "bg-blue-50 text-blue-600"
            )}>
              <Clock className="w-3 h-3" />
              {formatDate(task.dueDate)}
            </span>
          )}

          {/* 4th: Student or Teacher */}
          {task.role && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
              task.role === 'teacher' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            )}>
              {task.role === 'teacher' ? 'Professor' : 'Aluno'}
            </span>
          )}

          {task.assignedGrade !== null && task.assignedGrade !== undefined && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              Nota: {task.assignedGrade}/{task.maxPoints || '?'}
            </span>
          )}

          {task.role === 'teacher' && task.submissionCount && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Entregas: {task.submissionCount.turnedIn}/{task.submissionCount.total}
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
            {task.source === 'classroom' ? 'Exigências: ' : ''}{task.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {task.reminderConfig && (
            <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
              <Bell className="w-3 h-3" />
              Lembrete Ativo
            </span>
          )}

          {task.alternateLink && (
            <a 
              href={task.alternateLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-bold"
            >
              <ChevronRight className="w-3 h-3" />
              Ver no Classroom
            </a>
          )}
          {task.lastSyncAt && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              Sincronizado: {new Date(task.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {task.source === 'classroom' && !task.alternateLink && (
            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <GraduationCap className="w-2.5 h-2.5" />
              Classroom
            </span>
          )}
        </div>
      </div>

      {/* Three-dots Menu */}
      <div className="relative group">
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1 overflow-hidden">
              {onUpdateStatus && task.status !== 'in-progress' && (
                <button 
                  onClick={() => { onUpdateStatus('in-progress'); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Marcar em Progresso
                </button>
              )}
              {onUpdateStatus && task.status !== 'done' && (
                <button 
                  onClick={() => { onUpdateStatus('done'); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Finalizar
                </button>
              )}
              {onConfigureReminder && (
                <button 
                  onClick={() => { onConfigureReminder(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Configurar Lembrete
                </button>
              )}
              {onAddNote && (
                <button 
                  onClick={() => { onAddNote(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Adicionar Nota Local
                </button>
              )}
              {onEdit && task.source !== 'classroom' && (
                <button 
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Editar Original
                </button>
              )}
              <div className="h-px bg-slate-100 my-1" />
              <button 
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Excluir
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
