/**
 * 状态显示辅助函数
 * 统一订单状态、支付状态、退款状态等的显示配置
 */

type StatusConfig = {
  zh: string;
  en: string;
  color: string;
  bgColor: string;
};

// 订单状态映射
const ORDER_STATUS_MAP: Record<string, StatusConfig> = {
  PENDING: { zh: '待支付', en: 'Pending', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  PAID: { zh: '已支付', en: 'Paid', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  CONFIRMED: { zh: '已确认', en: 'Confirmed', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  MATCHED: { zh: '已匹配', en: 'Matched', color: 'text-purple-800', bgColor: 'bg-purple-100' },
  IN_PROGRESS: { zh: '服务中', en: 'In Progress', color: 'text-indigo-800', bgColor: 'bg-indigo-100' },
  EVIDENCE_COLLECTING: { zh: '取证中', en: 'Collecting', color: 'text-orange-800', bgColor: 'bg-orange-100' },
  MEMO_GENERATING: { zh: '生成中', en: 'Generating', color: 'text-teal-800', bgColor: 'bg-teal-100' },
  COMPLETED: { zh: '已完成', en: 'Completed', color: 'text-green-800', bgColor: 'bg-green-100' },
  CANCELLED: { zh: '已取消', en: 'Cancelled', color: 'text-gray-800', bgColor: 'bg-gray-100' },
  REFUNDING: { zh: '退款中', en: 'Refunding', color: 'text-orange-800', bgColor: 'bg-orange-100' },
  REFUNDED: { zh: '已退款', en: 'Refunded', color: 'text-red-800', bgColor: 'bg-red-100' },
};

// 支付状态映射
const PAYMENT_STATUS_MAP: Record<string, StatusConfig> = {
  PENDING: { zh: '待支付', en: 'Pending', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  COMPLETED: { zh: '已支付', en: 'Completed', color: 'text-green-800', bgColor: 'bg-green-100' },
  REFUNDED: { zh: '已退款', en: 'Refunded', color: 'text-red-800', bgColor: 'bg-red-100' },
  FAILED: { zh: '支付失败', en: 'Failed', color: 'text-red-800', bgColor: 'bg-red-100' },
};

// 退款状态映射
const REFUND_STATUS_MAP: Record<string, StatusConfig> = {
  PENDING: { zh: '待审核', en: 'Pending', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  APPROVED: { zh: '已批准', en: 'Approved', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  REJECTED: { zh: '已拒绝', en: 'Rejected', color: 'text-red-800', bgColor: 'bg-red-100' },
  PROCESSING: { zh: '处理中', en: 'Processing', color: 'text-orange-800', bgColor: 'bg-orange-100' },
  COMPLETED: { zh: '已完成', en: 'Completed', color: 'text-green-800', bgColor: 'bg-green-100' },
  FAILED: { zh: '失败', en: 'Failed', color: 'text-red-800', bgColor: 'bg-red-100' },
};

/**
 * 获取状态配置
 */
export const getStatusConfig = (
  status: string,
  type: 'order' | 'payment' | 'refund' = 'order',
  lang: 'zh' | 'en' = 'zh'
): StatusConfig => {
  const configMap =
    type === 'order'
      ? ORDER_STATUS_MAP
      : type === 'payment'
        ? PAYMENT_STATUS_MAP
        : REFUND_STATUS_MAP;

  return (
    configMap[status] || {
      zh: status,
      en: status,
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
    }
  );
};

/**
 * 获取状态标签文本
 */
export const getStatusLabel = (
  status: string,
  type: 'order' | 'payment' | 'refund' = 'order',
  lang: 'zh' | 'en' = 'zh'
): string => {
  return getStatusConfig(status, type, lang)[lang];
};

/**
 * 获取状态文字颜色类名
 */
export const getStatusColor = (status: string, type: 'order' | 'payment' | 'refund' = 'order'): string => {
  return getStatusConfig(status, type).color;
};

/**
 * 获取状态背景颜色类名
 */
export const getStatusBgColor = (status: string, type: 'order' | 'payment' | 'refund' = 'order'): string => {
  return getStatusConfig(status, type).bgColor;
};

/**
 * 获取状态Badge的完整类名
 */
export const getStatusBadgeClass = (
  status: string,
  type: 'order' | 'payment' | 'refund' = 'order'
): string => {
  const config = getStatusConfig(status, type);
  return `${config.bgColor} ${config.color} px-2 py-1 rounded-full text-xs font-medium`;
};
