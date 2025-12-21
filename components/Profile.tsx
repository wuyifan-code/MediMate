import React, { useState } from 'react';
import { Language, UserRole } from '../types';
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon, MoreHorizontal, Mail } from 'lucide-react';

interface ProfileProps {
  lang: Language;
  role: UserRole;
  onBack?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ lang, role, onBack }) => {
  const [activeTab, setActiveTab] = useState('posts');
  
  const isGuest = role === UserRole.GUEST;
  const isEscort = role === UserRole.ESCORT;

  const t = {
    zh: {
      posts: '服务记录', // Posts -> Service History
      replies: '评价', // Replies -> Reviews
      media: '媒体',
      likes: '收藏',
      edit: '编辑资料',
      follow: '关注',
      joined: '2023年9月加入',
      location: '中国 · 北京',
      guestName: '游客',
      guestBio: '登录后查看您的就医档案和订单记录。',
      patientName: '用户_9527',
      patientBio: '慢性病管理 | 定期复查 | 寻找专业心内科陪诊',
      escortName: '王淑芬',
      escortBio: '三甲医院护士退休 🏥 | 5年陪诊经验 | 熟悉协和/301就医流程 | 专业负责 ❤️',
      following: '关注',
      followers: '粉丝',
      historyItem: '完成了在 [北京大学第一医院] 的陪诊服务。',
      reviewItem: '回复 @user123: 感谢您的信任，祝老人早日康复！🙏'
    },
    en: {
      posts: 'History',
      replies: 'Reviews',
      media: 'Media',
      likes: 'Likes',
      edit: 'Edit Profile',
      follow: 'Follow',
      joined: 'Joined September 2023',
      location: 'Beijing, China',
      guestName: 'Guest User',
      guestBio: 'Log in to view your medical records.',
      patientName: 'User_9527',
      patientBio: 'Chronic care management | Regular checkups',
      escortName: 'Wang Shufen',
      escortBio: 'Retired Nurse 🏥 | 5 years experience | Expert in Cardiology care ❤️',
      following: 'Following',
      followers: 'Followers',
      historyItem: 'Completed service at Peking University First Hospital.',
      reviewItem: 'Replying to @user123: Thank you for your trust!'
    }
  }[lang];

  const profileData = {
    name: isGuest ? t.guestName : (isEscort ? t.escortName : t.patientName),
    handle: isGuest ? '@guest' : (isEscort ? '@wang_pro' : '@patient_9527'),
    bio: isGuest ? t.guestBio : (isEscort ? t.escortBio : t.patientBio),
    following: isGuest ? 0 : (isEscort ? 12 : 45),
    followers: isGuest ? 0 : (isEscort ? 3420 : 2),
    avatar: isGuest 
      ? 'https://ui-avatars.com/api/?name=Guest&background=random' 
      : (isEscort ? 'https://picsum.photos/200/200?random=1' : 'https://picsum.photos/200/200?random=50'),
    banner: 'https://picsum.photos/600/200?grayscale'
  };

  return (
    <div className="pb-20">
       {/* Sticky Header */}
       <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md px-4 py-1 flex items-center gap-6 cursor-pointer border-b border-slate-100 pt-safe" onClick={onBack}>
          <div className="p-2 hover:bg-slate-100 rounded-full transition-colors">
             <ArrowLeft className="h-5 w-5 text-slate-900" />
          </div>
          <div>
             <div className="font-bold text-xl text-slate-900 leading-tight">{profileData.name}</div>
             <div className="text-xs text-slate-500">{isGuest ? 0 : 124} {t.posts}</div>
          </div>
       </div>

       {/* Banner */}
       <div className="h-32 bg-slate-200 w-full overflow-hidden">
          <img src={profileData.banner} className="w-full h-full object-cover" alt="Banner" />
       </div>

       {/* Profile Actions & Avatar */}
       <div className="px-4 relative mb-4">
          <div className="absolute -top-16 left-4">
             <img src={profileData.avatar} className="w-32 h-32 rounded-full border-4 border-white object-cover" alt="Avatar" />
          </div>
          <div className="flex justify-end py-3 gap-2">
             <div className="w-9 h-9 border border-slate-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-50">
                <MoreHorizontal className="h-5 w-5 text-slate-900" />
             </div>
             {isGuest ? (
                <button className="px-5 py-1.5 bg-black text-white rounded-full font-bold text-sm hover:bg-slate-800">
                   Login
                </button>
             ) : (
                <>
                  {!isEscort && <div className="w-9 h-9 border border-slate-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-50"><Mail className="h-5 w-5 text-slate-900" /></div>}
                  <button className="px-4 py-1.5 border border-slate-300 rounded-full font-bold text-sm hover:bg-slate-50 text-slate-900">
                     {t.edit}
                  </button>
                </>
             )}
          </div>
       </div>

       {/* Bio Section */}
       <div className="px-4 mb-4">
          <div className="font-black text-xl text-slate-900 leading-tight">{profileData.name}</div>
          <div className="text-slate-500 text-sm mb-3">{profileData.handle}</div>
          <div className="text-slate-900 mb-3 whitespace-pre-line">{profileData.bio}</div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-sm mb-3">
             <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {t.location}
             </div>
             <div className="flex items-center gap-1">
                <LinkIcon className="h-4 w-4" />
                <span className="text-teal-500">medimate.cn</span>
             </div>
             <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {t.joined}
             </div>
          </div>

          <div className="flex gap-4 text-sm">
             <div className="hover:underline cursor-pointer"><span className="font-bold text-slate-900">{profileData.following}</span> <span className="text-slate-500">{t.following}</span></div>
             <div className="hover:underline cursor-pointer"><span className="font-bold text-slate-900">{profileData.followers}</span> <span className="text-slate-500">{t.followers}</span></div>
          </div>
       </div>

       {/* Tabs */}
       <div className="flex border-b border-slate-100">
         {[t.posts, t.replies, t.media, t.likes].map((tab) => (
           <div 
             key={tab} 
             className="flex-1 hover:bg-slate-50 cursor-pointer flex justify-center py-3 relative transition-colors"
             onClick={() => setActiveTab(tab)}
           >
              <span className={`font-bold text-sm ${activeTab === tab ? 'text-slate-900' : 'text-slate-500'}`}>{tab}</span>
              {activeTab === tab && <div className="absolute bottom-0 w-14 h-1 bg-teal-500 rounded-full"></div>}
           </div>
         ))}
       </div>

       {/* Feed (Posts) */}
       <div className="divide-y divide-slate-100">
          {/* Item 1 */}
          <div className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3">
              <img src={profileData.avatar} className="w-10 h-10 rounded-full" alt="" />
              <div>
                 <div className="flex items-center gap-1 text-slate-500 text-sm">
                    <span className="font-bold text-slate-900">{profileData.name}</span>
                    <span>{profileData.handle}</span>
                    <span>· 1d</span>
                 </div>
                 <div className="text-slate-900 mt-0.5">
                    {activeTab === t.posts ? t.historyItem : t.reviewItem}
                 </div>
              </div>
          </div>
          {/* Item 2 */}
          <div className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3">
              <img src={profileData.avatar} className="w-10 h-10 rounded-full" alt="" />
              <div>
                 <div className="flex items-center gap-1 text-slate-500 text-sm">
                    <span className="font-bold text-slate-900">{profileData.name}</span>
                    <span>{profileData.handle}</span>
                    <span>· 5d</span>
                 </div>
                 <div className="text-slate-900 mt-0.5">
                    {isEscort ? '分享今日陪诊日常：耐心是最大的良药 💊' : '又一次顺利的就医体验，感谢平台。'}
                 </div>
              </div>
          </div>
       </div>
    </div>
  );
};