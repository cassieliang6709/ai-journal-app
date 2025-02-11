export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      journals: {
        Row: {
          id: string
          user_id: string
          content: string
          date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          date?: string
          created_at?: string
          updated_at?: string
        }
      }
      journal_insights: {
        Row: {
          id: string
          journal_id: string
          user_id: string
          date: string
          emotional_state: string | null
          emotion_cause: string | null
          management_tips: string | null
          thinking_patterns: string | null
          cognitive_biases: string | null
          action_suggestions: string[] | null
          mindfulness_tips: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          journal_id: string
          user_id: string
          date: string
          emotional_state?: string | null
          emotion_cause?: string | null
          management_tips?: string | null
          thinking_patterns?: string | null
          cognitive_biases?: string | null
          action_suggestions?: string[] | null
          mindfulness_tips?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          journal_id?: string
          user_id?: string
          date?: string
          emotional_state?: string | null
          emotion_cause?: string | null
          management_tips?: string | null
          thinking_patterns?: string | null
          cognitive_biases?: string | null
          action_suggestions?: string[] | null
          mindfulness_tips?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}