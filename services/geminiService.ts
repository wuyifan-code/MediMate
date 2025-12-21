/**
 * Qwen Service (OpenAI Compatible)
 * 替代原有的 Google Gemini 实现
 */

const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL_NAME = 'qwen-plus';

// --- Data Classes (Interfaces) ---

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// --- API Implementation (Retrofit Equivalent) ---

/**
 * 核心请求方法，类似于 Android 中的 Retrofit 接口调用
 */
async function executeChatCompletion(request: ChatCompletionRequest): Promise<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('API Key is not configured');
  }

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error (${response.status}):`, errorBody);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ChatCompletionResponse = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error('Qwen API call failed:', error);
    throw error;
  }
}

// --- ViewModel Logic (Exposed Services) ---

const SYSTEM_INSTRUCTION = `你是一个专业的 MediMate AI 医疗助手。
你的职责是协助用户（患者、家属和陪诊师）：
1. 医疗预检：根据简单症状建议挂号科室。
2. 平台导航：解释如何预约陪诊、价格或服务类型。
3. 通用健康信息：提供常识性健康建议（声明自己不是医生）。
4. 情绪支持：对焦虑的患者保持共情。

语气：专业、温暖、简洁。
语言：使用与用户相同的语言。`;

/**
 * 智能导诊服务
 */
export const getHealthTriage = async (symptoms: string): Promise<string> => {
  try {
    const request: ChatCompletionRequest = {
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: '你是一个专业的医疗预检助手。' },
        { role: 'user', content: `根据以下症状提供挂号建议、准备建议和温馨提示：\n症状：${symptoms}` }
      ],
      temperature: 0.7
    };

    return await executeChatCompletion(request);
  } catch (error) {
    return "服务暂时不可用，请直接前往医院或咨询在线医生。";
  }
};

/**
 * 匹配理由生成服务
 */
export const getMatchReasoning = async (patientNeeds: string, escortProfile: string): Promise<string> => {
  try {
    const request: ChatCompletionRequest = {
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: '你是一个智能匹配助手。' },
        { role: 'user', content: `请用一句话解释为什么这位陪诊师适合该患者：\n患者需求：${patientNeeds}\n陪诊师资料：${escortProfile}` }
      ]
    };

    return await executeChatCompletion(request);
  } catch (error) {
    return "基于地理位置与专业资质智能推荐";
  }
};

/**
 * AI 助手对话服务 (含历史记录)
 */
export const getAiAssistantResponse = async (
  message: string, 
  history: { role: 'user' | 'model', parts: [{ text: string }] }[]
): Promise<string> => {
  try {
    // 将 Gemini 格式的历史记录转换为 OpenAI 格式
    const chatHistory: ChatMessage[] = history.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts[0].text
    }));

    const request: ChatCompletionRequest = {
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        ...chatHistory,
        { role: 'user', content: message }
      ],
      temperature: 0.8
    };

    return await executeChatCompletion(request);
  } catch (error) {
    return "抱歉，通义千问服务暂时连接失败，请稍后再试。";
  }
};