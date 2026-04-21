import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Task, Subject } from '../types';
import { Bell, CheckCircle2, MessageSquare, GraduationCap, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeacherDashboardProps {
  tasks: Task[];
  subjects: Subject[];
}

export function TeacherDashboard({ tasks, subjects }: TeacherDashboardProps) {
  // Get all courses/tasks where the user is a teacher
  const teacherTasks = useMemo(() => {
    return tasks.filter(t => t.role === 'teacher');
  }, [tasks]);

  const recentSubmissions = useMemo(() => {
    return teacherTasks
      .filter(t => t.submissionCount && t.submissionCount.turnedIn > 0)
      .sort((a, b) => new Date(b.updateTime || b.updatedAt?.toMillis?.() || 0).getTime() - new Date(a.updateTime || a.updatedAt?.toMillis?.() || 0).getTime());
  }, [teacherTasks]);

  const announcements = useMemo(() => {
    return tasks
      .filter(t => t.source === 'classroom_announcement' && t.role === 'teacher') // Wait, announcements don't have role=teacher yet, maybe we need to fix that or just show all announcements the user created
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [tasks]);

  const allAnnouncements = useMemo(() => {
     // fallback if role isn't set on announcements
     return tasks.filter(t => t.source === 'classroom_announcement');
  }, [tasks])

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Painel do Professor</h1>
        <p className="text-slate-500 mt-1">Acompanhe entregas, mensagens e interações de suas turmas do Classroom.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Atividades com novas entregas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Entregas Recentes
            </h2>
          </div>
          
          {recentSubmissions.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
              Nenhuma entrega recente detectada nas suas turmas.
            </div>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map(task => (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{task.title.replace(/^\[PROF\]\s*/i, '')}</h3>
                    <p className="text-sm text-slate-500 truncate">{task.category || 'Classroom'}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {task.submissionCount?.turnedIn}/{task.submissionCount?.total} Entregues
                      </span>
                      {task.alternateLink && (
                        <a 
                          href={task.alternateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          Ver no Classroom
                          <ChevronRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quadro de avisos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Recados
            </h2>
          </div>

          <div className="bg-indigo-50 p-4 rounded-2xl">
            <p className="text-xs text-indigo-800 mb-4 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Para ver os comentários dos alunos ou responder dúvidas, acesse diretamente o Google Classroom usando os links abaixo.</span>
            </p>
            
            <div className="space-y-3">
              {allAnnouncements.length === 0 ? (
                <p className="text-sm font-medium text-indigo-400 text-center py-4">Nenhum recado recente.</p>
              ) : (
                allAnnouncements.slice(0, 5).map(ann => (
                  <div key={ann.id} className="bg-white/80 p-3 rounded-xl shadow-sm space-y-2">
                    <p className="font-bold text-sm text-slate-800 truncate">{ann.category}</p>
                    <p className="text-xs text-slate-600 line-clamp-3">{ann.description}</p>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-100/50">
                      <span className="text-[10px] font-medium text-slate-400">
                        {format(new Date(ann.dueDate || ann.createdAt?.toMillis?.() || Date.now()), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                      {ann.alternateLink && (
                        <a 
                          href={ann.alternateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center"
                        >
                          Abrir <ChevronRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
