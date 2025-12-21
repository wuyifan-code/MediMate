import React from 'react';
import { Language } from '../types';
import { ArrowLeft, Globe, Check } from 'lucide-react';

interface SettingsProps {
  currentLang: Language;
  setLang: (lang: Language) => void;
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentLang, setLang, onBack }) => {
  const texts = {
    zh: {
      title: '设置',
      accessibility: '辅助功能、显示与语言',
      languages: '语言',
      displayLang: '显示语言',
      chinese: '简体中文',
      english: 'English'
    },
    en: {
      title: 'Settings',
      accessibility: 'Accessibility, display and languages',
      languages: 'Languages',
      displayLang: 'Display Language',
      chinese: 'Simplified Chinese',
      english: 'English'
    }
  };

  const t = texts[currentLang];

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 h-[53px] flex items-center gap-6 cursor-pointer" onClick={onBack}>
         <ArrowLeft className="h-5 w-5 hover:bg-slate-100 rounded-full" />
         <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
      </div>

      <div className="p-4">
        <h2 className="text-xl font-black mb-6">{t.accessibility}</h2>
        
        <div className="space-y-6">
           <div>
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                 <Globe className="h-5 w-5" />
                 <span className="font-bold text-slate-900">{t.languages}</span>
              </div>
              <p className="text-sm text-slate-500 mb-4 ml-8">
                 Manage which languages are used to personalize your MediMate experience.
              </p>
              
              <div className="ml-8 space-y-1">
                 <div 
                   className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer rounded-xl transition-colors"
                   onClick={() => setLang('zh')}
                 >
                    <span className="font-medium">{t.chinese}</span>
                    {currentLang === 'zh' && <Check className="h-5 w-5 text-teal-600" />}
                 </div>
                 
                 <div 
                   className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer rounded-xl transition-colors"
                   onClick={() => setLang('en')}
                 >
                    <span className="font-medium">{t.english}</span>
                    {currentLang === 'en' && <Check className="h-5 w-5 text-teal-600" />}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};