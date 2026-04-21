import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, Calendar as CalendarIcon, BookOpen, Bell, Box, LayoutDashboard, Shield, ChevronRight } from 'lucide-react';
import { Task, Notice, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HomeDashboardProps {
  tasks: Task[];
  notices: Notice[];
  userProfile: UserProfile | null;
  setActiveTab: (tab: string) => void;
  isTeacher: boolean;
  isAdmin: boolean;
}

export function HomeDashboard({ 
  tasks, 
  notices, 
  userProfile, 
  setActiveTab, 
  isTeacher, 
  isAdmin 
}: HomeDashboardProps) {

  const pendingTasks = useMemo(() => tasks.filter(t => !t.completed && t.source !== 'classroom_announcement'), [tasks]);
  
  const announcements = useMemo(() => tasks.filter(t => t.source === 'classroom_announcement'), [tasks]);

  const cards = [
    {
      id: 'tasks',
      title: 'Tarefas',
      description: `${pendingTasks.length} pendentes`,
      icon: CheckSquare,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      tab: 'tasks'
    },
    {
      id: 'kanban',
      title: 'Quadro Kanban',
      description: 'Organize visualmente',
      icon: LayoutDashboard,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      tab: 'kanban'
    },
    {
      id: 'calendar',
      title: 'Calendário',
      description: 'Sua agenda semanal',
      icon: CalendarIcon,
      color: 'bg-pink-500',
      lightColor: 'bg-pink-50',
      textColor: 'text-pink-700',
      tab: 'calendar'
    },
    {
      id: 'academic',
      title: 'Acadêmico',
      description: 'Disciplinas e Períodos',
      icon: BookOpen,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      tab: 'academic'
    }
  ];

  if (isTeacher) {
    cards.push({
      id: 'teacher-inbox',
      title: 'Painel do Prof',
      description: 'Entregas e Mural',
      icon: Bell,
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      tab: 'teacher-inbox'
    });
  } else {
    cards.push({
      id: 'announcements',
      title: 'Mural de Avisos',
      description: `${announcements.length} recados novos`,
      icon: Bell,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      tab: 'announcements' // Let's make an announcements tab or filter tasks
    });
  }

  if (isAdmin) {
    cards.push({
      id: 'admin',
      title: 'Administração',
      description: 'Controle do sistema',
      icon: Shield,
      color: 'bg-slate-800',
      lightColor: 'bg-slate-100',
      textColor: 'text-slate-800',
      tab: 'admin'
    });
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0 pt-2 lg:pt-0">
      {/* Mobile Top Header */}
      <header className="flex items-center justify-between lg:hidden mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Olá{userProfile?.displayName ? `, ${userProfile.displayName.split(' ')[0]}` : ''}!</h1>
          <p className="text-sm text-slate-500">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <button 
          onClick={() => setActiveTab('settings')}
          className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        >
          <img 
            src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${userProfile?.displayName || 'User'}&background=random`} 
            alt="Profile" 
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${userProfile?.displayName || 'User'}&background=random`;
            }}
          />
        </button>
      </header>
      
      {/* Desktop Header Enhancement */}
      <header className="hidden lg:flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Visão Geral</h1>
          <p className="text-slate-500 mt-1">Seu resumo diário de atividades.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-slate-800">{userProfile?.displayName}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">{userProfile?.role_user === 'admin' ? 'Admin' : isTeacher ? 'Professor' : 'Aluno'}</p>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-full overflow-hidden shadow-sm">
            <img 
              src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${userProfile?.displayName || 'User'}&background=random`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* Overview Stats (Desktop) / Cards (Mobile) */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {cards.map((card, i) => (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              onClick={() => setActiveTab(card.tab)}
              className={cn(
                "flex flex-col text-left p-5 lg:p-6 rounded-[2rem] border border-white/50 shadow-sm hover:shadow-lg transition-all active:scale-95 group relative overflow-hidden",
                card.lightColor
              )}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/30 transition-colors" />
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-inner relative z-10",
                card.color
              )}>
                <card.icon className="w-6 h-6" />
              </div>
              <h3 className={cn("font-bold text-base lg:text-lg mb-1 line-clamp-1 relative z-10", card.textColor)}>
                {card.title}
              </h3>
              <p className={cn("text-xs lg:text-sm font-medium opacity-80 line-clamp-1 relative z-10", card.textColor)}>
                {card.description}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Due Soon Section on Dashboard */}
      {pendingTasks.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              Próximas Entregas
            </h2>
            <button 
              onClick={() => setActiveTab('tasks')}
              className="text-sm text-blue-600 font-bold hover:text-blue-700 flex items-center"
            >
              Ver todas <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {pendingTasks
              .filter(t => t.dueDate)
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .slice(0, 3)
              .map(task => (
                <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.subjectId ? undefined : '#cbd5e1' }} />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{task.title}</p>
                      <p className="text-xs text-slate-500 truncate">{task.category || 'Geral'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {format(new Date(task.dueDate), "dd MMM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
