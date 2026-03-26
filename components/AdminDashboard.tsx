import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Language } from '../types';
import {
  Users, ShoppingCart, UserCheck, DollarSign, TrendingUp,
  ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight,
  Check, X, Eye, Edit, Ban, Unlock, AlertTriangle, FileText,
  Download, ChevronDown, Columns, Filter, RotateCcw, BarChart3,
  PieChart, Calendar, User, Phone, Mail, MapPin, Activity
} from 'lucide-react';

interface AdminDashboardProps {
  lang: Language;
}

const translations = {
  zh: {
    dashboard: '概览',
    users: '用户管理',
    orders: '订单管理',
    escorts: '陪诊师管理',
    refunds: '退款管理',
    complaints: '投诉管理',
    statistics: '数据统计',
    totalUsers: '总用户数',
    totalOrders: '总订单数',
    pendingOrders: '待处理订单',
    totalRevenue: '总收入',
    recentOrders: '最近订单',
    recentUsers: '最近用户',
    pendingEscorts: '待审核陪诊师',
    viewAll: '查看全部',
    search: '搜索用户、订单...',
    status: '状态',
    role: '角色',
    active: '正常',
    inactive: '禁用',
    patient: '患者',
    escort: '陪诊师',
    admin: '管理员',
    pending: '待处理',
    completed: '已完成',
    cancelled: '已取消',
    all: '全部',
    verify: '审核',
    disable: '禁用',
    enable: '启用',
    edit: '编辑',
    view: '查看',
    export: '导出',
    filter: '筛选',
    noData: '暂无数据',
    loading: '加载中...',
    error: '加载失败',
    retry: '重试',
    prev: '上一页',
    next: '下一页',
    page: '页',
    of: '共',
    items: '条',
    orderNo: '订单号',
    patientName: '患者',
    escortName: '陪诊师',
    hospital: '医院',
    serviceType: '服务类型',
    price: '价格',
    createdAt: '创建时间',
    updatedAt: '更新时间',
    actions: '操作',
    name: '姓名',
    phone: '电话',
    email: '邮箱',
    verified: '已认证',
    unverified: '未认证',
    rating: '评分',
    completedOrders: '完成订单',
    idCard: '身份证',
    certificate: '资格证书',
    approve: '通过',
    reject: '拒绝',
    reason: '原因',
    confirm: '确认',
    cancel: '取消',
    success: '成功',
    failed: '失败',
    orderDetails: '订单详情',
    userDetails: '用户详情',
    escortDetails: '陪诊师详情',
    assignEscort: '分配陪诊师',
    updateStatus: '更新状态',
    refundManagement: '退款管理',
    refundRequests: '退款申请',
    pendingRefunds: '待处理退款',
    approvedRefunds: '已批准退款',
    rejectedRefunds: '已拒绝退款',
    refundAmount: '退款金额',
    refundReason: '退款原因',
    refundTime: '申请时间',
    approveRefund: '批准退款',
    rejectRefund: '拒绝退款',
    refundReasonPlaceholder: '请输入处理原因...',
    refundDetails: '退款详情',
    refundSuccess: '退款处理成功',
    refundFailed: '退款处理失败',
    userStats: '用户统计',
    orderStats: '订单统计',
    revenueStats: '收入统计',
    newUsers: '新增用户',
    activeUsers: '活跃用户',
    cancelledOrders: '已取消订单',
    refundedOrders: '已退款订单',
    refundRate: '退款率',
    averageOrderValue: '平均订单金额',
    dateRange: '日期范围',
    startDate: '开始日期',
    endDate: '结束日期',
    apply: '应用',
    reset: '重置',
    editUser: '编辑用户',
    save: '保存',
    cancelOrder: '取消订单',
    cancelReason: '取消原因',
    cancelReasonPlaceholder: '请输入取消原因...',
    confirmCancel: '确认取消',
    viewDetails: '查看详情',
    viewRefund: '查看退款',
  },
  en: {
    dashboard: 'Dashboard',
    users: 'Users',
    orders: 'Orders',
    escorts: 'Escorts',
    refunds: 'Refunds',
    complaints: 'Complaints',
    statistics: 'Statistics',
    totalUsers: 'Total Users',
    totalOrders: 'Total Orders',
    pendingOrders: 'Pending Orders',
    totalRevenue: 'Total Revenue',
    recentOrders: 'Recent Orders',
    recentUsers: 'Recent Users',
    pendingEscorts: 'Pending Escorts',
    viewAll: 'View All',
    search: 'Search users, orders...',
    status: 'Status',
    role: 'Role',
    active: 'Active',
    inactive: 'Inactive',
    patient: 'Patient',
    escort: 'Escort',
    admin: 'Admin',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    all: 'All',
    verify: 'Verify',
    disable: 'Disable',
    enable: 'Enable',
    edit: 'Edit',
    view: 'View',
    export: 'Export',
    filter: 'Filter',
    noData: 'No data',
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    prev: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    items: 'items',
    orderNo: 'Order No',
    patientName: 'Patient',
    escortName: 'Escort',
    hospital: 'Hospital',
    serviceType: 'Service Type',
    price: 'Price',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    actions: 'Actions',
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    verified: 'Verified',
    unverified: 'Unverified',
    rating: 'Rating',
    completedOrders: 'Completed Orders',
    idCard: 'ID Card',
    certificate: 'Certificate',
    approve: 'Approve',
    reject: 'Reject',
    reason: 'Reason',
    confirm: 'Confirm',
    cancel: 'Cancel',
    success: 'Success',
    failed: 'Failed',
    orderDetails: 'Order Details',
    userDetails: 'User Details',
    escortDetails: 'Escort Details',
    assignEscort: 'Assign Escort',
    updateStatus: 'Update Status',
    refundManagement: 'Refund Management',
    refundRequests: 'Refund Requests',
    pendingRefunds: 'Pending Refunds',
    approvedRefunds: 'Approved Refunds',
    rejectedRefunds: 'Rejected Refunds',
    refundAmount: 'Refund Amount',
    refundReason: 'Refund Reason',
    refundTime: 'Time',
    approveRefund: 'Approve Refund',
    rejectRefund: 'Reject Refund',
    refundReasonPlaceholder: 'Please enter handle reason...',
    refundDetails: 'Refund Details',
    refundSuccess: 'Refund processed successfully',
    refundFailed: 'Failed to process refund',
    userStats: 'User Statistics',
    orderStats: 'Order Statistics',
    revenueStats: 'Revenue Statistics',
    newUsers: 'New Users',
    activeUsers: 'Active Users',
    cancelledOrders: 'Cancelled Orders',
    refundedOrders: 'Refunded Orders',
    refundRate: 'Refund Rate',
    averageOrderValue: 'Average Order Value',
    dateRange: 'Date Range',
    startDate: 'Start Date',
    endDate: 'End Date',
    apply: 'Apply',
    reset: 'Reset',
    editUser: 'Edit User',
    save: 'Save',
    cancelOrder: 'Cancel Order',
    cancelReason: 'Cancel Reason',
    cancelReasonPlaceholder: 'Please enter cancel reason...',
    confirmCancel: 'Confirm Cancel',
    viewDetails: 'View Details',
    viewRefund: 'View Refund',
  },
};

