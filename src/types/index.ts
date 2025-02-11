export interface SectionContent {
  reflection: string;
  emotion: string;
  mindfulness: string;
}

export type ModalState = 'none' | 'journal' | 'insight';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Journal extends BaseEntity {
  content: string;
  date: string;
}

export interface JournalInsight extends BaseEntity {
  journal_id: string;
  date: string;
  emotional_state: string;
  emotion_cause: string;
  management_tips: string;
  thinking_patterns: string;
  cognitive_biases: string;
  action_suggestions: string[];
  mindfulness_tips: string[];
}

export interface Todo extends BaseEntity {
  title: string;
  status: 'pending' | 'completed';
  due_date: string;
  priority: number;
  estimated_time?: number;
} 