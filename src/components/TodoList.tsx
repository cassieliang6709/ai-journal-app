import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Trash2, CheckCircle, Circle, AlertCircle, Clock, 
  Sparkles, Play, Calendar, Brain, Wand2, Rocket, X, Volume2, VolumeX, Pause, ArrowPath, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store';
import { processTasksWithAI, optimizeTaskSchedule, splitTasks, planTasks, generateQuickStartSuggestion } from '../lib/ai';
import type { Todo, TaskInput, Status } from '../types';
import FocusMode from './FocusMode';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TaskEditorProps {
  task: Todo;
  onClose: () => void;
  onSave: (updates: Partial<Todo>) => Promise<void>;
}

function TaskEditor({ task, onClose, onSave }: TaskEditorProps) {
  const [title, setTitle] = useState(task.title);
  const [estimatedTime, setEstimatedTime] = useState(task.estimated_time?.toString() || '30');
  const [dueDate, setDueDate] = useState(task.due_date || format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(task.start_time ? format(new Date(task.start_time), 'HH:mm') : '');
  const [endTime, setEndTime] = useState(task.end_time ? format(new Date(task.end_time), 'HH:mm') : '');

  const handleSave = async () => {
    const updates: Partial<Todo> = {
      title,
      estimated_time: parseInt(estimatedTime),
      due_date: dueDate,
    };

    if (startTime) {
      updates.start_time = `${dueDate}T${startTime}:00`;
    }
    if (endTime) {
      updates.end_time = `${dueDate}T${endTime}:00`;
    }

    await onSave(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预计时间（分钟）</label>
            <input
              type="number"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">计划日期</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={() => void handleSave()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TodoList() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [editingTask, setEditingTask] = useState<Todo | null>(null);
  const [batchInput, setBatchInput] = useState('');
  const [processingTasks, setProcessingTasks] = useState(false);
  const [optimizingSchedule, setOptimizingSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [showPlanningResult, setShowPlanningResult] = useState(false);
  const [planningSuggestion, setPlanningSuggestion] = useState('');
  const [quickStartSuggestion, setQuickStartSuggestion] = useState<string>('');
  const [completionSuggestion, setCompletionSuggestion] = useState<string>('');
  const [showQuickStartHistory, setShowQuickStartHistory] = useState(false);
  const [showCompletionHistory, setShowCompletionHistory] = useState(false);
  const [quickStartHistory, setQuickStartHistory] = useState<string[]>([]);
  const [completionHistory, setCompletionHistory] = useState<string[]>([]);
  const [isAISectionCollapsed, setIsAISectionCollapsed] = useState(false);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true })
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as Todo[];
    },
    enabled: !!user,
  });

  const { data: userPreferences = {
    wake_time: '08:00',
    sleep_time: '22:00',
    focus_duration: 25,
    break_duration: 5,
    daily_focus_goal: 240
  }} = useQuery({
    queryKey: ['userPreferences', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('未登录');
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('获取用户偏好设置失败:', error);
        throw error;
      }
      
      return data || {
        wake_time: '08:00',
        sleep_time: '22:00',
        focus_duration: 25,
        break_duration: 5,
        daily_focus_goal: 240
      };
    },
    enabled: !!user
  });

  const addTaskMutation = useMutation({
    mutationFn: async (task: TaskInput) => {
      if (!user) throw new Error('未登录');
      console.log('添加任务:', task);
      const { data, error } = await supabase
        .from('todos')
        .insert([{
          ...task,
          user_id: user.id,
          status: 'in_progress' as Status,
          start_time: new Date().toISOString(),
        }])
        .select();
      
      if (error) {
        console.error('数据库错误:', error);
        throw error;
      }
      console.log('添加成功:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Todo> & { id: string }) => {
      const { error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const taskTitle = batchInput.trim();
      if (!taskTitle) return;

      try {
        await addTaskMutation.mutateAsync({
          title: taskTitle,
          priority: 2,
          estimated_time: 30,
        });

        setBatchInput('');
        setError(null);
      } catch (error) {
        console.error('添加任务失败:', error);
        setError('添加任务失败，请重试');
      }
    }
  };

  const handleAISplit = async () => {
    if (!batchInput.trim()) return;
    
    setProcessingTasks(true);
    setError(null);
    
    try {
      console.log('开始 AI 拆分...');
      const tasks = await splitTasks(batchInput);
      console.log('拆分结果:', tasks);
      
      if (tasks && tasks.length > 0) {
        // 直接添加到数据库
        await Promise.all(
          tasks.map(task => 
            addTaskMutation.mutateAsync({
              title: task.title,
              description: task.description,
              priority: task.priority,
              estimated_time: task.estimated_time,
              subtasks: task.subtasks
            })
          )
        );
        
        setBatchInput('');
        setError(null);
        console.log('任务添加成功');
      } else {
        throw new Error('未能正确拆分任务');
      }
    } catch (error) {
      console.error('AI 拆分失败:', error);
      setError(error instanceof Error ? error.message : '处理失败，请重试');
    } finally {
      setProcessingTasks(false);
    }
  };

  const handleAIPlanning = async () => {
    const inProgressTasks = todos.filter(t => t.status === 'in_progress');
    if (!inProgressTasks.length) {
      setError('没有进行中的任务需要规划');
      return;
    }

    setProcessingTasks(true);
    setError(null);

    try {
      console.log('开始规划任务:', inProgressTasks);
      const { tasks: plannedTasks, suggestion } = await planTasks(
        inProgressTasks,
        userPreferences
      );
      console.log('规划结果:', { plannedTasks, suggestion });

      // 更新任务时间安排
      await Promise.all(
        plannedTasks.map(task => {
          console.log('更新任务:', task);
          return updateTaskMutation.mutateAsync({
            id: task.id,
            start_time: task.start_time,
            end_time: task.end_time,
            estimated_time: task.estimated_time
          });
        })
      );

      setPlanningSuggestion(suggestion);
      setShowPlanningResult(true);
      console.log('任务规划更新成功');
    } catch (error) {
      console.error('AI 规划失败:', error);
      setError(error instanceof Error ? error.message : '规划失败');
    } finally {
      setProcessingTasks(false);
    }
  };

  const handleStatusChange = async (task: Todo, newStatus: Status) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        status: newStatus,
        start_time: newStatus === 'in_progress' ? new Date().toISOString() : task.start_time,
        end_time: newStatus === 'completed' ? new Date().toISOString() : task.end_time,
      });
    } catch (error) {
      console.error('更新任务状态失败:', error);
    }
  };

  const handleGetSuggestion = async (task: Todo) => {
    try {
      const suggestions = await generateQuickStartSuggestion(task);
      setQuickStartSuggestion(suggestions.quickStart);
      setCompletionSuggestion(suggestions.completion);
      // 添加到历史记录
      setQuickStartHistory(prev => [suggestions.quickStart, ...prev.slice(0, 4)]);
      setCompletionHistory(prev => [suggestions.completion, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error('获取建议失败:', error);
      setError(error instanceof Error ? error.message : '获取建议失败');
    }
  };

  const renderTaskList = (status: Status) => {
    const filteredTasks = todos.filter(task => task.status === status);
    
    return (
      <div className="space-y-2">
        {filteredTasks.map(task => (
          <div
            key={task.id}
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onDoubleClick={() => setEditingTask(task)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(task, status === 'completed' ? 'pending' : 'completed');
                  }}
                  className="flex-shrink-0 text-gray-500 hover:text-blue-500"
                >
                  {status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium truncate ${status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {task.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                    {task.due_date && (
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(new Date(task.due_date), isZh ? 'MM月dd日' : 'MMM dd', {
                          locale: isZh ? zhCN : undefined
                        })}
                      </span>
                    )}
                    {task.estimated_time && (
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {task.estimated_time}分钟
                      </span>
                    )}
                    {task.start_time && (
                      <span className="flex items-center text-blue-500">
                        <Play className="w-4 h-4 mr-1" />
                        {format(new Date(task.start_time), 'HH:mm')}
                      </span>
                    )}
                    {task.end_time && (
                      <span className="flex items-center text-green-500">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {format(new Date(task.end_time), 'HH:mm')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                {status !== 'completed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTask(task);
                      setShowFocusMode(true);
                    }}
                    className="p-2 text-gray-500 hover:text-blue-500 rounded-full hover:bg-gray-100"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTaskMutation.mutate(task.id);
                  }}
                  className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              onKeyDown={handleQuickAdd}
              className="w-full h-20 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="输入任务并按回车添加，或粘贴多个任务后点击 AI 拆分"
            />
            {error && (
              <div className="mt-2 text-red-600 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span>{error}</span>
              </div>
            )}
          </div>
          <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2">
            <button
              onClick={() => void handleAISplit()}
              disabled={processingTasks || !batchInput.trim()}
              className="flex-1 md:w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {processingTasks ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>拆分中...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>AI 拆分</span>
                </>
              )}
            </button>
            <button
              onClick={() => void handleAIPlanning()}
              disabled={processingTasks}
              className="flex-1 md:w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {processingTasks ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>规划中...</span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5" />
                  <span>AI 时间规划</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI 时间规划建议 */}
      {aiSuggestions && (
        <div className="bg-gradient-to-r from-purple-500/10 via-purple-600/10 to-purple-500/10 rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-800">AI 时间规划建议</h3>
          </div>
          <div className="prose max-w-none">
            <div className="whitespace-pre-line text-purple-700 text-sm md:text-base">
              {aiSuggestions}
            </div>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-blue-700 flex items-center">
              <Rocket className="w-5 h-5 mr-2" />
              专注进行
            </h2>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {renderTaskList('in_progress')}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-green-700 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              任务完成
            </h2>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {renderTaskList('completed')}
            </div>
          </div>
        </div>
      </div>

      {editingTask && (
        <TaskEditor
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={async (updates) => {
            await updateTaskMutation.mutateAsync({
              id: editingTask.id,
              ...updates
            });
          }}
        />
      )}

      {showFocusMode && selectedTask && (
        <FocusMode
          duration={selectedTask.estimated_time || 25}
          task={selectedTask}
          onClose={() => {
            setShowFocusMode(false);
            setSelectedTask(null);
          }}
          onComplete={async () => {
            if (selectedTask) {
              await updateTaskMutation.mutateAsync({
                id: selectedTask.id,
                status: 'completed',
                end_time: new Date().toISOString(),
              });
            }
            setShowFocusMode(false);
            setSelectedTask(null);
          }}
        />
      )}

      {/* AI 规划建议区域 */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Brain className="w-6 h-6 text-purple-600" />
            AI 时间规划建议
          </h2>
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-700 mb-2">执行建议</h3>
              <div className="text-purple-600 whitespace-pre-line">
                {planningSuggestion}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TodoList;