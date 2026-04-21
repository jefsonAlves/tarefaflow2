import { useTranslation } from 'react-i18next';
import { UserProfile, Task, Subject, AcademicTerm, StudentProfileType } from '../types';
import { Shield, LogOut, CheckCircle2, TrendingUp, Calendar as CalendarIcon, RefreshCw, GraduationCap, BookOpen, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function SettingsView({ 
  userProfile, 
  setActiveTab, 
  onLogout,
  onReconnect,
  tasks = [],
  subjects = [],
  profileType,
  setProfileType,
  terms = [],
  onAddTerm,
  onDeleteTerm
}: { 
  userProfile: UserProfile | null, 
  setActiveTab: (tab: string) => void, 
  onLogout: () => void,
  onReconnect?: () => void,
  tasks?: Task[],
  subjects?: Subject[],
  profileType: StudentProfileType,
  setProfileType: (type: StudentProfileType) => void,
  terms?: AcademicTerm[],
  onAddTerm: () => void,
  onDeleteTerm: (id: string) => void
}) {
  const { t, i18n } = useTranslation();

  // Calculate progress metrics
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate stats per subject
  const subjectStats = subjects.map(subject => {
    const subjectTasks = tasks.filter(t => t.subjectId === subject.id);
    const completed = subjectTasks.filter(t => t.completed).length;
    const total = subjectTasks.length;
    
    // Calculate average grade if available
    const gradedTasks = subjectTasks.filter(t => t.assignedGrade !== undefined && t.maxPoints !== undefined);
    let avgGrade = null;
    if (gradedTasks.length > 0) {
      const totalGrade = gradedTasks.reduce((acc, t) => acc + ((t.assignedGrade || 0) / (t.maxPoints || 1)) * 100, 0);
      avgGrade = Math.round(totalGrade / gradedTasks.length);
    }

    return {
      ...subject,
      completed,
      total,
      avgGrade
    };
  }).filter(s => s.total > 0); // Only show subjects with tasks

  // Get upcoming important dates (tasks due in next 7 days)
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingTasks = tasks
    .filter(t => !t.completed && t.hasDueDate && new Date(t.dueDate) > now && new Date(t.dueDate) <= nextWeek)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3); // Show top 3

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t('settings')}</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Settings */}
        <div className="space-y-6 lg:col-span-1">
          {userProfile && (
            <div className="p-4 bg-white rounded-xl shadow-sm flex items-center gap-4">
              {userProfile.photoURL && <img src={userProfile.photoURL} alt="Profile" className="w-16 h-16 rounded-full" />}
              <div>
                <h3 className="font-bold text-lg">{userProfile.displayName || 'Estudante'}</h3>
                <p className="text-sm text-slate-500">{userProfile.email}</p>
              </div>
            </div>
          )}
          
          {userProfile?.role_user === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className="w-full p-4 bg-indigo-600 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold"
            >
              <Shield className="w-5 h-5" />
              {t('Administração')}
            </button>
          )}

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-8">
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800">Tipo de Perfil Acadêmico</h3>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setProfileType('school')}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all text-left space-y-2",
                    profileType === 'school' ? "border-blue-600 bg-blue-50" : "border-slate-100 bg-white hover:border-slate-200"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", profileType === 'school' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800">Escolar</h3>
                  <p className="text-xs text-slate-500">Organizado por séries, anos ou bimestres.</p>
                </button>
                <button 
                  onClick={() => setProfileType('university')}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all text-left space-y-2",
                    profileType === 'university' ? "border-blue-600 bg-blue-50" : "border-slate-100 bg-white hover:border-slate-200"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", profileType === 'university' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800">Universitário</h3>
                  <p className="text-xs text-slate-500">Organizado por semestres e créditos.</p>
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Períodos Letivos</h3>
                <button onClick={onAddTerm} className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Adicionar Período
                </button>
              </div>
              <div className="space-y-3">
                {terms.map(term => (
                  <div key={term.id} className="group bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-md transition-all">
                    <div>
                      <h3 className="font-bold text-slate-800">{term.name}</h3>
                      <p className="text-xs text-slate-500">
                        {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {term.active && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Ativo</span>
                      )}
                      <button 
                        onClick={() => {
                          if(confirm('Tem certeza que deseja excluir este período?')) {
                            onDeleteTerm(term.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {terms.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">Nenhum período letivo cadastrado.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold mb-2">{t('Tema')}</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.remove('dark');
                  }
                }} 
                className={`flex-1 p-2 rounded-lg font-medium transition-colors ${!document.documentElement.classList.contains('dark') ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
              >
                Claro
              </button>
              <button 
                onClick={() => {
                  document.documentElement.classList.add('dark');
                }} 
                className={`flex-1 p-2 rounded-lg font-medium transition-colors ${document.documentElement.classList.contains('dark') ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
              >
                Escuro
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold mb-2">{t('language')}</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => i18n.changeLanguage('en')} 
                className={`flex-1 p-2 rounded-lg font-medium transition-colors ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
              >
                EN
              </button>
              <button 
                onClick={() => i18n.changeLanguage('pt')} 
                className={`flex-1 p-2 rounded-lg font-medium transition-colors ${i18n.language === 'pt' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
              >
                PT
              </button>
            </div>
          </div>

          {onReconnect && (
            <button 
              onClick={onReconnect}
              className="w-full p-4 bg-blue-50 text-blue-600 rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Re-conectar Google
            </button>
          )}

          <button 
            onClick={onLogout}
            className="w-full p-4 bg-red-50 text-red-600 rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t('Logoff')}
          </button>
        </div>

        {/* Right Column: Academic Progress Summary */}
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Resumo do Progresso</h3>
                <p className="text-sm text-slate-500">Acompanhe seu desempenho acadêmico</p>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-slate-600">Taxa de Conclusão Geral</span>
                <span className="text-2xl font-black text-blue-600">{completionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 text-right">
                {completedTasks} de {totalTasks} tarefas concluídas
              </p>
            </div>

            {/* Subject Stats */}
            {subjectStats.length > 0 && (
              <div className="mb-8">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  Progresso por Disciplina
                </h4>
                <div className="space-y-4">
                  {subjectStats.map(stat => (
                    <div key={stat.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                          <span className="font-bold text-slate-700">{stat.name}</span>
                        </div>
                        {stat.avgGrade !== null && (
                          <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                            Média: {stat.avgGrade}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${(stat.completed / stat.total) * 100}%`,
                                backgroundColor: stat.color 
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                          {stat.completed} / {stat.total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Dates */}
            {upcomingTasks.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  Próximas Datas Importantes
                </h4>
                <div className="space-y-3">
                  {upcomingTasks.map(task => {
                    const subject = subjects.find(s => s.id === task.subjectId);
                    return (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <div className="w-10 h-10 bg-white rounded-lg flex flex-col items-center justify-center shrink-0 border border-amber-100">
                          <span className="text-[10px] font-bold text-amber-600 uppercase">
                            {new Date(task.dueDate).toLocaleDateString('pt-BR', { month: 'short' })}
                          </span>
                          <span className="text-sm font-black text-slate-800">
                            {new Date(task.dueDate).getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-sm truncate">{task.title}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            {subject && (
                              <>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                                {subject.name} • 
                              </>
                            )}
                            {new Date(task.dueDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {subjectStats.length === 0 && upcomingTasks.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p>Adicione tarefas e disciplinas para ver seu progresso aqui.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
