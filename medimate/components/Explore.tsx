import React from 'react';
import { Language } from '../types';
import { Search, MoreHorizontal, Settings, MapPin, TrendingUp } from 'lucide-react';

interface ExploreProps {
  lang: Language;
}

export const Explore: React.FC<ExploreProps> = ({ lang }) => {
  const t = {
    zh: {
      search: '搜索医院、科室、医生',
      forYou: '推荐',
      trending: '热门医院',
      news: '健康资讯',
      entertainment: '本地',
      hospitals: [
        { name: '北京协和医院', rank: 'No.1 全国综合', topic: '疑难重症', posts: '12.5万 接单' },
        { name: '四川大学华西医院', rank: 'No.2 科研实力', topic: '西南地区', posts: '9.8万 接单' },
        { name: '复旦大学附属中山医院', rank: 'No.3 心血管', topic: '上海', posts: '8.2万 接单' },
        { name: '中日友好医院', rank: 'No.4 呼吸科', topic: '中西医结合', posts: '5.4万 接单' },
      ],
      newsItems: [
        { category: '公共卫生 · 1小时前', title: '2025年流感疫苗接种指南发布，老年人免费接种', img: 'https://picsum.photos/200/200?random=10' },
        { category: '医疗科技 · 实时', title: 'AI辅助诊断系统纳入医保支付范围，陪诊效率提升40%', img: 'https://picsum.photos/200/200?random=11' },
      ]
    },
    en: {
      search: 'Search hospitals, departments...',
      forYou: 'For you',
      trending: 'Trending',
      news: 'News',
      entertainment: 'Local',
      hospitals: [
        { name: 'Peking Union Medical College', rank: 'No.1 General', topic: 'Complex Cases', posts: '125K Orders' },
        { name: 'West China Hospital', rank: 'No.2 Research', topic: 'Southwest', posts: '98K Orders' },
        { name: 'Zhongshan Hospital', rank: 'No.3 Cardio', topic: 'Shanghai', posts: '82K Orders' },
      ],
      newsItems: [
        { category: 'Public Health · 1h ago', title: '2025 Flu Vaccine Guide Released', img: 'https://picsum.photos/200/200?random=10' },
        { category: 'MedTech · LIVE', title: 'AI Diagnostics now covered by insurance', img: 'https://picsum.photos/200/200?random=11' },
      ]
    }
  }[lang];

  return (
    <div className="pb-20">
      {/* Search Header */}
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-100 px-4 py-2 flex items-center gap-4">
        <div className="flex-1 relative group">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <Search className="h-4 w-4 text-slate-500" />
           </div>
           <input 
             type="text" 
             placeholder={t.search}
             className="bg-slate-100 w-full rounded-full py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white border border-transparent focus:border-teal-500 transition-all"
           />
        </div>
        <Settings className="h-5 w-5 text-slate-900 cursor-pointer" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar">
         {[t.forYou, t.trending, t.news, t.entertainment].map((tab, idx) => (
           <div key={idx} className="px-4 py-3 hover:bg-slate-50 cursor-pointer min-w-max relative">
              <span className={`font-bold text-sm ${idx === 0 ? 'text-slate-900' : 'text-slate-500'}`}>{tab}</span>
              {idx === 0 && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-teal-500 rounded-full"></div>}
           </div>
         ))}
      </div>

      {/* Main Feature: Trending Hospitals */}
      <div className="border-b border-slate-100">
         <div className="py-3 px-4 text-xl font-black text-slate-900">{t.trending}</div>
         {t.hospitals.map((h, i) => (
           <div key={i} className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors relative">
              <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                 <span>{i + 1} · {h.topic} · 热门</span>
                 <MoreHorizontal className="h-4 w-4" />
              </div>
              <div className="font-bold text-slate-900 text-base">{h.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{h.rank} · {h.posts}</div>
           </div>
         ))}
         <div className="p-4 text-teal-500 text-sm cursor-pointer hover:bg-slate-50">
            {lang === 'zh' ? '显示更多' : 'Show more'}
         </div>
      </div>

      {/* News Feed with Images */}
      {t.newsItems.map((news, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
           <div className="flex-1">
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                 {news.category}
              </div>
              <div className="font-bold text-slate-900 leading-snug">
                 {news.title}
              </div>
           </div>
           <img src={news.img} className="w-20 h-20 rounded-xl object-cover" alt="News" />
        </div>
      ))}
    </div>
  );
};