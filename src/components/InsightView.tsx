import React from 'react';
import { Brain, Heart, Target, Smile } from 'lucide-react';

interface InsightViewProps {
  insight: {
    emotional_state: string;
    emotion_cause: string;
    management_tips: string;
    thinking_patterns: string;
    cognitive_biases: string;
    action_suggestions: string[];
    mindfulness_tips: string[];
  };
}

function InsightView({ insight }: InsightViewProps) {
  return (
    <div className="space-y-6">
      {/* 情绪分析 */}
      <section className="bg-purple-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
          <Heart className="w-5 h-5" />
          情绪分析
        </h3>
        <div className="space-y-3 text-purple-700">
          <div className="flex gap-2">
            <span className="font-medium min-w-[5rem]">情绪状态</span>
            <p className="text-purple-600">{insight.emotional_state}</p>
          </div>
          <div className="flex gap-2">
            <span className="font-medium min-w-[5rem]">变化原因</span>
            <p className="text-purple-600">{insight.emotion_cause}</p>
          </div>
          <div className="flex gap-2">
            <span className="font-medium min-w-[5rem]">管理建议</span>
            <p className="text-purple-600">{insight.management_tips}</p>
          </div>
        </div>
      </section>

      {/* 思维模式 */}
      <section className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          思维模式
        </h3>
        <div className="grid gap-4">
          <div className="bg-blue-100/50 p-3 rounded">
            <h4 className="font-medium text-blue-700 mb-1">潜在模式</h4>
            <p className="text-blue-600">{insight.thinking_patterns}</p>
          </div>
          <div className="bg-blue-100/50 p-3 rounded">
            <h4 className="font-medium text-blue-700 mb-1">认知偏差</h4>
            <p className="text-blue-600">{insight.cognitive_biases}</p>
          </div>
        </div>
      </section>

      {/* 行为建议 */}
      <section className="bg-green-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
          <Target className="w-5 h-5" />
          行为建议
        </h3>
        <div className="space-y-2">
          {insight.action_suggestions?.map((suggestion, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-green-600 text-sm">{index + 1}</span>
              </div>
              <p className="text-green-600">{suggestion}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 正念提醒 */}
      <section className="bg-amber-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
          <Smile className="w-5 h-5" />
          正念提醒
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insight.mindfulness_tips?.map((tip, index) => (
            <div key={index} className="bg-amber-100/50 p-3 rounded">
              <p className="text-amber-600">{tip}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default InsightView; 