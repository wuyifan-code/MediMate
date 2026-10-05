import axios from 'axios';

const aiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
  },
  transformRequest: [
    (data: any, headers: any) => {
      return JSON.stringify(data);
    },
  ],
});

// Attach JWT token to all AI requests
aiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('medimate_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getHealthTriage = async (
  symptoms: string,
  location?: { latitude: number; longitude: number }
): Promise<string> => {
  try {
    const payload: any = { symptoms };
    if (location?.latitude && location?.longitude) {
      payload.latitude = location.latitude;
      payload.longitude = location.longitude;
    }
    const response = await aiClient.post('/ai/triage', payload);
    return response.data?.data?.text || 'Unable to generate triage advice. Please consult a doctor immediately.';
  } catch (error) {
    console.error('AI triage error:', error);
    return 'Service temporarily unavailable. Please visit a hospital.';
  }
};

export const getMatchReasoning = async (patientNeeds: string, escortProfile: string): Promise<string> => {
  try {
    const response = await aiClient.post('/ai/match-reasoning', {
      patientNeeds,
      escortProfile,
    });
    return response.data?.data?.text || '基于地理位置与专业资质智能推荐';
  } catch (error) {
    console.error('AI match reasoning error:', error);
    return '基于地理位置与专业资质智能推荐';
  }
};

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const getAiAssistantResponse = async (
  prompt: string,
  history: ChatMessage[] = [],
  onChunk?: (chunk: string) => void,
): Promise<string> => {
  try {
    const response = await aiClient.post('/ai/assistant', {
      prompt,
      history,
    });

    const text = response.data?.data?.text || 'Sorry, I could not generate a response.';

    if (onChunk) {
      onChunk(text);
    }

    return text;
  } catch (error) {
    console.error('AI assistant error:', error);
    return 'Sorry, the service is temporarily unavailable.';
  }
};
