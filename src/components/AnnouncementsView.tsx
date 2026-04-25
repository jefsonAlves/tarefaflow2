import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Task, Subject } from '../types';
import { MessageSquare, AlertCircle, ChevronRight, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EnvironmentSwitcher } from './EnvironmentSwitcher';

interface AnnouncementsViewProps {
  tasks: Task[];
  subjects: Subject[];
  onToggle: (task: Task) => void;
}

export function AnnouncementsView({ tasks, subjects, onToggle }: AnnouncementsViewProps) {
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');

  const announcements = useMemo(() => {
    return tasks
      .filter(t => t.source === 'classroom_announcement' && !t.completed)
      .filter(t => roleFilter === 'all' || t.role === roleFilter)
      .sort((a, b) => new Date(b.updateTime || b.createdAt?.toMillis?.() || 0).getTime() - new Date(a.updateTime || a.createdAt?.toMillis?.() || 0).getTime());
  }, [tasks, roleFilter]);

  const hasStudent = useMemo(() => tasks.some(t => t.role === 'student'), [tasks]);
  const hasTeacher = useMemo(() => tasks.some(t => t.role === 'teacher'), [tasks]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-amber-500" />
          Mural de Avisos
        </h1>
        <p className="text-slate-500 mt-1">Mensagens e recados importantes das suas turmas.</p>
      </header>

      <EnvironmentSwitcher 
        role={roleFilter} 
        setRole={setRoleFilter} 
        hasStudent={hasStudent} 
        hasTeacher={hasTeacher} 
        showAmbos={true}
      />

      {announcements.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
          <Bell className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum recado ainda</h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm">Quando seus professores publicarem novidades no Google Classroom, elas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann, i) => {
            const subject = subjects.find(s => s.id === ann.subjectId);
            return (
              <motion.div 
                key={`${ann.id}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {ann.creatorPhoto ? (
                      <img src={ann.creatorPhoto} alt={ann.creatorName || "Creator"} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-amber-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-800 tracking-tight">
                        {ann.creatorName ? `${ann.creatorName}` : (ann.category || 'Mural do Google Classroom')}
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        {ann.creatorName ? `${ann.category || 'Mural'} • ` : ''}
                        {format(new Date(ann.updateTime || ann.createdAt?.toMillis?.() || Date.now()), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {subject && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subject.color }} />
                      {subject.name}
                    </span>
                  )}
                </div>

                <div className="pl-0 sm:pl-13 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {!ann.title.startsWith('Recado:') && (
                    <div className="font-bold text-slate-800 mb-2">{ann.title}</div>
                  )}
                  {ann.description || (!ann.title.startsWith('Recado:') ? '' : ann.title)}
                </div>

                <div className="pl-0 sm:pl-13 flex flex-wrap justify-end gap-2 mt-2">
                  <button
                    onClick={() => onToggle(ann)}
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
                    Marcar como Lido
                  </button>
                  {ann.alternateLink && (
                    <a 
                      href={ann.alternateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-md shadow-blue-200"
                    >
                      Responder / Ver no Classroom
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
