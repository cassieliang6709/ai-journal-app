import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});

// 添加响应拦截器
supabase.handleError = (error: any) => {
  console.error('Supabase error:', error);
  
  // 处理表不存在的错误
  if (error.code === '42P01') {
    console.warn('Table does not exist:', error.message);
    return;
  }

  // 处理 404 错误
  if (error.code === 'PGRST404') {
    console.warn('Resource not found:', error.message);
    return;
  }

  // 处理认证错误
  if (error.code === 'PGRST401') {
    toast.error('登录已过期，请重新登录');
    supabase.auth.signOut();
    return;
  }

  // 处理网络错误
  if (error.message?.includes('network')) {
    toast.error('网络连接失败，请检查网络');
    return;
  }

  // 处理其他错误
  if (!error.code?.startsWith('42')) { // 忽略数据库结构相关错误
    toast.error(error.message || '操作失败，请重试');
  }
};

// 添加全局错误处理
const originalFrom = supabase.from.bind(supabase);
supabase.from = (table: string) => {
  const builder = originalFrom(table);
  const originalSelect = builder.select.bind(builder);
  
  builder.select = (...args: any[]) => {
    const query = originalSelect(...args);
    const originalThen = query.then.bind(query);
    
    query.then = (onfulfilled: any, onrejected: any) => {
      return originalThen((result: any) => {
        if (result.error) {
          supabase.handleError(result.error);
        }
        return onfulfilled?.(result);
      }, onrejected);
    };
    
    return query;
  };
  
  return builder;
};

export default supabase;