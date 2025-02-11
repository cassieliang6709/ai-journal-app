import { useAuthStore } from '../store/auth-store';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useJournals() {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ['journals'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
} 