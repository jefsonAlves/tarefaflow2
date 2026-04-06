import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  Settings, 
  X, 
  GraduationCap, 
  Clock, 
  Menu,
  Bell,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Subject, AcademicTerm, StudentProfileType } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  subjects: Subject[];
  terms: AcademicTerm[];
  profileType: StudentProfileType;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  onAddSubject: () => void;
  onAddTerm: () => void;
}

export function Sidebar({ 
  isOpen, 
  setIsOpen,
  activeTab, 
  setActiveTab, 
  subjects, 
  terms, 
  profileType,
  selectedSubjectId,
  setSelectedSubjectId,
  onAddSubject,
  onAddTerm
}: SidebarProps) {
  
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setSelectedSubjectId(null);
    if (window.innerWidth < 1024 && !isOpen) setIsOpen(false);
  };

  const handleSubjectClick = (id: string) => {
    setSelectedSubjectId(id);
    setActiveTab('tasks');
    if (window.innerWidth < 1024 && !isOpen) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && window.innerWidth < 1024 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 288 : 80 }}
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-100 z-50 flex flex-col shadow-2xl lg:shadow-none transition-all duration-300 ease-in-out",
          window.innerWidth < 1024 && !isOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-100 h-20">
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div 
                key="logo-full"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3 overflow-hidden"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200 shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="truncate">
                  <h1 className="font-bold text-slate-800 leading-tight">StudyOS</h1>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    {profileType === 'university' ? 'Universidade' : 'Escola'}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="logo-mini"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200 mx-auto"
              >
                <GraduationCap className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>
          
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="hidden lg:flex p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={() => setIsOpen(false)} 
            className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar py-4">
          <div className="px-3 space-y-1 mb-6">
            {isOpen && <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu</p>}
            {[
              { id: 'tasks', label: 'Tarefas', icon: <CheckSquare className="w-5 h-5" /> },
              { id: 'kanban', label: 'Kanban', icon: <BookOpen className="w-5 h-5" /> },
              { id: 'calendar', label: 'Calendário', icon: <Calendar className="w-5 h-5" /> },
              { id: 'reminders', label: 'Lembretes', icon: <Bell className="w-5 h-5" /> },
              { id: 'notes', label: 'Notas', icon: <StickyNote className="w-5 h-5" /> },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={cn(
                  "w-full flex items-center rounded-xl font-medium transition-all group relative",
                  isOpen ? "px-4 py-3 gap-3" : "p-3 justify-center",
                  activeTab === item.id && !selectedSubjectId
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                title={!isOpen ? item.label : undefined}
              >
                {item.icon}
                {isOpen && <span className="truncate">{item.label}</span>}
                {!isOpen && activeTab === item.id && !selectedSubjectId && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                )}
              </button>
            ))}
          </div>

          <div className="px-3 space-y-1 mb-6">
            <div className={cn("flex items-center justify-between mb-2", isOpen ? "px-4" : "justify-center")}>
              {isOpen && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disciplinas</p>}
              {isOpen && (
                <button onClick={onAddSubject} className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {subjects.map(subject => (
              <button
                key={subject.id}
                onClick={() => handleSubjectClick(subject.id)}
                className={cn(
                  "w-full flex items-center rounded-xl font-medium transition-all group relative",
                  isOpen ? "px-4 py-2.5 gap-3 text-sm" : "p-3 justify-center",
                  selectedSubjectId === subject.id
                    ? "bg-slate-100 text-slate-900 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                title={!isOpen ? subject.name : undefined}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                {isOpen && <span className="truncate">{subject.name}</span>}
                {!isOpen && selectedSubjectId === subject.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-slate-900 rounded-r-full" />
                )}
              </button>
            ))}
            
            {subjects.length === 0 && isOpen && (
              <p className="px-4 text-[10px] text-slate-400 italic">Nenhuma disciplina.</p>
            )}
          </div>

          <div className="px-3 space-y-1">
            {isOpen && <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estrutura</p>}
            <button
              onClick={() => handleTabClick('settings')}
              className={cn(
                "w-full flex items-center rounded-xl font-medium transition-all group relative",
                isOpen ? "px-4 py-3 gap-3" : "p-3 justify-center",
                activeTab === 'settings'
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
              title={!isOpen ? "Configurações Acadêmicas" : undefined}
            >
              <Settings className="w-5 h-5" />
              {isOpen && <span className="truncate">Configurações</span>}
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className={cn("flex items-center gap-3", !isOpen && "justify-center")}>
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
              {/* User avatar would go here */}
            </div>
            {isOpen && (
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 truncate">Estudante</p>
                <p className="text-[10px] text-slate-400 truncate">Plano Grátis</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}
