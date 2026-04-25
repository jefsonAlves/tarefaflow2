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
  isSyncing?: boolean;
  onSyncClassroom?: () => void;
}

export function TeacherDashboard({ tasks, subjects, isSyncing, onSyncClassroom }: TeacherDashboardProps) {
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);

  // Get all courses/tasks where the user is a teacher
  const teacherTasks = useMemo(() => {
    return tasks.filter(t => t.role === 'teacher');
  }, [tasks]);

  const recentSubmissions = useMemo(() => {
    return teacherTasks
      .filter(t => t.submissionCount && t.submissionCount.turnedIn > 0)
      .sort((a, b) => new Date(b.updateTime || b.updatedAt?.toMillis?.() || 0).getTime() - new Date(a.updateTime || a.updatedAt?.toMillis?.() || 0).getTime());
  }, [teacherTasks]);

  const selectedTask = useMemo(() => {
    return teacherTasks.find(t => t.id === selectedTaskId);
  }, [teacherTasks, selectedTaskId]);

  // Mock student list for demonstration
  const mockStudents = useMemo(() => {
    if (!selectedTask || !selectedTask.submissionCount) return [];
    
    const students = [];
    const { turnedIn, total } = selectedTask.submissionCount;
    
    // First N are turned in
    for (let i = 1; i <= total; i++) {
      const isTurnedIn = i <= turnedIn;
      students.push({
        id: `student-${i}`,
        name: `Aluno Exemplo ${i}`,
        status: isTurnedIn ? 'TURNED_IN' : 'PENDING',
        photo: `https://ui-avatars.com/api/?name=Aluno+${i}&background=random`
      });
    }
    return students;
  }, [selectedTask]);

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
              {recentSubmissions.map((task, idx) => (
                <motion.div 
                  key={`${task.id}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                  className={cn(
                    "bg-white p-4 rounded-3xl shadow-sm border flex flex-col gap-4 hover:shadow-md transition-all cursor-pointer",
                    selectedTaskId === task.id ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-100"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center shrink-0">
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
                        <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 shrink-0">
                          {selectedTaskId === task.id ? 'Ocultar Lista' : 'Quem Entregou?'}
                          <ChevronRight className={cn("w-3 h-3 transition-transform", selectedTaskId === task.id && "rotate-90")} />
                        </span>
                      </div>
                    </div>
                    {task.alternateLink && (
                      <a 
                        href={task.alternateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </a>
                    )}
                  </div>

                  {selectedTaskId === task.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-slate-100 pt-4 space-y-3"
                    >
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Relatório de Demonstração</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mockStudents.map(student => (
                          <div key={student.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 border border-slate-100">
                            <div className="flex items-center gap-2">
                              <img src={student.photo} className="w-6 h-6 rounded-lg shadow-sm" alt="" />
                              <span className="text-xs font-medium text-slate-700">{student.name}</span>
                            </div>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                              student.status === 'TURNED_IN' ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
                            )}>
                              {student.status === 'TURNED_IN' ? 'Entregue' : 'Pendente'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
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
            <div className="flex flex-col gap-3 mb-6">
              <p className="text-xs text-indigo-800 flex items-start gap-2 bg-indigo-100/50 p-3 justify-center items-center rounded-xl border border-indigo-100 font-medium">
                <AlertCircle className="w-5 h-5 shrink-0 text-indigo-600" />
                <span>Para liberar o acesso as mensagens e recado clique no botão abaixo e autorize o acesso do app as mensagens do classroom. O acesso é feito de forma segura para garantir a proteção de seus dados e sincronizar corretamente as atribuições e comunicados.</span>
              </p>
              {onSyncClassroom && (
                <button
                  onClick={onSyncClassroom}
                  disabled={isSyncing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl shadow-sm shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                >
                  {isSyncing ? 'Sincronizando...' : 'Autorizar e Sincronizar Classroom'}
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {allAnnouncements.length === 0 ? (
                <p className="text-sm font-medium text-indigo-400 text-center py-4">Nenhum recado recente.</p>
              ) : (
                allAnnouncements.slice(0, 5).map((ann, i) => (
                  <div key={`${ann.id}-${i}`} className="bg-white/80 p-3 rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                       {ann.creatorPhoto ? (
                         <img src={ann.creatorPhoto} alt={ann.creatorName || "Creator"} className="w-6 h-6 rounded-full object-cover shrink-0" />
                       ) : (
                         <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                           <MessageSquare className="w-3 h-3 text-indigo-600" />
                         </div>
                       )}
                       <div className="min-w-0 flex-1">
                         <p className="font-bold text-xs text-slate-800 truncate">{ann.creatorName ? `${ann.creatorName}` : ann.category}</p>
                         {ann.creatorName && <p className="text-[10px] text-slate-500 truncate">{ann.category}</p>}
                       </div>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3">{ann.description}</p>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-100/50">
                      <span className="text-[10px] font-medium text-slate-400">
                        {format(new Date(ann.updateTime || ann.dueDate || ann.createdAt?.toMillis?.() || Date.now()), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
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
