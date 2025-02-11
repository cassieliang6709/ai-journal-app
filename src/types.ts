export type Priority = 1 | 2 | 3; // 1: High, 2: Medium, 3: Low
export type Status = 'pending' | 'in_progress' | 'completed';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface AITaskSuggestion {
  type: 'optimization' | 'scheduling' | 'breakdown';
  content: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: Priority;
  status: Status;
  user_id: string;
  estimated_time?: number;
  start_time?: string | null;
  end_time?: string | null;
  ai_suggestions?: AITaskSuggestion[];
  subtasks?: Subtask[];
}

export interface TaskInput {
  title: string;
  description?: string;
  due_date?: string | null;
  priority: Priority;
  estimated_time?: number;
  ai_suggestions?: AITaskSuggestion[];
  subtasks?: Subtask[];
}

export interface UserPreferences {
  wake_time: string;
  sleep_time: string;
  focus_duration: number;
  break_duration: number;
  daily_focus_goal: number;
}