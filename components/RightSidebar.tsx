import React from 'react';
import { SearchBar } from './SearchBar';
import { Hospital, EscortProfile } from '../types';
import { MoreHorizontal } from 'lucide-react';

interface RightSidebarProps {
  lang: 'zh' | 'en';
  popularHospitals: Hospital[];
  popularEscorts: EscortProfile[];
  onSearch: (query: string, type: 'hospital' | 'escort' | 'all') => void;
  onStartConversation: (escortId: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  lang,
  popularHospitals,
  popularEscorts,
  onSearch,
  onStartConversation,
}) => {
  const translations = {
    zh: {
      search: '搜索医院 / 科室',
      popular: '热门医院',
      topEscorts: '金牌陪诊师',
      book: '预约',
      orders: '订单',
    },
    en: {
      search: 'Search Hospital / Dept',
      popular: 'Popular Hospitals',
      topEscorts: 'Top Escorts',
      book: 'Book',
      orders: 'Orders',
    },
  };

  const t = translations[lang];

  return (
    <aside className="hidden lg:block w-[350px] pl-8 py-4 sticky top-0 h-screen overflow-y-auto no-scrollbar">
      {/* Search */}
      <div className="sticky top-0 bg-white dark:bg-slate-900 pb-3 z-30">
        <SearchBar
          lang={lang}
          onSearch={onSearch}
          placeholder={t.search}
        />
      </div>

      {/* Trends -> Popular Hospitals */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden mb-4 border border-slate-100 dark:border-slate-700">
        <h2 className="text-xl font-black px-4 py-3 text-slate-900 dark:text-white">{t.popular}</h2>
        {popularHospitals.length > 0 ? (
          popularHospitals.map((hospital) => (
            <div
              key={hospital.id}
              className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors relative"
              onClick={() => onSearch(hospital.name, 'hospital')}
            >
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{hospital.level} · {hospital.department}</span>
                <MoreHorizontal className="h-4 w-4" />
              </div>
              <div className="font-bold text-slate-900 dark:text-white my-0.5">{hospital.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{hospital.rating} ⭐</div>
            </div>
          ))
        ) : (
          // Fallback static data
          [
            { tag: lang === 'zh' ? '北京 · 三甲' : 'Beijing · Grade 3A', title: lang === 'zh' ? '北京协和医院' : 'Peking Union Medical College', posts: `5,203 ${t.orders}`, id: 'hosp-001' },
            { tag: lang === 'zh' ? '上海 · 三甲' : 'Shanghai · Grade 3A', title: lang === 'zh' ? '复旦大学附属华山医院' : 'Huashan Hospital', posts: `2,100 ${t.orders}`, id: 'hosp-002' },
            { tag: lang === 'zh' ? '广州 · 三甲' : 'Guangzhou · Grade 3A', title: lang === 'zh' ? '中山大学附属第一医院' : 'First Affiliated Hospital', posts: `10.5K ${t.orders}`, id: 'hosp-003' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors relative"
              onClick={() => {
                onSearch(item.title, 'hospital');
              }}
            >
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{item.tag}</span>
                <MoreHorizontal className="h-4 w-4" />
              </div>
              <div className="font-bold text-slate-900 dark:text-white my-0.5">{item.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{item.posts}</div>
            </div>
          ))
        )}
      </div>

      {/* Who to follow -> Top Escorts */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <h2 className="text-xl font-black px-4 py-3 text-slate-900 dark:text-white">{t.topEscorts}</h2>
        {popularEscorts.length > 0 ? (
          popularEscorts.map((escort) => (
            <div
              key={escort.id}
              className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors flex items-center justify-between"
              onClick={() => onStartConversation(escort.id)}
            >
              <div className="flex items-center gap-3">
                <img src={escort.imageUrl || `https://picsum.photos/100/100?random=${escort.id}`} alt={escort.name} className="h-10 w-10 rounded-full bg-slate-300" />
                <div className="leading-tight">
                  <div className="font-bold hover:underline text-slate-900 dark:text-white">{escort.name}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-sm">{escort.rating} ⭐ · {escort.completedOrders} 订单</div>
                </div>
              </div>
              <button
                className="bg-black dark:bg-teal-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-slate-800 dark:hover:bg-teal-500"
                onClick={(e) => { e.stopPropagation(); onStartConversation(escort.id); }}
              >
                {t.book}
              </button>
            </div>
          ))
        ) : (
          // Fallback static data
          [
            { id: 'escort-wang', name: lang === 'zh' ? '王淑芬' : 'Wang Shu', handle: '@wang_pro', avatar: 'https://picsum.photos/100/100?random=20', rating: 4.9, orders: 523 },
            { id: 'escort-zhang', name: lang === 'zh' ? '张伟' : 'Zhang Wei', handle: '@zhang_expert', avatar: 'https://picsum.photos/100/100?random=21', rating: 4.8, orders: 210 },
          ].map((item, idx) => (
            <div
              key={idx}
              className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors flex items-center justify-between"
              onClick={() => onStartConversation(item.id)}
            >
              <div className="flex items-center gap-3">
                <img src={item.avatar} alt={item.name} className="h-10 w-10 rounded-full bg-slate-300" />
                <div className="leading-tight">
                  <div className="font-bold hover:underline text-slate-900 dark:text-white">{item.name}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-sm">{item.rating} ⭐ · {item.orders} 订单</div>
                </div>
              </div>
              <button
                className="bg-black dark:bg-teal-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-slate-800 dark:hover:bg-teal-500"
                onClick={(e) => { e.stopPropagation(); onStartConversation(item.id); }}
              >
                {t.book}
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
