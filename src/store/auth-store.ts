import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

const createProfileIfNotExists = async (user: User) => {
  try {
    // 首先检查profile是否已存在
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 是"没有找到结果"的错误
      throw checkError;
    }

    // 如果profile不存在，则创建
    if (!existingProfile) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{ id: user.id, email: user.email }]);

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error managing profile:', error);
    // 不抛出错误，因为这不应该影响用户的登录状态
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (user) {
        await createProfileIfNotExists(user);
        set({ user });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '登录失败' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  signUp: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      if (user) {
        await createProfileIfNotExists(user);
        set({ user });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '注册失败' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  signInWithGoogle: async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google 登录失败:', error);
      throw error;
    }
  },
  signOut: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '退出失败' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  setUser: (user) => set({ user, loading: false }),
  clearError: () => set({ error: null }),
}));