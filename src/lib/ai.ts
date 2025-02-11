import { TaskInput, AITaskSuggestion, Todo, UserPreferences } from '../types';
import { format } from 'date-fns';

// API 配置 - 直接使用固定值
const API_URL = 'https://api.siliconflow.cn/v1';
const API_KEY = 'sk-iorvmzkqtjrmvpailttfxcbkjarlndkysjogkqiozozwhqim';

// 请求限制器
const requestLimiter = {
  lastRequestTime: 0,
  minInterval: 1000, // 最小请求间隔（毫秒）

  async waitForNext() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }
};

// API 请求函数
async function makeAPIRequest(messages: any[]): Promise<string> {
  await requestLimiter.waitForNext();
  const timeout = 60000; // 60 秒超时
  const maxRetries = 5;  // 5 次重试
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      console.log(`尝试请求 API (第 ${attempt + 1}/${maxRetries} 次)`);
      const response = await fetch(`${API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B',
          messages,
          temperature: 0.3, // 降低温度使输出更稳定
          max_tokens: 2048, // 增加 token 限制
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 0,
          top_p: 0.95
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API 请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      // 尝试清理和解析 JSON
      const cleanedContent = content
        ?.replace(/```json\s*/, '') // 移除可能的 JSON 代码块标记
        ?.replace(/```\s*$/, '')    // 移除结尾的代码块标记
        ?.trim();                   // 移除多余空白

      if (!cleanedContent) {
        throw new Error('无效的响应格式');
      }

      return cleanedContent;
    } catch (error) {
      console.error(`第 ${attempt + 1} 次请求失败:`, error);
      lastError = error instanceof Error ? error : new Error('未知错误');
      
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error('请求失败');
}

// AI 拆分任务
export async function splitTasks(content: string): Promise<TaskInput[]> {
  if (!content.trim()) {
    throw new Error('请输入任务内容');
  }

  try {
    console.log('开始拆分任务:', content);
    const response = await makeAPIRequest([
      {
        role: 'system',
        content: `你是一个任务分析专家。请将用户输入的任务列表拆分为结构化的格式。要求：
        1. 每个任务都应该具体且可执行
        2. 设置合理的优先级（1最高-3最低）
        3. 估算所需时间（分钟）
        4. 必要时添加子任务
        
        返回格式示例：
        [
          {
            "title": "任务标题",
            "description": "简短描述",
            "priority": 1,
            "estimated_time": 30,
            "subtasks": [
              {
                "id": "1",
                "title": "子任务1",
                "completed": false
              }
            ]
          }
        ]`
      },
      {
        role: 'user',
        content: `任务列表：\n${content}`
      }
    ]);
    
    console.log('AI 响应:', response);
    const parsed = JSON.parse(response);
    // 确保返回的是数组
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('AI 拆分错误:', error);
    throw new Error(`AI 拆分失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// AI 时间规划
export async function planTasks(
  tasks: Todo[], 
  preferences: UserPreferences
): Promise<{
  tasks: Todo[],
  suggestion: string,
  planningLogic: string
}> {
  try {
    const now = new Date();
    const response = await makeAPIRequest([
      {
        role: 'system',
        content: `你是一个时间管理AI助手。请分析任务并返回JSON格式的时间规划建议。
返回格式必须是有效的JSON，不要包含任何控制字符：
{
  "tasks": [
    {
      "id": "任务ID",
      "start_time": "ISO时间格式",
      "end_time": "ISO时间格式",
      "estimated_time": "预计用时(分钟)",
      "priority": "优先级(1-3)"
    }
  ],
  "suggestion": "整体执行建议",
  "planningLogic": "时间安排逻辑说明"
}`
      },
      {
        role: 'user',
        content: `请为以下任务安排时间：
任务列表：${JSON.stringify(tasks, null, 2)}

限制条件：
1. 从${format(now, 'HH:mm')}开始安排
2. 睡觉时间：${preferences.sleep_time}前完成
3. 任务间隔：${preferences.break_duration}分钟休息
4. 按优先级和预计用时合理安排`
      }
    ]);

    // 清理可能的控制字符
    const cleanResponse = response.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    try {
      const parsed = JSON.parse(cleanResponse);
      
      if (!parsed.tasks?.length || !parsed.suggestion || !parsed.planningLogic) {
        throw new Error('返回的数据结构不完整');
      }

      // 验证每个任务的时间格式
      const validTasks = parsed.tasks.map(task => {
        if (!task.id) {
          throw new Error('任务缺少ID');
        }

        try {
          const startTime = task.start_time ? new Date(task.start_time) : new Date();
          const endTime = task.end_time ? new Date(task.end_time) : new Date(startTime.getTime() + (task.estimated_time || 30) * 60000);
          
          if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            throw new Error('无效的时间格式');
          }

          return {
            ...task,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            estimated_time: task.estimated_time || 30,
            priority: Number(task.priority) || 2
          };
        } catch (error) {
          console.error('时间格式错误:', task, error);
          throw new Error('时间格式无效');
        }
      });

      return {
        tasks: validTasks,
        suggestion: parsed.suggestion,
        planningLogic: parsed.planningLogic
      };
    } catch (error) {
      console.error('JSON 解析错误:', error);
      throw new Error(`AI 规划失败: ${error.message}`);
    }
  } catch (error) {
    console.error('AI 规划错误:', error);
    throw error;
  }
}

// 快速启动建议
export async function generateQuickStartSuggestion(task: Todo): Promise<{
  quickStart: string;
  completion: string;
}> {
  try {
    const response = await makeAPIRequest([
      {
        role: 'system',
        content: `你是一位专业的任务教练。请提供两种建议：
1. 快速启动：用一句话说明如何在1分钟内开始这个任务（不超过30字）
2. 完成建议：3-4点简短的任务完成策略

建议要求：
- 快速启动要具体、立即可执行
- 完成建议要简洁、可操作
- 使用鼓励性的语言
- 避免空泛的建议`
      },
      {
        role: 'user',
        content: `任务：${task.title}
预计用时：${task.estimated_time || '未设置'}分钟
优先级：${task.priority}

请提供：
1. 一句话的快速启动建议
2. 3-4点完成策略

返回格式：
{
  "quickStart": "准备好笔记本，立即写下第一个想法",
  "completion": "• 记录关键思路\\n• 分段完成\\n• 及时总结"
}`
      }
    ]);

    const parsed = JSON.parse(response);
    return {
      quickStart: parsed.quickStart || '准备好工具，立即开始行动',
      completion: parsed.completion || '• 专注当前步骤\n• 及时记录进度\n• 确保完成质量'
    };
  } catch (error) {
    console.error('生成建议失败:', error);
    throw new Error('生成建议失败，请重试');
  }
}

// 日记分析
export async function analyzeJournal(content: string): Promise<string[]> {
  if (!content.trim()) {
    throw new Error('日记内容不能为空');
  }

  try {
    const response = await makeAPIRequest([
      {
        role: 'system',
        content: `作为一位专业的心理分析师，请分析用户的日记内容，并严格按照以下格式返回分析结果：

情绪状态：[描述当前的情绪状态]
情绪原因：[分析导致这些情绪的原因]
管理建议：[如何管理和改善这些情绪]
思维模式：[分析体现出的思维方式]
认知偏差：[指出可能存在的认知偏差]
行为建议：
• [具体建议1]
• [具体建议2]
• [具体建议3]
• [具体建议4]
正念提醒：
• [放松提示1]
• [放松提示2]

注意：
1. 必须严格按照上述格式返回，包括"•"符号
2. 行为建议必须提供4条
3. 正念提醒必须提供2条
4. 所有建议要具体可执行
5. 分析要与日记内容紧密相关`
      },
      {
        role: 'user',
        content: `请分析以下日记内容：\n\n${content}`
      }
    ]);

    // 解析返回的内容，按固定格式拆分
    const lines = response.split('\n').filter(line => line.trim());
    const result = {
      emotionalState: '',
      emotionCause: '',
      managementTips: '',
      thinkingPatterns: '',
      cognitiveBiases: '',
      actionSuggestions: [] as string[],
      mindfulnessTips: [] as string[]
    };

    let currentSection = '';
    for (const line of lines) {
      if (line.startsWith('情绪状态：')) {
        result.emotionalState = line.replace('情绪状态：', '').trim();
      } else if (line.startsWith('情绪原因：')) {
        result.emotionCause = line.replace('情绪原因：', '').trim();
      } else if (line.startsWith('管理建议：')) {
        result.managementTips = line.replace('管理建议：', '').trim();
      } else if (line.startsWith('思维模式：')) {
        result.thinkingPatterns = line.replace('思维模式：', '').trim();
      } else if (line.startsWith('认知偏差：')) {
        result.cognitiveBiases = line.replace('认知偏差：', '').trim();
      } else if (line.startsWith('行为建议：')) {
        currentSection = 'action';
      } else if (line.startsWith('正念提醒：')) {
        currentSection = 'mindfulness';
      } else if (line.startsWith('• ')) {
        const content = line.replace('• ', '').trim();
        if (currentSection === 'action' && result.actionSuggestions.length < 4) {
          result.actionSuggestions.push(content);
        } else if (currentSection === 'mindfulness' && result.mindfulnessTips.length < 2) {
          result.mindfulnessTips.push(content);
        }
      }
    }

    // 确保有默认值
    if (result.actionSuggestions.length === 0) {
      result.actionSuggestions = [
        '制定每日任务清单，合理分配时间',
        '建立规律的作息时间表',
        '适当休息和运动',
        '与朋友或家人交流分享'
      ];
    }

    if (result.mindfulnessTips.length === 0) {
      result.mindfulnessTips = [
        '每天进行10分钟的深呼吸练习',
        '保持正念，专注当下的感受'
      ];
    }

    return [
      result.emotionalState,
      result.emotionCause,
      result.managementTips,
      result.thinkingPatterns,
      result.cognitiveBiases,
      ...result.actionSuggestions,
      ...result.mindfulnessTips
    ];
  } catch (error) {
    console.error('AI分析失败:', error);
    throw new Error('AI分析失败，请稍后重试');
  }
}

// AI拆分：智能识别和拆分用户输入的多个任务
export async function processTasksWithAI(tasks: TaskInput[]): Promise<TaskInput[]> {
  if (!tasks.length) return tasks;

  try {
    const prompt = `作为任务分析专家，请分析并拆分以下任务列表。
对于每个任务：
1. 如果任务描述过于宽泛，将其拆分为更具体、可执行的子任务
2. 为每个任务估算合理的完成时间（分钟）
3. 设置任务优先级（1最高，3最低）

请返回JSON格式：
{
  "tasks": [
    {
      "title": "具体的任务描述",
      "estimated_time": 预计时间（分钟）,
      "priority": 优先级（1-3）
    }
  ]
}

任务列表：${JSON.stringify(tasks)}`;

    const response = await makeAPIRequest([
      {
        role: 'system',
        content: '你是任务管理专家。分析并拆分任务，返回JSON格式结果。注重实用性和可执行性。'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);

    try {
      const processed = JSON.parse(response);
      if (!processed.tasks || !Array.isArray(processed.tasks)) {
        throw new Error('无效的响应格式');
      }
      return processed.tasks;
    } catch (error) {
      throw new Error('AI 拆分失败，请重试');
    }
  } catch (error) {
    throw error;
  }
}

interface TaskContext {
  tasks: Todo[];
  preferences: {
    wake_time: string;
    sleep_time: string;
    focus_duration: number;
    break_duration: number;
    daily_focus_goal: number;
  };
}

// AI时间规划：优化任务顺序和时间安排
export async function optimizeTaskSchedule(context: TaskContext): Promise<AITaskSuggestion[]> {
  if (!context.tasks.length) return [];

  try {
    const prompt = `作为时间管理专家，请根据以下信息制定任务执行计划：

用户偏好：
- 起床时间：${context.preferences.wake_time}
- 睡觉时间：${context.preferences.sleep_time}
- 专注时长：${context.preferences.focus_duration}分钟
- 休息时长：${context.preferences.break_duration}分钟
- 每日目标：${context.preferences.daily_focus_goal}分钟

待处理任务：
${context.tasks.map(task => `- ${task.title}（预计${task.estimated_time}分钟）`).join('\n')}

请提供一个结构化的时间规划建议（200字左右），包含：

1. 任务优先级和执行顺序
2. 具体的时间段安排
3. 休息时间建议
4. 注意事项

格式要求：
- 分点列出，简明扼要
- 重点突出时间安排
- 考虑用户作息习惯
- 建议切实可行`;

    const response = await makeAPIRequest([
      {
        role: 'system',
        content: '你是专业的时间管理顾问。请提供具体、可执行的时间规划建议。'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);

    return [{
      type: 'optimization',
      content: response.trim()
    }];
  } catch (error) {
    throw error;
  }
}