import * as React from 'react';
import { useState, useEffect, useMemo, Component } from 'react';
import { auth, signIn, handleRedirectResult, db, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, deleteDoc, Timestamp, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
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
  Menu,
  ExternalLink,
  X,
  CheckSquare,
  BookOpen,
  StickyNote,
  Download,
  Trash2,
  Zap,
  Info
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
  
  // Dispatch custom event for UI feedback
  const event = new CustomEvent('firestore-error', { detail: errInfo });
  window.dispatchEvent(event);
  
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
        <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
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

import { Task, TaskStatus, ReminderConfig, StudentProfileType, AcademicTerm, Subject, UserProfile, Note, Notice } from './types';

import { Sidebar } from './components/Sidebar';
import { TaskActionMenu } from './components/TaskActionMenu';
import { TaskDashboardSummary } from './components/TaskDashboardSummary';
import { SettingsView } from './components/SettingsView';
import { BottomNavigation } from './components/BottomNavigation';
import { EnvironmentSwitcher } from './components/EnvironmentSwitcher';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('google_access_token');
    } catch (e) {
      console.warn("Session storage access failed:", e);
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userRole, setUserRole] = useState<'student' | 'teacher'>('student');
  
  const dueSoonTasks = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return tasks.filter(task => {
      if (!task.dueDate || task.status === 'done' || task.completed) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate > now && dueDate <= tomorrow;
    });
  }, [tasks]);

  const handleLogout = async () => {
    await logout();
    sessionStorage.removeItem('google_access_token');
    localStorage.removeItem('active_tab');
    setUser(null);
    setUserProfile(null);
    setTasks([]);
    setAllUsers([]);
    setPaymentRequests([]);
  };

  const playAlarmSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1); // Drop to A4
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Could not play alarm sound", e);
    }
  };

  const triggerNotification = (title: string, options: NotificationOptions) => {
    playAlarmSound();
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, options);
      } catch (e) {
        console.error("Notification error:", e);
        // Fallback: try using service worker if available
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
          }).catch(err => console.error("Service Worker Notification error:", err));
        }
      }
    }
  };
  
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'error' | 'success' | 'info' }[]>([]);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    const handleGlobalError = (e: any) => {
      const errInfo = e.detail;
      let userMessage = "Ocorreu um erro ao processar sua solicitação no banco de dados.";
      
      const errorStr = errInfo.error.toLowerCase();
      if (errorStr.includes("permission-denied") || errorStr.includes("missing or insufficient permissions")) {
        userMessage = "Você não tem permissão para realizar esta ação. Verifique se você está conectado corretamente.";
      } else if (errorStr.includes("quota-exceeded")) {
        userMessage = "O limite de uso do banco de dados foi atingido. Tente novamente mais tarde.";
      } else if (errorStr.includes("offline")) {
        userMessage = "Você parece estar offline. Verifique sua conexão com a internet.";
      }
      
      showToast(userMessage, 'error');
    };

    window.addEventListener('firestore-error', handleGlobalError);
    return () => window.removeEventListener('firestore-error', handleGlobalError);
  }, []);

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
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, message: '' });
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      return localStorage.getItem('active_tab') || 'tasks';
    } catch (e) {
      return 'tasks';
    }
  });
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Admin State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const unsubNotices = onSnapshot(query(collection(db, 'notices'), where('active', '==', true)), (snapshot) => {
      const activeNotices = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notice));
      setNotices(activeNotices);
      
      // Show the most recent notice if not seen yet
      if (activeNotices.length > 0 && user) {
        const seenNotices = JSON.parse(localStorage.getItem(`seen_notices_${user.uid}`) || '[]');
        const unseen = activeNotices.filter(n => !seenNotices.includes(n.id));
        if (unseen.length > 0) {
          setActiveNotice(unseen[0]);
        }
      }
    }, (error) => {
      console.error("Error listening to notices:", error);
      // Don't throw here to avoid crashing the app for a non-critical feature
    });
    return () => unsubNotices();
  }, [user]);

  const markNoticeAsSeen = (id: string) => {
    if (!user) return;
    const seenNotices = JSON.parse(localStorage.getItem(`seen_notices_${user.uid}`) || '[]');
    if (!seenNotices.includes(id)) {
      localStorage.setItem(`seen_notices_${user.uid}`, JSON.stringify([...seenNotices, id]));
    }
    setActiveNotice(null);
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    try {
      localStorage.setItem('active_tab', activeTab);
    } catch (e) {
      console.warn("Local storage write failed:", e);
    }
  }, [activeTab]);
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
    // Safety timeout to ensure app eventually loads
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization timed out, forcing loading to false");
        setLoading(false);
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      // Test Firestore connection on boot
      try {
        await getDocFromServer(doc(db, '_internal', 'connection_test'));
        console.log("Firestore connection verified");
      } catch (error: any) {
        console.error("Firestore initial connection test failed:", error);
        if (error.code === 'unavailable' || error.message?.includes('offline')) {
          setInitializationError("Não foi possível conectar ao banco de dados. Isso pode indicar uma configuração incorreta do Firebase ou falta de internet.");
        }
      }
      
      if (u) {
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (!userDocSnap.exists()) {
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || '',
              photoURL: u.photoURL || '',
              role_user: (u.email?.toLowerCase() === 'jefson.s.a7@gmail.com' || u.email?.toLowerCase() === 'jefson.ti@gmail.com') ? 'admin' : 'user',
              subscriptionStatus: 'trialing',
              trialStartAt: new Date().toISOString(),
              trialEndsAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
              billingCycle: 'monthly'
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          } else {
            const data = userDocSnap.data() as UserProfile;
            // Force admin role if email matches but role is not admin
            if ((u.email?.toLowerCase() === 'jefson.s.a7@gmail.com' || u.email?.toLowerCase() === 'jefson.ti@gmail.com') && data.role_user !== 'admin') {
              await updateDoc(userDocRef, { role_user: 'admin' });
              data.role_user = 'admin';
            }
            setUserProfile(data);
          }
        } catch (error: any) {
          console.error("Error fetching/creating user profile:", error);
          setInitializationError("Erro ao carregar perfil: " + error.message);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
      clearTimeout(timeoutId);
    });
    
    // Check for redirect result
    handleRedirectResult().then((result) => {
      if (result && result.accessToken) {
        setAccessToken(result.accessToken);
        try {
          sessionStorage.setItem('google_access_token', result.accessToken);
        } catch (e) {}
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    }).catch((e: any) => {
      console.error("Redirect sign-in error details:", e);
      setAuthErrorMessage(`Erro ao fazer login: ${e.message || 'Erro desconhecido'}`);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Admin Data Fetching
  useEffect(() => {
    if (userProfile?.role_user === 'admin') {
      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(d => d.data() as UserProfile));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      });
      const unsubPayments = onSnapshot(collection(db, 'payment_requests'), (snapshot) => {
        setPaymentRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'payment_requests');
      });
      return () => {
        unsubUsers();
        unsubPayments();
      };
    }
  }, [userProfile]);

  useEffect(() => {
    const checkProactiveNotifications = () => {
      if (!user) return;
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
            triggerNotification(`Lembrete: ${task.title}`, {
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

        // Handle standard proactive notifications
        if (task.hasDueDate) {
          const dueDate = new Date(task.dueDate);
          const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

          // Notify if due within 48 hours or overdue by up to 24 hours
          if (diffHours <= 48 && diffHours > -24) {
            const lastNotified = notifiedTasks[task.id];
            let shouldNotify = false;

            if (!lastNotified) {
              shouldNotify = true;
            } else if (typeof lastNotified === 'number') {
              shouldNotify = (now.getTime() - lastNotified) >= 24 * 60 * 60 * 1000;
            } else {
              // Legacy boolean format
              shouldNotify = true;
            }

            if (shouldNotify) {
              const isOverdue = diffHours < 0;
              const title = isOverdue ? `Tarefa Atrasada: ${task.title}` : `Tarefa Próxima do Prazo: ${task.title}`;
              const body = isOverdue 
                ? `O prazo expirou há ${Math.round(Math.abs(diffHours))} horas e ainda não foi concluída.` 
                : `Vence em ${Math.round(diffHours)} horas e ainda não foi concluída.`;

              triggerNotification(title, {
                body,
                icon: '/favicon.ico'
              });
              notifiedTasks[task.id] = now.getTime();
              updated = true;
            }
          }
        }
      });

      if (updated) {
        localStorage.setItem(`notified_tasks_${user.uid}`, JSON.stringify(notifiedTasks));
      }
    };

    checkProactiveNotifications();
    const interval = setInterval(checkProactiveNotifications, 60 * 1000); // Check every 1 min for precise reminders
    
    const requestNotificationPermission = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      document.removeEventListener('click', requestNotificationPermission);
    };
    document.addEventListener('click', requestNotificationPermission);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('click', requestNotificationPermission);
    };
  }, [tasks, user]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSignIn = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const result = await signIn();
      if (result && result.user) {
        setUser(result.user);
        if (result.accessToken) {
          setAccessToken(result.accessToken);
          try {
            sessionStorage.setItem('google_access_token', result.accessToken);
          } catch (e) {
            console.warn("Could not save access token to session storage:", e);
          }
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
        }
      }
    } catch (e: any) {
      console.error("Sign-in error details:", {
        code: e.code,
        message: e.message,
        customData: e.customData,
        name: e.name
      });
      
      let errorMsg = "Erro ao fazer login. Tente novamente.";
      if (e.code === 'auth/popup-blocked') {
        errorMsg = "O popup de login foi bloqueado. Por favor, permita popups ou use o botão 'Abrir em nova aba'.";
      } else if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        errorMsg = "Login cancelado.";
      } else {
        errorMsg = "Erro: " + (e.message || "Erro desconhecido");
      }
      setAuthErrorMessage(errorMsg);
      setShowAuthModal(true);
    } finally {
      setIsLoggingIn(false);
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
      if (accessToken) {
        if (task.calendarEventId) {
          fetch('/api/google/calendar/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, eventId: task.calendarEventId })
          }).catch(e => console.error("Calendar Delete Error:", e));
        }
        if (task.externalId) {
          fetch('/api/google/tasks/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, externalId: task.externalId })
          }).catch(e => console.error("Tasks Delete Error:", e));
        }
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
      
      // Refined Role Filtering
      const matchesRole = roleFilter === 'all' || 
                          (roleFilter === 'teacher' 
                            ? (t.role === 'teacher' || t.courseId !== undefined) 
                            : t.role === 'student');
      
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

  const addSubject = async (name: string, color: string, termId?: string, reminderConfig?: ReminderConfig) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'subjects'), {
        name,
        color,
        termId: termId || null,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        reminderConfig: reminderConfig || null
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

  const deleteTerm = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'terms', id));
      showToast('Período excluído com sucesso!', 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `terms/${id}`);
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
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="mb-4"
        >
          <RefreshCw className="w-10 h-10 text-blue-600" />
        </motion.div>
        <h2 className="text-xl font-semibold text-slate-800">Iniciando Agende Tarefas...</h2>
        <p className="text-slate-500 mt-2 max-w-xs">Isso pode levar alguns segundos dependendo da sua conexão.</p>
        
        {initializationError && (
          <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 max-w-xs">
            <AlertCircle className="w-5 h-5 mx-auto mb-2" />
            {initializationError}
            <button 
              onClick={() => window.location.reload()}
              className="mt-3 block w-full py-2 bg-red-600 text-white rounded-xl font-bold"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(userAgent);
    const isAndroidWebView = userAgent.includes('wv') || (userAgent.includes('Android') && userAgent.includes('Version/'));
    const isSocialApp = userAgent.includes('Instagram') || userAgent.includes('FBAN') || userAgent.includes('FBAV');
    const isWebView = isIOSWebView || isAndroidWebView || isSocialApp;

    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Agende Tarefas</h1>
            <p className="text-slate-500">Organize sua vida acadêmica e pessoal com inteligência e confiabilidade.</p>
          </div>
          
          {isWebView ? (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-sm text-left space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <p className="font-semibold">Navegador incompatível detectado</p>
              </div>
              <p>
                Você está usando um navegador interno que bloqueia o login seguro do Google. 
                Para acessar o aplicativo, por favor abra no seu navegador padrão (Chrome, Safari, etc).
              </p>
              <button 
                onClick={() => window.open(window.location.href, '_system')}
                className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all flex items-center justify-center gap-2 mt-2"
              >
                Abrir no Navegador Padrão <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              )}
              {isLoggingIn ? 'Iniciando login...' : 'Entrar com Google'}
            </button>
          )}

          {authErrorMessage && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100 flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authErrorMessage}</span>
            </div>
          )}
          
          {!isWebView && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-2">Problemas no login?</p>
              <div className="space-y-3">
                <button 
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="w-full py-3 border-2 border-blue-100 text-blue-600 rounded-2xl text-sm font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  Abrir em nova aba <ExternalLink className="w-4 h-4" />
                </button>
                <p className="text-[10px] text-slate-400">
                  Dica: Em dispositivos móveis, o login pode ser bloqueado pelo navegador. Abrir em uma nova aba resolve a maioria dos problemas.
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400">Ao entrar, você concorda com nossos termos de uso.</p>
        </div>
      </div>
    );
  }

  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> => {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 && retries > 0) {
        const retryAfter = res.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : backoff;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      if (!res.ok && res.status >= 500 && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      return res;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw error;
    }
  };

  const syncGoogleCalendar = async (task: Task) => {
    if (!user || !accessToken) return;
    try {
      const res = await fetchWithRetry('/api/google/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, task })
      });
      const data = await res.json();
      
      if (!res.ok) {
        const msg = data.error || "";
        const isApiDisabled = msg.includes("googleapis.com") || msg.includes("API has not been used") || res.status === 403;
        
        if (isApiDisabled) {
          const projectMatch = msg.match(/project (\d+)/);
          const projectId = projectMatch ? projectMatch[1] : "537809046235";
          const enableUrl = `https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=${projectId}`;
          
          console.warn(`Google Calendar API não ativada. Ative em: ${enableUrl}`);
          setDiagnosticStatus(prev => ({ ...prev, calendar: 'denied' }));
          setAuthErrorMessage(`ERRO CRÍTICO (403): A API do Google Calendar não está ativada no seu projeto Google Cloud (${projectId}). \n\nPara corrigir:\n1. Clique no link abaixo\n2. Clique no botão azul "ATIVAR"\n3. Aguarde 2 minutos\n4. Clique em "Recarregar Aplicativo"\n\nLink: ${enableUrl}`);
          setShowAuthModal(true);
        } else if (msg.toLowerCase().includes("token") || 
            msg.toLowerCase().includes("auth") || 
            msg.toLowerCase().includes("credentials") ||
            res.status === 401) {
          setAccessToken(null);
          sessionStorage.removeItem('google_access_token');
          setAuthErrorMessage("Sua sessão do Google Calendar expirou ou as permissões são insuficientes. Por favor, reconecte sua conta.");
          setShowAuthModal(true);
        } else {
          showToast(`Erro ao sincronizar calendário: ${msg}`, 'error');
        }
        return;
      }

      setDiagnosticStatus(prev => ({ ...prev, calendar: 'stable' }));
      if (data.calendarEventId) {
        try {
          await updateDoc(doc(db, 'tasks', task.id), {
            calendarEventId: data.calendarEventId,
            lastSyncAt: new Date().toISOString()
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
      if (!accessToken) {
        setAuthErrorMessage("Conecte sua conta Google para sincronizar tarefas.");
        setShowAuthModal(true);
      }
      return;
    }

    setIsSyncingTasks(true);
    setSyncProgress({ current: 0, total: 0, message: 'Iniciando sincronização com Google Tasks...' });

    try {
      setSyncProgress(prev => ({ ...prev, message: 'Buscando tarefas do Google...' }));
      const res = await fetchWithRetry('/api/google/tasks/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao buscar tarefas do Google');
      }

      const googleTasks = await res.json();
      const localTasks = tasks;
      
      const googleTaskIds = new Set(googleTasks.map((t: any) => t.id));
      const localTasksWithExternalId = localTasks.filter(t => t.externalId);
      const localOnly = localTasks.filter(t => !t.externalId && t.source !== 'classroom');

      setSyncProgress({ current: 0, total: googleTasks.length, message: 'Sincronizando tarefas...' });
      
      let count = 0;
      for (const gTask of googleTasks) {
        count++;
        setSyncProgress(prev => ({ ...prev, current: count, message: `Sincronizando: ${gTask.title || 'Sem Título'}` }));
        
        const localTask = localTasks.find(t => t.externalId === gTask.id);
        const googleUpdated = new Date(gTask.updated || 0).getTime();
        
        if (!localTask) {
          // New task from Google
          const taskData = {
            title: (gTask.title || 'Tarefa do Google').substring(0, 500),
            description: (gTask.notes || '').substring(0, 2000),
            dueDate: gTask.due || new Date().toISOString(),
            hasDueDate: !!gTask.due,
            completed: gTask.status === 'completed',
            status: gTask.status === 'completed' ? 'done' : 'todo',
            priority: 'medium',
            category: 'Google Tasks',
            source: 'tasks',
            externalId: gTask.id,
            userId: user.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            lastSyncAt: new Date().toISOString(),
            order: 0
          };
          
          try {
            const docRef = await addDoc(collection(db, 'tasks'), taskData);
            syncGoogleCalendar({ id: docRef.id, ...taskData } as Task);
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'tasks');
          }
        } else {
          // Sync existing
          const localUpdated = localTask.updatedAt?.toDate ? localTask.updatedAt.toDate().getTime() : new Date(localTask.updatedAt || 0).getTime();
          
          if (googleUpdated > localUpdated + 1000) { // 1s buffer
            const updateData = {
              title: (gTask.title || localTask.title).substring(0, 500),
              description: (gTask.notes || localTask.description).substring(0, 2000),
              completed: gTask.status === 'completed',
              status: gTask.status === 'completed' ? 'done' : localTask.status,
              updatedAt: Timestamp.fromDate(new Date(gTask.updated)),
              lastSyncAt: new Date().toISOString()
            };
            try {
              await updateDoc(doc(db, 'tasks', localTask.id), updateData);
              syncGoogleCalendar({ ...localTask, ...updateData } as Task);
            } catch (e) {
              handleFirestoreError(e, OperationType.UPDATE, `tasks/${localTask.id}`);
            }
          } else if (localUpdated > googleUpdated + 1000) {
            // Push local to Google
            await fetchWithRetry('/api/google/tasks/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken, task: localTask })
            });
            try {
              await updateDoc(doc(db, 'tasks', localTask.id), {
                lastSyncAt: new Date().toISOString()
              });
            } catch (e) {
              handleFirestoreError(e, OperationType.UPDATE, `tasks/${localTask.id}`);
            }
          }
        }
      }

      // Handle deletions
      for (const lTask of localTasksWithExternalId) {
        if (!googleTaskIds.has(lTask.externalId!)) {
          try {
            await deleteDoc(doc(db, 'tasks', lTask.id));
            if (lTask.calendarEventId) {
              await fetchWithRetry('/api/google/calendar/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, eventId: lTask.calendarEventId })
              });
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, `tasks/${lTask.id}`);
          }
        }
      }

      // Push new local tasks to Google
      for (const lTask of localOnly) {
        const syncRes = await fetchWithRetry('/api/google/tasks/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, task: lTask })
        });
        
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.externalId) {
            const updatedTask = { ...lTask, externalId: syncData.externalId, lastSyncAt: new Date().toISOString() };
            try {
              await updateDoc(doc(db, 'tasks', lTask.id), {
                externalId: syncData.externalId,
                lastSyncAt: new Date().toISOString()
              });
              syncGoogleCalendar(updatedTask);
            } catch (e) {
              handleFirestoreError(e, OperationType.UPDATE, `tasks/${lTask.id}`);
            }
          }
        }
      }

      setDiagnosticStatus(prev => ({ ...prev, tasks: 'stable' }));
      showToast('Sincronização com Google Tasks concluída!', 'success');
    } catch (e: any) {
      const errorMessage = e.message || 'Erro desconhecido';
      console.error("Sync error:", errorMessage);
      
      if (errorMessage.includes("401") || errorMessage.includes("403")) {
        setAuthErrorMessage("Sua sessão do Google expirou ou permissões são insuficientes. Reconecte sua conta.");
        setShowAuthModal(true);
      }
      
      if (errorMessage.includes("tasks.googleapis.com") || errorMessage.includes("API has not been used") || errorMessage.includes("403")) {
        const projectMatch = errorMessage.match(/project (\d+)/);
        const projectId = projectMatch ? projectMatch[1] : "537809046235";
        const enableUrl = `https://console.developers.google.com/apis/api/tasks.googleapis.com/overview?project=${projectId}`;
        setDiagnosticStatus(prev => ({ ...prev, tasks: 'denied' }));
        setAuthErrorMessage(`A API do Google Tasks não está ativada no seu projeto Google Cloud (${projectId}). Para que o sistema funcione corretamente, você precisa ativá-la: ${enableUrl}`);
        setShowAuthModal(true);
      } else {
        setAuthErrorMessage(`Erro no Google Tasks: ${errorMessage}`);
        setShowAuthModal(true);
      }
    } finally {
      setIsSyncingTasks(false);
      setSyncProgress({ current: 0, total: 0, message: '' });
    }
  };
  const syncClassroom = async () => {
    if (!user || !accessToken) {
      if (!accessToken) {
        setAuthErrorMessage("Para sincronizar com o Google Classroom, você precisa conectar sua conta Google.");
        setShowAuthModal(true);
      }
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0, message: 'Iniciando sincronização com Google Classroom...' });
    try {
      localStorage.setItem(`accepted_policies_${user.uid}`, 'true');
      setShowOnboarding(false);

      setSyncProgress(prev => ({ ...prev, message: 'Buscando suas turmas...' }));
      const coursesRes = await fetchWithRetry('/api/google/classroom/courses', {
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
      let courseCount = 0;
      for (const course of courses) {
        courseCount++;
        setSyncProgress(prev => ({ ...prev, current: courseCount, message: `Sincronizando turma: ${course.name}` }));
        try {
          // Determine role
          const role = course.role || 'student';
          
          const courseworkRes = await fetchWithRetry('/api/google/classroom/coursework', {
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
                const subRes = await fetchWithRetry('/api/google/classroom/submissions', {
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
      setSyncProgress({ current: 0, total: courses.length, message: 'Sincronização concluída!' });
      showToast("Sincronização com Google Classroom concluída!", 'success');
    } catch (e: any) {
      console.error("Sync Error:", e);
      
      let errorMessage = e.message || "Tente entrar novamente.";
      
      if (errorMessage.includes("invalid authentication credentials") || errorMessage.includes("Expected OAuth 2 access token")) {
        setAccessToken(null);
        sessionStorage.removeItem('google_access_token');
        setAuthErrorMessage("Sua sessão do Google expirou. Por favor, reconecte sua conta para sincronizar.");
        setShowAuthModal(true);
        return;
      }
      
      // Check for disabled API error
      if (errorMessage.includes("classroom.googleapis.com") || errorMessage.includes("API has not been used")) {
        const projectMatch = errorMessage.match(/project (\d+)/);
        const projectId = projectMatch ? projectMatch[1] : "";
        const enableUrl = `https://console.developers.google.com/apis/api/classroom.googleapis.com/overview?project=${projectId}`;
        
        setDiagnosticStatus(prev => ({ ...prev, classroom: 'denied' }));
        setAuthErrorMessage(`A API do Google Classroom não está ativada. Para que o sistema funcione corretamente, você precisa ativá-la no console do Google Cloud: ${enableUrl}`);
        setShowAuthModal(true);
        return;
      }

      setDiagnosticStatus(prev => ({ ...prev, classroom: 'stable' }));
      setAuthErrorMessage(`Erro na sincronização: ${errorMessage}`);
      setShowAuthModal(true);
      if (errorMessage.toLowerCase().includes("token") || 
          errorMessage.toLowerCase().includes("auth") || 
          errorMessage.toLowerCase().includes("credentials")) {
        setAccessToken(null);
        sessionStorage.removeItem('google_access_token');
        setAuthErrorMessage("Sua sessão do Google expirou ou as permissões são insuficientes. Por favor, reconecte sua conta.");
        setShowAuthModal(true);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <div className="flex min-h-[100dvh] bg-slate-50">
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
        showInstallPrompt={showInstallPrompt}
        onInstallClick={handleInstallClick}
        userProfile={userProfile}
      />

      <main className="flex-1 overflow-x-hidden lg:pb-8">
        <div className="max-w-7xl mx-auto p-4 lg:p-8 w-full">
          {/* Payment Banner */}
          <PaymentBanner 
            userProfile={userProfile} 
            onPay={() => setActiveTab('settings')} 
          />

          {/* Due Soon Banner */}
          <DueSoonBanner 
            tasks={dueSoonTasks} 
            onAction={() => setActiveTab('tasks')} 
          />

          {/* Notices Banner */}
          <NoticeBanner 
            notices={notices.filter(n => {
              const seen = JSON.parse(localStorage.getItem(`seen_notices_${user?.uid}`) || '[]');
              return !seen.includes(n.id);
            })} 
            onDismiss={markNoticeAsSeen} 
          />

          {/* Header */}
        {(isSyncing || isSyncingTasks) && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="font-bold text-sm">{syncProgress.message}</span>
              </div>
              {syncProgress.total > 0 && (
                <span className="text-xs font-bold bg-blue-500 px-2 py-1 rounded-lg">
                  {syncProgress.current} / {syncProgress.total}
                </span>
              )}
            </div>
            {syncProgress.total > 0 && (
              <div className="w-full bg-blue-400/30 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  className="bg-white h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </motion.div>
        )}

        {showInstallPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold">Instalar Agende Tarefas</h3>
                <p className="text-sm text-blue-100">Instale o aplicativo para acesso rápido e notificações.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setShowInstallPrompt(false)}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-blue-100 hover:bg-white/10 rounded-xl transition-colors"
              >
                Agora não
              </button>
              <button 
                onClick={handleInstallClick}
                className="flex-1 sm:flex-none px-6 py-2 bg-white text-blue-600 text-sm font-bold rounded-xl shadow-sm hover:bg-blue-50 transition-colors"
              >
                Instalar
              </button>
            </div>
          </motion.div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 bg-white rounded-2xl shadow-sm text-slate-600 border border-slate-100 active:scale-95 transition-transform"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">
                {activeTab === 'tasks' ? (selectedSubjectId ? subjects.find(s => s.id === selectedSubjectId)?.name : 'Minhas Tarefas') :
                 activeTab === 'kanban' ? 'Quadro Kanban' :
                 activeTab === 'calendar' ? 'Calendário' :
                 activeTab === 'reminders' ? 'Lembretes' :
                 activeTab === 'notes' ? 'Minhas Notas' :
                 activeTab === 'settings' ? 'Configurações Acadêmicas' : 'Disciplinas'}
              </h1>
              <p className="text-slate-500 font-medium text-sm md:text-base">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => syncGoogleTasks()}
              disabled={isSyncingTasks}
              className={cn(
                "flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95",
                isSyncingTasks && "opacity-50 cursor-not-allowed"
              )}
              title="Sincronizar Agenda"
            >
              <Calendar className={cn("w-5 h-5", isSyncingTasks && "animate-spin")} />
              <span className="hidden sm:inline">{isSyncingTasks ? 'Sincronizando...' : 'Agenda'}</span>
            </button>
            <button 
              onClick={() => syncClassroom()}
              disabled={isSyncing}
              className={cn(
                "flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95",
                isSyncing && "opacity-50 cursor-not-allowed"
              )}
              title="Sincronizar Classroom"
            >
              <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
              <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Classroom'}</span>
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nova Tarefa</span>
              <span className="sm:hidden">Nova</span>
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
                <EnvironmentSwitcher 
                  role={userRole} 
                  setRole={(newRole) => {
                    setUserRole(newRole);
                    setRoleFilter(newRole);
                  }} 
                />
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
              <RemindersView tasks={tasks.filter(t => t.reminderConfig)} subjects={subjects} />
            ) : activeTab === 'settings' ? (
              <SettingsView 
                userProfile={userProfile} 
                setActiveTab={setActiveTab} 
                onLogout={handleLogout} 
                onReconnect={handleSignIn}
                tasks={tasks}
                subjects={subjects}
                profileType={profileType}
                setProfileType={setProfileType}
                terms={terms}
                onAddTerm={() => setShowTermModal(true)}
                onDeleteTerm={deleteTerm}
              />
            ) : activeTab === 'admin' && userProfile?.role_user === 'admin' ? (
              <AdminPanel 
                users={allUsers}
                paymentRequests={paymentRequests}
                onApprovePayment={async (requestId, userId) => {
                  try {
                    await updateDoc(doc(db, 'payment_requests', requestId), { status: 'approved' });
                    await updateDoc(doc(db, 'users', userId), { subscriptionStatus: 'active' });
                  } catch (e) { console.error(e); }
                }}
                onRejectPayment={async (requestId, userId) => {
                  try {
                    await updateDoc(doc(db, 'payment_requests', requestId), { status: 'rejected' });
                    await updateDoc(doc(db, 'users', userId), { subscriptionStatus: 'blocked' });
                  } catch (e) { console.error(e); }
                }}
                onReleaseAccess={async (userId) => {
                  try {
                    await updateDoc(doc(db, 'users', userId), { isReleased: true, subscriptionStatus: 'active' });
                  } catch (e) { console.error(e); }
                }}
                onPauseAccess={async (userId) => {
                  try {
                    await updateDoc(doc(db, 'users', userId), { isReleased: false, subscriptionStatus: 'paused' });
                  } catch (e) { console.error(e); }
                }}
                onCreateNotice={async (title, content, type) => {
                  try {
                    await addDoc(collection(db, 'notices'), {
                      title,
                      content,
                      type,
                      active: true,
                      createdAt: new Date().toISOString()
                    });
                    showToast('Aviso publicado com sucesso!', 'success');
                  } catch (e) { console.error(e); }
                }}
              />
            ) : (
              <SubjectsView 
                subjects={subjects} 
                terms={terms} 
                onAddSubject={() => setShowSubjectModal(true)} 
                onDeleteSubject={async (id) => {
                  try {
                    await deleteDoc(doc(db, 'subjects', id));
                    showToast('Disciplina excluída com sucesso!', 'success');
                  } catch (e) {
                    handleFirestoreError(e, OperationType.DELETE, `subjects/${id}`);
                  }
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
        {/* Spacer for mobile bottom navigation */}
        <div className="h-32 lg:hidden w-full"></div>
        </div>
      </main>
      <BottomNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={userProfile?.role_user === 'admin'} 
      />
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
                <h2 className="text-2xl font-bold text-slate-900">Bem-vindo ao Agende Tarefas!</h2>
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
        {activeNotice && (
          <NoticeModal 
            notice={activeNotice} 
            onClose={() => markNoticeAsSeen(activeNotice.id)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDiagnostics && (
          <DiagnosticsPanel 
            status={diagnosticStatus} 
            onClose={() => setShowDiagnostics(false)} 
            onReauth={handleSignIn}
          />
        )}
      </AnimatePresence>

      {/* Auth Error Modal */}
      <AnimatePresence>
        {/* Toast Notifications */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-md px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "p-4 rounded-2xl shadow-lg border flex items-center gap-3 pointer-events-auto",
                toast.type === 'error' ? "bg-red-50 border-red-100 text-red-800" :
                toast.type === 'success' ? "bg-green-50 border-green-100 text-green-800" :
                "bg-white border-slate-200 text-slate-800"
              )}
            >
              {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
              <p className="text-sm font-medium">{toast.message}</p>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-auto p-1 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showAuthModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <X className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 text-center mb-4">Conexão Necessária</h3>
              <div className="text-slate-600 text-center mb-8 leading-relaxed space-y-4">
                {authErrorMessage.includes('http') ? (
                  <>
                    <p>{authErrorMessage.split('http')[0]}</p>
                    <a 
                      href={'http' + authErrorMessage.split('http')[1]} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-200 hover:bg-amber-100 transition-colors break-all"
                    >
                      Clique aqui para ativar a API
                    </a>
                    <p className="text-[10px] text-slate-400 italic">Após ativar, aguarde 1-2 minutos e tente novamente.</p>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{authErrorMessage}</p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowAuthModal(false);
                    handleSignIn();
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  Conectar Conta Google
                </button>
                {authErrorMessage.includes('http') && (
                  <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" /> Recarregar Aplicativo
                  </button>
                )}
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Reminder Modal Removed */}

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTaskModal 
            onClose={() => setShowCreateModal(false)} 
            userId={user?.uid || ''}
            categories={customCategories}
            setCategories={setCustomCategories}
            initialRole={roleFilter === 'all' ? 'student' : roleFilter}
            subjects={subjects}
            onAddSubject={() => {
              setShowCreateModal(false);
              setShowSubjectModal(true);
            }}
            onTaskCreated={(task) => {
              if (accessToken) {
                syncGoogleCalendar(task);
                // Also sync to Google Tasks if it's a general task
                fetch('/api/google/tasks/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accessToken, task })
                }).catch(err => console.error("Error syncing to Google Tasks:", err));
              } else {
                setAuthErrorMessage("Sua sessão do Google expirou. Reconecte para salvar no Google Agenda.");
                setShowAuthModal(true);
              }
            }}
          />
        )}
      </AnimatePresence>
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
      <div className="flex-1 bg-white rounded-[32px] shadow-xl p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 rotate-180 text-slate-400" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
            <div key={`header-${day}-${index}`} className="text-center text-[10px] md:text-xs font-bold text-slate-400 uppercase py-2">{day}</div>
          ))}
          
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 md:h-24" />
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
                  "h-16 md:h-24 border border-slate-50 rounded-2xl p-1 md:p-2 space-y-1 overflow-y-auto no-scrollbar cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md", 
                  isToday ? "bg-blue-50/50 border-blue-100 shadow-sm" : "bg-slate-50/30",
                  isOverdueHighlight && "border-red-300 bg-red-50/30 ring-2 ring-red-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-[10px] md:text-xs font-bold", isToday ? "text-blue-600" : "text-slate-400")}>{day}</span>
                  <div className="flex gap-0.5">
                    {pending.length > 0 && <span className="w-1 h-1 bg-blue-500 rounded-full" />}
                    {overdue.length > 0 && <span className="w-1 h-1 bg-red-500 rounded-full" />}
                    {completed.length > 0 && <span className="w-1 h-1 bg-green-500 rounded-full" />}
                  </div>
                </div>
                <div className="space-y-1 hidden md:block">
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
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium truncate max-w-[80px] md:max-w-[120px]">
            {subjectName || 'Sem disciplina'}
          </span>

          {/* Role Indicator */}
          {task.role && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
              task.role === 'teacher' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            )}>
              {task.role === 'teacher' ? 'Prof' : 'Aluno'}
            </span>
          )}

          {/* 2nd: Activity of the subject (Task Title) */}
          <h3 className={cn("font-semibold truncate max-w-[120px] md:max-w-[300px]", task.completed && "line-through text-slate-400")}>
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

          {task.reminderConfig && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Bell className="w-3 h-3" />
              {task.reminderConfig.type === 'recurring' ? 'Recorrente' : 'Lembrete'}
              {task.reminderConfig.time && ` às ${task.reminderConfig.time}`}
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
  const [reminderType, setReminderType] = useState<'once' | 'repeated' | 'nagging' | 'progressive' | 'recurring'>('once');
  const [interval, setInterval] = useState(15);
  const [repeatUntilAck, setRepeatUntilAck] = useState(false);
  const [progressiveStep, setProgressiveStep] = useState(5);
  const [reminderTime, setReminderTime] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Default weekdays

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
          time: reminderTime || null,
          daysOfWeek: reminderType === 'recurring' ? daysOfWeek : null,
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
                Único
              </button>
              <button 
                type="button"
                onClick={() => setReminderType('recurring')}
                className={cn("p-3 rounded-xl text-xs font-bold border-2 transition-all", reminderType === 'recurring' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500")}
              >
                Recorrente
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

            {reminderType === 'recurring' && (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-600">Dias da Semana</label>
                <div className="flex flex-wrap gap-2">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDaysOfWeek(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                      className={cn("w-8 h-8 rounded-lg text-xs font-bold border transition-all", daysOfWeek.includes(i) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-400")}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600">Horário do Lembrete</label>
                  <input 
                    type="time" 
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {reminderType !== 'once' && reminderType !== 'recurring' && (
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

function SubjectsView({ subjects, terms, onAddSubject, onDeleteSubject }: { subjects: Subject[], terms: AcademicTerm[], onAddSubject: () => void, onDeleteSubject: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Minhas Disciplinas</h2>
          <p className="text-sm text-slate-500 font-medium">Gerencie suas matérias e acompanhe seu progresso.</p>
        </div>
        <button 
          onClick={onAddSubject} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nova Disciplina
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map(subject => (
          <div key={subject.id} className="group bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  if(confirm('Tem certeza que deseja excluir esta disciplina?')) {
                    onDeleteSubject(subject.id);
                  }
                }}
                className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl transform group-hover:rotate-6 transition-transform" style={{ backgroundColor: subject.color }}>
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest">
                  {terms.find(t => t.id === subject.termId)?.name || 'Sem Período'}
                </span>
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{subject.name}</h3>
            
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
              <Calendar className="w-3 h-3" />
              Desde {new Date(subject.createdAt).toLocaleDateString()}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    {i}
                  </div>
                ))}
              </div>
              <button className="text-blue-600 font-bold text-sm hover:underline">Ver Detalhes</button>
            </div>
          </div>
        ))}

        {subjects.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhuma disciplina ainda</h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto mb-8">Comece adicionando as matérias que você está cursando neste período.</p>
            <button 
              onClick={onAddSubject}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              Adicionar Primeira Disciplina
            </button>
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

function RemindersView({ tasks, subjects }: { tasks: Task[], subjects: Subject[] }) {
  const subjectReminders = subjects.filter(s => s.reminderConfig);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Lembretes Ativos</h2>
      
      <div className="space-y-3">
        {/* Subject Reminders */}
        {subjectReminders.map(subject => (
          <div key={subject.id} className="bg-indigo-50 p-4 rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-indigo-900 text-sm">Estudar: {subject.name}</h3>
                <div className="flex items-center gap-2 text-xs text-indigo-600/70">
                  <Clock className="w-3 h-3" />
                  <span>Horário: {subject.reminderConfig?.time}</span>
                  <span className="px-2 py-0.5 bg-indigo-100 rounded-full text-[10px] font-bold uppercase">
                    Disciplina
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {subject.reminderConfig?.daysOfWeek?.map(d => (
                <span key={d} className="w-5 h-5 flex items-center justify-center bg-white text-[8px] font-bold rounded-md text-indigo-600 border border-indigo-100">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d]}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Task Reminders */}
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

        {tasks.length === 0 && subjectReminders.length === 0 && (
          <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhum lembrete configurado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Modals ---

function CreateSubjectModal({ onClose, onSave, terms }: { onClose: () => void, onSave: (name: string, color: string, termId?: string, reminderConfig?: ReminderConfig) => void, terms: AcademicTerm[] }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [termId, setTermId] = useState('');
  
  // Subject Reminders
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('14:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const handleSave = () => {
    let reminderConfig: ReminderConfig | undefined;
    if (hasReminder) {
      reminderConfig = {
        type: 'recurring',
        time: reminderTime,
        daysOfWeek,
        intervalMinutes: 0,
        repeatUntilAcknowledged: false,
        repeatCount: 0,
        nextReminder: new Date().toISOString() // Will be recalculated by the background logic
      };
    }
    onSave(name, color, termId, reminderConfig);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] no-scrollbar"
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

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                Lembrete de Estudo
              </label>
              <button 
                onClick={() => setHasReminder(!hasReminder)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  hasReminder ? "bg-blue-600" : "bg-slate-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  hasReminder ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            {hasReminder && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 bg-slate-50 p-4 rounded-2xl"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Dias para Estudar</label>
                  <div className="flex flex-wrap gap-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setDaysOfWeek(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-bold border transition-all",
                          daysOfWeek.includes(i) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 uppercase">Horário</label>
                  <input 
                    type="time" 
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={!name}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Criar Disciplina
        </button>
      </motion.div>
    </div>
  );
}

function PaymentBanner({ userProfile, onPay }: { userProfile: UserProfile | null, onPay: () => void }) {
  if (!userProfile) return null;
  
  const isTrialing = userProfile.subscriptionStatus === 'trialing';
  const isExpired = userProfile.subscriptionStatus === 'expired';
  const isPending = userProfile.subscriptionStatus === 'pending_approval';
  
  if (!isTrialing && !isExpired && !isPending) return null;

  let message = "";
  let buttonText = "Assinar Agora";
  let type: 'warning' | 'error' | 'info' = 'info';

  if (isTrialing) {
    const endsAt = new Date(userProfile.trialEndsAt || '');
    const now = new Date();
    const diffDays = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 5) return null; // Only show if less than 5 days left
    message = `Seu período de teste termina em ${diffDays} dias. Assine para não perder o acesso!`;
    type = 'warning';
  } else if (isExpired) {
    message = "Sua assinatura expirou. Renove agora para continuar usando todas as ferramentas.";
    buttonText = "Renovar Assinatura";
    type = 'error';
  } else if (isPending) {
    message = "Seu pagamento está em análise. Você terá acesso total em breve!";
    buttonText = "Ver Status";
    type = 'info';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mb-6 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg",
        type === 'error' ? "bg-red-600 text-white shadow-red-100" :
        type === 'warning' ? "bg-amber-500 text-white shadow-amber-100" :
        "bg-blue-600 text-white shadow-blue-100"
      )}
    >
      <div className="flex items-center gap-3 text-center sm:text-left">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold">{message}</p>
        </div>
      </div>
      <button 
        onClick={onPay}
        className="px-6 py-2 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all whitespace-nowrap"
      >
        {buttonText}
      </button>
    </motion.div>
  );
}

function DueSoonBanner({ tasks, onAction }: { tasks: Task[], onAction: () => void }) {
  if (tasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">Atenção: Prazos Próximos</h3>
            <p className="text-xs text-amber-700">
              Você tem {tasks.length} {tasks.length === 1 ? 'tarefa que vence' : 'tarefas que vencem'} em menos de 24 horas.
            </p>
          </div>
        </div>
        <button 
          onClick={onAction}
          className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition-all whitespace-nowrap"
        >
          Ver Tarefas
        </button>
      </div>
    </motion.div>
  );
}

function NoticeBanner({ notices, onDismiss }: { notices: Notice[], onDismiss: (id: string) => void }) {
  if (notices.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {notices.map(notice => (
        <motion.div
          key={notice.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={cn(
            "p-3 rounded-xl flex items-center justify-between gap-4 shadow-sm border",
            notice.type === 'urgent' || notice.type === 'warning' ? "bg-red-50 border-red-100 text-red-800" :
            notice.type === 'promo' ? "bg-purple-50 border-purple-100 text-purple-800" :
            "bg-blue-50 border-blue-100 text-blue-800"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              notice.type === 'urgent' || notice.type === 'warning' ? "bg-red-100" :
              notice.type === 'promo' ? "bg-purple-100" :
              "bg-blue-100"
            )}>
              {notice.type === 'urgent' || notice.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
               notice.type === 'promo' ? <Zap className="w-4 h-4" /> :
               <Info className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-bold">{notice.title}</p>
              <p className="text-xs opacity-80">{notice.content}</p>
            </div>
          </div>
          <button 
            onClick={() => onDismiss(notice.id)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

function NoticeModal({ notice, onClose }: { notice: Notice, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden"
      >
        {notice.type === 'promo' && (
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500" />
        )}
        {notice.type === 'warning' && (
          <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {notice.type === 'promo' ? (
              <div className="p-2 bg-purple-100 rounded-xl">
                <Plus className="w-5 h-5 text-purple-600" />
              </div>
            ) : notice.type === 'warning' ? (
              <div className="p-2 bg-amber-100 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
            ) : (
              <div className="p-2 bg-blue-100 rounded-xl">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-900">{notice.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
            {notice.content}
          </p>
        </div>

        <button 
          onClick={onClose}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all",
            notice.type === 'promo' ? "bg-purple-600 text-white shadow-purple-100 hover:bg-purple-700" :
            notice.type === 'warning' ? "bg-amber-600 text-white shadow-amber-100 hover:bg-amber-700" :
            "bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700"
          )}
        >
          Entendido
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
