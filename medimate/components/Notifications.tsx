import React, { useState } from 'react';
import { Language } from '../types';
import { Settings, User, FileText, CheckCircle, Clock, CreditCard } from 'lucide-react';

interface NotificationsProps {
  lang: Language;
}

export const Notifications: React.FC<NotificationsProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'mentions'>('all');

  const t = {
    zh: {
      title: '消息通知',
      all: '全部',
      orders: '订单',
      mentions: '提及',
      items: [
        { type: 'order', icon: CheckCircle, color: 'text-teal-500', title: '订单完成', content: '您在 [北京协和医院] 的陪诊服务已完成，陪诊师王淑芬已确认。', time: '10分钟前' },
        { type: 'system', icon: User, color: 'text-purple-500', title: '新的关注', content: '金牌陪诊师 李强 关注了你', time: '2小时前' },
        { type: 'payment', icon: CreditCard, color: 'text-blue-500', title: '支付成功', content: '您已成功支付订单 #88291，金额 ¥258.00', time: '5小时前' },
        { type: 'order', icon: Clock, color: 'text-amber-500', title: '即将开始', content: '您的预约将在明天上午 09:00 开始，请携带好医保卡。', time: '1天前' },
        { type: 'system', icon: FileText, color: 'text-slate-500', title: '系统通知', content: '2025年《老年陪诊服务规范》已更新，点击查看详情。', time: '2天前' },
      ]
    },
    en: {
      title: 'Notifications',
      all: 'All',
      orders: 'Orders',
      mentions: 'Mentions',
      items: [
        { type: 'order', icon: CheckCircle, color: 'text-teal-500', title: 'Order Completed', content: 'Service at Peking Union Medical College Hospital is complete.', time: '10m ago' },
        { type: 'system', icon: User, color: 'text-purple-500', title: 'New Follower', content: 'Escort Li Qiang followed you', time: '2h ago' },
        { type: 'payment', icon: CreditCard, color: 'text-blue-500', title: 'Payment Success', content: 'Order #88291 paid successfully: ¥258.00', time: '5h ago' },
      ]
    }
  }[lang];

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-100">
         <div className="flex justify-between items-center px-4 py-3">
            <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
            <Settings className="h-5 w-5 text-slate-900 cursor-pointer" />
         </div>
         <div className="flex">
            <div 
              className="flex-1 flex justify-center hover:bg-slate-50 cursor-pointer transition-colors relative py-3"
              onClick={() => setActiveTab('all')}
            >
               <span className={`font-bold text-sm ${activeTab === 'all' ? 'text-slate-900' : 'text-slate-500'}`}>{t.all}</span>
               {activeTab === 'all' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-teal-500 rounded-full"></div>}
            </div>
            <div 
              className="flex-1 flex justify-center hover:bg-slate-50 cursor-pointer transition-colors relative py-3"
              onClick={() => setActiveTab('verified')}
            >
               <span className={`font-bold text-sm ${activeTab === 'verified' ? 'text-slate-900' : 'text-slate-500'}`}>{t.orders}</span>
               {activeTab === 'verified' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-teal-500 rounded-full"></div>}
            </div>
            <div 
              className="flex-1 flex justify-center hover:bg-slate-50 cursor-pointer transition-colors relative py-3"
              onClick={() => setActiveTab('mentions')}
            >
               <span className={`font-bold text-sm ${activeTab === 'mentions' ? 'text-slate-900' : 'text-slate-500'}`}>{t.mentions}</span>
               {activeTab === 'mentions' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-teal-500 rounded-full"></div>}
            </div>
         </div>
      </div>

      <div className="divide-y divide-slate-100">
         {t.items.map((item, idx) => (
           <div key={idx} className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3">
              <div className="flex-shrink-0 w-8 flex justify-end">
                 <item.icon className={`h-7 w-7 ${item.color} fill-current`} />
              </div>
              <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                    <img src={`https://picsum.photos/50/50?random=${idx + 20}`} className="w-8 h-8 rounded-full" alt="" />
                 </div>
                 <div className="text-slate-900 text-[15px]">
                    <span className="font-bold">{item.title}</span> <span className="text-slate-500">· {item.time}</span>
                    <div className="text-slate-600 mt-1">{item.content}</div>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};