import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Save, Loader2, Calendar as CalendarIcon, Sparkles, Brain, Heart, Target, Smile } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { analyzeJournal } from '../lib/ai';
import { toast } from 'react-hot-toast';

interface SectionContent {
  reflection: string;
  emotion: string;
  mindfulness: string;
}

const JOURNAL_PROMPTS = {
  reflection: {
    title: '日常反思',
    placeholder: '今天发生了什么？有什么特别的经历或感受？',
    description: '记录今天的重要时刻，反思经历带给你的启示。关注那些让你感动、困惑或有所领悟的瞬间。'
  },
  emotion: {
    title: '情绪觉察',
    placeholder: '你今天经历了哪些情绪？是什么触发了这些情绪？',
    description: '觉察并记录你的情绪变化。尝试理解情绪背后的原因，以及你是如何应对的。这有助于提升情绪智力。'
  },
  mindfulness: {
    title: '正念冥想',
    placeholder: '此刻你的身心状态如何？有什么特别的感受或想法？',
    description: '通过正念练习，专注当下的感受。关注你的呼吸、身体感觉，以及内心的平静或波动。'
  }
};

function Journal() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedDate] = useState(new Date());
  const isZh = i18n.language === 'zh';
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const [sectionContents, setSectionContents] = useState<SectionContent>({
    reflection: '',
    emotion: '',
    mindfulness: ''
  });

  const { data: journal, isLoading } = useQuery({
    queryKey: ['journal', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (journal?.content) {
      try {
        const parsed = JSON.parse(journal.content) as SectionContent;
        setSectionContents(parsed);
      } catch (e) {
        setSectionContents({
          reflection: journal.content,
          emotion: '',
          mindfulness: ''
        });
      }
    } else {
      setSectionContents({
        reflection: '',
        emotion: '',
        mindfulness: ''
      });
    }
  }, [journal]);

  const saveInsight = async (journalId: string) => {
    if (!aiAnalysis.emotionalState || !user) return;

    const insightData = {
      journal_id: journalId,
      user_id: user.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      emotional_state: aiAnalysis.emotionalState,
      emotion_cause: aiAnalysis.emotionCause,
      management_tips: aiAnalysis.managementTips,
      thinking_patterns: aiAnalysis.thinkingPatterns,
      cognitive_biases: aiAnalysis.cognitiveBiases,
      action_suggestions: aiAnalysis.actionSuggestions,
      mindfulness_tips: aiAnalysis.mindfulnessTips,
    };

    // 先检查是否已存在
    const { data: existingInsight } = await supabase
      .from('journal_insights')
      .select('id')
      .eq('journal_id', journalId)
      .single();

    if (existingInsight) {
      // 更新现有洞察
      const { error } = await supabase
        .from('journal_insights')
        .update(insightData)
        .eq('id', existingInsight.id);
      
      if (error) throw error;
    } else {
      // 创建新洞察
      const { error } = await supabase
        .from('journal_insights')
        .insert([insightData]);
      
      if (error) throw error;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('未登录');

      const journalData = {
        user_id: user.id,
        content: JSON.stringify(sectionContents),
        date: format(selectedDate, 'yyyy-MM-dd'),
      };

      try {
        // 保存日记内容
        let journalResult;
        if (journal) {
          journalResult = await supabase
            .from('journals')
            .update(journalData)
            .eq('id', journal.id)
            .select()
            .single();
        } else {
          journalResult = await supabase
            .from('journals')
            .insert([journalData])
            .select()
            .single();
        }

        if (journalResult.error) throw journalResult.error;

        // 保存洞察
        await saveInsight(journalResult.data.id);

        return journalResult.data;
      } catch (error) {
        console.error('保存错误:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['journals']);
      queryClient.invalidateQueries(['insights']);
      toast.success('保存成功');
    },
  });

  const handleSave = async () => {
    if (!user) {
      setSaveError('请先登录');
      return;
    }

    if (!Object.values(sectionContents).some(content => content.trim())) {
      setSaveError('请至少填写一项内容');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await saveMutation.mutateAsync();
    } catch (error) {
      // 错误已在 mutation 的 onError 中处理
    } finally {
      if (retryCount >= MAX_RETRIES) {
        setIsSaving(false);
        setRetryCount(0);
      }
    }
  };

  const [aiAnalysis, setAiAnalysis] = useState<{
    emotionalState: string;
    emotionCause: string;
    managementTips: string;
    thinkingPatterns: string;
    cognitiveBiases: string;
    actionSuggestions: string[];
    mindfulnessTips: string[];
  }>({
    emotionalState: '',
    emotionCause: '',
    managementTips: '',
    thinkingPatterns: '',
    cognitiveBiases: '',
    actionSuggestions: [],
    mindfulnessTips: []
  });

  const handleAIAnalysis = async () => {
    const allContent = Object.values(sectionContents).join('\n\n');
    if (!allContent.trim()) {
      return;
    }
    
    setIsProcessing(true);
    try {
      const suggestions = await analyzeJournal(allContent);
      
      // 解析 AI 返回的建议，确保与日记内容相关
      const analysis = {
        emotionalState: suggestions[0] || '暂无情绪分析',
        emotionCause: suggestions[1] || '暂无原因分析',
        managementTips: suggestions[2] || '暂无管理建议',
        thinkingPatterns: suggestions[3] || '暂无思维模式分析',
        cognitiveBiases: suggestions[4] || '暂无认知偏差分析',
        actionSuggestions: suggestions.slice(5, 9).filter(Boolean) || ['暂无具体建议'],
        mindfulnessTips: suggestions.slice(9, 11).filter(Boolean) || ['暂无正念提醒']
      };
      
      setAiAnalysis(analysis);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('AI分析失败:', error);
      // 显示错误信息给用户
      setAiSuggestions(['AI 分析失败，请稍后重试']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSectionChange = (section: keyof SectionContent, value: string) => {
    setSectionContents(prev => ({
      ...prev,
      [section]: value
    }));
  };

  // 加载 AI 洞察
  const { data: insight } = useQuery({
    queryKey: ['journal-insight', journal?.id],
    queryFn: async () => {
      if (!user || !journal?.id) return null;

      const { data, error } = await supabase
        .from('journal_insights')
        .select('*')
        .eq('journal_id', journal.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user && !!journal?.id,
  });

  // 在组件加载时设置已存在的 AI 洞察
  useEffect(() => {
    if (insight) {
      setAiAnalysis({
        emotionalState: insight.emotional_state || '',
        emotionCause: insight.emotion_cause || '',
        managementTips: insight.management_tips || '',
        thinkingPatterns: insight.thinking_patterns || '',
        cognitiveBiases: insight.cognitive_biases || '',
        actionSuggestions: insight.action_suggestions || [],
        mindfulnessTips: insight.mindfulness_tips || []
      });
    }
  }, [insight]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：日记输入区域 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{t('common.journal')}</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <CalendarIcon className="w-5 h-5" />
                <span>
                  {format(selectedDate, isZh ? 'PPP' : 'PP', {
                    locale: isZh ? zhCN : undefined,
                  })}
                </span>
              </div>
              <button
                onClick={() => void handleSave()}
                disabled={isSaving || !Object.values(sectionContents).some(v => v.trim())}
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {isSaving ? '保存中...' : t('common.save')}
              </button>
            </div>
          </div>

          {saveError && (
            <div className={`mb-4 p-3 rounded-md ${
              saveError.includes('重试') ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                {saveError.includes('重试') && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <span>{saveError}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(JOURNAL_PROMPTS).map(([key, prompt]) => (
              <div key={key} className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-700">{prompt.title}</h2>
                <p className="text-sm text-gray-500">{prompt.description}</p>
                <textarea
                  value={sectionContents[key as keyof SectionContent]}
                  onChange={(e) => handleSectionChange(key as keyof SectionContent, e.target.value)}
                  placeholder={prompt.placeholder}
                  className="w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：AI 洞察区域 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Brain className="w-6 h-6" />
              AI 洞察
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleAIAnalysis()}
                disabled={isProcessing || !Object.values(sectionContents).some(v => v.trim())}
                className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {isProcessing ? '分析中...' : '分析日记'}
              </button>
              {aiAnalysis.emotionalState && (
                <button
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {isSaving ? '保存中...' : '保存洞察'}
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {isProcessing ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  <p className="text-gray-500">正在分析日记内容...</p>
                </div>
              </div>
            ) : !aiAnalysis.emotionalState ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <p>点击"分析日记"获取 AI 洞察</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 情绪分析部分 */}
                <section className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    情绪分析
                  </h3>
                  <div className="space-y-3 text-purple-700">
                    <div className="flex gap-2">
                      <span className="font-medium min-w-[5rem]">情绪状态</span>
                      <p className="text-purple-600">{aiAnalysis.emotionalState}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-[5rem]">变化原因</span>
                      <p className="text-purple-600">{aiAnalysis.emotionCause}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-[5rem]">管理建议</span>
                      <p className="text-purple-600">{aiAnalysis.managementTips}</p>
                    </div>
                  </div>
                </section>

                {/* 思维模式部分 */}
                <section className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    思维模式
                  </h3>
                  <div className="grid gap-4">
                    <div className="bg-blue-100/50 p-3 rounded">
                      <h4 className="font-medium text-blue-700 mb-1">潜在模式</h4>
                      <p className="text-blue-600">{aiAnalysis.thinkingPatterns}</p>
                    </div>
                    <div className="bg-blue-100/50 p-3 rounded">
                      <h4 className="font-medium text-blue-700 mb-1">认知偏差</h4>
                      <p className="text-blue-600">{aiAnalysis.cognitiveBiases}</p>
                    </div>
                  </div>
                </section>

                {/* 行为建议部分 */}
                <section className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    行为建议
                  </h3>
                  <div className="space-y-2">
                    {aiAnalysis.actionSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-green-600 text-sm">{index + 1}</span>
                        </div>
                        <p className="text-green-600">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 正念提醒部分 */}
                <section className="bg-amber-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <Smile className="w-5 h-5" />
                    正念提醒
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiAnalysis.mindfulnessTips.map((tip, index) => (
                      <div key={index} className="bg-amber-100/50 p-3 rounded">
                        <p className="text-amber-600">{tip}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Journal;