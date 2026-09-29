
export interface WorkoutBlock {
  id: string;
  title: string; // e.g., "Warm Up", "Strength", "WOD"
  content: string;
}

export interface WorkoutDay {
  id: string; // Now acts as the Date string (YYYY-MM-DD)
  date: string; // ISO Date String YYYY-MM-DD
  dayName: string; // Display name (Lunes, Martes...)
  title: string;
  focus: string;
  content: string; // Kept for DB compatibility (JSON stringified blocks)
  blocks?: WorkoutBlock[]; // The parsed structure for the UI
  isRestDay: boolean;
}

export interface ProgramWeek {
  weekNumber: number; // calculated from date
  startDate: string; // YYYY-MM-DD of the Monday
  days: WorkoutDay[];
}

export interface WorkoutLog {
  id: string;
  userId: string;
  dayId: string;
  sectionTitle?: string; // The specific block title (e.g. "Metcon", "Back Squat")
  result: string;
  notes?: string;
  date: string; // ISO timestamp
}

export interface AthleteRecord {
  id: string;
  userId: string;
  category: 'BIOMETRICS' | 'LIFTING' | 'GYMNASTICS' | 'MONO';
  exercise: string;
  value: string;
  unit: string;
}

export interface AppNotification {
  id: string;
  senderId: string;
  receiverId: string | null; // Null means global/all
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const LIFTING_EXERCISES = [
  "Back Squat", "Deadlift", "Front Squat", "Bench Press", "Strict Press",
  "Snatch", "Power Snatch", "Hang Snatch", "Overhead Squat",
  "Clean & Jerk", "Power Clean", "Hang Clean", "Push Jerk"
];

export const GYMNASTICS_EXERCISES = [
  "Max pull ups", "Max bar muscle up", "Max chest to bar", "Max Strict pull ups",
  "Max toes to bar", "Max HSPU", "Max Strict HSPU", "Max Deficit HSPU", "Max Deficit SHSPU",
  "Max Ring Muscle up", "Max Strict Ring Muscle up", "Max Ring dips", "Max Strict Ring dips"
];

export const MONO_EXERCISES = [
  "Run 400m", "Run 1000m", "Run 1600m", "Run 5km", "Run 10km", "Run 15km", "Run 21km", "Run 42km",
  "Row 500m", "Row 1000m", "Row 5km", "Row 10km", "Row 15km", "Row 21km", "Row 42km",
  "Bike Calories 50 reps", "Bike Calories 100 reps"
];

export type TimerMode = 'AMRAP' | 'EMOM' | 'FORTIME' | 'TABATA';

export interface TimerConfig {
  mode: TimerMode;
  timeCapMinutes: number; // For AMRAP, For Time
  intervalMinutes: number; // For EMOM
  workSeconds: number; // For Tabata
  restSeconds: number; // For Tabata
  rounds: number; // For EMOM, Tabata
}

export enum TimerState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
}

export interface TimerGlobalState {
   isActive: boolean;
   startTime: number; // Timestamp when timer started
   pausedAt: number | null; // Timestamp when paused, or null if running
   totalPausedTime: number; // Accumulated paused duration
   mode: TimerMode;
   config: TimerConfig;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type UserRole = 'ATHLETE' | 'COACH';

export interface User {
  id: string;
  username: string;
  password?: string; // stored simply for this demo
  role: UserRole;
  fullName: string;
  isApproved: boolean;
  avatarUrl?: string | null;
}

export type AppTab = 'program' | 'timer' | 'calc' | 'profile' | 'users' | 'logs';
