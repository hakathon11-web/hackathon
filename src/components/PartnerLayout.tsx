import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Building2, BarChart3, Plus, Bell, LogOut, Settings, Users, History, Menu, X, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '@/components/ThemeToggle';

const PartnerLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Set body attribute to prevent global padding-top from applying
  React.useEffect(() => {
    document.body.setAttribute('data-partner-layout', 'true');
    return () => {
      document.body.removeAttribute('data-partner-layout');
    };
  }, []);

  const handleSignOut = async () => {
    try {
      console.log('🔄 PartnerLayout: Starting sign out...');
      await signOut();
      console.log('🔄 PartnerLayout: Redirecting to unified auth...');
    } catch (error) {
      console.error('❌ PartnerLayout: Sign out error (continuing anyway):', error);
    } finally {
      // Always redirect regardless of what happens above
      window.location.href = '/auth';
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const navigationItems = [
    {
      title: t('partner.nav.venueManagement'),
      href: '/partner/dashboard',
      icon: Building2,
    },
    {
      title: t('partner.nav.analytics'),
      href: '/partner/analytics', 
      icon: BarChart3,
    },
    {
      title: t('partner.nav.history'),
      href: '/partner/history',
      icon: History,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 partner-layout">
      {/* Partner Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="px-6 py-3 max-lg:px-4 max-lg:py-2">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3 max-lg:space-x-2">
              <Link to="/partner/dashboard" aria-label="Partner dashboard" className="flex items-center space-x-2 max-lg:space-x-1 hover:opacity-80 transition-opacity cursor-pointer">
                <div className="w-8 h-8 max-lg:w-7 max-lg:h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 max-lg:h-4 max-lg:w-4 text-white" />
                </div>
                <div className="max-lg:hidden">
                  <h1 className="text-xl font-bold text-foreground">{t('partner.header.title', 'Partner Portal')}</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('partner.header.subtitle', 'Manage your places and grow your business')}</p>
                </div>
                <div className="lg:hidden">
                  <h1 className="text-lg font-bold text-foreground">{t('partner.header.title', 'Partner Portal')}</h1>
                </div>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Desktop User Info and Actions */}
            <div className="hidden lg:flex items-center space-x-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <Button variant="outline" size="sm" onClick={handleGoHome}>
                <Home className="h-4 w-4 mr-2" />
                {t('common.backToHome', 'Back to main site')}
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{profile?.email}</p>
              </div>

              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('common.signOut', 'Sign Out')}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background">
            <div className="px-4 py-3 space-y-3">
              {/* Mobile User Info */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{profile?.email}</p>
                </div>
                
              </div>
              
              {/* Mobile Navigation */}
              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.href || 
                                 (item.href !== '/partner/dashboard' && location.pathname.startsWith(item.href));
                  
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        navigate(item.href);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                        isActive 
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Actions */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ThemeToggle />
                    <LanguageSwitcher />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={handleGoHome} className="text-xs">
                      <Home className="h-4 w-4 mr-2" />
                      {t('common.backToHome', 'Home')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs">
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('common.signOut', 'Sign Out')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Navigation Bar */}
      <nav className="hidden lg:block bg-background border-b border-border">
        <div className="px-6">
          <div className="flex space-x-8">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href || 
                             (item.href !== '/partner/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "flex items-center space-x-2 py-4 border-b-2 transition-colors",
                    isActive 
                      ? "border-blue-600 text-blue-600 dark:text-blue-400" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default PartnerLayout;