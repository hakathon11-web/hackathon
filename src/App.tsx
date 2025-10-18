
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { useUserExpiredNotifications } from "@/hooks/useUserExpiredNotifications";
import { useGlobalSettingsSync } from "@/hooks/useGlobalSettingsSync";
import { useBookingTimeouts } from "@/hooks/useBookingTimeouts";
import { useLayoutStability } from "@/hooks/useLayoutStability";
import { useAnalyticsTracking } from "@/hooks/useAnalytics";
import { analyticsEvents } from "@/lib/analytics";
import EmailConfirmationGuard from "@/components/EmailConfirmationGuard";
import Header from "@/components/Header";
import AppLoadingFallback from "@/components/AppLoadingFallback";
import Footer from "@/components/Footer";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import TermsAndConsentDialog from "@/components/TermsAndConsentDialog";
import CurrentBookingDisplay from "@/components/CurrentBookingDisplay";
import FloatingHelpButton from "@/components/FloatingHelpButton";
import ContactSupportModal from "@/components/ContactSupportModal";
import GlobalBookingDialog from "@/components/GlobalBookingDialog";
import BogCardSaveHandler from "@/components/BogCardSaveHandler";
import ScrollToTop from "@/components/ScrollToTop";
import '@/utils/resetSystemSettings'; // Clear old cached settings

const SearchResults = lazy(() => import("./pages/SearchResults"));
const CategoryLandingPage = lazy(() => import("./pages/CategoryLandingPage"));
const VenuePage = lazy(() => import("./pages/VenuePage"));
const LayoutStabilityTest = lazy(() => import("./components/LayoutStabilityTest"));

