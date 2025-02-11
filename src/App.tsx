import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth-store';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import TodoList from './components/TodoList';
import Journal from './components/Journal';
import Calendar from './components/Calendar';
import Auth from './components/Auth';
import { useTranslation } from 'react-i18next';
import type { User } from '@supabase/supabase-js';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { initDatabase } from './lib/initDatabase';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const { user, setUser, loading } = useAuthStore();
  const { t } = useTranslation();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check active sessions and sets the user
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setUser(session?.user ?? null);

        // Listen for changes on auth state (sign in, sign out, etc.)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      }
    };

    initializeAuth();
  }, [setUser]);

  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            {!user ? (
              <Route path="*" element={<Auth />} />
            ) : (
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/calendar" replace />} />
                <Route path="/tasks" element={<TodoList />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/calendar" element={<Calendar />} />
              </Route>
            )}
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;