import { useAuthStore } from '../store/auth-store';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { JournalInsight } from '../types';

export function useInsights(date?: Date) {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ['insights', date],
    queryFn: async () => {
      if (!user) return [];
      try {
        // 先获取日记
        const { data: journals } = await supabase
          .from('journals')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', date ? format(date, 'yyyy-MM-dd') : undefined);

        if (!journals?.length) return [];

        // 获取这些日记对应的洞察
        const { data, error } = await supabase
          .from('journal_insights')
          .select('*')
          .in('journal_id', journals.map(j => j.id));
        
        if (error) {
          if (error.code === 'PGRST116') {
            return [];
          }
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Failed to fetch insights:', error);
        return [];
      }
    },
    enabled: !!user,
    retry: false,
  });
} 