const ConfirmAndPay = lazy(() => import("./pages/ConfirmAndPay"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailed = lazy(() => import("./pages/PaymentFailed"));

const BookingHistoryPage = lazy(() => import("./pages/BookingHistoryPage"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Legal/static pages
const About = lazy(() => import("./pages/about"));
const Contact = lazy(() => import("./pages/contact"));
const Terms = lazy(() => import("./pages/terms"));
const RefundPolicy = lazy(() => import("./pages/refund-policy"));
const Privacy = lazy(() => import("./pages/privacy"));
const ServiceDescription = lazy(() => import("./pages/service-description"));

// Partner pages
const PartnerDashboard = lazy(() => import("./pages/partner/PartnerDashboard"));
const AddVenue = lazy(() => import("./pages/partner/AddVenue"));
const EditVenue = lazy(() => import("./pages/partner/EditVenue"));
const Analytics = lazy(() => import("./pages/partner/Analytics"));
const History = lazy(() => import("./pages/partner/History"));
import PartnerProtectedRoute from "./components/PartnerProtectedRoute";

// Employee pages
const EmployeeAuth = lazy(() => import("./pages/employee/EmployeeAuth"));
const EmployeeDashboard = lazy(() => import("./pages/employee/EmployeeDashboard"));
import EmployeeProtectedRoute from "./components/EmployeeProtectedRoute";

// Admin pages - Import AdminProtectedRoute directly
import AdminProtectedRoute from "./components/AdminProtectedRoute";
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const VenueApprovals = lazy(() => import("./pages/admin/VenueApprovals"));
const VenueManagement = lazy(() => import("./pages/admin/VenueManagement"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const AdminBookings = lazy(() => import("./pages/admin/Bookings"));

const AdminServices = lazy(() => import("./pages/admin/Services"));
const AdminReviews = lazy(() => import("./pages/admin/Reviews"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminVenueRecipients = lazy(() => import("./pages/admin/VenueRecipients"));

const queryClient = new QueryClient();

// Helper function to check if we're on a category/search page
const isCategoryPage = (pathname: string) => {
  return pathname === '/search' || pathname === '/gaming' || pathname === '/dental' || pathname === '/wellness-spa';
};

// Conditional Header Component
const ConditionalHeader = () => {
  const location = useLocation();
  const isPartnerPage = location.pathname.startsWith('/partner');
  const isAdminPage = location.pathname.startsWith('/admin');
  const isEmployeePage = location.pathname.startsWith('/employee');
  const isSearchPage = isCategoryPage(location.pathname);
  
  // Check if we're in mobile map view
  const isMobileMapView = isSearchPage && 
    new URLSearchParams(location.search).get('view') === 'map' && 
    window.innerWidth < 1024;
  
  // Don't show main header on partner, admin, employee pages, or mobile map view
  if (isPartnerPage || isAdminPage || isEmployeePage || isMobileMapView) {
    return null;
  }
  
  // Show header on search page (now main page) for all devices
  if (isSearchPage) {
    return <Header />;
  }
  
  return <Header />;
};

// Main app wrapper to include real-time functionality
const AppWrapper = () => {
  const location = useLocation();
  const isPartnerPage = location.pathname.startsWith('/partner');
  const isAdminPage = location.pathname.startsWith('/admin');
  const isEmployeePage = location.pathname.startsWith('/employee');
  const { user } = useAuth();
  const [isSupportModalOpen, setIsSupportModalOpen] = React.useState(false);
  
  // Initialize Google Analytics
  useAnalyticsTracking();
  
  // Set data attributes on body for proper CSS targeting
  React.useEffect(() => {
    if (isPartnerPage) {
      document.body.setAttribute('data-partner-layout', 'true');
      document.body.removeAttribute('data-employee-layout');
      document.body.removeAttribute('data-admin-layout');
    } else if (isEmployeePage) {
      document.body.setAttribute('data-employee-layout', 'true');
      document.body.removeAttribute('data-partner-layout');
      document.body.removeAttribute('data-admin-layout');
    } else if (isAdminPage) {
      document.body.setAttribute('data-admin-layout', 'true');
      document.body.removeAttribute('data-partner-layout');
      document.body.removeAttribute('data-employee-layout');
    } else {
      // Consumer pages - remove all layout attributes
      document.body.removeAttribute('data-partner-layout');
      document.body.removeAttribute('data-employee-layout');
      document.body.removeAttribute('data-admin-layout');
    }
  }, [isPartnerPage, isEmployeePage, isAdminPage]);
  
  
  try {
    useRealtimeBookings(); // Enable real-time booking updates for consumers
    useUserExpiredNotifications(); // Enable expired booking notifications for users
    useGlobalSettingsSync(); // Ensure settings sync across all components
    useBookingTimeouts(); // Auto-expire old pending bookings
    useLayoutStability(); // Enable layout stability to prevent body shifts
    
    
  } catch (error) {
    console.error('❌ Error in AppWrapper hooks:', error);
    // Track errors in analytics
    if (error instanceof Error) {
      analyticsEvents.error('app_initialization', error.message);
    }
  }

  // REMOVED: Global body manipulation observer - was causing conflicts with other systems
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ConditionalHeader />
      {/* Only show CurrentBookingDisplay for signed-in users; GuestBookingDisplay for guests. Hide on partner/admin/employee and mobile split search */}
      {!isPartnerPage && !isAdminPage && !isEmployeePage && !(
        isCategoryPage(location.pathname) && 
        new URLSearchParams(location.search).get('view') === 'split' && 
        window.innerWidth < 1024
      ) && (
        user ? <CurrentBookingDisplay mode="user" /> : <CurrentBookingDisplay mode="guest" />
      )}
      
      {/* Global Booking Dialog - Available on all pages */}
      <GlobalBookingDialog />
      <BogCardSaveHandler />
      
      {/* Floating Help Button - Only for regular users, not on search page split view mobile */}
      {!isPartnerPage && !isAdminPage && !isEmployeePage && !(
        isCategoryPage(location.pathname) && 
        new URLSearchParams(location.search).get('view') === 'split' && 
        window.innerWidth < 1024
      ) && (
        <FloatingHelpButton onOpenSupport={() => setIsSupportModalOpen(true)} />
      )}
      
      {/* Contact Support Modal */}
      <ContactSupportModal 
        isOpen={isSupportModalOpen} 
        onClose={() => setIsSupportModalOpen(false)} 
      />
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading application...</p>
          </div>
        </div>
      }>
        <div className="flex-1">
          <ScrollToTop />
          <Routes>
          <Route path="/" element={<CategoryLandingPage />} />
          <Route path="/gaming" element={<SearchResults />} />
          <Route path="/dental" element={<SearchResults />} />
          <Route path="/wellness-spa" element={<SearchResults />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/venue/:id" element={<VenuePage />} />
          <Route path="/test-layout" element={<LayoutStabilityTest />} />

          {/* Legal/static routes */}
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/service-description" element={<ServiceDescription />} />

          <Route path="/confirm-and-pay" element={<ConfirmAndPay />} />
          <Route path="/payment-methods" element={<PaymentMethods />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/failed" element={<PaymentFailed />} />
          
          <Route path="/booking-history" element={<BookingHistoryPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Partner routes */}
          <Route path="/partner/auth" element={<Navigate to="/auth" replace />} />
          <Route path="/partner/dashboard" element={
            <PartnerProtectedRoute>
              <PartnerDashboard />
            </PartnerProtectedRoute>
          } />
          <Route path="/partner/venues/add" element={
            <PartnerProtectedRoute>
              <AddVenue />
            </PartnerProtectedRoute>
          } />
          <Route path="/partner/venues/:venueId/edit" element={
            <PartnerProtectedRoute>
              <EditVenue />
            </PartnerProtectedRoute>
          } />
          <Route path="/partner/analytics" element={
            <PartnerProtectedRoute>
              <Analytics />
            </PartnerProtectedRoute>
          } />
          <Route path="/partner/history" element={
            <PartnerProtectedRoute>
              <History />
            </PartnerProtectedRoute>
          } />
          
          {/* Employee routes */}
          <Route path="/employee/auth" element={<EmployeeAuth />} />
          <Route path="/employee/dashboard" element={
            <EmployeeProtectedRoute>
              <EmployeeDashboard />
            </EmployeeProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin" element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="approvals" element={<VenueApprovals />} />
            <Route path="venues" element={<VenueManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="venues/:venueId/recipients" element={<AdminVenueRecipients />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
      </Suspense>
      {/* Global footer on consumer pages only */}
      {!isPartnerPage && !isAdminPage && !isEmployeePage && <Footer />}
      
      
    </div>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <EmailConfirmationGuard>
              <AppWrapper />
            </EmailConfirmationGuard>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
