import React, { useState } from 'react';
import { UserRole } from '../types';
import { X, Smartphone, ArrowRight } from 'lucide-react';

interface LoginProps {
  setRole: (role: UserRole) => void;
  onClose: () => void;
  lang: 'zh' | 'en';
}

export const Login: React.FC<LoginProps> = ({ setRole, onClose, lang }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  
  const texts = {
    zh: {
      title: '登录 MediMate',
      subtitle: '专业的陪诊服务平台',
      phoneLabel: '手机号码',
      phonePlaceholder: '请输入手机号',
      codeLabel: '验证码',
      codePlaceholder: '请输入验证码',
      getCode: '获取验证码',
      resend: '重新发送',
      next: '下一步',
      login: '登录',
      agreement: '登录即代表同意《用户协议》和《隐私政策》',
      patientLogin: '我是患者 (演示入口)',
      escortLogin: '我是陪诊师 (演示入口)',
      guest: '先逛逛',
      prefix: '+86'
    },
    en: {
      title: 'Login to MediMate',
      subtitle: 'Professional Medical Escort Platform',
      phoneLabel: 'Phone Number',
      phonePlaceholder: 'Enter phone number',
      codeLabel: 'Verification Code',
      codePlaceholder: 'Enter code',
      getCode: 'Get Code',
      resend: 'Resend',
      next: 'Next',
      login: 'Login',
      agreement: 'By logging in, you agree to our Terms and Privacy Policy',
      patientLogin: 'I am a Patient (Demo)',
      escortLogin: 'I am an Escort (Demo)',
      guest: 'Browse as Guest',
      prefix: '+86'
    }
  };

  const t = texts[lang];

  const handleNext = () => {
    if (step === 'phone' && phoneNumber) {
      setStep('code');
    } else if (step === 'code') {
      // Mock login logic
      setRole(UserRole.PATIENT);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pt-safe pb-safe">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl flex flex-col min-h-[500px]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="h-6 w-6 text-slate-500" />
          </button>
          <div className="font-bold text-lg text-slate-400">MediMate</div>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4">
          <h1 className="text-3xl font-black text-slate-900 mb-2">{t.title}</h1>
          <p className="text-slate-500 mb-8">{t.subtitle}</p>
          
          <div className="space-y-6">
             {step === 'phone' ? (
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">{t.phoneLabel}</label>
                 <div className="flex border-b-2 border-slate-100 focus-within:border-black transition-colors py-2">
                    <span className="text-slate-900 font-bold mr-4 text-lg">{t.prefix}</span>
                    <input 
                      type="tel" 
                      placeholder={t.phonePlaceholder}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 outline-none text-lg bg-transparent placeholder-slate-400 text-slate-900"
                      autoFocus
                    />
                 </div>
               </div>
             ) : (
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t.codeLabel}</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={t.codePlaceholder}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="flex-1 border-b-2 border-slate-100 focus:border-black outline-none text-lg py-2 bg-transparent"
                      autoFocus
                    />
                    <button className="text-sm font-bold text-slate-500 hover:text-black">
                      {t.resend}
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {lang === 'zh' ? `验证码已发送至 +86 ${phoneNumber}` : `Code sent to +86 ${phoneNumber}`}
                  </div>
               </div>
             )}

             <button 
               className="w-full bg-black text-white rounded-full py-4 font-bold text-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
               onClick={handleNext}
               disabled={step === 'phone' && !phoneNumber}
             >
               {step === 'phone' ? t.next : t.login}
               {step === 'phone' && <ArrowRight className="h-5 w-5" />}
             </button>
             
             <p className="text-xs text-slate-400 text-center leading-relaxed px-4">
               {t.agreement}
             </p>
          </div>
        </div>

        {/* Demo Roles Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100">
           <div className="grid grid-cols-2 gap-4">
             <button 
               className="text-teal-600 font-bold text-sm bg-teal-50 py-3 rounded-xl hover:bg-teal-100 transition-colors"
               onClick={() => { setRole(UserRole.PATIENT); onClose(); }}
             >
               {t.patientLogin}
             </button>
             <button 
                className="text-indigo-600 font-bold text-sm bg-indigo-50 py-3 rounded-xl hover:bg-indigo-100 transition-colors"
                onClick={() => { setRole(UserRole.ESCORT); onClose(); }}
             >
               {t.escortLogin}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};