import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format, addDays, startOfMonth, endOfMonth, isSameDay, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Book,
  Edit,
  Plus,
  X,
  Save,
  CheckCircle,
  Circle,
  Brain,
  Heart,
  Target,
  Smile
} from 'lucide-react';
import type { Todo, Journal, SectionContent, JournalInsight } from '../types';
import { useAuthStore } from '../store/auth-store';

function Calendar() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const isZh = i18n.language === 'zh';
  const [modalState, setModalState] = useState<'none' | 'journal' | 'insight'>('none');
  const [journalContent, setJournalContent] = useState<SectionContent>({
    reflection: '',
    emotion: '',
    mindfulness: ''
  });
  const [newTask, setNewTask] = useState('');
  const [selectedInsight, setSelectedInsight] = useState<JournalInsight | null>(null);

  // 获取任务数据
  const { data: todos = [] } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as Todo[];
    },
    enabled: !!user,
  });

  // 获取日记数据
  const { data: journals = [] } = useQuery({
    queryKey: ['journals'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as JournalEntry[];
    },
    enabled: !!user,
  });

  // 获取当月的开始和结束日期
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  
  // 生成30天的日期数组
  const calendarDays = [...Array(30)].map((_, i) => addDays(monthStart, i));

  // 按日期分组任务和日记
  const dayData = calendarDays.reduce((acc, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    acc[dateStr] = {
      tasks: todos.filter(todo => todo.due_date && format(new Date(todo.due_date), 'yyyy-MM-dd') === dateStr),
      journal: journals.find(journal => format(new Date(journal.date), 'yyyy-MM-dd') === dateStr)
    };
    return acc;
  }, {} as Record<string, { tasks: Todo[], journal: JournalEntry | undefined }>);

  // 切换月份
  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
  };

  // 更新任务状态
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'completed' }) => {
      const { error } = await supabase
        .from('todos')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // 添加新任务
  const addTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!user) throw new Error('未登录');
      const { error } = await supabase
        .from('todos')
        .insert([{
          title,
          user_id: user.id,
          status: 'pending',
          due_date: format(selectedDate, 'yyyy-MM-dd'),
          priority: 2
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setNewTask('');
    },
  });

  // 保存日记
  const saveJournalMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('未登录');
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const currentJournal = journals.find(j => format(new Date(j.date), 'yyyy-MM-dd') === dateStr);

      const journalData = {
        user_id: user.id,
        content: JSON.stringify(journalContent),
        date: dateStr,
      };

      if (currentJournal) {
        const { error } = await supabase
          .from('journals')
          .update({ content: journalData.content })
          .eq('id', currentJournal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('journals')
          .insert([journalData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      setModalState('none');
    },
  });

  // 修改获取 AI 洞察的查询
  const { data: insights = [] } = useQuery({
    queryKey: ['calendar-insights', format(selectedDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!user) return [];

      const startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

      const { data: journals } = await supabase
        .from('journals')
        .select('id')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (!journals?.length) return [];

      const { data, error } = await supabase
        .from('journal_insights')
        .select('*')
        .in('journal_id', journals.map(j => j.id));

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // 处理日期点击
  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // 查找该日期的 AI 洞察
    const dayInsight = insights?.find(insight => 
      format(new Date(insight.date), 'yyyy-MM-dd') === dateStr
    );

    if (dayInsight) {
      setSelectedInsight(dayInsight);
      setModalState('insight');
    }

    const journal = journals.find(j => format(new Date(j.date), 'yyyy-MM-dd') === dateStr);
    
    if (journal) {
      try {
        setJournalContent(JSON.parse(journal.content));
      } catch {
        setJournalContent({
          reflection: journal.content,
          emotion: '',
          mindfulness: ''
        });
      }
    } else {
      setJournalContent({
        reflection: '',
        emotion: '',
        mindfulness: ''
      });
    }
    setModalState('journal');
  };

  // 修改双击处理函数
  const handleDateDoubleClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const journal = journals.find(j => 
      format(new Date(j.date), 'yyyy-MM-dd') === dateStr
    );
    
    if (journal) {
      const insight = insights.find(i => i.journal_id === journal.id);
      if (insight) {
        setSelectedInsight(insight);
        setModalState('insight');
      }
    }
  };

  return (
    <div className="container mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              <span className="text-xl font-semibold text-gray-800">
                {format(selectedDate, isZh ? 'yyyy年MM月' : 'MMMM yyyy', { locale: isZh ? zhCN : undefined })}
              </span>
            </div>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 日历网格 */}
        <div className="grid grid-cols-7 gap-4">
          {/* 星期标题 */}
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div key={day} className="text-center font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          
          {/* 日期格子 */}
          {calendarDays.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const data = dayData[dateStr] || { tasks: [], journal: undefined };
            const isCurrentDay = isToday(date);
            const isSelected = isSameDay(date, selectedDate);

            return (
              <div
                key={date.toISOString()}
                onClick={() => handleDateClick(date)}
                onDoubleClick={() => handleDateDoubleClick(date)}
                className={`min-h-[100px] p-2 rounded-lg border relative ${
                  isCurrentDay ? 'border-blue-500' : 'border-gray-200'
                } ${
                  isSelected ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`inline-block rounded-full w-7 h-7 leading-7 text-center ${
                    isCurrentDay ? 'bg-blue-500 text-white' :
                    isSelected ? 'bg-purple-500 text-white' :
                    'text-gray-600'
                  }`}>
                    {format(date, 'd')}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* AI 洞察指示器 */}
                    {insights.some(insight => {
                      const journal = journals.find(j => j.id === insight.journal_id);
                      return journal && format(new Date(journal.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                    }) && (
                      <Brain className="w-4 h-4 text-purple-500" />
                    )}
                    {/* 日记指示器 */}
                    {data.journal && (
                      <Book className="w-4 h-4 text-purple-500" />
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  {data.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`text-xs p-1 rounded ${
                        task.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-white shadow-sm border-l-2 border-blue-500'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTaskMutation.mutate({
                              id: task.id,
                              status: task.status === 'completed' ? 'pending' : 'completed'
                            });
                          }}
                          className="flex-shrink-0"
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <Circle className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                        <span className={task.status === 'completed' ? 'line-through' : ''}>
                          {task.title}
                        </span>
                      </div>
                      {task.estimated_time && (
                        <div className="flex items-center text-gray-500 mt-0.5">
                          <Clock className="w-3 h-3 mr-1" />
                          {task.estimated_time}分钟
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 日记编辑器 */}
      {modalState === 'journal' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {format(selectedDate, isZh ? 'yyyy年MM月dd日' : 'MMMM d, yyyy', { locale: isZh ? zhCN : undefined })}
              </h2>
              <button
                onClick={() => setModalState('none')}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* 日记部分 */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">日记内容</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      日常反思
                    </label>
                    <textarea
                      value={journalContent.reflection}
                      onChange={(e) => setJournalContent(prev => ({
                        ...prev,
                        reflection: e.target.value
                      }))}
                      className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500"
                      placeholder="今天发生了什么？有什么感想？"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      情绪觉察
                    </label>
                    <textarea
                      value={journalContent.emotion}
                      onChange={(e) => setJournalContent(prev => ({
                        ...prev,
                        emotion: e.target.value
                      }))}
                      className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500"
                      placeholder="今天的心情如何？有什么特别的情绪体验？"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      正念冥想
                    </label>
                    <textarea
                      value={journalContent.mindfulness}
                      onChange={(e) => setJournalContent(prev => ({
                        ...prev,
                        mindfulness: e.target.value
                      }))}
                      className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500"
                      placeholder="当下的感受是什么？注意到了哪些细节？"
                    />
                  </div>
                </div>
              </div>

              {/* 任务部分 */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">任务管理</h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTask.trim()) {
                        void addTaskMutation.mutateAsync(newTask.trim());
                      }
                    }}
                    placeholder="添加新任务..."
                    className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (newTask.trim()) {
                        void addTaskMutation.mutateAsync(newTask.trim());
                      }
                    }}
                    className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {dayData[format(selectedDate, 'yyyy-MM-dd')]?.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                    >
                      <button
                        onClick={() => updateTaskMutation.mutate({
                          id: task.id,
                          status: task.status === 'completed' ? 'pending' : 'completed'
                        })}
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <span className={task.status === 'completed' ? 'line-through text-gray-500' : ''}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setModalState('none')}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => void saveJournalMutation.mutateAsync()}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 洞察弹窗 */}
      {modalState === 'insight' && selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Brain className="w-6 h-6" />
                {format(new Date(selectedInsight.date), isZh ? 'PPP' : 'PP', {
                  locale: isZh ? zhCN : undefined,
                })} 的 AI 洞察
              </h2>
              <button
                onClick={() => setModalState('none')}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <InsightView insight={selectedInsight} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;