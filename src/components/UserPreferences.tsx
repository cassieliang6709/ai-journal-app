import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { Clock, Moon, Sun, Brain, Save, X } from 'lucide-react';

interface UserPreferences {
  wake_time: string;
  sleep_time: string;
  focus_duration: number;
  break_duration: number;
  daily_focus_goal: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  wake_time: '07:00',
  sleep_time: '23:00',
  focus_duration: 25,
  break_duration: 5,
  daily_focus_goal: 240
};

function UserPreferences({ isOpen, onClose }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: existingPreferences, isError } = useQuery({
    queryKey: ['userPreferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
    retry: false
  });

  useEffect(() => {
    if (existingPreferences) {
      setPreferences(existingPreferences);
    } else {
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, [existingPreferences]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('未登录');

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_preferences')
          .update({ ...preferences })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert([{ ...preferences, user_id: user.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences', user?.id] });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">个人偏好设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Sun className="w-4 h-4 mr-2" />
                起床时间
              </label>
              <input
                type="time"
                value={preferences.wake_time}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  wake_time: e.target.value
                }))}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Moon className="w-4 h-4 mr-2" />
                睡觉时间
              </label>
              <input
                type="time"
                value={preferences.sleep_time}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  sleep_time: e.target.value
                }))}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 mr-2" />
                专注时长（分钟）
              </label>
              <input
                type="number"
                value={preferences.focus_duration}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  focus_duration: Math.max(1, Math.min(120, parseInt(e.target.value) || 1))
                }))}
                min="1"
                max="120"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 mr-2" />
                休息时长（分钟）
              </label>
              <input
                type="number"
                value={preferences.break_duration}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  break_duration: Math.max(1, Math.min(30, parseInt(e.target.value) || 1))
                }))}
                min="1"
                max="30"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Brain className="w-4 h-4 mr-2" />
                每日专注目标（分钟）
              </label>
              <input
                type="number"
                value={preferences.daily_focus_goal}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  daily_focus_goal: Math.max(1, Math.min(720, parseInt(e.target.value) || 1))
                }))}
                min="1"
                max="720"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isLoading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saveSuccess ? '保存成功！' : '保存设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserPreferences;