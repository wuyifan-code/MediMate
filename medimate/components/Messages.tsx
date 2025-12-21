import React from 'react';
import { Language } from '../types';
import { Settings, MailPlus, Search } from 'lucide-react';

interface MessagesProps {
  lang: Language;
}

export const Messages: React.FC<MessagesProps> = ({ lang }) => {
  const t = {
    zh: {
      title: '私信',
      search: '搜索私信',
      requests: '消息请求',
      chats: [
        { name: '王淑芬', handle: '@wang_pro', msg: '好的，明天早上8点我在门诊大厅等您。', time: '12分钟前', unread: true },
        { name: 'MediMate 客服', handle: '@support', msg: '您的退款申请已通过，款项将在24小时内到账。', time: '昨天', unread: false, isOfficial: true },
        { name: '李强', handle: '@li_expert', msg: '请记得带上之前的检查报告。', time: '3月12日', unread: false },
        { name: '张伟', handle: '@zhang_driver', msg: '专车已消毒，随时可以出发。', time: '3月10日', unread: false },
      ]
    },
    en: {
      title: 'Messages',
      search: 'Search Direct Messages',
      requests: 'Message requests',
      chats: [
        { name: 'Wang Shufen', handle: '@wang_pro', msg: 'Ok, see you at the lobby at 8 AM.', time: '12m ago', unread: true },
        { name: 'MediMate Support', handle: '@support', msg: 'Refund approved.', time: 'Yesterday', unread: false, isOfficial: true },
      ]
    }
  }[lang];

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md px-4 py-3 flex items-center justify-between">
         <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
         <div className="flex gap-4">
            <Settings className="h-5 w-5 text-slate-900 cursor-pointer" />
            <MailPlus className="h-5 w-5 text-slate-900 cursor-pointer" />
         </div>
      </div>

      <div className="px-4 mb-4">
        <div className="relative group">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <Search className="h-4 w-4 text-slate-500" />
           </div>
           <input 
             type="text" 
             placeholder={t.search}
             className="bg-slate-100 w-full rounded-full py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white border border-transparent focus:border-teal-500 transition-all"
           />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
         {t.chats.map((chat, idx) => (
           <div key={idx} className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${chat.unread ? 'bg-slate-50' : ''}`}>
              <div className="relative">
                 <img src={`https://picsum.photos/60/60?random=${idx + 50}`} className="w-12 h-12 rounded-full object-cover" alt="" />
                 {chat.isOfficial && (
                   <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                     <div className="bg-black text-white text-[8px] font-bold px-1 rounded-sm">M</div>
                   </div>
                 )}
              </div>
              <div className="flex-1 overflow-hidden">
                 <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1 truncate">
                       <span className="font-bold text-slate-900 truncate">{chat.name}</span>
                       <span className="text-slate-500 text-sm truncate">{chat.handle}</span>
                    </div>
                    <span className="text-slate-500 text-sm whitespace-nowrap">{chat.time}</span>
                 </div>
                 <div className={`truncate ${chat.unread ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                    {chat.msg}
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};