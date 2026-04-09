/**
 * MediMate 组件统一导出入口
 * 方便统一导入，减少单个组件导入语句
 */

// Auth components
export { Login } from './Login';
export { Register } from './Register';

// Dashboard components
export { PatientDashboard } from './PatientDashboard';
export { EscortDashboard } from './EscortDashboard';
export { AdminDashboard } from './AdminDashboard';

// Profile components
export { Profile } from './Profile';
export { EditProfile } from './EditProfile';
export { EditUserModal } from './EditUserModal';
export { NotificationSettings } from './NotificationSettings';

// Order components
export { OrderList } from './OrderList';
export { OrderDetail } from './OrderDetail';
export { OrderConfirmation } from './OrderConfirmation';
export { RefundModal } from './RefundModal';

// Search components
export { SearchBar } from './SearchBar';
export { SearchResults } from './SearchResults';
export { Explore } from './Explore';

// Service components
export { AvailableEscorts } from './AvailableEscorts';
export { EscortDetail } from './EscortDetail';
export { EscortServiceList } from './EscortServiceList';
export { ServicePublishModal } from './ServicePublishModal';

// Payment components
export { PaymentForm } from './PaymentForm';
export { WeChatPayment } from './WeChatPayment';
export { IncomeDetail } from './IncomeDetail';
export { WithdrawForm } from './WithdrawForm';

// Communication components
export { Messages } from './Messages';
export { Notifications } from './Notifications';

// Review components
export { ReviewModal, ReviewList } from './Review';

// Evidence components
export { default as EvidenceCollector } from './EvidenceCollector';
export { default as RecoveryMemoViewer } from './RecoveryMemoViewer';

// AI components
export { AIChatOverlay } from './AIChatOverlay';

// UI components
export { Header } from './Header';
export { Settings } from './Settings';
export { ErrorBoundary } from './ErrorBoundary';
export { ImageUpload } from './ImageUpload';
export { DatePickerModal } from './DatePickerModal';
export { RightSidebar } from './RightSidebar';
export { MobileBottomNav } from './MobileBottomNav';
