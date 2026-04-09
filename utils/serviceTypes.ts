/**
 * 服务类型常量与标签
 * 统一管理所有服务类型的显示标签，避免在多个组件中重复定义
 */

import type { ServiceType } from '../types';

export const SERVICE_TYPE_LABELS: Record<ServiceType, { zh: string; en: string }> = {
  FULL_PROCESS: { zh: '全程陪诊', en: 'Full Service' },
  APPOINTMENT: { zh: '代约挂号', en: 'Appointment' },
  REPORT_PICKUP: { zh: '代取报告', en: 'Report Pickup' },
  VIP_TRANSPORT: { zh: '专车接送', en: 'VIP Transport' },
};

export const SERVICE_TYPES = [
  { value: 'ALL', label: { zh: '全部服务', en: 'All Services' } },
  { value: 'FULL_PROCESS', label: { zh: '全程陪诊', en: 'Full Service' } },
  { value: 'APPOINTMENT', label: { zh: '代约挂号', en: 'Appointment' } },
  { value: 'REPORT_PICKUP', label: { zh: '代取报告', en: 'Report Pickup' } },
  { value: 'VIP_TRANSPORT', label: { zh: '专车接送', en: 'VIP Transport' } },
] as const;

/**
 * 获取服务类型标签
 */
export function getServiceTypeLabel(type: string, lang: 'zh' | 'en' = 'zh'): string {
  return SERVICE_TYPE_LABELS[type as ServiceType]?.[lang] || type;
}

/**
 * 获取所有服务类型选项（用于下拉选择）
 */
export function getServiceTypeOptions(lang: 'zh' | 'en' = 'zh') {
  return SERVICE_TYPES.map(st => ({
    value: st.value,
    label: st.label[lang],
  }));
}
