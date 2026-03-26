import React, { useState } from 'react';
import { X, Star, BadgeCheck, Calendar, Clock, FileText, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/apiService';
import { CreateOrderRequest, ServiceType } from '../types';

export type ServiceTypeKey = 'FULL_PROCESS' | 'APPOINTMENT' | 'REPORT_PICKUP' | 'VIP_TRANSPORT';

interface EscortInfo {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  hourly_rate: number;
  is_verified?: boolean;
}

interface OrderConfirmationProps {
  escort: EscortInfo;
  serviceType: ServiceTypeKey;
  servicePrice: number;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
  lang?: 'zh' | 'en';
}

const PLATFORM_FEE = 10;

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  escort,
  serviceType,
  servicePrice,
  onSuccess,
  onCancel,
  lang = 'zh'
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(1);
  const [notes, setNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);

  const texts = {
    zh: {
      title: '确认下单',
      serviceDetails: '服务详情',
      escortInfo: '陪诊师信息',
      priceDetails: '价格明细',
      serviceFee: '服务费',
      platformFee: '平台费',
      couponDiscount: '优惠券',
      total: '总计',
      serviceTime: '服务时间',
      selectDate: '选择日期',
      selectTime: '选择时间',
      duration: '服务时长',
      hours: '小时',
      notes: '备注',
      notesPlaceholder: '请输入备注信息（可选）',
      coupon: '优惠券',
      couponPlaceholder: '请输入优惠券码',
      apply: '应用',
      applySuccess: '优惠券已应用',
      applyFailed: '优惠券无效',
      confirm: '确认下单',
      cancel: '取消',
      validating: '验证中...',
      orderSuccess: '订单创建成功！',
      orderFailed: '订单创建失败',
      requiredField: '请选择服务时间',
      serviceTypes: {
        FULL_PROCESS: '全程陪诊',
        APPOINTMENT: '代约挂号',
        REPORT_PICKUP: '代取报告',
        VIP_TRANSPORT: '专车接送'
      },
      serviceDescriptions: {
        FULL_PROCESS: '从挂号到取药的全称陪伴服务',
        APPOINTMENT: '帮助预约专家号',
        REPORT_PICKUP: '代取检查报告并解读',
        VIP_TRANSPORT: '舒适专车接送服务'
      },
      timeSlots: [
        { value: '08:00', label: '08:00' },
        { value: '09:00', label: '09:00' },
        { value: '10:00', label: '10:00' },
        { value: '11:00', label: '11:00' },
        { value: '14:00', label: '14:00' },
        { value: '15:00', label: '15:00' },
        { value: '16:00', label: '16:00' },
        { value: '17:00', label: '17:00' }
      ],
      rating: '评分',
      verified: '已认证',
      completedOrders: '已完成订单'
    },
    en: {
      title: 'Confirm Order',
      serviceDetails: 'Service Details',
      escortInfo: 'Escort Information',
      priceDetails: 'Price Details',
      serviceFee: 'Service Fee',
      platformFee: 'Platform Fee',
      couponDiscount: 'Coupon Discount',
      total: 'Total',
      serviceTime: 'Service Time',
      selectDate: 'Select Date',
      selectTime: 'Select Time',
      duration: 'Duration',
      hours: 'hours',
      notes: 'Notes',
      notesPlaceholder: 'Enter notes (optional)',
      coupon: 'Coupon',
      couponPlaceholder: 'Enter coupon code',
      apply: 'Apply',
      applySuccess: 'Coupon applied successfully',
      applyFailed: 'Invalid coupon',
      confirm: 'Confirm Order',
      cancel: 'Cancel',
      validating: 'Validating...',
      orderSuccess: 'Order created successfully!',
      orderFailed: 'Order creation failed',
      requiredField: 'Please select service time',
      serviceTypes: {
        FULL_PROCESS: 'Full Service',
        APPOINTMENT: 'Appointment Booking',
        REPORT_PICKUP: 'Report Pickup',
        VIP_TRANSPORT: 'VIP Transport'
      },
      serviceDescriptions: {
        FULL_PROCESS: 'Full escort service from registration to medication pickup',
        APPOINTMENT: 'Help booking specialist appointments',
        REPORT_PICKUP: 'Pick up and interpret medical reports',
        VIP_TRANSPORT: 'Comfortable private car transport service'
      },
      timeSlots: [
        { value: '08:00', label: '08:00' },
        { value: '09:00', label: '09:00' },
        { value: '10:00', label: '10:00' },
        { value: '11:00', label: '11:00' },
        { value: '14:00', label: '14:00' },
        { value: '15:00', label: '15:00' },
        { value: '16:00', label: '16:00' },
        { value: '17:00', label: '17:00' }
      ],
      rating: 'Rating',
      verified: 'Verified',
      completedOrders: 'Completed Orders'
    }
  };

  const t = texts[lang];

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    return threeMonthsLater.toISOString().split('T')[0];
  };

  const calculateTotal = () => {
    const serviceTotal = servicePrice * duration;
    const subtotal = serviceTotal + PLATFORM_FEE;
    return Math.max(0, subtotal - couponDiscount);
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    
    if (couponCode.toUpperCase() === 'MEDIMATE10') {
      setCouponDiscount(10);
    } else if (couponCode.toUpperCase() === 'WELCOME20') {
      setCouponDiscount(20);
    } else {
      setError(t.applyFailed);
      setTimeout(() => setError(''), 2000);
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedDate || !selectedTime) {
      setError(t.requiredField);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderData: CreateOrderRequest = {
        escortId: escort.id,
        serviceType: serviceType as ServiceType,
        price: servicePrice,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        duration: duration,
        notes: notes,
        couponCode: couponCode || undefined,
        platformFee: PLATFORM_FEE,
      };

      const response = await apiService.createAppointment(orderData);
      
      if (response && response.id) {
        onSuccess(response.id);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Create order error:', err);
      setError(error.response?.data?.message || error.message || t.orderFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden relative shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-black text-slate-900">{t.title}</h2>
          <button 
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-500 mb-2">{t.serviceDetails}</h3>
            <div className="font-bold text-lg text-slate-900">
              {t.serviceTypes[serviceType]}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {t.serviceDescriptions[serviceType]}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-500 mb-3">{t.escortInfo}</h3>
            <div className="flex items-center gap-3">
              <img 
                src={escort.avatar || `https://ui-avatars.com/api/?name=${escort.name}&background=random`}
                alt={escort.name}
                className="w-14 h-14 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{escort.name}</span>
                  {escort.is_verified && (
                    <BadgeCheck className="h-5 w-5 text-teal-500" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-slate-700">{escort.rating?.toFixed(1) || '0.0'}</span>
                    <span>{t.rating}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  ¥{escort.hourly_rate || 0}/{lang === 'zh' ? '小时' : 'hr'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-500 mb-3">{t.serviceTime}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                {t.selectDate}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                {t.selectTime}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {t.timeSlots.map((slot) => (
                  <button
                    key={slot.value}
                    onClick={() => setSelectedTime(slot.value)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedTime === slot.value
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.duration}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDuration(Math.max(1, duration - 1))}
                  className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                >
                  -
                </button>
                <span className="text-xl font-bold text-slate-900 min-w-[60px] text-center">
                  {duration} {t.hours}
                </span>
                <button
                  onClick={() => setDuration(Math.min(12, duration + 1))}
                  className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-500 mb-3">{t.priceDetails}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>{t.serviceFee}</span>
                <span>¥{servicePrice} × {duration} {t.hours}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t.platformFee}</span>
                <span>¥{PLATFORM_FEE}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t.couponDiscount}</span>
                  <span>-¥{couponDiscount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t border-slate-100">
                <span>{t.total}</span>
                <span className="text-teal-600">¥{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              {t.notes}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Tag className="h-4 w-4 inline mr-1" />
              {t.coupon}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={t.couponPlaceholder}
                disabled={couponDiscount > 0}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-slate-100"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || couponDiscount > 0}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.apply}
              </button>
            </div>
            {couponDiscount > 0 && (
              <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                <BadgeCheck className="h-4 w-4" />
                {t.applySuccess}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-slate-300 rounded-full font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirmOrder}
            disabled={loading || !selectedDate || !selectedTime}
            className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-full font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t.validating}
              </>
            ) : (
              t.confirm
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
