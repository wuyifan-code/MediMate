import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, MapPin, MessageCircle, Repeat2, Heart, Share, BarChart2 } from 'lucide-react';
import { Language } from '../types';

interface EscortDashboardProps {
  lang: Language;
}

const data = [
  { name: 'M', income: 420 },
  { name: 'T', income: 380 },
  { name: 'W', income: 550 },
  { name: 'T', income: 200 },
  { name: 'F', income: 600 },
  { name: 'S', income: 850 },
  { name: 'S', income: 720 },
];

export const EscortDashboard: React.FC<EscortDashboardProps> = ({ lang }) => {
  const onInteract = (action: string) => {
    console.log(`Interaction: ${action}`);
  };

  const t = {
    zh: {
      pinnedStats: '数据置顶',
      name: '王淑芬',
      postContent: '本周收入报表看起来不错！📈 感谢所有患者的信任。#MediMate #陪诊生活',
      orderReq: '新订单请求',
      accept: '接单',
      decline: '拒绝',
      details: '订单详情',
      insurance: '包含保险',
      away: '距离',
      hospital: '北京朝阳医院',
      dept: '消化内科'
    },
    en: {
      pinnedStats: 'Pinned Stats',
      name: 'Wang Shufen',
      postContent: 'Weekly income report is looking good! 📈 Thanks to all my patients for the trust. #MediMate #EscortLife',
      orderReq: 'New Order Request',
      accept: 'Accept',
      decline: 'Decline',
      details: 'Order Details',
      insurance: 'Insurance Included',
      away: 'away',
      hospital: 'Beijing Chaoyang Hospital',
      dept: 'Digestive Medicine'
    }
  }[lang];

  return (
    <div className="pb-24">
       {/* Income Chart as Pinned Tweet */}
       <div 
         className="border-b border-slate-100 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
         onClick={() => onInteract('View Stats')}
       >
         <div className="flex gap-1 mb-1 text-xs font-bold text-slate-500 items-center ml-12">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current mr-1"><g><path d="M7 4.5C7 3.12 8.12 2 9.5 2h5C15.88 2 17 3.12 17 4.5v15c0 1.38-1.12 2.5-2.5 2.5h-5C8.12 22 7 20.88 7 19.5v-15zM9.5 4c-.28 0-.5.22-.5.5v15c0 .28.22.5.5.5h5c.28 0 .5-.22.5-.5v-15c0-.28-.22-.5-.5-.5h-5z"></path></g></svg>
            {t.pinnedStats}
         </div>
         <div className="flex gap-3">
             <div className="flex-shrink-0">
               <img src="https://picsum.photos/120/120" alt="Profile" className="w-10 h-10 rounded-full" />
             </div>
             <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-900">{t.name}</span>
                  <span className="text-slate-500 text-sm">@wang_escort · 12h</span>
                </div>
                <div className="mt-1 text-slate-900">
                   {t.postContent}
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 p-2 bg-slate-50 h-48 w-full max-w-md">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#e2e8f0'}} />
                        <Bar dataKey="income" fill="#0d9488" radius={[2, 2, 0, 0]} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                <div className="mt-3 flex justify-between text-slate-500 max-w-md">
                   <div onClick={(e) => { e.stopPropagation(); onInteract('Comment');}} className="flex items-center gap-1 text-sm group cursor-pointer hover:text-blue-500"><MessageCircle className="h-4 w-4"/><span className="text-xs">2</span></div>
                   <div onClick={(e) => { e.stopPropagation(); onInteract('Retweet');}} className="flex items-center gap-1 text-sm group cursor-pointer hover:text-green-500"><Repeat2 className="h-4 w-4"/><span className="text-xs"></span></div>
                   <div onClick={(e) => { e.stopPropagation(); onInteract('Like');}} className="flex items-center gap-1 text-sm group cursor-pointer hover:text-red-500"><Heart className="h-4 w-4"/><span className="text-xs">24</span></div>
                   <div onClick={(e) => { e.stopPropagation(); onInteract('Stats');}} className="flex items-center gap-1 text-sm group cursor-pointer hover:text-blue-500"><BarChart2 className="h-4 w-4"/><span className="text-xs">500</span></div>
                   <div onClick={(e) => { e.stopPropagation(); onInteract('Share');}} className="flex items-center gap-1 text-sm group cursor-pointer hover:text-blue-500"><Share className="h-4 w-4"/></div>
                </div>
             </div>
         </div>
       </div>

       {/* Orders Feed */}
       <div className="divide-y divide-slate-100">
         {[1, 2, 3].map((i) => (
           <div 
             key={i} 
             className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
             onClick={() => onInteract(`Order Details ${i}`)}
           >
              <div className="flex gap-3">
                 <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">O</div>
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-900">{t.orderReq}</span>
                          <span className="text-slate-500 text-sm">@system · 1m</span>
                       </div>
                    </div>
                    
                    <div className="mt-1 text-slate-900">
                       <span className="font-bold text-teal-600">¥188</span> {lang === 'zh' ? '订单在' : 'order available at'} <span className="font-bold">{t.hospital}</span>. 
                       {lang === 'zh' ? '科室:' : 'Department:'} {t.dept}. 🏥
                    </div>

                    <div className="mt-3 border border-slate-200 rounded-2xl overflow-hidden">
                       <div className="bg-slate-50 p-3 border-b border-slate-200">
                          <span className="text-sm font-bold text-slate-700">{t.details}</span>
                       </div>
                       <div className="p-3 text-sm text-slate-600 space-y-1">
                          <div className="flex items-center gap-2"><MapPin className="h-4 w-4"/> 2.5km {t.away}</div>
                          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> {t.insurance}</div>
                       </div>
                    </div>

                    <div className="mt-3 flex gap-4">
                       <button 
                         className="flex-1 bg-black text-white font-bold py-2 rounded-full hover:bg-slate-800 transition-colors"
                         onClick={(e) => { e.stopPropagation(); onInteract('Accept Order'); }}
                       >
                         {t.accept}
                       </button>
                       <button 
                         className="flex-1 border border-slate-300 text-slate-700 font-bold py-2 rounded-full hover:bg-slate-50 transition-colors"
                         onClick={(e) => { e.stopPropagation(); onInteract('Decline Order'); }}
                       >
                         {t.decline}
                       </button>
                    </div>
                 </div>
              </div>
           </div>
         ))}
       </div>
    </div>
  );
};