/**
 * 格式化工具函数
 * 统一日期、货币、时间等格式化逻辑
 */

/**
 * 格式化日期
 */
export const formatDate = (dateStr: string, lang: 'zh' | 'en' = 'zh'): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * 格式化时间
 */
export const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 格式化日期时间
 */
export const formatDateTime = (dateStr: string, lang: 'zh' | 'en' = 'zh'): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 格式化货币 (单位：分 -> 元)
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${(amount / 100).toFixed(2)}`;
};

/**
 * 格式化相对时间 (如"3小时前")
 */
export const formatRelativeTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return formatDate(dateStr);
};

/**
 * 格式化时长 (如 "2小时30分钟")
 */
export const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0分钟';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}分钟`;
  if (mins === 0) return `${hours}小时`;
  return `${hours}小时${mins}分钟`;
};