type TabType = 'dashboard' | 'users' | 'orders' | 'escorts' | 'refunds' | 'complaints' | 'statistics';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ lang }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<any>(null);

  // User management state
  const [users, setUsers] = useState<any[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');

  // Order management state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderStatus, setOrderStatus] = useState('');

  // Escort management state
  const [escorts, setEscorts] = useState<any[]>([]);
  const [escortsPage, setEscortsPage] = useState(1);
  const [escortsTotal, setEscortsTotal] = useState(0);
  const [escortStatus, setEscortStatus] = useState('');

  // Refund management state
  const [refunds, setRefunds] = useState<any[]>([]);
  const [refundsPage, setRefundsPage] = useState(1);
  const [refundsTotal, setRefundsTotal] = useState(0);
  const [refundStatus, setRefundStatus] = useState('');
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAction, setRefundAction] = useState<'approve' | 'reject'>('approve');
  const [refundReason, setRefundReason] = useState('');

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'users' | 'orders' | 'escorts'>('users');
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');

  // Complaint management state
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintsPage, setComplaintsPage] = useState(1);
  const [complaintsTotal, setComplaintsTotal] = useState(0);
  const [complaintStatus, setComplaintStatus] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [showHandleModal, setShowHandleModal] = useState(false);
  const [handleAction, setHandleAction] = useState<'RESOLVED' | 'REJECTED'>('RESOLVED');
  const [handleNote, setHandleNote] = useState('');

  // User edit modal state
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userEditForm, setUserEditForm] = useState({ name: '', phone: '', role: '', isActive: true });

  // Order detail modal state
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderCancelReason, setOrderCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Refund detail modal state
  const [showRefundDetailModal, setShowRefundDetailModal] = useState(false);
  const [selectedRefundDetail, setSelectedRefundDetail] = useState<any>(null);

  // Statistics state
  const [userStats, setUserStats] = useState<any>(null);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [statsDateRange, setStatsDateRange] = useState({ start: '', end: '' });

  async function loadStats() {
    try {
      const data = await apiService.getAdminDashboard();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function loadUsers() {
    try {
      const data = await apiService.getAdminUsers(usersPage, 20, userSearch, userRole);
      setUsers(data.data || []);
      setUsersTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  async function loadOrders() {
    try {
      const data = await apiService.getAdminOrders(ordersPage, 20, orderStatus);
      setOrders(data.data || []);
      setOrdersTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  }

  async function loadEscorts() {
    try {
      const data = await apiService.getAdminEscorts(escortsPage, 20, escortStatus);
      setEscorts(data.data || []);
      setEscortsTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load escorts:', error);
    }
  }

  async function loadRefunds() {
    try {
      const data = await apiService.getRefunds(refundsPage, 20, refundStatus);
      setRefunds(data.data || []);
      setRefundsTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load refunds:', error);
    }
  }

  async function loadComplaints() {
    try {
      const data = await apiService.getComplaints(complaintsPage, 20, complaintStatus);
      setComplaints(data.data || []);
      setComplaintsTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load complaints:', error);
    }
  }

  async function loadStatistics() {
    try {
      const [userData, orderData, revenueData] = await Promise.all([
        apiService.getUserStats(statsDateRange.start, statsDateRange.end),
        apiService.getOrderStats(statsDateRange.start, statsDateRange.end),
        apiService.getRevenueStatistics(statsDateRange.start, statsDateRange.end),
      ]);
      setUserStats(userData);
      setOrderStats(orderData);
      setRevenueStats(revenueData);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (activeTab === 'users') void loadUsers();
      if (activeTab === 'orders') void loadOrders();
      if (activeTab === 'escorts') void loadEscorts();
      if (activeTab === 'refunds') void loadRefunds();
      if (activeTab === 'complaints') void loadComplaints();
      if (activeTab === 'statistics') void loadStatistics();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [activeTab, usersPage, ordersPage, escortsPage, refundsPage, complaintsPage]);

  // User edit handlers
  const openUserEditModal = (user: any) => {
    setEditingUser(user);
    setUserEditForm({
      name: user.profile?.name || '',
      phone: user.profile?.phone || '',
      role: user.role,
      isActive: user.isActive,
    });
    setShowUserEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      await apiService.updateUser(editingUser.id, userEditForm);
      setShowUserEditModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert(lang === 'zh' ? '保存失败' : 'Save failed');
    }
  };

  // Order detail handlers
  const openOrderDetail = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDetailModal(true);
  };

  const openCancelModal = (order: any) => {
    setSelectedOrder(order);
    setOrderCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    try {
      await apiService.cancelOrderAdmin(selectedOrder.id, orderCancelReason);
      setShowCancelModal(false);
      setShowOrderDetailModal(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert(lang === 'zh' ? '取消订单失败' : 'Failed to cancel order');
    }
  };

  // Refund detail handler
  const openRefundDetail = async (refund: any) => {
    try {
      const detail = await apiService.getRefundDetails(refund.id);
      setSelectedRefundDetail(detail);
      setShowRefundDetailModal(true);
    } catch (error) {
      console.error('Failed to get refund details:', error);
    }
  };

  const handleDisableUser = async (userId: string) => {
    try {
      await apiService.disableUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to disable user:', error);
    }
  };

  const handleEnableUser = async (userId: string) => {
    try {
      await apiService.enableUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to enable user:', error);
    }
  };

  const handleVerifyEscort = async (escortId: string, approved: boolean, reason?: string) => {
    try {
      await apiService.verifyEscort(escortId, approved, reason);
      loadEscorts();
    } catch (error) {
      console.error('Failed to verify escort:', error);
    }
  };

  const openRefundModal = (refund: any, action: 'approve' | 'reject') => {
    setSelectedRefund(refund);
    setRefundAction(action);
    setRefundReason('');
    setShowRefundModal(true);
  };

  const handleRefundAction = async () => {
    if (!selectedRefund) return;
    try {
      if (refundAction === 'approve') {
        await apiService.approveRefund(selectedRefund.id, refundReason);
      } else {
        await apiService.rejectRefund(selectedRefund.id, refundReason);
      }
      setShowRefundModal(false);
      setSelectedRefund(null);
      loadRefunds();
    } catch (error) {
      console.error('Failed to process refund:', error);
    }
  };

  const openHandleModal = (complaint: any, action: 'RESOLVED' | 'REJECTED') => {
    setSelectedComplaint(complaint);
    setHandleAction(action);
    setHandleNote('');
    setShowHandleModal(true);
  };

  const handleComplaintAction = async () => {
    if (!selectedComplaint) return;
    try {
      await apiService.handleComplaint(selectedComplaint.id, handleAction, handleNote);
      setShowHandleModal(false);
      setSelectedComplaint(null);
      loadComplaints();
    } catch (error) {
      console.error('Failed to handle complaint:', error);
    }
  };

  const handleExport = async () => {
    try {
      const data = await apiService.exportData(exportType, exportFormat);
      const blob = new Blob([data.content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = data.filename;
      link.click();
      setShowExportModal(false);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      CONFIRMED: 'bg-blue-100 text-blue-700',
      MATCHED: 'bg-purple-100 text-purple-700',
      IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
      REFUNDED: 'bg-orange-100 text-orange-700',
      ACTIVE: 'bg-green-100 text-green-700',
      INACTIVE: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: lang === 'zh' ? '待处理' : 'Pending',
      CONFIRMED: lang === 'zh' ? '已确认' : 'Confirmed',
      MATCHED: lang === 'zh' ? '已匹配' : 'Matched',
      IN_PROGRESS: lang === 'zh' ? '进行中' : 'In Progress',
      COMPLETED: lang === 'zh' ? '已完成' : 'Completed',
      CANCELLED: lang === 'zh' ? '已取消' : 'Cancelled',
      REFUNDED: lang === 'zh' ? '已退款' : 'Refunded',
      ACTIVE: lang === 'zh' ? '正常' : 'Active',
      INACTIVE: lang === 'zh' ? '禁用' : 'Inactive',
    };
    return labels[status] || status;
  };

  const getRefundStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getRefundStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: lang === 'zh' ? '待处理' : 'Pending',
      APPROVED: lang === 'zh' ? '已批准' : 'Approved',
      REJECTED: lang === 'zh' ? '已拒绝' : 'Rejected',
      COMPLETED: lang === 'zh' ? '已完成' : 'Completed',
    };
    return labels[status] || status;
  };

  const getComplaintStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      PROCESSING: 'bg-blue-100 text-blue-700',
      RESOLVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getComplaintStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: lang === 'zh' ? '待处理' : 'Pending',
      PROCESSING: lang === 'zh' ? '处理中' : 'Processing',
      RESOLVED: lang === 'zh' ? '已解决' : 'Resolved',
      REJECTED: lang === 'zh' ? '已拒绝' : 'Rejected',
    };
    return labels[status] || status;
  };

  const renderTabButton = (tab: TabType, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
        activeTab === tab ? 'text-teal-600' : 'text-slate-500'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  const renderPagination = (page: number, total: number, onPageChange: (page: number) => void) => {
    const totalPages = Math.ceil(total / 20);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-lg bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-slate-600">
          {t.page} {page} {t.of} {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // Dashboard View
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t.totalUsers}</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers || 0}</p>
            </div>
            <Users className="h-8 w-8 text-teal-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t.totalOrders}</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalOrders || 0}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t.pendingOrders}</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.pendingOrders || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t.totalRevenue}</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.totalRevenue || 0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{t.recentOrders}</h3>
          <button onClick={() => setActiveTab('orders')} className="text-sm text-teal-600">
            {t.viewAll}
          </button>
        </div>
        <div className="space-y-2">
          {(stats?.recentOrders || []).map((order: any) => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">{order.orderNo}</p>
                <p className="text-sm text-slate-500">{order.patient?.profile?.name || order.patient?.email}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
                <p className="text-sm text-slate-900 mt-1">{formatCurrency(order.totalAmount)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Users View
  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder={t.search}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={userRole}
          onChange={(e) => setUserRole(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">{t.all}</option>
          <option value="PATIENT">{t.patient}</option>
          <option value="ESCORT">{t.escort}</option>
          <option value="ADMIN">{t.admin}</option>
        </select>
        <button onClick={loadUsers} className="px-4 py-2 bg-teal-500 text-white rounded-lg">
          <Search className="h-4 w-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.name}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.email}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.role}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.status}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{user.profile?.name || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-slate-100 rounded-full text-xs">
                    {user.role === 'PATIENT' ? t.patient : user.role === 'ESCORT' ? t.escort : t.admin}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(user.isActive ? 'ACTIVE' : 'INACTIVE')}`}>
                    {user.isActive ? t.active : t.inactive}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openUserEditModal(user)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit className="h-4 w-4" />
                    </button>
                    {user.isActive ? (
                      <button onClick={() => handleDisableUser(user.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Ban className="h-4 w-4" />
                      </button>
                    ) : (
                      <button onClick={() => handleEnableUser(user.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Unlock className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderPagination(usersPage, usersTotal, setUsersPage)}
    </div>
  );

  // Orders View
  const renderOrders = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          value={orderStatus}
          onChange={(e) => setOrderStatus(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">{t.all}</option>
          <option value="PENDING">{t.pending}</option>
          <option value="CONFIRMED">{lang === 'zh' ? '已确认' : 'Confirmed'}</option>
          <option value="IN_PROGRESS">{lang === 'zh' ? '进行中' : 'In Progress'}</option>
          <option value="COMPLETED">{t.completed}</option>
          <option value="CANCELLED">{t.cancelled}</option>
        </select>
        <button onClick={loadOrders} className="px-4 py-2 bg-teal-500 text-white rounded-lg">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.orderNo}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.patientName}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.escortName}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.price}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.status}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-sm">{order.orderNo}</td>
                <td className="px-4 py-3">{order.patient?.profile?.name || order.patient?.email}</td>
                <td className="px-4 py-3">{order.escort?.profile?.name || '-'}</td>
                <td className="px-4 py-3">{formatCurrency(order.totalAmount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openOrderDetail(order)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Eye className="h-4 w-4" />
                    </button>
                    {order.status === 'PENDING' && (
                      <button onClick={() => openCancelModal(order)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderPagination(ordersPage, ordersTotal, setOrdersPage)}
    </div>
  );

  // Refunds View
  const renderRefunds = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          value={refundStatus}
          onChange={(e) => setRefundStatus(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">{t.all}</option>
          <option value="PENDING">{t.pending}</option>
          <option value="APPROVED">{lang === 'zh' ? '已批准' : 'Approved'}</option>
          <option value="REJECTED">{lang === 'zh' ? '已拒绝' : 'Rejected'}</option>
        </select>
        <button onClick={loadRefunds} className="px-4 py-2 bg-teal-500 text-white rounded-lg">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.orderNo}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.refundAmount}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.refundReason}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.status}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((refund) => (
              <tr key={refund.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-sm">{refund.order?.orderNo}</td>
                <td className="px-4 py-3">{formatCurrency(refund.amount)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{refund.reason}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${getRefundStatusColor(refund.status)}`}>
                    {getRefundStatusLabel(refund.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openRefundDetail(refund)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Eye className="h-4 w-4" />
                    </button>
                    {refund.status === 'PENDING' && (
                      <>
                        <button onClick={() => openRefundModal(refund, 'approve')} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => openRefundModal(refund, 'reject')} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderPagination(refundsPage, refundsTotal, setRefundsPage)}
    </div>
  );

  // Statistics View
  const renderStatistics = () => (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          type="date"
          value={statsDateRange.start}
          onChange={(e) => setStatsDateRange({ ...statsDateRange, start: e.target.value })}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <input
          type="date"
          value={statsDateRange.end}
          onChange={(e) => setStatsDateRange({ ...statsDateRange, end: e.target.value })}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button onClick={loadStatistics} className="px-4 py-2 bg-teal-500 text-white rounded-lg">
          {t.apply}
        </button>
      </div>

      {/* User Stats */}
      {userStats && (
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">{t.userStats}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{userStats.totalUsers || 0}</p>
              <p className="text-sm text-slate-500">{t.totalUsers}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600">{userStats.newUsers || 0}</p>
              <p className="text-sm text-slate-500">{t.newUsers}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{userStats.activeUsers || 0}</p>
              <p className="text-sm text-slate-500">{t.activeUsers}</p>
            </div>
          </div>
        </div>
      )}

      {/* Order Stats */}
      {orderStats && (
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">{t.orderStats}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{orderStats.totalOrders || 0}</p>
              <p className="text-sm text-slate-500">{t.totalOrders}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{orderStats.completedOrders || 0}</p>
              <p className="text-sm text-slate-500">{t.completedOrders}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{orderStats.cancelledOrders || 0}</p>
              <p className="text-sm text-slate-500">{t.cancelledOrders}</p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Stats */}
      {revenueStats && (
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">{t.revenueStats}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(revenueStats.totalRevenue || 0)}</p>
              <p className="text-sm text-slate-500">{t.totalRevenue}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(revenueStats.averageOrderValue || 0)}</p>
              <p className="text-sm text-slate-500">{t.averageOrderValue}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <h1 className="text-xl font-bold text-slate-900">{lang === 'zh' ? '管理后台' : 'Admin Dashboard'}</h1>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'refunds' && renderRefunds()}
        {activeTab === 'statistics' && renderStatistics()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2">
        <div className="flex justify-around">
          {renderTabButton('dashboard', <BarChart3 className="h-5 w-5" />, t.dashboard)}
          {renderTabButton('users', <Users className="h-5 w-5" />, t.users)}
          {renderTabButton('orders', <ShoppingCart className="h-5 w-5" />, t.orders)}
          {renderTabButton('refunds', <DollarSign className="h-5 w-5" />, t.refunds)}
          {renderTabButton('statistics', <PieChart className="h-5 w-5" />, t.statistics)}
        </div>
      </div>
    </div>
  );
};
