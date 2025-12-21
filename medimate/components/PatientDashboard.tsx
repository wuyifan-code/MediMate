import React, { useState, useEffect } from 'react';
import { getHealthTriage } from '../services/geminiService';
import { apiService } from '../services/apiService';
import { EscortProfile, Language } from '../types';
import { MapPin, MessageCircle, Repeat2, Heart, BarChart2, Share, Image as ImageIcon, Smile, CalendarClock, BriefcaseMedical, MoreHorizontal, AlertCircle, RefreshCw } from 'lucide-react';

interface PatientDashboardProps {
  lang: Language;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ lang }) => {
  const [symptoms, setSymptoms] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [escorts, setEscorts] = useState<EscortProfile[]>([]);
  const [escortsLoading, setEscortsLoading] = useState(true);
  const [escortsError, setEscortsError] = useState('');
  
  const t = {
    zh: {
      placeholder: '哪里不舒服？(输入症状 AI 智能导诊)',
      aiTitle: 'AI 导诊建议',
      analyzing: '分析中...',
      triage: '智能导诊',
      officialServices: '官方服务',
      officialAccount: 'MediMate 官方服务',
      alwaysOpen: '24小时',
      services: [
        { label: '全程陪诊', sub: '挂号/取药/送医' },
        { label: '代办买药', sub: '送药上门' },
        { label: '专车接送', sub: '轮椅/担架' },
        { label: '住院陪护', sub: '24H护工' }
      ],
      certified: '实名认证',
      proService: '专业陪诊服务，熟悉',
      process: '流程。',
      consult: '咨询',
      book: '下单',
      orders: '接单',
      loadingEscorts: '加载陪诊师列表...',
      failedToLoad: '加载失败',
      noEscortsFound: '附近暂无陪诊师',
      retry: '重试',
      networkError: '网络错误，请检查网络连接'
    },
    en: {
      placeholder: 'What are your symptoms? (AI Triage)',
      aiTitle: 'AI Triage Advice',
      analyzing: 'Analyzing...',
      triage: 'AI Triage',
      officialServices: 'Official Services',
      officialAccount: 'MediMate Official',
      alwaysOpen: '24/7',
      services: [
        { label: 'Full Escort', sub: 'Reg/Meds/Doctor' },
        { label: 'Med Delivery', sub: 'Door-to-door' },
        { label: 'Transport', sub: 'Wheelchair/Stretcher' },
        { label: 'Caregiving', sub: '24H Nursing' }
      ],
      certified: 'Certified',
      proService: 'Professional escort service, familiar with',
      process: 'process.',
      consult: 'Consult',
      book: 'Book',
      orders: 'Orders',
      loadingEscorts: 'Loading escorts...',
      failedToLoad: 'Failed to load',
      noEscortsFound: 'No escorts found nearby',
      retry: 'Retry',
      networkError: 'Network error, please check your connection'
    }
  }[lang];

  // Fetch nearby escorts
  const fetchEscorts = async () => {
    setEscortsLoading(true);
    setEscortsError('');
    
    try {
      // Mock geolocation for now, in real app we'd use navigator.geolocation
      const latitude = 39.9042; // Beijing coordinates
      const longitude = 116.4074;
      
      // Use API service to fetch nearby escorts
      const data = await apiService.getNearbyEscorts(latitude, longitude, 10);
      setEscorts(data);
      
      // If no data returned, set a message
      if (data.length === 0) {
        setEscortsError(t.noEscortsFound);
      }
    } catch (error) {
      console.error('Failed to fetch escorts:', error);
      setEscortsError(t.networkError);
    } finally {
      setEscortsLoading(false);
    }
  };

  // Fetch escorts on component mount
  useEffect(() => {
    fetchEscorts();
  }, []);

  const handleAiTriage = async () => {
    if (!symptoms) return;
    setAiLoading(true);
    const advice = await getHealthTriage(symptoms);
    setAiAdvice(advice);
    setAiLoading(false);
  };

  const onInteract = (action: string) => {
    console.log(`User interaction: ${action}`);
  };

  const serviceColors = [
    'bg-blue-50 text-blue-600',
    'bg-emerald-50 text-emerald-600',
    'bg-amber-50 text-amber-600',
    'bg-purple-50 text-purple-600'
  ];

  return (
    <div className="pb-24">
      <div className="border-b border-slate-100 p-4">
        <div className="flex gap-3">
          <img src="https://picsum.photos/100/100?random=50" className="h-10 w-10 rounded-full bg-slate-200" alt="Me" />
          <div className="flex-1">
            <textarea
              className="w-full text-xl placeholder-slate-500 border-none focus:ring-0 resize-none outline-none text-slate-900 min-h-[50px]"
              placeholder={t.placeholder}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={2}
            />
            
            {aiAdvice && (
              <div className="mb-4 bg-teal-50 rounded-2xl p-3 text-slate-900 border border-teal-100 text-sm">
                <span className="font-bold text-teal-600 block mb-1">{t.aiTitle}</span>
                {aiAdvice}
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <div className="flex gap-1 text-teal-500">
                <div onClick={() => onInteract('Add Image')} className="p-2 hover:bg-teal-50 rounded-full cursor-pointer transition-colors"><ImageIcon className="h-5 w-5" /></div>
                <div onClick={() => onInteract('Schedule')} className="p-2 hover:bg-teal-50 rounded-full cursor-pointer transition-colors"><CalendarClock className="h-5 w-5" /></div>
                <div onClick={() => onInteract('Location')} className="p-2 hover:bg-teal-50 rounded-full cursor-pointer transition-colors opacity-50"><MapPin className="h-5 w-5" /></div>
              </div>
              <button
              onClick={handleAiTriage}
              disabled={aiLoading || !symptoms}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-5 py-1.5 rounded-full disabled:opacity-50 transition-colors"
            >
              {aiLoading ? t.analyzing : t.triage}
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Official Services */}
      <div 
        className="border-b border-slate-100 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={() => onInteract('Open Services')}
      >
         <div className="flex gap-1 mb-1 text-xs font-bold text-slate-500 items-center ml-12">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current mr-1"><g><path d="M7 4.5C7 3.12 8.12 2 9.5 2h5C15.88 2 17 3.12 17 4.5v15c0 1.38-1.12 2.5-2.5 2.5h-5C8.12 22 7 20.88 7 19.5v-15zM9.5 4c-.28 0-.5.22-.5.5v15c0 .28.22.5.5.5h5c.28 0 .5-.22.5-.5v-15c0-.28-.22-.5-.5-.5h-5z"></path></g></svg>
            {t.officialServices}
         </div>
         <div className="flex gap-3">
             <div className="flex-shrink-0">
               <div className="h-10 w-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">M</div>
             </div>
             <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-900">{t.officialAccount}</span>
                  <span className="text-teal-500">@official</span>
                  <span className="text-slate-500 text-sm">· {t.alwaysOpen}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {t.services.map((s, idx) => (
                    <div 
                        key={idx} 
                        className={`rounded-xl p-3 ${serviceColors[idx]} border border-transparent hover:border-black/10 transition-all`}
                        onClick={(e) => { e.stopPropagation(); onInteract(`Service: ${s.label}`); }}
                    >
                       <div className="font-bold">{s.label}</div>
                       <div className="text-xs opacity-70">{s.sub}</div>
                    </div>
                  ))}
                </div>
             </div>
         </div>
      </div>

      {/* Escort List */}
      <div className="divide-y divide-slate-100">
        {escortsLoading ? (
          <div className="p-10 text-center text-slate-500">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-slate-200 border-t-transparent rounded-full animate-spin"></div>
              <div>{t.loadingEscorts}</div>
            </div>
          </div>
        ) : escortsError ? (
          <div className="p-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="font-medium text-slate-900">{t.failedToLoad}</div>
              <div className="text-sm text-slate-500 mb-4">{escortsError}</div>
              <button
                className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-full hover:bg-teal-600 transition-colors"
                onClick={fetchEscorts}
              >
                <RefreshCw className="h-4 w-4" />
                {t.retry}
              </button>
            </div>
          </div>
        ) : escorts.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-slate-400 mb-2">
              <MapPin className="h-12 w-12 mx-auto" />
            </div>
            <div className="font-medium text-slate-900 mb-1">{t.noEscortsFound}</div>
            <div className="text-sm text-slate-500">{lang === 'zh' ? '尝试调整搜索范围或稍后再试' : 'Try adjusting your search or check back later'}</div>
          </div>
        ) : (
          escorts.map((escort) => (
            <div 
              key={escort.id} 
              className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => onInteract(`Escort Profile: ${escort.name}`)}
            >
              <div className="flex gap-3">
                <img src={escort.imageUrl} alt={escort.name} className="h-10 w-10 rounded-full hover:opacity-90" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 group">
                      <span className="font-bold text-slate-900 group-hover:underline">{escort.name}</span>
                      {escort.isCertified && (
                         <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-teal-500 fill-current">
                           <title>{t.certified}</title>
                           <g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.457.748 2.795 1.863 3.616-.203.438-.323.922-.323 1.434 0 2.21 1.71 3.998 3.818 3.998.47 0 .92-.084 1.336-.25.62 1.333 1.926 2.25 3.437 2.25s2.817-.917 3.437-2.25c.415.165.866.25 1.336.25 2.11 0 3.818-1.79 3.818-4 0-.512-.12-.996-.323-1.434 1.114-.82 1.863-2.16 1.863-3.616zm-5.558-1.984l-4.235 7.48c-.144.255-.38.41-.66.41-.28 0-.514-.155-.658-.41l-2.456-4.34c-.204-.36-.075-.815.286-1.018.36-.203.816-.074 1.018.286l1.812 3.2 3.6-6.355c.203-.36.66-.488 1.02-.285.36.203.49.658.284 1.02z"></path></g>
                         </svg>
                      )}
                      <span className="text-slate-500 text-sm">@{escort.id}_pro · {escort.distance}</span>
                    </div>
                    <div 
                      className="text-slate-400 hover:text-teal-500 p-2 rounded-full hover:bg-teal-50 transition-colors"
                    >
                       <MoreHorizontal className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-1 text-slate-900">
                     <p className="mb-2">{t.proService} <span className="text-teal-500">#{escort.specialties[0]}</span> {t.process}</p>
                     <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                       <span className="bg-slate-100 px-2 py-0.5 rounded">⭐ {escort.rating}</span>
                       <span className="bg-slate-100 px-2 py-0.5 rounded">📜 100%{t.certified}</span>
                       <span className="bg-slate-100 px-2 py-0.5 rounded">💼 {t.orders}{escort.completedOrders}+</span>
                     </div>
                  </div>

                  <div className="mt-3 flex justify-between text-slate-500 max-w-md pr-4">
                     <div 
                       className="flex items-center gap-1 group cursor-pointer"
                       onClick={(e) => { e.stopPropagation(); onInteract('Consult'); }}
                     >
                        <div className="p-2 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <MessageCircle className="h-4 w-4" />
                        </div>
                        <span className="text-xs group-hover:text-blue-500">{t.consult}</span>
                     </div>
                      
                     <div 
                       className="flex items-center gap-1 group cursor-pointer"
                       onClick={(e) => { e.stopPropagation(); onInteract('Book Now'); }}
                     >
                        <div className="p-2 rounded-full group-hover:bg-green-50 group-hover:text-green-500 transition-colors">
                          <BriefcaseMedical className="h-4 w-4" />
                        </div>
                        <span className="text-xs group-hover:text-green-500">{t.book}</span>
                     </div>

                     <div 
                       className="flex items-center gap-1 group cursor-pointer"
                       onClick={(e) => { e.stopPropagation(); onInteract('Save'); }}
                     >
                        <div className="p-2 rounded-full group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                          <Heart className="h-4 w-4" />
                        </div>
                        <span className="text-xs group-hover:text-red-500">{escort.rating}</span>
                     </div>

                     <div 
                       className="flex items-center gap-1 group cursor-pointer"
                       onClick={(e) => { e.stopPropagation(); onInteract('Share'); }}
                     >
                        <div className="p-2 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <Share className="h-4 w-4" />
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};