import { Calendar, CheckSquare, Settings, Home } from 'lucide-react';

export function BottomNavigation({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const navItems = [
    { id: 'home', icon: Home, label: 'Inicial' },
    { id: 'tasks', icon: CheckSquare, label: 'Tarefas' },
    { id: 'calendar', icon: Calendar, label: 'Calendário' },
    { id: 'settings', icon: Settings, label: 'Config' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 p-2 flex justify-around items-center pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50 lg:hidden">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col items-center p-2 rounded-2xl transition-all active:scale-90 ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <item.icon size={22} className={activeTab === item.id ? 'fill-blue-50' : ''} />
          <span className={`text-[10px] mt-1 font-bold ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
