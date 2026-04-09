import React from 'react';
import { UserRole } from '../../types';

interface AuthRoleSwitchProps {
  lang: 'zh' | 'en';
  value: UserRole;
  onChange: (role: UserRole) => void;
}

export const AuthRoleSwitch: React.FC<AuthRoleSwitchProps> = ({ lang, value, onChange }) => {
  const labels = {
    zh: {
      title: '选择身份',
      patient: {
        label: '患者',
        description: '需要陪诊、取报告或预约协助',
      },
      escort: {
        label: '陪诊师',
        description: '管理订单并提供专业陪护服务',
      },
    },
    en: {
      title: 'Select role',
      patient: {
        label: 'Patient',
        description: 'Need escort support for visits and appointments',
      },
      escort: {
        label: 'Escort',
        description: 'Manage orders and provide escort services',
      },
    },
  }[lang];

  const options = [
    { role: UserRole.PATIENT, ...labels.patient },
    { role: UserRole.ESCORT, ...labels.escort },
  ];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-600">{labels.title}</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const active = value === option.role;
          return (
            <button
              key={option.role}
              type="button"
              onClick={() => onChange(option.role)}
              className={`group rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
                active
                  ? 'border-teal-500 bg-teal-50/90 shadow-[0_12px_30px_rgba(13,148,136,0.12)]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{option.label}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                </div>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 ${
                    active
                      ? 'border-teal-500 bg-teal-500 text-white'
                      : 'border-slate-300 bg-white text-transparent group-hover:border-slate-400'
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      active ? 'bg-white' : 'bg-slate-300 group-hover:bg-slate-400'
                    }`}
                  />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
