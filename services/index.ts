/**
 * Services Index
 * Re-exports all services for convenient imports
 */

// Base API client
export { axiosInstance, getToken, setToken, setRefreshToken, setUser, getStoredUser, clearAuth, extractPayload } from './baseApiClient';

// Auth Service
export {
  isLoggedIn,
  login,
  register,
  logout,
  getCurrentUser,
} from './authService';

// User Service
export {
  getUserProfile,
  updateUserProfile,
  getEscortProfile,
  updateEscortProfile,
  getNotificationSettings,
  updateNotificationSettings,
  uploadImage,
} from './userService';

// Order Service
export {
  createOrder,
  getUserAppointments,
  getOrderDetails,
  getMyOrders,
  acceptOrder,
  cancelOrder,
  startService,
  completeService,
  updateOrder,
  getOrdersByEscort,
} from './orderService';

// Payment Service
export {
  createStripePaymentIntent,
  confirmStripePayment,
  createWechatPayment,
  queryWechatPayment,
  getPaymentByOrderId,
  requestRefund,
  createRefund,
  getMyRefunds,
  getRefund,
  getRefundStatus,
} from './paymentService';

// Hospital Service
export {
  getHospitals,
  getHospitalById,
  searchHospitals,
  getHospitalSuggestions,
  getPopularHospitals,
  getDepartments,
} from './hospitalService';

// Escort Service
export {
  getEscorts,
  getNearbyEscorts,
  getAvailableEscorts,
  searchEscorts,
  getEscortSuggestions,
  getPopularEscorts,
  getSpecialties,
  getEscortById,
  updateEscortLocation,
  getRecommendedServices,
  createEscortService,
  getMyEscortServices,
  getAllEscortServices,
  getEscortServiceById,
  updateEscortService,
  toggleEscortServiceStatus,
  deleteEscortService,
  getServiceAvailability,
} from './escortService';

// Notification Service
export {
  getNotifications,
  getUnreadNotificationCount,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteNotifications,
} from './notificationService';

// Message Service
export {
  getConversations,
  startConversation,
  getUnreadCount,
  getMessages,
  sendMessage,
  searchMessages,
  markMessageRead,
  markConversationRead,
  deleteMessage,
} from './messageService';
