import { Calendar, CheckSquare, Settings, BookOpen, Shield } from 'lucide-react';

export function BottomNavigation({ activeTab, setActiveTab, isAdmin }: { activeTab: string, setActiveTab: (tab: string) => void, isAdmin?: boolean }) {
  const navItems = [
    { id: 'tasks', icon: CheckSquare, label: 'Tarefas' },
    { id: 'calendar', icon: Calendar, label: 'Calendário' },
    { id: 'academic', icon: BookOpen, label: 'Acadêmico' },
    { id: 'settings', icon: Settings, label: 'Config' },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', icon: Shield, label: 'Admin' });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-around items-center pb-safe z-50 lg:hidden">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col items-center p-2 rounded-lg ${activeTab === item.id ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <item.icon size={24} />
          <span className="text-[10px] mt-1">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
