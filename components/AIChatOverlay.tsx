import React, { useState, useRef, useEffect } from 'react';
import { getAiAssistantResponse } from '../services/geminiService';
import { X, Send, Sparkles, BrainCircuit, User, History, Plus, MessageSquare, Trash2, ChevronRight, ArrowLeft, Copy, ThumbsUp, ThumbsDown, Zap, Smile, Info, Lightbulb, Hospital, FileSearch } from 'lucide-react';
import { Language } from '../types';

interface AIChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

type ChatMode = 'standard' | 'fun';

export const AIChatOverlay: React.FC<AIChatOverlayProps> = ({ isOpen, onClose, lang }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('standard');
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = {
    zh: {
      title: 'MediMate AI',
      placeholder: '在这里输入您的问题...',
      send: '发送',
      thinking: '正在思考...',
      greeting: '你好！我是您的医疗助手。',
      history: '历史记录',
      newChat: '开启新对话',
      noHistory: '暂无记录',
      delete: '删除',
      back: '返回',
      copy: '复制',
      modeStandard: '专业模式',
      modeFun: '趣味模式',
      suggestions: [
        { icon: Lightbulb, text: '感冒发烧挂什么科？', color: 'text-amber-500' },
        { icon: Hospital, text: '附近有哪些三甲医院？', color: 'text-blue-500' },
        { icon: FileSearch, text: '如何预约专家号？', color: 'text-emerald-500' },
        { icon: Info, text: '陪诊服务如何计费？', color: 'text-purple-500' }
      ]
    },
    en: {
      title: 'MediMate AI',
      placeholder: 'Type your question here...',
      send: 'Send',
      thinking: 'Thinking...',
      greeting: 'Hello! I am your AI assistant.',
      history: 'History',
      newChat: 'New Chat',
      noHistory: 'No history',
      delete: 'Delete',
      back: 'Back',
      copy: 'Copy',
      modeStandard: 'Pro',
      modeFun: 'Casual',
      suggestions: [
        { icon: Lightbulb, text: 'Which clinic for fever?', color: 'text-amber-500' },
        { icon: Hospital, text: 'Hospitals nearby?', color: 'text-blue-500' },
        { icon: FileSearch, text: 'How to book experts?', color: 'text-emerald-500' },
        { icon: Info, text: 'Pricing details?', color: 'text-purple-500' }
      ]
    }
  }[lang];

  useEffect(() => {
    const savedSessions = localStorage.getItem('medimate_chat_history');
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('medimate_chat_history', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (isOpen && !showHistory) {
      scrollToBottom();
    }
  }, [isOpen, messages, showHistory]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setShowHistory(false);
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setShowHistory(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) startNewChat();
  };

  const updateCurrentSession = (newMessages: Message[]) => {
    const now = Date.now();
    if (currentSessionId) {
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: newMessages, timestamp: now } : s));
    } else {
      const firstUserMsg = newMessages.find(m => m.role === 'user');
      const title = firstUserMsg ? (firstUserMsg.text.slice(0, 25) + '...') : t.newChat;
      const newId = now.toString();
      const newSession: ChatSession = { id: newId, title, messages: newMessages, timestamp: now };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newId);
    }
  };

  const handleSend = async (text?: string) => {
    const userText = text || inputValue;
    if (!userText.trim() || isLoading) return;

    setInputValue('');
    const messagesWithUser = [...messages, { role: 'user' as const, text: userText }];
    setMessages(messagesWithUser);
    setIsLoading(true);
    updateCurrentSession(messagesWithUser);

    const apiHistory = messagesWithUser.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    let finalPrompt = userText;
    if (mode === 'fun') {
      finalPrompt = `(以幽默、富有同情心且专业的语气回答) ${userText}`;
    }

    const responseText = await getAiAssistantResponse(finalPrompt, apiHistory.slice(0, -1) as any);
    const messagesWithModel = [...messagesWithUser, { role: 'model' as const, text: responseText }];
    setMessages(messagesWithModel);
    setIsLoading(false);

    setSessions(prev => {
      if (currentSessionId) {
        return prev.map(s => s.id === currentSessionId ? { ...s, messages: messagesWithModel, timestamp: Date.now() } : s);
      }
      return prev;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white lg:bg-slate-900/60 lg:backdrop-blur-md lg:items-center lg:justify-center transition-all duration-300">
      
      <div className="w-full h-full lg:h-[800px] lg:w-[600px] lg:rounded-3xl bg-white lg:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden relative font-sans animate-in fade-in zoom-in duration-300">
        
        {/* Header: Modern Minimalist */}
        <div className="h-[64px] flex items-center justify-between px-6 border-b border-slate-50 bg-white/90 backdrop-blur-md z-20 pt-safe shrink-0">
           <div className="flex items-center gap-3">
              {showHistory ? (
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : (
                <div className="h-10 w-10 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-sm">
                   <BrainCircuit className="h-6 w-6 text-white" />
                </div>
              )}
              {!showHistory && (
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 leading-none">{t.title}</span>
                  <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                    <span className="h-1 w-1 bg-teal-500 rounded-full animate-pulse"></span> 
                    Active Model: Qwen-Plus
                  </span>
                </div>
              )}
           </div>

           <div className="flex items-center gap-2">
             {!showHistory && (
               <div className="flex bg-slate-100/80 p-1 rounded-xl">
                  <button onClick={() => setMode('standard')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'standard' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>{t.modeStandard}</button>
                  <button onClick={() => setMode('fun')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'fun' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>{t.modeFun}</button>
               </div>
             )}
             <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-xl transition-all ${showHistory ? 'bg-teal-50 text-teal-600' : 'hover:bg-slate-100 text-slate-500'}`}>
                <History className="h-5 w-5" />
             </button>
             <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all text-slate-500">
                <X className="h-5 w-5" />
             </button>
           </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-white">
          
          {showHistory ? (
            /* History Section */
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-4">
               <button onClick={startNewChat} className="w-full bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-slate-800 transition-all shadow-md group">
                  <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                  {t.newChat}
               </button>
               {sessions.length === 0 && <div className="text-center py-20 text-slate-400"><MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />{t.noHistory}</div>}
               {sessions.map((s) => (
                 <div key={s.id} onClick={() => loadSession(s)} className={`p-4 bg-white rounded-2xl border border-slate-100 hover:border-teal-200 hover:shadow-sm cursor-pointer transition-all relative group ${currentSessionId === s.id ? 'ring-2 ring-teal-500/10 border-teal-200' : ''}`}>
                    <h3 className="font-bold text-slate-800 truncate pr-8">{s.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-1">{new Date(s.timestamp).toLocaleString()}</p>
                    <button onClick={(e) => deleteSession(e, s.id)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="h-4 w-4" /></button>
                 </div>
               ))}
            </div>
          ) : (
            /* Message Content */
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth no-scrollbar">
              {messages.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center py-10">
                    <div className="text-center space-y-2 mb-12">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.greeting}</h2>
                      <p className="text-slate-500 text-sm">{mode === 'standard' ? '今天有什么可以帮您的？' : '在这里我们可以聊聊任何事。'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
                       {t.suggestions.map((s, idx) => (
                         <button key={idx} onClick={() => handleSend(s.text)} className="p-4 bg-white border border-slate-100 rounded-2xl text-left hover:border-teal-500 hover:shadow-xl hover:shadow-teal-500/5 transition-all group active:scale-95">
                            <s.icon className={`h-5 w-5 ${s.color} mb-2 group-hover:scale-110 transition-transform`} />
                            <p className="text-xs font-bold text-slate-700">{s.text}</p>
                         </button>
                       ))}
                    </div>
                 </div>
              )}

              <div className="space-y-8">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                      <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-100 text-slate-500' : 'bg-slate-900 text-white'}`}>
                              {msg.role === 'user' ? <User className="h-5 w-5" /> : <BrainCircuit className="h-5 w-5" />}
                          </div>
                          <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                              <div className={`px-5 py-3.5 rounded-3xl text-[15px] leading-relaxed ${
                                msg.role === 'user' 
                                  ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white rounded-tr-sm shadow-lg shadow-teal-500/10' 
                                  : 'bg-white border border-slate-100 text-slate-900 rounded-tl-sm'
                              }`}>
                                  {msg.text}
                              </div>
                              <div className="flex gap-3 mt-2 px-1 opacity-0 hover:opacity-100 transition-opacity">
                                  <button onClick={() => navigator.clipboard.writeText(msg.text)} className="p-1.5 text-slate-400 hover:text-teal-500 hover:bg-slate-50 rounded-lg transition-all"><Copy className="h-3.5 w-3.5" /></button>
                                  {msg.role === 'model' && (
                                    <>
                                      <button className="p-1.5 text-slate-400 hover:text-teal-500 hover:bg-slate-50 rounded-lg transition-all"><ThumbsUp className="h-3.5 w-3.5" /></button>
                                      <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-all"><ThumbsDown className="h-3.5 w-3.5" /></button>
                                    </>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start animate-in fade-in">
                    <div className="flex gap-4 items-center">
                      <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center animate-pulse">
                        <BrainCircuit className="h-5 w-5" />
                      </div>
                      <div className="flex gap-1">
                         <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"></span>
                         <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce delay-75"></span>
                         <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce delay-150"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* New Input Area Design: Floating Pill Style */}
          {!showHistory && (
            <div className="px-6 py-6 shrink-0 bg-white">
              <div className="max-w-2xl mx-auto relative group">
                {/* Visual Accent/Glow behind input */}
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-emerald-400 rounded-[32px] opacity-0 group-focus-within:opacity-15 blur-lg transition-opacity"></div>
                
                <div className="relative flex items-center bg-white border border-slate-200 rounded-[30px] p-1.5 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] group-focus-within:border-teal-400 group-focus-within:shadow-[0_12px_40px_-12px_rgba(20,184,166,0.15)] transition-all">
                    <button className="h-11 w-11 flex items-center justify-center text-slate-400 hover:text-teal-500 hover:bg-teal-50 rounded-full transition-all">
                        <Plus className="h-5 w-5" />
                    </button>
                    
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t.placeholder}
                      className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-40 min-h-[44px] py-2.5 px-2 text-slate-900 placeholder-slate-400 text-[15px]"
                      rows={1}
                      style={{ height: 'auto' }}
                    />

                    <div className="flex items-center gap-1.5 pr-1">
                      <button className="h-11 w-11 hidden sm:flex items-center justify-center text-slate-400 hover:text-teal-500 hover:bg-teal-50 rounded-full transition-all">
                          <Smile className="h-5 w-5" />
                      </button>
                      
                      <button 
                        onClick={() => handleSend()}
                        disabled={isLoading || !inputValue.trim()}
                        className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          inputValue.trim() 
                            ? 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-900/10' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                </div>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-4 flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI 助手由通义千问提供，医疗建议仅供参考。
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};