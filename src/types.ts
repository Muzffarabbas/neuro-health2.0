export interface User {
  id: number;
  email: string;
  name: string;
  neural_points: number;
  streak: number;
  last_log_date: string;
}

export interface Log {
  id: number;
  user_id: number;
  type: 'mood' | 'sleep' | 'activity' | 'eating' | 'brain_waves' | 'routine';
  value: string; // JSON string
  logged_at: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface BrainWaveData {
  alpha: number;
  beta: number;
  theta: number;
  gamma: number;
}

export interface SleepData {
  hours: number;
  quality: number; // 1-10
}

export interface MoodData {
  score: number; // 1-10
  emotion: string;
}
