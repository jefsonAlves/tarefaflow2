import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, CheckSquare, Settings, X, GraduationCap, Clock, Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import { Subject, AcademicTerm, StudentProfileType } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  subjects: Subject[];
  terms: AcademicTerm[];
  profileType: StudentProfileType;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  activeTab, 
  setActiveTab, 
  subjects, 
  terms, 
  profileType,
  selectedSubjectId,
  setSelectedSubjectId
}: SidebarProps) {
  
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setSelectedSubjectId(null);
    if (window.innerWidth < 1024) onClose();
  };

  const handleSubjectClick = (id: string) => {
    setSelectedSubjectId(id);
    setActiveTab('tasks');
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-slate-100 z-50 flex flex-col shadow-2xl lg:shadow-none overflow-y-auto",
          !isOpen && "lg:translate-x-0" // Always visible on large screens if we want, but we control it via props
        )}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">StudyOS</h1>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                {profileType === 'university' ? 'Universidade' : 'Escola'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1">
          <div className="space-y-1 mb-8">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu Principal</p>
            {[
              { id: 'tasks', label: 'Lista de Tarefas', icon: <CheckSquare className="w-5 h-5" /> },
              { id: 'kanban', label: 'Quadro Kanban', icon: <BookOpen className="w-5 h-5" /> },
              { id: 'calendar', label: 'Calendário', icon: <Calendar className="w-5 h-5" /> },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
                  activeTab === item.id && !selectedSubjectId
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between px-4 mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Disciplinas</p>
              <button className="text-blue-600 hover:text-blue-700 p-1">
                <Menu className="w-4 h-4" />
              </button>
            </div>
            
            {subjects.map(subject => (
              <button
                key={subject.id}
                onClick={() => handleSubjectClick(subject.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all text-sm",
                  selectedSubjectId === subject.id
                    ? "bg-slate-100 text-slate-900 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                <span className="truncate">{subject.name}</span>
              </button>
            ))}
            
            {subjects.length === 0 && (
              <p className="px-4 text-xs text-slate-400 italic">Nenhuma disciplina cadastrada.</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-all">
            <Settings className="w-5 h-5" />
            Configurações
          </button>
        </div>
      </motion.aside>
    </>
  );
}
