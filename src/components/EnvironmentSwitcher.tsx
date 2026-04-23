export function EnvironmentSwitcher({ role, setRole, hasStudent = true, hasTeacher = true, showAmbos = false }: { role: 'all' | 'student' | 'teacher', setRole: (role: 'all' | 'student' | 'teacher') => void, hasStudent?: boolean, hasTeacher?: boolean, showAmbos?: boolean }) {
  return (
    <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 shadow-inner">
      {showAmbos && (hasStudent && hasTeacher) && (
        <button
          onClick={() => setRole('all')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${role === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Ambos
        </button>
      )}
      {hasStudent && (
        <button
          onClick={() => setRole('student')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${role === 'student' ? 'bg-white text-blue-600 shadow-sm disabled:opacity-50' : 'text-slate-500 hover:text-slate-700'}`}
          disabled={!hasTeacher && !showAmbos}
        >
          Ambiente: Aluno
        </button>
      )}
      {hasTeacher && (
        <button
          onClick={() => setRole('teacher')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${role === 'teacher' ? 'bg-purple-50 text-purple-700 shadow-sm disabled:opacity-50' : 'text-slate-500 hover:text-slate-700'}`}
          disabled={!hasStudent && !showAmbos}
        >
          Ambiente: Professor
        </button>
      )}
      {!hasStudent && !hasTeacher && (
        <div className="flex-1 py-2 px-4 rounded-lg text-sm font-bold text-center text-slate-400">
          Nenhum ambiente detectado
        </div>
      )}
    </div>
  );
}
