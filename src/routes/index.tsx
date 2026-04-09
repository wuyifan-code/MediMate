import React, { lazy, Suspense } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';
import { UserRole, Language, UserInfo } from '../../types';

// Lazy load heavy components
const PatientDashboard = lazy(() => import('../../components/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const EscortDashboard = lazy(() => import('../../components/EscortDashboard').then(m => ({ default: m.EscortDashboard })));
const AdminDashboard = lazy(() => import('../../components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

// Page loader
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
  </div>
);

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  roles?: UserRole[];
}

export type AppRoutes = {
  lang: Language;
  user: UserInfo | null;
  role: UserRole;
  onLogout: () => void;
};

// Helper to create routes with auth guard capability
export const createRoutes = (config: AppRoutes): RouteObject[] => {
  const { lang, user, role, onLogout } = config;

  const routes: RouteObject[] = [
    // Home page based on role
    {
      path: '/',
      element: role === UserRole.PATIENT ? (
        <Suspense fallback={<PageLoader />}>
          <PatientDashboard lang={lang} user={user} onSelectService={() => {}} />
        </Suspense>
      ) : role === UserRole.ESCORT ? (
        <Suspense fallback={<PageLoader />}>
          <EscortDashboard lang={lang} user={user} />
        </Suspense>
      ) : (
        <Suspense fallback={<PageLoader />}>
          <PatientDashboard lang={lang} user={user} onSelectService={() => {}} />
        </Suspense>
      ),
    },
    {
      path: '/home',
      element: role === UserRole.PATIENT ? (
        <Suspense fallback={<PageLoader />}>
          <PatientDashboard lang={lang} user={user} onSelectService={() => {}} />
        </Suspense>
      ) : role === UserRole.ESCORT ? (
        <Suspense fallback={<PageLoader />}>
          <EscortDashboard lang={lang} user={user} />
        </Suspense>
      ) : (
        <Suspense fallback={<PageLoader />}>
          <PatientDashboard lang={lang} user={user} onSelectService={() => {}} />
        </Suspense>
      ),
    },
    {
      path: '/explore',
      element: <div>Explore Page</div>,
    },
    {
      path: '/notifications',
      element: <div>Notifications Page</div>,
    },
    {
      path: '/messages',
      element: <div>Messages Page</div>,
    },
    {
      path: '/messages/:partnerId',
      element: <div>Messages with Partner</div>,
    },
    {
      path: '/saved',
      element: <div>Saved Page</div>,
    },
    {
      path: '/profile',
      element: <div>Profile Page</div>,
    },
    {
      path: '/profile/:userId',
      element: <div>User Profile</div>,
    },
    {
      path: '/settings',
      element: <div>Settings Page</div>,
    },
    {
      path: '/login',
      element: <div>Login Page</div>,
    },
    {
      path: '/register',
      element: <div>Register Page</div>,
    },
    {
      path: '/admin',
      element: role === UserRole.ADMIN ? (
        <Suspense fallback={<PageLoader />}>
          <AdminDashboard lang={lang} />
        </Suspense>
      ) : <Navigate to="/" replace />,
    },
    {
      path: '/orders',
      element: <div>Orders Page</div>,
    },
    {
      path: '/orders/:orderId',
      element: <div>Order Detail</div>,
    },
    {
      path: '/order-confirmation',
      element: <div>Order Confirmation</div>,
    },
    {
      path: '/order-confirmation/:escortId',
      element: <div>Order Confirmation with Escort</div>,
    },
    // Catch all - redirect to home
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ];

  return routes;
};

// Route paths as constants for type-safe navigation
export const Routes = {
  HOME: '/',
  HOME_ALT: '/home',
  EXPLORE: '/explore',
  NOTIFICATIONS: '/notifications',
  MESSAGES: '/messages',
  MESSAGES_PARTNER: '/messages/:partnerId',
  SAVED: '/saved',
  PROFILE: '/profile',
  PROFILE_USER: '/profile/:userId',
  SETTINGS: '/settings',
  LOGIN: '/login',
  REGISTER: '/register',
  ADMIN: '/admin',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:orderId',
  ORDER_CONFIRMATION: '/order-confirmation',
  ORDER_CONFIRMATION_ESCORT: '/order-confirmation/:escortId',
} as const;
