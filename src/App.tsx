import * as React from 'react';
import { useState, useEffect, useMemo, Component } from 'react';
import { auth, signIn, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Bell, 
  GraduationCap, 
  Settings, 
  AlertCircle, 
  Clock,
  LogOut,
  RefreshCw,
  Search,
  Filter,
  ChevronRight,
  MoreVertical,
  Menu
} from 'lucide-react';
import { cn, formatDate } from './lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const DraggableComponent = Draggable as any;

// Types
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Ocorreu um erro inesperado.";
      try {
        const errObj = JSON.parse(this.state.error.message);
        if (errObj.error && errObj.error.includes("Missing or insufficient permissions")) {
          displayMessage = "Erro de permissão no banco de dados. Por favor, verifique se você está logado corretamente.";
        }
      } catch (e) {
        // Not a JSON error
      }
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Ops! Algo deu errado</h2>
            <p className="text-slate-500 text-sm">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Task, TaskStatus, ReminderConfig, StudentProfileType, AcademicTerm, Subject, UserProfile, Note } from './types';

import { Sidebar } from './components/Sidebar';
import { TaskActionMenu } from './components/TaskActionMenu';
import { TaskDashboardSummary } from './components/TaskDashboardSummary';
import { SettingsView } from './components/SettingsView';
import { BottomNavigation } from './components/BottomNavigation';
import { EnvironmentSwitcher } from './components/EnvironmentSwitcher';
import { CheckSquare, BookOpen, StickyNote, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(sessionStorage.getItem('google_access_token'));
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userRole, setUserRole] = useState<'student' | 'teacher'>('student');
  
  // Academic Structure State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [profileType, setProfileType] = useState<StudentProfileType>('school');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'classroom' | 'tasks'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState({
    notifications: 'checking',
    battery: 'checking',
    background: 'checking',
    googleAccount: 'checking',
    sync: 'checking',
    calendar: 'stable',
    classroom: 'stable',
    tasks: 'stable'
  });
  const [customCategories, setCustomCategories] = useState<string[]>(JSON.parse(localStorage.getItem('custom_categories') || '["Geral", "Estudo", "Trabalho", "Pessoal"]'));

  useEffect(() => {
    const checkDiagnostics = async () => {
      const status = { ...diagnosticStatus };
      
      // Notifications
      if ('Notification' in window) {
        status.notifications = Notification.permission === 'granted' ? 'active' : 'denied';
      }
      
      // Battery (if supported)
      if ('getBattery' in navigator) {
        try {
          const battery: any = await (navigator as any).getBattery();
          status.battery = battery.charging ? 'charging' : 'optimized';
        } catch {
          status.battery = 'unknown';
        }
      }

      // Google Account
      status.googleAccount = user && accessToken ? 'active' : 'pending';
      
      // Sync
      const lastSync = localStorage.getItem(`last_sync_${user?.uid}`);
      status.sync = lastSync ? 'stable' : 'pending';

      // Calendar status is updated via syncGoogleCalendar
      
      setDiagnosticStatus(status as any);
    };

    checkDiagnostics();
  }, [user, accessToken]);

  useEffect(() => {
    localStorage.setItem('custom_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    if (user) {
      const accepted = localStorage.getItem(`accepted_policies_${user.uid}`);
      if (!accepted) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Proactive Notifications and Advanced Reminders
  useEffect(() => {
    if (!user || tasks.length === 0 || !('Notification' in window) || Notification.permission !== 'granted') return;

    const checkProactiveNotifications = () => {
      const now = new Date();
      const notifiedTasks = JSON.parse(localStorage.getItem(`notified_tasks_${user.uid}`) || '{}');
      let updated = false;

      tasks.forEach(async (task) => {
        if (task.completed || task.status === 'done') return;
        
        // Handle Advanced Reminders
        if (task.reminderConfig && task.reminderConfig.nextReminder) {
          const nextReminderTime = new Date(task.reminderConfig.nextReminder);
          
          if (nextReminderTime <= now) {
            // Trigger Notification
            new Notification(`Lembrete: ${task.title}`, {
              body: task.description || 'Você tem uma tarefa pendente.',
              icon: '/favicon.ico'
            });

            // Calculate next schedule
            let nextTime = new Date(now);
            const config = task.reminderConfig;
            
            if (config.type === 'once') {
              // Clear reminder config if it's a one-time reminder
              await updateDoc(doc(db, 'tasks', task.id), {
                reminderConfig: null
              });
            } else {
              let intervalToAdd = config.intervalMinutes;
              
              if (config.type === 'progressive') {
                const currentCount = config.repeatCount || 0;
                const step = config.progressiveStepMinutes || 5;
                const intervalToAdd = config.intervalMinutes + (currentCount * step);
                
                // Cap max interval to 1440 mins (24h) to prevent infinite stretching
                const cappedInterval = Math.min(intervalToAdd, 1440); 
                
                await updateDoc(doc(db, 'tasks', task.id), {
                  'reminderConfig.nextReminder': new Date(now.getTime() + cappedInterval * 60000).toISOString(),
                  'reminderConfig.repeatCount': currentCount + 1
                });
              } else {
                const intervalToAdd = config.intervalMinutes || 15;
                await updateDoc(doc(db, 'tasks', task.id), {
                  'reminderConfig.nextReminder': new Date(now.getTime() + intervalToAdd * 60000).toISOString()
                });
              }
            }
          }
        }

        // Handle standard 24h proactive notifications
        if (task.hasDueDate) {
          const dueDate = new Date(task.dueDate);
          const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

          // Notify if due within 24 hours and not already notified
          if (diffHours > 0 && diffHours <= 24 && !notifiedTasks[task.id]) {
            new Notification(`Tarefa Próxima do Prazo: ${task.title}`, {
              body: `Vence em ${Math.round(diffHours)} horas.`,
              icon: '/favicon.ico'
            });
            notifiedTasks[task.id] = true;
            updated = true;
          }
        }
      });

      if (updated) {
        localStorage.setItem(`notified_tasks_${user.uid}`, JSON.stringify(notifiedTasks));
      }
    };

    checkProactiveNotifications();
    const interval = setInterval(checkProactiveNotifications, 60 * 1000); // Check every 1 min for precise reminders
    return () => clearInterval(interval);
  }, [tasks, user]);

  const handleSignIn = async () => {
    try {
      const { accessToken: token } = await signIn();
      if (token) {
        setAccessToken(token);
        sessionStorage.setItem('google_access_token', token);
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    } catch (e: any) {
      console.error("Sign-in error details:", {
        code: e.code,
        message: e.message,
        customData: e.customData,
        name: e.name
      });
      alert(`Erro ao fazer login: ${e.message || 'Erro desconhecido'}`);
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('dueDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(taskList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tasks');
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const subjectsQ = query(collection(db, 'subjects'), where('userId', '==', user.uid));
    const termsQ = query(collection(db, 'terms'), where('userId', '==', user.uid));
    const notesQ = query(collection(db, 'notes'), where('userId', '==', user.uid));

    const unsubSubjects = onSnapshot(subjectsQ, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'subjects');
    });

    const unsubTerms = onSnapshot(termsQ, (snapshot) => {
      setTerms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicTerm)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'terms');
    });

    const unsubNotes = onSnapshot(notesQ, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notes');
    });

    return () => {
      unsubSubjects();
      unsubTerms();
      unsubNotes();
    };
  }, [user]);

  const toggleTask = async (task: Task) => {
    try {
      let newStatus: TaskStatus = 'todo';
      let newCompleted = false;

      if (task.status === 'todo') {
        newStatus = 'in-progress';
        newCompleted = false;
      } else if (task.status === 'in-progress') {
        newStatus = 'done';
        newCompleted = true;
      } else {
        newStatus = 'todo';
        newCompleted = false;
      }

      const updatedTask: Task = { ...task, completed: newCompleted, status: newStatus };
      await updateDoc(doc(db, 'tasks', task.id), {
        completed: newCompleted,
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      if (accessToken) {
        syncGoogleCalendar(updatedTask);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const deleteTask = async (task: Task) => {
    try {
      if (accessToken && task.calendarEventId) {
        fetch('/api/google/calendar/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, eventId: task.calendarEventId })
        }).catch(e => console.error("Calendar Delete Error:", e));
      }
      await deleteDoc(doc(db, 'tasks', task.id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `tasks/${task.id}`);
    }
  };

  const handleMoveTask = async (id: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const newCompleted = newStatus === 'done';
    const updatedTask: Task = { ...task, status: newStatus, completed: newCompleted };
    
    setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
    
    try {
      await updateDoc(doc(db, 'tasks', id), { 
        status: newStatus,
        completed: newCompleted,
        updatedAt: Timestamp.now()
      });
      if (accessToken) {
        syncGoogleCalendar(updatedTask);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSource = sourceFilter === 'all' || t.source === sourceFilter;
      const matchesRole = roleFilter === 'all' || t.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchesSearch && matchesSource && matchesRole && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, sourceFilter, roleFilter, statusFilter, priorityFilter]);

  const studentTasks = useMemo(() => filteredTasks.filter(t => t.role === 'student'), [filteredTasks]);
  const teacherTasks = useMemo(() => filteredTasks.filter(t => t.role === 'teacher'), [filteredTasks]);

  const renderTaskSection = (tasksToRender: Task[], title: string, icon: React.ReactNode, colorClass: string, droppableId: string, emptyMessage?: string) => {
    if (tasksToRender.length === 0 && !emptyMessage) return null;
    
    // Sort tasks by order
    const sortedTasks = [...tasksToRender].sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={cn("text-lg font-bold flex items-center gap-2", colorClass)}>
            {icon}
            {title}
          </h2>
        </div>
        <Droppable droppableId={droppableId}>
          {(provided) => (
            <div 
              className="grid gap-3 min-h-[100px]"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {sortedTasks.length > 0 ? (
                sortedTasks.map((task, index) => (
                  <DraggableComponent key={task.id} draggableId={task.id} index={index}>
                    {(provided: any, snapshot: any) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                        }}
                      >
                        <TaskCard task={task} subjects={subjects} onToggle={() => toggleTask(task)} onDelete={() => deleteTask(task)} onMove={handleMoveTask} />
                      </div>
                    )}
                  </DraggableComponent>
                ))
              ) : emptyMessage ? (
                <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">{emptyMessage}</p>
                </div>
              ) : null}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </section>
    );
  };

  const renderTaskGroup = (groupTasks: Task[], prefix: string) => {
    const groupInProgress = groupTasks.filter(t => t.status === 'in-progress');
    const groupOverdue = groupTasks.filter(t => {
      const d = new Date(t.dueDate);
      const now = new Date();
      return d < now && t.status === 'todo';
    });
    const groupToday = groupTasks.filter(t => {
      const d = new Date(t.dueDate);
      const now = new Date();
      return d.toDateString() === now.toDateString() && t.status === 'todo';
    });
    const groupUpcoming = groupTasks.filter(t => {
      const d = new Date(t.dueDate);
      const now = new Date();
      return d > now && d.toDateString() !== now.toDateString() && t.status === 'todo';
    });

    return (
      <div className="space-y-12">
        {renderTaskSection(groupInProgress, "Em Progresso", <Clock className="w-5 h-5" />, "text-blue-600", `${prefix}-inprogress`)}
        {renderTaskSection(groupOverdue, "Atrasadas", <AlertCircle className="w-5 h-5" />, "text-red-600", `${prefix}-overdue`)}
        {renderTaskSection(groupToday, "Para Hoje", <Clock className="w-5 h-5" />, "text-blue-600", `${prefix}-today`, "Tudo limpo por aqui!")}
        {renderTaskSection(groupUpcoming, "Próximas", <Calendar className="w-5 h-5" />, "text-purple-600", `${prefix}-upcoming`)}
      </div>
    );
  };

  const todayTasks = filteredTasks.filter(t => {
    const d = new Date(t.dueDate);
    const now = new Date();
    return d.toDateString() === now.toDateString() && !t.completed;
  });

  const upcomingTasks = filteredTasks.filter(t => {
    const d = new Date(t.dueDate);
    const now = new Date();
    return d > now && d.toDateString() !== now.toDateString() && !t.completed;
  });

  const overdueTasks = filteredTasks.filter(t => {
    const d = new Date(t.dueDate);
    const now = new Date();
    return d < now && !t.completed;
  });

  const assignedTasks = filteredTasks.filter(t => !t.completed);
  
  const nearOverdueCount = assignedTasks.filter(t => {
    const dueDate = new Date(t.dueDate);
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours > 0 && hours <= 24;
  }).length;

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Find the task
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    // Handle Kanban Board Drag & Drop
    if (destination.droppableId.startsWith('kanban-')) {
      const newStatus = destination.droppableId.replace('kanban-', '') as TaskStatus;
      const newCompleted = newStatus === 'done';
      const updatedTask: Task = { ...task, status: newStatus, completed: newCompleted };
      
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === draggableId ? updatedTask : t));
      
      try {
        await updateDoc(doc(db, 'tasks', draggableId), { 
          status: newStatus,
          completed: newCompleted,
          updatedAt: Timestamp.now()
        });
        if (accessToken) {
          syncGoogleCalendar(updatedTask);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `tasks/${draggableId}`);
      }
      return;
    }

    // Handle List View Reordering
    // To properly reorder, we need the list of tasks in the destination droppable
    // Since we sort by 'order', we can assign a new order value between the adjacent tasks.
    
    // Determine which list it was dropped into (just for getting the adjacent tasks)
    // We can just get all tasks that would be in that droppable
    let targetList: Task[] = [];
    const prefix = destination.droppableId.split('-')[0]; // student, teacher, or all
    const section = destination.droppableId.split('-')[1]; // overdue, today, upcoming

    const baseTasks = prefix === 'student' ? studentTasks : prefix === 'teacher' ? teacherTasks : filteredTasks;
    
    if (section === 'overdue') {
      targetList = baseTasks.filter(t => new Date(t.dueDate) < new Date() && !t.completed);
    } else if (section === 'today') {
      targetList = baseTasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString() && !t.completed);
    } else if (section === 'upcoming') {
      targetList = baseTasks.filter(t => new Date(t.dueDate) > new Date() && new Date(t.dueDate).toDateString() !== new Date().toDateString() && !t.completed);
    }

    // Sort target list by current order
    targetList.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Remove the dragged task from targetList if it's there (moving within same list)
    targetList = targetList.filter(t => t.id !== draggableId);

    // Calculate new order
    let newOrder = 0;
    if (targetList.length === 0) {
      newOrder = 1000;
    } else if (destination.index === 0) {
      newOrder = (targetList[0].order || 1000) - 1000;
    } else if (destination.index >= targetList.length) {
      newOrder = (targetList[targetList.length - 1].order || 1000) + 1000;
    } else {
      const prevOrder = targetList[destination.index - 1].order || 0;
      const nextOrder = targetList[destination.index].order || 0;
      newOrder = prevOrder + (nextOrder - prevOrder) / 2;
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, order: newOrder } : t));

    try {
      await updateDoc(doc(db, 'tasks', draggableId), { 
        order: newOrder,
        updatedAt: Timestamp.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${draggableId}`);
    }
  };

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  const addSubject = async (name: string, color: string, termId?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'subjects'), {
        name,
        color,
        termId: termId || null,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      setShowSubjectModal(false);
    } catch (e) {
      console.error("Error adding subject:", e);
    }
  };

  const addTerm = async (name: string, startDate: string, endDate: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'terms'), {
        name,
        startDate,
        endDate,
        active: true,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      setShowTermModal(false);
    } catch (e) {
      console.error("Error adding term:", e);
    }
  };

  const addNote = async (title: string, content: string, subjectId?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'notes'), {
        title,
        content,
        subjectId: subjectId || null,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setShowNoteModal(false);
    } catch (e) {
      console.error("Error adding note:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">SmartPlan Pro</h1>
            <p className="text-slate-500">Organize sua vida acadêmica e pessoal com inteligência e confiabilidade.</p>
          </div>
          <button
            onClick={handleSignIn}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>
          <p className="text-xs text-slate-400">Ao entrar, você concorda com nossos termos de uso.</p>
        </div>
      </div>
    );
  }

  const syncGoogleCalendar = async (task: Task) => {
    if (!user || !accessToken) return;
    try {
      const res = await fetch('/api/google/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, task })
      });
      const data = await res.json();
      
      if (!res.ok) {
        const msg = data.error || "";
        if (msg.includes("calendar-json.googleapis.com") || msg.includes("API has not been used")) {
          const projectMatch = msg.match(/project (\d+)/);
          const projectId = projectMatch ? projectMatch[1] : "";
          const enableUrl = `https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=${projectId}`;
          console.warn(`Google Calendar API não ativada. Ative em: ${enableUrl}`);
          setDiagnosticStatus(prev => ({ ...prev, calendar: 'denied' }));
        }
        if (msg.toLowerCase().includes("token") || 
            msg.toLowerCase().includes("auth") || 
            msg.toLowerCase().includes("credentials")) {
          setAccessToken(null);
          sessionStorage.removeItem('google_access_token');
          handleSignIn();
        }
        return;
      }

      setDiagnosticStatus(prev => ({ ...prev, calendar: 'stable' }));
      if (data.calendarEventId) {
        try {
          await updateDoc(doc(db, 'tasks', task.id), {
            calendarEventId: data.calendarEventId
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `tasks/${task.id}`);
        }
      }
    } catch (e) {
      console.error("Calendar Sync Error:", e);
    }
  };

  const syncGoogleTasks = async () => {
    if (!user || !accessToken) {
      if (!accessToken) handleSignIn();
      return;
    }
    setIsSyncingTasks(true);
    try {
      // 1. Fetch from Google
      const res = await fetch('/api/google/tasks/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      });
      const googleTasks = await res.json();
      
      if (!res.ok) {
        throw new Error(googleTasks.error || "Failed to fetch Google Tasks");
      }
      
      if (!Array.isArray(googleTasks)) throw new Error("Invalid response from Google Tasks");

      // 2. Bidirectional Sync with Conflict Resolution (Local Priority)
      for (const gTask of googleTasks) {
        const localTask = tasks.find(t => t.externalId === gTask.id);
        
        if (!localTask) {
          // Import new task
          const taskData = {
            title: (gTask.title || 'Sem Título').substring(0, 500),
            description: (gTask.notes || '').substring(0, 2000),
            dueDate: gTask.due || new Date().toISOString(),
            hasDueDate: !!gTask.due,
            completed: gTask.status === 'completed',
            status: gTask.status === 'completed' ? 'done' : 'todo',
            order: 1000,
            priority: 'medium',
            category: 'Google Tasks',
            source: 'tasks' as const,
            externalId: gTask.id,
            userId: user.uid,
            createdAt: Timestamp.now(),
            lastSyncAt: new Date().toISOString()
          };
          let docRef;
          try {
            docRef = await addDoc(collection(db, 'tasks'), taskData);
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'tasks');
            return; // Should not reach here if handleFirestoreError throws
          }
          syncGoogleCalendar({ id: docRef.id, ...taskData } as Task);
        } else {
          // Conflict Resolution: If local is newer or modified, push to cloud
          // For simplicity, we'll push local changes if they exist
          await fetch('/api/google/tasks/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, task: localTask })
          });
          syncGoogleCalendar(localTask);
        }
      }

      // 3. Push Local Tasks that don't have externalId
      const localOnly = tasks.filter(t => t.source === 'tasks' && !t.externalId);
      for (const lTask of localOnly) {
        const syncRes = await fetch('/api/google/tasks/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, task: lTask })
        });
        const syncData = await syncRes.json();
        if (syncData.externalId) {
          const updatedTask = { ...lTask, externalId: syncData.externalId, lastSyncAt: new Date().toISOString() };
          try {
            await updateDoc(doc(db, 'tasks', lTask.id), {
              externalId: syncData.externalId,
              lastSyncAt: new Date().toISOString()
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, `tasks/${lTask.id}`);
          }
          syncGoogleCalendar(updatedTask);
        }
      }

      // alert("Sincronização com Google Tasks concluída!");
    } catch (e: any) {
      console.error("Tasks Sync Error:", e);
      
      let errorMessage = e.message || "Erro desconhecido.";
      
      if (errorMessage.toLowerCase().includes("token") || 
          errorMessage.toLowerCase().includes("auth") || 
          errorMessage.toLowerCase().includes("credentials")) {
        setAccessToken(null);
        sessionStorage.removeItem('google_access_token');
        // alert("Sua sessão do Google expirou. Por favor, faça login novamente.");
        handleSignIn();
        return;
      }

      if (errorMessage.includes("tasks.googleapis.com") || errorMessage.includes("API has not been used")) {
        const projectMatch = errorMessage.match(/project (\d+)/);
        const projectId = projectMatch ? projectMatch[1] : "";
        const enableUrl = `https://console.developers.google.com/apis/api/tasks.googleapis.com/overview?project=${projectId}`;
        
        setDiagnosticStatus(prev => ({ ...prev, tasks: 'denied' }));
        // alert(`A API do Google Tasks não está ativada no seu projeto Google Cloud.\n\nPor favor, acesse o link abaixo para ativar a API e tente novamente:\n\n${enableUrl}`);
        return;
      }

      setDiagnosticStatus(prev => ({ ...prev, tasks: 'stable' }));
      // alert(`Erro no Google Tasks: ${errorMessage}`);
    } finally {
      setIsSyncingTasks(false);
    }
  };
  const syncClassroom = async () => {
    if (!user || !accessToken) {
      if (!accessToken) handleSignIn();
      return;
    }

    setIsSyncing(true);
    try {
      // Mark policies as accepted
      localStorage.setItem(`accepted_policies_${user.uid}`, 'true');
      setShowOnboarding(false);

      // 1. Fetch Courses (Incremental check)
      const lastSync = localStorage.getItem(`last_sync_${user.uid}`) || new Date(0).toISOString();
      
      const coursesRes = await fetch('/api/google/classroom/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      });
      const coursesData = await coursesRes.json();

      if (!coursesRes.ok) {
        throw new Error(coursesData.error || "Failed to fetch courses");
      }
      
      const courses = coursesData;

      if (!Array.isArray(courses)) throw new Error("Invalid response from Classroom API");

      let totalImported = 0;
      let totalUpdated = 0;
      const newlyImported: Task[] = [];

      // 2. Fetch Coursework for each course
      for (const course of courses) {
        try {
          // Determine role
          const role = course.role || 'student';
          
          const courseworkRes = await fetch('/api/google/classroom/coursework', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, courseId: course.id })
          });
          const courseworkData = await courseworkRes.json();

          if (!courseworkRes.ok) {
            if (courseworkData.error?.includes("invalid authentication credentials") || courseworkData.error?.includes("Expected OAuth 2 access token")) {
              throw new Error(courseworkData.error);
            }
            console.warn(`Failed to fetch coursework for course ${course.id}:`, courseworkData.error);
            continue;
          }

          const coursework = courseworkData;

          if (Array.isArray(coursework)) {
            for (const work of coursework) {
              // Skip deleted or drafted coursework
              if (work.state === 'DELETED') continue;

              const updateTime = work.updateTime || work.creationTime;
              const existingTask = tasks.find(t => t.externalId === work.id);
              
              // Incremental sync logic:
              // 1. If task exists and Classroom updateTime matches our stored updateTime, 
              //    we still might need to check submission status/grades if it's a student task.
              //    However, to optimize, we can skip if it was synced very recently.
              const lastSynced = existingTask?.lastSyncAt ? new Date(existingTask.lastSyncAt).getTime() : 0;
              const now = Date.now();
              const fiveMinutesAgo = now - (5 * 60 * 1000);

              if (existingTask && existingTask.updateTime === updateTime && lastSynced > fiveMinutesAgo) {
                continue;
              }
              
              // Convert due date
              let dueDate = new Date().toISOString();
              let hasDueDate = false;
              if (work.dueDate && work.dueDate.year && work.dueDate.month && work.dueDate.day) {
                try {
                  const d = work.dueDate;
                  const t = work.dueTime || { hours: 23, minutes: 59 };
                  const dateObj = new Date(d.year, d.month - 1, d.day, t.hours || 23, t.minutes || 59);
                  if (!isNaN(dateObj.getTime())) {
                    dueDate = dateObj.toISOString();
                    hasDueDate = true;
                  }
                } catch (e) {
                  console.warn("Invalid Classroom dueDate:", work.dueDate);
                }
              }

              // 3. Fetch Submissions
              let submissionStatus: any = null;
              let assignedGrade: number | null = null;
              let submissionCount: { turnedIn: number, total: number } | null = null;

              try {
                const subRes = await fetch('/api/google/classroom/submissions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accessToken, courseId: course.id, courseWorkId: work.id, role })
                });
                const subData = await subRes.json();
                if (!subRes.ok) {
                  if (subData.error?.includes("invalid authentication credentials") || subData.error?.includes("Expected OAuth 2 access token")) {
                    throw new Error(subData.error);
                  }
                } else if (Array.isArray(subData)) {
                  if (role === 'student' && subData.length > 0) {
                    submissionStatus = subData[0].state || null;
                    assignedGrade = subData[0].assignedGrade !== undefined ? subData[0].assignedGrade : null;
                  } else if (role === 'teacher') {
                    const turnedIn = subData.filter((s: any) => s.state === 'TURNED_IN' || s.state === 'RETURNED').length;
                    submissionCount = { turnedIn, total: subData.length };
                  }
                }
              } catch (e: any) {
                if (e.message?.includes("invalid authentication credentials") || e.message?.includes("Expected OAuth 2 access token")) {
                  throw e;
                }
                console.warn(`Failed to fetch submissions for coursework ${work.id}:`, e);
              }

              const isCompleted = role === 'student' ? (submissionStatus === 'TURNED_IN' || submissionStatus === 'RETURNED') : false;
              const taskData: any = {
                title: (work.title || 'Sem Título').substring(0, 500),
                description: (work.description || '').substring(0, 2000),
                dueDate,
                hasDueDate,
                completed: isCompleted,
                status: isCompleted ? 'done' : 'todo',
                order: 1000,
                priority: 'medium',
                category: (course.name || 'Classroom').substring(0, 200),
                source: 'classroom' as const,
                externalId: work.id,
                courseId: course.id,
                userId: user.uid,
                role: role,
                submissionStatus,
                submissionCount,
                assignedGrade,
                maxPoints: work.maxPoints !== undefined ? work.maxPoints : null,
                alternateLink: work.alternateLink || null,
                updatedAt: Timestamp.now(),
                lastSyncAt: new Date().toISOString()
              };
              if (updateTime) taskData.updateTime = updateTime;

              if (!existingTask) {
                try {
                  const docRef = await addDoc(collection(db, 'tasks'), {
                    ...taskData,
                    createdAt: Timestamp.now()
                  });
                  const newTask = { id: docRef.id, ...taskData } as Task;
                  syncGoogleCalendar(newTask);
                  newlyImported.push(newTask);
                  totalImported++;
                } catch (e) {
                  handleFirestoreError(e, OperationType.CREATE, 'tasks');
                }
              } else {
                // Only update if data actually changed to save Firestore writes
                const hasChanged = 
                  existingTask.updateTime !== updateTime || 
                  existingTask.submissionStatus !== submissionStatus ||
                  existingTask.assignedGrade !== assignedGrade;

                if (hasChanged) {
                  try {
                    await updateDoc(doc(db, 'tasks', existingTask.id), taskData);
                    syncGoogleCalendar({ id: existingTask.id, ...taskData } as Task);
                    totalUpdated++;
                  } catch (e) {
                    handleFirestoreError(e, OperationType.UPDATE, `tasks/${existingTask.id}`);
                  }
                }
              }
            }
          }
        } catch (courseError: any) {
          if (courseError.message?.includes("invalid authentication credentials") || courseError.message?.includes("Expected OAuth 2 access token")) {
            throw courseError;
          }
          console.error(`Error processing course ${course.id}:`, courseError);
        }
      }
      
      localStorage.setItem(`last_sync_${user.uid}`, new Date().toISOString());
      
      // Removed alerts for direct loading experience
      console.log(`Sync complete: ${totalImported} imported, ${totalUpdated} updated`);
    } catch (e: any) {
      console.error("Sync Error:", e);
      
      let errorMessage = e.message || "Tente entrar novamente.";
      
      if (errorMessage.includes("invalid authentication credentials") || errorMessage.includes("Expected OAuth 2 access token")) {
        setAccessToken(null);
        sessionStorage.removeItem('google_access_token');
        alert("Sua sessão do Google expirou. Por favor, faça login novamente.");
        handleSignIn();
        return;
      }
      
      // Check for disabled API error
      if (errorMessage.includes("classroom.googleapis.com") || errorMessage.includes("API has not been used")) {
        const projectMatch = errorMessage.match(/project (\d+)/);
        const projectId = projectMatch ? projectMatch[1] : "";
        const enableUrl = `https://console.developers.google.com/apis/api/classroom.googleapis.com/overview?project=${projectId}`;
        
        setDiagnosticStatus(prev => ({ ...prev, classroom: 'denied' }));
        alert(`A API do Google Classroom não está ativada no seu projeto Google Cloud.\n\nPor favor, acesse o link abaixo para ativar a API e tente novamente:\n\n${enableUrl}`);
        return;
      }

      setDiagnosticStatus(prev => ({ ...prev, classroom: 'stable' }));
      alert(`Erro na sincronização: ${errorMessage}`);
      if (errorMessage.toLowerCase().includes("token") || 
          errorMessage.toLowerCase().includes("auth") || 
          errorMessage.toLowerCase().includes("credentials")) {
        setAccessToken(null);
        sessionStorage.removeItem('google_access_token');
        handleSignIn(); 
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        subjects={subjects}
        terms={terms}
        profileType={profileType}
        selectedSubjectId={selectedSubjectId}
        setSelectedSubjectId={setSelectedSubjectId}
        onAddSubject={() => setShowSubjectModal(true)}
        onAddTerm={() => setShowTermModal(true)}
      />

      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-white rounded-xl shadow-sm text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {activeTab === 'tasks' ? (selectedSubjectId ? subjects.find(s => s.id === selectedSubjectId)?.name : 'Minhas Tarefas') :
                 activeTab === 'kanban' ? 'Quadro Kanban' :
                 activeTab === 'calendar' ? 'Calendário' :
                 activeTab === 'reminders' ? 'Lembretes' :
                 activeTab === 'notes' ? 'Minhas Notas' :
                 activeTab === 'settings' ? 'Configurações Acadêmicas' : 'Disciplinas'}
              </h1>
              <p className="text-slate-500 font-medium">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => syncClassroom()}
              disabled={isSyncing}
              className={cn(
                "flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm",
                isSyncing && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
              {isSyncing ? 'Sincronizando...' : 'Classroom'}
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Plus className="w-5 h-5" />
              Nova Tarefa
            </button>
          </div>
        </header>

        {/* Filters & Tabs (Only for tasks/kanban/calendar) */}
        {(activeTab === 'tasks' || activeTab === 'kanban' || activeTab === 'calendar') && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
              {[
                { id: 'tasks', label: 'Lista', icon: <CheckSquare className="w-4 h-4" /> },
                { id: 'kanban', label: 'Kanban', icon: <BookOpen className="w-4 h-4" /> },
                { id: 'calendar', label: 'Calendário', icon: <Calendar className="w-4 h-4" /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                    activeTab === tab.id ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="Buscar tarefas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 py-2.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium focus:border-blue-500 outline-none transition-all w-full md:w-64"
                />
              </div>
              
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
              >
                <option value="all">Todos Status</option>
                <option value="todo">A Fazer</option>
                <option value="in-progress">Em Progresso</option>
                <option value="done">Concluído</option>
              </select>

              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="px-4 py-2.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
              >
                <option value="all">Prioridades</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (selectedSubjectId || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'tasks' ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <EnvironmentSwitcher role={userRole} setRole={setUserRole} />
                <TaskDashboardSummary tasks={filteredTasks} />
                {renderTaskGroup(filteredTasks, 'main')}
              </DragDropContext>
            ) : activeTab === 'kanban' ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { id: 'todo', title: 'A Fazer', color: 'bg-slate-100', text: 'text-slate-700' },
                    { id: 'in-progress', title: 'Em Progresso', color: 'bg-blue-50', text: 'text-blue-700' },
                    { id: 'done', title: 'Concluído', color: 'bg-green-50', text: 'text-green-700' }
                  ].map(column => (
                    <div key={column.id} className={cn("rounded-3xl p-4 min-h-[500px]", column.color)}>
                      <h3 className={cn("font-bold mb-4 px-2", column.text)}>{column.title}</h3>
                      <Droppable droppableId={`kanban-${column.id}`}>
                        {(provided) => (
                          <div 
                            className="space-y-3 min-h-[400px]"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            {filteredTasks
                              .filter(t => (t.status || 'todo') === column.id)
                              .sort((a, b) => (a.order || 0) - (b.order || 0))
                              .map((task, index) => (
                                <DraggableComponent key={task.id} draggableId={task.id} index={index}>
                                  {(provided: any, snapshot: any) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={{
                                        ...provided.draggableProps.style,
                                        opacity: snapshot.isDragging ? 0.8 : 1,
                                      }}
                                    >
                                      <TaskCard task={task} subjects={subjects} onToggle={() => toggleTask(task)} onDelete={() => deleteTask(task)} onMove={handleMoveTask} />
                                    </div>
                                  )}
                                </DraggableComponent>
                              ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </DragDropContext>
            ) : activeTab === 'calendar' ? (
              <CalendarView tasks={filteredTasks} />
            ) : activeTab === 'notes' ? (
              <NotesView notes={notes} subjects={subjects} onAddNote={() => setShowNoteModal(true)} />
            ) : activeTab === 'reminders' ? (
              <RemindersView tasks={tasks.filter(t => t.reminderConfig)} />
            ) : activeTab === 'settings' ? (
              <SettingsView />
            ) : (
              <SubjectsView subjects={subjects} terms={terms} onAddSubject={() => setShowSubjectModal(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Onboarding Tour Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl space-y-6 text-center"
            >
              <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Bem-vindo ao SmartPlan!</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Para começar a organizar sua vida acadêmica, precisamos sincronizar seus dados do <strong>Google Classroom</strong>.
                </p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-2xl text-left space-y-3">
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-xs text-slate-600">Acesso às suas turmas e atividades.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-xs text-slate-600">Status de entrega e notas em tempo real.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-3 h-3 text-blue-600" />
                  </div>
                  <p className="text-xs text-slate-600">Ao clicar em sincronizar, você aceita nossas políticas de privacidade e termos de uso.</p>
                </div>
              </div>

              <button 
                onClick={syncClassroom}
                disabled={isSyncing}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                {isSyncing ? "Sincronizando..." : "Aceitar e Sincronizar"}
              </button>
              
              <button 
                onClick={() => setShowOnboarding(false)}
                className="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
              >
                Configurar manualmente depois
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Diagnostics Panel */}
      <AnimatePresence>
        {showDiagnostics && (
          <DiagnosticsPanel 
            status={diagnosticStatus} 
            onClose={() => setShowDiagnostics(false)} 
            onReauth={handleSignIn}
          />
        )}
      </AnimatePresence>

      {/* Import Reminder Modal Removed */}

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTaskModal 
            onClose={() => setShowCreateModal(false)} 
            userId={user.uid}
            categories={customCategories}
            setCategories={setCustomCategories}
            initialRole={roleFilter === 'all' ? 'student' : roleFilter}
            subjects={subjects}
            onAddSubject={() => {
              setShowCreateModal(false);
              setShowSubjectModal(true);
            }}
            onTaskCreated={(task) => {
              if (accessToken) syncGoogleCalendar(task);
            }}
          />
        )}
      </AnimatePresence>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-around sm:hidden">
        <button className="p-2 text-blue-600"><Clock className="w-6 h-6" /></button>
        <button className="p-2 text-slate-400"><Calendar className="w-6 h-6" /></button>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center -mt-10 shadow-lg shadow-blue-200 text-white"
        >
          <Plus className="w-8 h-8" />
        </button>
        <button className="p-2 text-slate-400"><GraduationCap className="w-6 h-6" /></button>
        <button className="p-2 text-slate-400"><Settings className="w-6 h-6" /></button>
      </nav>
    </>
  );
}

function CalendarView({ tasks }: { tasks: Task[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDayPanel, setShowDayPanel] = useState(false);
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getTasksForDay = (day: number) => {
    return tasks.filter(t => {
      const d = new Date(t.dueDate);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  const groupTasks = (dayTasks: Task[]) => {
    return {
      completed: dayTasks.filter(t => t.completed),
      overdue: dayTasks.filter(t => !t.completed && new Date(t.dueDate) < new Date()),
      pending: dayTasks.filter(t => !t.completed && new Date(t.dueDate) >= new Date())
    };
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setShowDayPanel(true);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 bg-white rounded-[32px] shadow-xl p-8 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronRight className="w-6 h-6 rotate-180 text-slate-400" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronRight className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
            <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase py-2">{day}</div>
          ))}
          
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24" />
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayTasks = getTasksForDay(day);
            const { completed, overdue, pending } = groupTasks(dayTasks);
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            
            const isToday = dateObj.getTime() === today.getTime();
            const isYesterday = dateObj.getTime() === yesterday.getTime();
            
            // Check if yesterday or today has overdue tasks for prominent indicator
            const hasOverdue = overdue.length > 0;
            const isOverdueHighlight = hasOverdue && (isToday || isYesterday);

            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                className={cn(
                  "h-24 border border-slate-50 rounded-2xl p-2 space-y-1 overflow-y-auto no-scrollbar cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md", 
                  isToday ? "bg-blue-50/50 border-blue-100 shadow-sm" : "bg-slate-50/30",
                  isOverdueHighlight && "border-red-300 bg-red-50/30 ring-2 ring-red-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-bold", isToday ? "text-blue-600" : "text-slate-400")}>{day}</span>
                  <div className="flex gap-0.5">
                    {pending.length > 0 && <span className="w-1 h-1 bg-blue-500 rounded-full" />}
                    {overdue.length > 0 && <span className="w-1 h-1 bg-red-500 rounded-full" />}
                    {completed.length > 0 && <span className="w-1 h-1 bg-green-500 rounded-full" />}
                  </div>
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(t => (
                    <div key={t.id} className={cn("text-[7px] p-0.5 rounded-sm truncate font-medium", t.completed ? "bg-green-100 text-green-700" : (new Date(t.dueDate) < new Date() ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"))}>
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-[6px] text-slate-400 text-center font-bold">
                      +{dayTasks.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showDayPanel && selectedDay && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-full lg:w-80 bg-white rounded-[32px] shadow-xl p-6 border border-slate-100 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedDay} de {months[currentDate.getMonth()]}</h3>
                <p className="text-xs text-slate-500">Resumo do dia</p>
              </div>
              <button onClick={() => setShowDayPanel(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <Plus className="w-5 h-5 rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
              {(() => {
                const dayTasks = getTasksForDay(selectedDay);
                const { completed, overdue, pending } = groupTasks(dayTasks);

                if (dayTasks.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Calendar className="w-12 h-12 text-slate-200 mb-4" />
                      <p className="text-sm text-slate-400 font-medium">Nenhuma tarefa para este dia</p>
                    </div>
                  );
                }

                return (
                  <>
                    {overdue.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle className="w-3 h-3" />
                          Atrasadas ({overdue.length})
                        </h4>
                        <div className="space-y-2">
                          {overdue.map(t => (
                            <div key={t.id} className="p-3 bg-red-50 rounded-xl border border-red-100">
                              <p className="text-sm font-semibold text-red-900 truncate">{t.title}</p>
                              <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatDate(t.dueDate)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pending.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Pendentes ({pending.length})
                        </h4>
                        <div className="space-y-2">
                          {pending.map(t => (
                            <div key={t.id} className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                              <p className="text-sm font-semibold text-blue-900 truncate">{t.title}</p>
                              <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatDate(t.dueDate)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {completed.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-green-500 uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3" />
                          Concluídas ({completed.length})
                        </h4>
                        <div className="space-y-2">
                          {completed.map(t => (
                            <div key={t.id} className="p-3 bg-green-50 rounded-xl border border-green-100 opacity-75">
                              <p className="text-sm font-semibold text-green-900 truncate line-through">{t.title}</p>
                              <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Finalizada
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReminderConfigurator({ onSave, onCancel, initialDueDate }: { onSave: (config: any) => void, onCancel: () => void, initialDueDate: string }) {
  const [type, setType] = useState<'once' | 'repeated' | 'nagging' | 'progressive'>('once');
  const [interval, setInterval] = useState(30);
  const [progressiveStep, setProgressiveStep] = useState(15);

  const handleSave = () => {
    const dueDate = new Date(initialDueDate);
    const nextReminder = type === 'once' ? dueDate.toISOString() : new Date(dueDate.getTime() - interval * 60000).toISOString();
    
    onSave({
      type,
      intervalMinutes: interval,
      nextReminder,
      repeatUntilAcknowledged: type === 'nagging' || type === 'progressive',
      ...(type === 'progressive' ? { progressiveStepMinutes: progressiveStep } : {}),
      repeatCount: 0
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'once', label: 'Único', icon: <Bell className="w-4 h-4" /> },
          { id: 'repeated', label: 'Repetido', icon: <RefreshCw className="w-4 h-4" /> },
          { id: 'nagging', label: 'Persistente', icon: <AlertCircle className="w-4 h-4" /> },
          { id: 'progressive', label: 'Progressivo', icon: <Clock className="w-4 h-4" /> }
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setType(opt.id as any)}
            className={cn(
              "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
              type === opt.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 hover:border-slate-200 text-slate-500"
            )}
          >
            {opt.icon}
            <span className="text-[10px] font-bold uppercase">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase">Antecedência (minutos)</label>
        <input 
          type="number" 
          value={interval}
          onChange={(e) => setInterval(parseInt(e.target.value))}
          className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
        />
      </div>

      {type === 'progressive' && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Passo Progressivo (minutos)</label>
          <input 
            type="number" 
            value={progressiveStep}
            onChange={(e) => setProgressiveStep(parseInt(e.target.value))}
            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          />
        </div>
      )}

      <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs font-medium flex items-start gap-2">
        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p><strong>Próximo lembrete:</strong> {formatDate(type === 'once' ? new Date(initialDueDate).toISOString() : new Date(new Date(initialDueDate).getTime() - interval * 60000).toISOString())}</p>
          {type === 'once' && <p className="mt-1 opacity-80">Lembrete único no horário do prazo.</p>}
          {type === 'repeated' && <p className="mt-1 opacity-80">Repetirá a cada {interval} minutos até a conclusão.</p>}
          {type === 'nagging' && <p className="mt-1 opacity-80">Repetirá a cada {interval} minutos até ser confirmado.</p>}
          {type === 'progressive' && <p className="mt-1 opacity-80">Repetirá com intervalos aumentando em {progressiveStep} minutos a cada repetição.</p>}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button 
          onClick={handleSave}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
        >
          Confirmar Lembrete
        </button>
        <button 
          onClick={onCancel}
          className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

function DiagnosticsPanel({ status, onClose, onReauth }: { status: any, onClose: () => void, onReauth: () => void }) {
  const getStatusColor = (val: string) => {
    switch (val) {
      case 'active':
      case 'stable':
      case 'charging': return 'text-green-500 bg-green-50';
      case 'pending':
      case 'optimized': return 'text-amber-500 bg-amber-50';
      case 'denied': return 'text-red-500 bg-red-50';
      default: return 'text-slate-400 bg-slate-50';
    }
  };

  const getAction = (key: string, val: string) => {
    if (val === 'active' || val === 'stable' || val === 'charging') {
      if (key === 'googleAccount') return { label: 'Re-conectar', action: onReauth };
      return null;
    }
    
    switch (key) {
      case 'notifications':
        return { label: 'Ativar Notificações', action: () => Notification.requestPermission() };
      case 'googleAccount':
        return { label: 'Conectar Google', action: onReauth };
      case 'sync':
        return { label: 'Sincronizar Agora', action: onClose };
      case 'calendar':
        return { label: 'Ativar API', action: () => window.open('https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=537809046235', '_blank') };
      case 'classroom':
        return { label: 'Ativar API', action: () => window.open('https://console.developers.google.com/apis/api/classroom.googleapis.com/overview?project=537809046235', '_blank') };
      case 'tasks':
        return { label: 'Ativar API', action: () => window.open('https://console.developers.google.com/apis/api/tasks.googleapis.com/overview?project=537809046235', '_blank') };
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl p-8 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Diagnóstico do Sistema</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Plus className="w-6 h-6 rotate-45 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(status).map(([key, val]: [string, any]) => {
            const action = getAction(key, val);
            const labelMap: Record<string, string> = {
              notifications: 'Notificações',
              battery: 'Bateria',
              background: 'Segundo Plano',
              googleAccount: 'Conta Google',
              sync: 'Sincronização Local',
              calendar: 'Google Calendar API',
              classroom: 'Google Classroom API',
              tasks: 'Google Tasks API'
            };
            return (
              <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labelMap[key] || key}</p>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", 
                      (val === 'active' || val === 'stable' || val === 'charging') ? "bg-green-500" : "bg-amber-500"
                    )} />
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", getStatusColor(val))}>
                      {val === 'active' ? 'Ativo' : val === 'stable' ? 'Estável' : val === 'pending' ? 'Pendente' : val === 'denied' ? 'Desativada/Negada' : val}
                    </span>
                  </div>
                </div>
                {action && (
                  <button 
                    onClick={() => { action.action(); if(key !== 'googleAccount') onClose(); }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors"
                  >
                    {action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-blue-50 p-6 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Como ativar a sincronização?
          </h3>
          <ul className="text-xs text-blue-700 space-y-2 list-disc pl-4">
            <li>Certifique-se de que sua conta Google está conectada.</li>
            <li>Se as APIs aparecerem como <strong>"Desativada"</strong>, clique em "Ativar API" para abrir o Console do Google Cloud e ativá-las.</li>
            <li>Se ocorrer erro de <strong>credenciais inválidas</strong>, use o botão <strong>"Re-conectar"</strong> acima e marque todas as permissões na tela do Google.</li>
            <li>Clique no botão <strong>"Sincronizar Classroom"</strong> na tela principal para atualizar tudo.</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

function TaskCard({ task, subjects, onToggle, onDelete, onMove }: { task: Task, subjects: Subject[], onToggle: () => void | Promise<void>, onDelete: () => void | Promise<void>, onMove?: (id: string, newStatus: Task['status']) => void, key?: any }) {
  const getStatusInfo = () => {
    if (task.source !== 'classroom') return null;
    
    const status = task.submissionStatus;
    if (status === 'TURNED_IN') return { label: 'Entregue', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> };
    if (status === 'RETURNED') return { label: 'Devolvido', color: 'bg-blue-100 text-blue-700', icon: <RefreshCw className="w-3 h-3" /> };
    if (status === 'RECLAIMED_BY_STUDENT') return { label: 'Retomado', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> };
    return { label: 'Pendente', color: 'bg-slate-100 text-slate-700', icon: <AlertCircle className="w-3 h-3" /> };
  };

  const statusInfo = getStatusInfo();

  const isNearOverdue = useMemo(() => {
    if (task.completed) return false;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours > 0 && hours <= 24;
  }, [task.dueDate, task.completed]);

  const subjectName = task.subjectId ? subjects.find(s => s.id === task.subjectId)?.name : task.category;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all",
        task.completed && "opacity-60",
        isNearOverdue && "border-amber-200 bg-amber-50/20 shadow-amber-50"
      )}
    >
      <button 
        onClick={onToggle}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
          task.status === 'done' ? "bg-green-500 border-green-500 text-white" : 
          task.status === 'in-progress' ? "bg-blue-500 border-blue-500 text-white" :
          "border-slate-300 hover:border-blue-500",
          isNearOverdue && task.status === 'todo' && "border-amber-400"
        )}
      >
        {task.status === 'done' && <CheckCircle2 className="w-4 h-4" />}
        {task.status === 'in-progress' && <Clock className="w-4 h-4" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2">
          {/* 1st: Subject (Category) */}
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium truncate max-w-[120px]">
            {subjectName || 'Sem disciplina'}
          </span>

          {/* 2nd: Activity of the subject (Task Title) */}
          <h3 className={cn("font-semibold truncate max-w-[200px]", task.completed && "line-through text-slate-400")}>
            {task.title.replace(/^\[(ALUNO|PROF)\]\s*/i, '')}
          </h3>
          
          {/* 3rd: Status and Deadline */}
          {task.source === 'classroom' && statusInfo && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1",
              statusInfo.color
            )}>
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          )}

          {task.hasDueDate && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1",
              isNearOverdue && !task.completed ? "bg-amber-100 text-amber-700 animate-pulse" : 
              task.priority === 'high' ? "bg-red-50 text-red-600" : 
              task.priority === 'medium' ? "bg-amber-50 text-amber-600" : 
              "bg-blue-50 text-blue-600"
            )}>
              <Clock className="w-3 h-3" />
              {formatDate(task.dueDate)}
            </span>
          )}

          {/* 4th: Student or Teacher */}
          {task.role && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
              task.role === 'teacher' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            )}>
              {task.role === 'teacher' ? 'Professor' : 'Aluno'}
            </span>
          )}

          {task.assignedGrade !== null && task.assignedGrade !== undefined && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              Nota: {task.assignedGrade}/{task.maxPoints || '?'}
            </span>
          )}

          {task.role === 'teacher' && task.submissionCount && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Entregas: {task.submissionCount.turnedIn}/{task.submissionCount.total}
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
            {task.source === 'classroom' ? 'Exigências: ' : ''}{task.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {task.reminderConfig && (
            <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
              <Bell className="w-3 h-3" />
              Lembrete Ativo
            </span>
          )}

          {task.alternateLink && (
            <a 
              href={task.alternateLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-bold"
            >
              <ChevronRight className="w-3 h-3" />
              Ver no Classroom
            </a>
          )}
          {task.lastSyncAt && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              Sincronizado: {new Date(task.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {task.source === 'classroom' && !task.alternateLink && (
            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <GraduationCap className="w-2.5 h-2.5" />
              Classroom
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onMove ? (
          <TaskActionMenu task={task} onDelete={() => onDelete()} onMove={onMove} />
        ) : (
          <button onClick={onDelete} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function CreateTaskModal({ onClose, userId, categories, setCategories, onTaskCreated, initialRole, subjects, onAddSubject }: { onClose: () => void, userId: string, categories: string[], setCategories: (cats: string[]) => void, onTaskCreated?: (task: Task) => void, initialRole?: 'student' | 'teacher', subjects: Subject[], onAddSubject: () => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState(categories[0] || 'Geral');
  const [subjectId, setSubjectId] = useState<string>('');
  const [role, setRole] = useState<'student' | 'teacher'>(initialRole || 'student');
  const [newCat, setNewCat] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  
  // Advanced Reminders
  const [reminderType, setReminderType] = useState<'once' | 'repeated' | 'nagging' | 'progressive'>('once');
  const [interval, setInterval] = useState(15);
  const [repeatUntilAck, setRepeatUntilAck] = useState(false);
  const [progressiveStep, setProgressiveStep] = useState(5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;

    try {
      const taskData = {
        title,
        description: '',
        dueDate: new Date(date).toISOString(),
        hasDueDate: true,
        completed: false,
        priority,
        category: category.substring(0, 200),
        subjectId: subjectId || null,
        role,
        source: 'local' as const,
        userId,
        createdAt: Timestamp.now(),
        status: 'todo',
        order: 1000,
        reminderConfig: {
          type: reminderType,
          intervalMinutes: interval,
          nextReminder: reminderType === 'once' ? new Date(date).toISOString() : new Date(new Date(date).getTime() - interval * 60000).toISOString(),
          repeatUntilAcknowledged: repeatUntilAck,
          repeatCount: 0,
          ...(reminderType === 'progressive' ? { progressiveStepMinutes: progressiveStep } : {})
        }
      };
      
      const docRef = await addDoc(collection(db, 'tasks'), taskData);
      
      if (onTaskCreated) {
        onTaskCreated({ id: docRef.id, ...taskData } as Task);
      }
      
      onClose();
    } catch (e) {
      console.error("Error adding task:", e);
    }
  };

  const handleAddCategory = () => {
    if (newCat && !categories.includes(newCat)) {
      setCategories([...categories, newCat]);
      setCategory(newCat);
      setNewCat('');
      setShowAddCat(false);
    }
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (categories.length <= 1) return;
    const newCats = categories.filter(c => c !== catToDelete);
    setCategories(newCats);
    if (category === catToDelete) {
      setCategory(newCats[0]);
    }
  };

  const handleEditCategory = (oldCat: string, newName: string) => {
    if (!newName || categories.includes(newName)) return;
    const newCats = categories.map(c => c === oldCat ? newName : c);
    setCategories(newCats);
    if (category === oldCat) {
      setCategory(newName);
    }
    setEditingCat(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl p-8 space-y-6 overflow-y-auto max-h-[90vh] no-scrollbar"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Nova Tarefa</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Plus className="w-6 h-6 rotate-45 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">O que precisa ser feito?</label>
            <input 
              autoFocus
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Estudar para prova de Cálculo"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Data e Hora</label>
              <input 
                type="datetime-local" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Prioridade</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 transition-all outline-none appearance-none"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Disciplina</label>
              {subjects.length > 0 ? (
                <select 
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 transition-all outline-none appearance-none"
                >
                  <option value="">Nenhuma</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500">Nenhuma disciplina cadastrada.</p>
                  <button
                    type="button"
                    onClick={onAddSubject}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 py-2 px-3 rounded-xl transition-colors"
                  >
                    + Criar Disciplina
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Papel</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 transition-all outline-none appearance-none"
              >
                <option value="student">Aluno</option>
                <option value="teacher">Professor</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              Lembretes Avançados
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setReminderType('once')}
                className={cn("p-3 rounded-xl text-xs font-bold border-2 transition-all", reminderType === 'once' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500")}
              >
                Uma vez
              </button>
              <button 
                type="button"
                onClick={() => setReminderType('repeated')}
                className={cn("p-3 rounded-xl text-xs font-bold border-2 transition-all", reminderType === 'repeated' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500")}
              >
                Repetir
              </button>
              <button 
                type="button"
                onClick={() => setReminderType('nagging')}
                className={cn("p-3 rounded-xl text-xs font-bold border-2 transition-all", reminderType === 'nagging' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500")}
              >
                Persistente
              </button>
              <button 
                type="button"
                onClick={() => setReminderType('progressive')}
                className={cn("p-3 rounded-xl text-xs font-bold border-2 transition-all", reminderType === 'progressive' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500")}
              >
                Progressivo
              </button>
            </div>

            {reminderType !== 'once' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600">Intervalo (minutos)</label>
                  <input 
                    type="number" 
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value))}
                    className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                {reminderType === 'progressive' && (
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600">Aumento (minutos)</label>
                    <input 
                      type="number" 
                      value={progressiveStep}
                      onChange={(e) => setProgressiveStep(parseInt(e.target.value))}
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={repeatUntilAck}
                    onChange={(e) => setRepeatUntilAck(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">Repetir até eu confirmar</span>
                </label>
              </div>
            )}

            {date && (
              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs font-medium flex items-start gap-2 mt-3">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p><strong>Próximo lembrete:</strong> {formatDate(reminderType === 'once' ? new Date(date).toISOString() : new Date(new Date(date).getTime() - interval * 60000).toISOString())}</p>
                  {reminderType === 'once' && <p className="mt-1 opacity-80">Lembrete único no horário do prazo.</p>}
                  {reminderType === 'repeated' && <p className="mt-1 opacity-80">Repetirá a cada {interval} minutos até a conclusão.</p>}
                  {reminderType === 'nagging' && <p className="mt-1 opacity-80">Repetirá a cada {interval} minutos até ser confirmado.</p>}
                  {reminderType === 'progressive' && <p className="mt-1 opacity-80">Repetirá com intervalos diminuindo em {progressiveStep} minutos.</p>}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Categoria</label>
              <button 
                type="button"
                onClick={() => setShowAddCat(!showAddCat)}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                {showAddCat ? 'Cancelar' : '+ Nova Categoria'}
              </button>
            </div>
            
            {showAddCat && (
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Nome da categoria"
                  className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 outline-none focus:border-blue-500"
                />
                <button 
                  type="button"
                  onClick={handleAddCategory}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold"
                >
                  Add
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <div key={cat} className="group relative">
                  {editingCat === cat ? (
                    <div className="flex items-center gap-1 bg-white border-2 border-blue-500 rounded-xl px-2 py-1">
                      <input 
                        autoFocus
                        type="text"
                        defaultValue={cat}
                        onBlur={(e) => handleEditCategory(cat, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditCategory(cat, (e.target as HTMLInputElement).value);
                          if (e.key === 'Escape') setEditingCat(null);
                        }}
                        className="w-24 text-sm outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 flex items-center gap-2",
                        category === cat ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                      )}
                    >
                      {cat}
                      <div className="hidden group-hover:flex items-center gap-1 ml-1">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingCat(cat); }}
                          className="p-1 hover:bg-black/10 rounded"
                        >
                          <Plus className="w-3 h-3 rotate-0" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                          className="p-1 hover:bg-black/10 rounded text-red-500"
                        >
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            Criar Tarefa
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// --- New View Components ---

function SubjectsView({ subjects, terms, onAddSubject }: { subjects: Subject[], terms: AcademicTerm[], onAddSubject: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Minhas Disciplinas</h2>
        <button onClick={onAddSubject} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all">
          <Plus className="w-4 h-4" />
          Nova Disciplina
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map(subject => (
          <div key={subject.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: subject.color }}>
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {terms.find(t => t.id === subject.termId)?.name || 'Sem Período'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{subject.name}</h3>
            <p className="text-xs text-slate-500 font-medium">
              Criada em {new Date(subject.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        {subjects.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhuma disciplina cadastrada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NotesView({ notes, subjects, onAddNote }: { notes: Note[], subjects: Subject[], onAddNote: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Minhas Notas</h2>
        <button onClick={onAddNote} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all">
          <Plus className="w-4 h-4" />
          Nova Nota
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map(note => (
          <div key={note.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: subjects.find(s => s.id === note.subjectId)?.color || '#cbd5e1' }} 
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {subjects.find(s => s.id === note.subjectId)?.name || 'Geral'}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 mb-2">{note.title}</h3>
            <p className="text-sm text-slate-500 line-clamp-3 mb-4">{note.content}</p>
            <p className="text-[10px] text-slate-400 font-medium">
              Atualizado em {new Date(note.updatedAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <StickyNote className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhuma nota criada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RemindersView({ tasks }: { tasks: Task[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Lembretes Ativos</h2>
      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{task.title}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>Próximo: {task.reminderConfig?.nextReminder ? new Date(task.reminderConfig.nextReminder).toLocaleString() : 'Pendente'}</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-bold uppercase">
                    {task.reminderConfig?.type}
                  </span>
                </div>
              </div>
            </div>
            <button className="text-slate-400 hover:text-red-500 p-2 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhum lembrete configurado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AcademicSettingsView({ profileType, setProfileType, terms, onAddTerm }: { 
  profileType: StudentProfileType, 
  setProfileType: (type: StudentProfileType) => void,
  terms: AcademicTerm[],
  onAddTerm: () => void
}) {
  return (
    <div className="space-y-8 max-w-2xl">
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Tipo de Perfil Acadêmico</h2>
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
          <h2 className="text-xl font-bold text-slate-800">Períodos Letivos</h2>
          <button onClick={onAddTerm} className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Adicionar Período
          </button>
        </div>
        <div className="space-y-3">
          {terms.map(term => (
            <div key={term.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">{term.name}</h3>
                <p className="text-xs text-slate-500">
                  {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                </p>
              </div>
              {term.active && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Ativo</span>
              )}
            </div>
          ))}
          {terms.length === 0 && (
            <p className="text-sm text-slate-500 italic">Nenhum período cadastrado.</p>
          )}
        </div>
      </section>
    </div>
  );
}

// --- Modals ---

function CreateSubjectModal({ onClose, onSave, terms }: { onClose: () => void, onSave: (name: string, color: string, termId?: string) => void, terms: AcademicTerm[] }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [termId, setTermId] = useState('');

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Nova Disciplina</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Disciplina</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
              placeholder="Ex: Cálculo I, História..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período Letivo</label>
            <select 
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
            >
              <option value="">Selecione um período</option>
              {terms.map(term => (
                <option key={term.id} value={term.id}>{term.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cor de Identificação</label>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all border-2",
                    color === c ? "border-slate-900 scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={() => onSave(name, color, termId)}
          disabled={!name}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Criar Disciplina
        </button>
      </motion.div>
    </div>
  );
}

function CreateTermModal({ onClose, onSave }: { onClose: () => void, onSave: (name: string, start: string, end: string) => void }) {
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Novo Período</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Período</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
              placeholder="Ex: 1º Semestre 2024, 9º Ano..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Início</label>
              <input 
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fim</label>
              <input 
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <button 
          onClick={() => onSave(name, start, end)}
          disabled={!name || !start || !end}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Criar Período
        </button>
      </motion.div>
    </div>
  );
}

function CreateNoteModal({ onClose, onSave, subjects }: { onClose: () => void, onSave: (title: string, content: string, subjectId?: string) => void, subjects: Subject[] }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Nova Nota</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold"
              placeholder="Título da nota..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disciplina</label>
            <select 
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
            >
              <option value="">Geral (Sem disciplina)</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conteúdo</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all resize-none"
              placeholder="Escreva suas anotações aqui..."
            />
          </div>
        </div>

        <button 
          onClick={() => onSave(title, content, subjectId)}
          disabled={!title || !content}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Salvar Nota
        </button>
      </motion.div>
    </div>
  );
}
