export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'archived' | 'pending' | 'completed';

export interface ReminderConfig {
  type: 'once' | 'repeated' | 'nagging' | 'progressive' | 'recurring';
  intervalMinutes: number;
  nextReminder: string;
  time?: string; // HH:mm
  daysOfWeek?: number[]; // 0-6
  progressiveStepMinutes?: number;
  repeatCount?: number;
  repeatUntilAcknowledged?: boolean;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'promo' | 'urgent' | 'classroom_announcement';
  active: boolean;
  createdAt: string;
  userId?: string; // If specific to a user
  courseId?: string; // For classroom announcements
  externalId?: string; // For classroom announcements
  courseName?: string; // For classroom announcements
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  hasDueDate?: boolean;
  completed: boolean; // Derived from status === 'done'
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  category: string;
  source: 'local' | 'classroom' | 'tasks' | 'classroom_announcement';
  externalId?: string;

  courseId?: string;
  role?: 'student' | 'teacher';
  submissionStatus?: 'TURNED_IN' | 'RETURNED' | 'NEW' | 'RECLAIMED_BY_STUDENT';
  submissionCount?: { turnedIn: number, total: number };
  maxPoints?: number;
  assignedGrade?: number;
  alternateLink?: string;
  reminderConfig?: ReminderConfig;
  userId: string;
  createdAt: any;
  updatedAt?: any;
  lastSyncAt?: string;
  updateTime?: string;
  syncError?: string;
  calendarEventId?: string;
  order?: number;
  
  // Academic & Local Customization
  subjectId?: string;
  termId?: string;
  localNote?: string;
}

export type StudentProfileType = 'school' | 'university';

export interface AcademicTerm {
  id: string;
  name: string;
  active: boolean;
  startDate: string;
  endDate: string;
  userId: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  termId: string | null;
  userId: string;
  createdAt: string;
  reminderConfig?: ReminderConfig;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  profileType?: StudentProfileType;
  quietHoursStart?: string; // e.g., "22:00"
  quietHoursEnd?: string;   // e.g., "07:00"
  role_user?: 'admin' | 'user';
  subscriptionStatus?: 'trialing' | 'active' | 'paused' | 'expired' | 'pending_approval';
  trialStartAt?: string;
  trialEndsAt?: string;
  billingCycle?: 'monthly' | 'yearly';
  monthlyPrice?: number;
  yearlyPrice?: number;
  pixKey?: string;
  isReleased?: boolean;
  paymentPending?: boolean;
  paymentApprovedAt?: string | null;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subjectId?: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}
