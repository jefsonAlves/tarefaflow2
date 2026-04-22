import React from 'react';
import { Calendar, CheckSquare, Settings, Home } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function BottomNavigation({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const navItems = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'calendar', icon: Calendar, label: 'Agenda' },
    { id: 'settings', icon: Settings, label: 'Opções' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 p-2 flex justify-around items-center pb-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] lg:hidden">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className="relative flex flex-col items-center p-2 rounded-2xl transition-all active:scale-90 flex-1"
        >
          {activeTab === item.id && (
            <motion.div 
              layoutId="bottomNavTab"
              className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-2xl -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <item.icon 
            size={20} 
            className={cn(
              "transition-colors",
              activeTab === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
            )} 
          />
          <span className={cn(
            "text-[10px] mt-1 font-bold transition-colors",
            activeTab === item.id ? 'text-blue-600 dark:text-blue-400 underline decoration-2 underline-offset-4' : 'text-slate-400 opacity-60'
          )}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
