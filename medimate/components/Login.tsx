import React, { useState } from 'react';
import { UserRole } from '../types';
import { X, ArrowRight, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';

interface LoginProps {
  setRole: (role: UserRole) => void;
  onClose: () => void;
  lang: 'zh' | 'en';
}

export const Login: React.FC<LoginProps> = ({ setRole, onClose, lang }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.PATIENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const texts = {
    zh: {
      title: '登录 MediMate',
      subtitle: '专业的陪诊服务平台',
      emailLabel: '电子邮箱',
      emailPlaceholder: '请输入邮箱',
      passwordLabel: '密码',
      passwordPlaceholder: '请输入密码',
      login: '登录',
      agreement: '登录即代表同意《用户协议》和《隐私政策》',
      patientLogin: '我是患者 (演示入口)',
      escortLogin: '我是陪诊师 (演示入口)',
      guest: '先逛逛',
      roleSelection: '选择身份',
      patient: '患者',
      escort: '陪诊师',
      loginFailed: '登录失败',
      invalidCredentials: '邮箱或密码错误',
      networkError: '网络错误，请稍后重试'
    },
    en: {
      title: 'Login to MediMate',
      subtitle: 'Professional Medical Escort Platform',
      emailLabel: 'Email',
      emailPlaceholder: 'Enter email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter password',
      login: 'Login',
      agreement: 'By logging in, you agree to our Terms and Privacy Policy',
      patientLogin: 'I am a Patient (Demo)',
      escortLogin: 'I am an Escort (Demo)',
      guest: 'Browse as Guest',
      roleSelection: 'Select Role',
      patient: 'Patient',
      escort: 'Escort',
      loginFailed: 'Login Failed',
      invalidCredentials: 'Invalid email or password',
      networkError: 'Network error, please try again later'
    }
  };

  const t = texts[lang];

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t.invalidCredentials);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 使用API服务进行登录
      await apiService.login({
        email,
        password,
        role: selectedRole
      });
      
      // 登录成功后设置角色并关闭登录窗口
      setRole(selectedRole);
      onClose();
    } catch (err) {
      console.error('Login error:', err);
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    // 演示登录，使用模拟数据
    setRole(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-600">
                <div className="font-medium">{t.loginFailed}</div>
                <div>{error}</div>
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t.roleSelection}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`py-3 px-4 rounded-xl font-bold text-sm transition-colors ${selectedRole === UserRole.PATIENT 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}
                  onClick={() => setSelectedRole(UserRole.PATIENT)}
                >
                  {t.patient}
                </button>
                <button
                  className={`py-3 px-4 rounded-xl font-bold text-sm transition-colors ${selectedRole === UserRole.ESCORT 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                  onClick={() => setSelectedRole(UserRole.ESCORT)}
                >
                  {t.escort}
                </button>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t.emailLabel}</label>
              <div className="border-b-2 border-slate-100 focus-within:border-black transition-colors py-2">
                <input 
                  type="email" 
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 outline-none text-lg bg-transparent placeholder-slate-400 text-slate-900"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t.passwordLabel}</label>
              <div className="border-b-2 border-slate-100 focus-within:border-black transition-colors py-2">
                <input 
                  type="password" 
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 outline-none text-lg bg-transparent placeholder-slate-400 text-slate-900"
                />
              </div>
            </div>

            {/* Login Button */}
            <button 
              className="w-full bg-black text-white rounded-full py-4 font-bold text-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleLogin}
              disabled={loading || !email || !password}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                t.login
              )}
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
               onClick={() => handleDemoLogin(UserRole.PATIENT)}
             >
               {t.patientLogin}
             </button>
             <button 
                className="text-indigo-600 font-bold text-sm bg-indigo-50 py-3 rounded-xl hover:bg-indigo-100 transition-colors"
                onClick={() => handleDemoLogin(UserRole.ESCORT)}
             >
               {t.escortLogin}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};