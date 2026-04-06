export function EnvironmentSwitcher({ role, setRole }: { role: 'student' | 'teacher', setRole: (role: 'student' | 'teacher') => void }) {
  return (
    <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
      <button
        onClick={() => setRole('student')}
        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${role === 'student' ? 'bg-white shadow' : 'text-gray-500'}`}
      >
        Aluno
      </button>
      <button
        onClick={() => setRole('teacher')}
        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${role === 'teacher' ? 'bg-white shadow' : 'text-gray-500'}`}
      >
        Professor
      </button>
    </div>
  );
}
