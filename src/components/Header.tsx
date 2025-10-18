import { useState, useRef, useEffect } from "react";
import SiteLogo from "../../Logo.png";
import SiteLogoMobile from "../../Logo_D.png";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, History, Building2, MapPin, CreditCard, ChevronDown, Star } from "lucide-react";
import BecomePartnerDialog from "./BecomePartnerDialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useVenueSearch } from "@/hooks/useVenueSearch";
import { useTranslation } from "react-i18next";
import ProfileDialog from "./ProfileDialog";
import { LanguageSwitcher, MobileFlagLanguageSwitcher } from "./ui/language-switcher";
import { useLayoutStability } from "@/hooks/useLayoutStability";
import ThemeToggle from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [paymentsDialogOpen, setPaymentsDialogOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { searchQuery, searchResults, isSearching, isLiveFiltering, handleSearch, handleSearchButtonClick, clearSearch } = useVenueSearch();
  const navigate = useNavigate();
  const location = useLocation();
  const { handleDialogStateChange } = useLayoutStability();

  // Hide compact dropdown where the page already shows filtered results inline (main page and search page are now the same)
  const suppressSearchDropdown = location.pathname === '/' || location.pathname.startsWith('/search');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(event.target as Node)
      ) {
        clearSearch();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSearch]);

  // Handle click outside mobile menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
        handleDialogStateChange(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen, handleDialogStateChange]);

  // Handle scroll to close mobile menu
  useEffect(() => {
    const handleScroll = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
        handleDialogStateChange(false);
      }
    };

    if (isMenuOpen) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isMenuOpen, handleDialogStateChange]);

  // Mobile search ref for click outside handling
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      console.log('🔄 Header: Starting sign out...');
      
      // Always try to sign out, but don't let errors stop the process
      await signOut();
      
      console.log('🔄 Header: Redirecting to home and reloading...');
    } catch (error) {
      console.error('❌ Header: Sign out error (continuing anyway):', error);
    } finally {
      // Always redirect regardless of what happens above
      window.location.href = '/';
    }
  };

  const handleVenueSelect = (venueId: string) => {
    clearSearch();
    navigate(`/venue/${venueId}`);
  };

  const handleLogoClick = () => {
    // Clear search first
    clearSearch();
    // Force reload of home page to clear all filters
    window.location.href = '/';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-sm safe-area-top">
      <div className="responsive-container">
        <div className="flex items-center justify-between py-2 sm:py-3 md:py-4 lg:py-4 min-h-[var(--header-height)] mobile-header-layout mobile-m-l-optimized">
          {/* Logo and Compact Mobile Search - Left Side */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 lg:gap-3 flex-1 lg:flex-none min-w-0">
            <button 
              onClick={handleLogoClick}
              className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 flex items-center gap-1"
            >
              <div className="flex items-center">
                <img src={SiteLogoMobile} alt="Logo" className="h-8 xxs:h-9 xs:h-10 w-auto sm:hidden" />
                <img src={SiteLogo} alt="Logo" className="h-10 w-auto hidden sm:block" />
              </div>
            </button>
            
            {/* Compact Mobile Search Bar - Only show on small screens */}
            <div className="sm:hidden flex items-center flex-1 min-w-0 mobile-search-container mobile-m-l-search ml-2" ref={mobileSearchRef}>
              <div className="relative w-full mobile-search-compact mobile-m-l-search-bar">
                <div className="bg-muted border border-border rounded-full flex items-center p-2 shadow-sm h-8 hover:bg-muted/80 hover:border-border/80 transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-primary w-full dark:bg-[hsl(var(--dark-surface-2))] dark:border-[hsl(var(--border))] dark:hover:bg-[hsl(var(--dark-surface-3))] dark:hover:border-primary/30">
                  <svg className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0 dark:text-[hsl(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t('home.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    maxLength={100}
                    className="flex-1 bg-transparent border-none outline-none placeholder-muted-foreground text-xs text-foreground min-w-0 dark:text-white dark:placeholder-[hsl(var(--text-secondary))]"
                    onFocus={() => {
                      // Show search results dropdown on mobile
                      if (searchQuery.trim()) {
                        // Trigger search to show results
                      }
                    }}
                    onKeyDown={(e) => {
                      // Small screen only: Handle Return/Enter key like desktop search button
                      if (e.key === 'Enter' && window.innerWidth < 640) {
                        e.preventDefault();
                        handleSearchButtonClick();
                        // Exit typing mode by removing focus from input
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  {searchQuery.trim() && (
                    <button
                      onClick={() => {
                        clearSearch();
                        if (mobileSearchRef.current?.querySelector('input')) {
                          (mobileSearchRef.current.querySelector('input') as HTMLInputElement).blur();
                        }
                      }}
                      className="ml-1 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Mobile Search Results Dropdown (suppressed on pages with inline filtering) */}
                {searchQuery.trim() && !suppressSearchDropdown && (
                  <>
                    {isSearching && searchResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-lg border border-border shadow-lg z-50 p-3 w-64 xs:w-72">
                        <div className="flex items-center justify-center text-muted-foreground text-sm">
                          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                          Searching...
                        </div>
                      </div>
                    )}
                    {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-lg border border-border shadow-lg z-50 max-h-64 overflow-y-auto w-56 xxs:w-64 xs:w-72">
                    <div className="p-2">
                      <div className="text-xs text-muted-foreground mb-2 px-2 font-medium">
                        {searchResults.length} venue{searchResults.length !== 1 ? 's' : ''} found
                      </div>
                      {searchResults.map((venue) => (
                        <button
                          key={venue.id}
                          onClick={() => handleVenueSelect(venue.id)}
                          className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            {/* Venue Image */}
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                              {venue.images && venue.images.length > 0 ? (
                                <img
                                  src={venue.images[0]}
                                  alt={venue.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to initial if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.classList.remove('hidden');
                                    }
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ${venue.images && venue.images.length > 0 ? 'hidden' : ''}`}>
                                <span className="text-white font-semibold text-sm">
                                  {venue.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            {/* Venue Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate text-sm">
                                {venue.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {venue.location}
                              </div>
                            </div>
                            
                            {/* Rating */}
                            {venue.rating !== undefined && venue.rating !== null && (
                              <div className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-full px-2.5 py-1 flex-shrink-0 shadow-sm">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="text-xs font-semibold">
                                  {venue.rating}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Desktop & Tablet Search Bar */}
          <div className="hidden sm:flex flex-1 max-w-2xl mx-4 sm:mx-6 md:mx-8 lg:mx-8 relative tablet-search">
            <div className="relative w-full bg-gray-50 rounded-full border border-gray-200 flex items-center p-1 shadow-sm h-10 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50 focus-within:border-blue-500 dark:bg-[hsl(var(--dark-surface-2))] dark:border-[hsl(var(--border))] dark:hover:bg-[hsl(var(--dark-surface-3))] dark:hover:border-primary/30 dark:focus-within:ring-primary dark:focus-within:border-primary">
              <div className="flex items-center px-3 flex-1">
                <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0 dark:text-[hsl(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t('home.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  maxLength={100}
                  className="w-full text-gray-600 bg-transparent border-none outline-none placeholder-gray-400 text-sm dark:text-white dark:placeholder-[hsl(var(--text-secondary))]"
                />
              </div>
            </div>


            {/* Desktop Search Results Dropdown (suppressed on pages with inline filtering) */}
            {searchQuery.trim() && !suppressSearchDropdown && (
              <>
                {isSearching && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-lg border border-border shadow-lg z-50 p-4">
                    <div className="flex items-center justify-center text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Searching venues...
                    </div>
                  </div>
                )}
                {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-lg border border-border shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-muted-foreground mb-2 px-2 font-medium">
                    {searchResults.length} venue{searchResults.length !== 1 ? 's' : ''} found
                  </div>
                  {searchResults.map((venue) => (
                    <button
                      key={venue.id}
                      onClick={() => handleVenueSelect(venue.id)}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-md transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Venue Image */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                          {venue.images && venue.images.length > 0 ? (
                            <img
                              src={venue.images[0]}
                              alt={venue.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to initial if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) {
                                  fallback.classList.remove('hidden');
                                }
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ${venue.images && venue.images.length > 0 ? 'hidden' : ''}`}>
                            <span className="text-white font-semibold text-sm">
                              {venue.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Venue Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate text-sm">
                            {venue.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {venue.location}
                          </div>
                        </div>
                        
                        {/* Rating */}
                        {venue.rating !== undefined && venue.rating !== null && (
                          <div className="flex items-center gap-1.5 bg-blue-600 text-white rounded-full px-2.5 py-1 flex-shrink-0 shadow-sm">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-semibold">
                              {venue.rating}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
                )}
              </>
            )}
          </div>

          {/* Desktop & Tablet Auth & User Menu */}
          <div className="hidden sm:flex items-center space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-4">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-accent whitespace-nowrap tablet-optimized-button"
              onClick={() => setPartnerDialogOpen(true)}
            >
              <Building2 className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">{t('common.becomePartner', 'Become Partner')}</span>
              <span className="md:hidden">{t('common.partner', 'Partner')}</span>
            </Button>
            {user ? (
              <>
                <DropdownMenu open={userDropdownOpen} onOpenChange={(open) => {
                  setUserDropdownOpen(open);
                  handleDialogStateChange(open);
                }}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-lg" className="hover:bg-accent">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="cursor-pointer p-0"
                      onClick={() => {
                        setProfileDialogOpen(true);
                        setUserDropdownOpen(false);
                      }}
                    >
                      <div className="w-full flex items-center gap-2 px-2 py-1 text-sm">
                        <User className="h-4 w-4" />
                        {t('common.editProfile')}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer p-0"
                      onSelect={(e) => {
                        e.preventDefault();
                        setUserDropdownOpen(false);
                        navigate('/booking-history');
                      }}
                    >
                      <div className="w-full flex items-center gap-2 px-2 py-1 text-sm">
                        <History className="h-4 w-4" />
                        {t('common.bookingHistory')}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer p-0"
                      onClick={() => {
                        setPaymentsDialogOpen(true);
                        setUserDropdownOpen(false);
                      }}
                    >
                      <div className="w-full flex items-center gap-2 px-2 py-1 text-sm">
                        <CreditCard className="h-4 w-4" />
                        {t('common.paymentMethods')}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('common.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap tablet-optimized-button">
                  <span className="hidden md:inline">{t('common.signIn')}</span>
                  <span className="md:hidden">Sign In</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Right Side Controls - Only for small screens */}
          <div className="flex items-center gap-1.5 sm:hidden flex-shrink-0 mobile-controls mobile-m-l-controls">
            {/* Mobile Language Selector - Flag Only */}
            <MobileFlagLanguageSwitcher />
            <ThemeToggle />
            
            {!user ? (
              <>
                <Link to="/auth">
                  <Button size="sm" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground text-xs px-2 py-1 h-7 shadow-md hover:shadow-lg transition-all duration-200 font-medium whitespace-nowrap max-lg:h-7 max-lg:px-2 max-lg:py-1">
                    <span className="hidden xxs:inline">{t('common.signIn')}</span>
                    <span className="xxs:hidden">Sign</span>
                  </Button>
                </Link>
                <Button size="sm" onClick={() => setPartnerDialogOpen(true)} className="hidden bg-background text-primary border border-primary/20 hover:bg-accent text-xs px-2 py-1 h-7 transition-all duration-200 font-medium whitespace-nowrap max-lg:h-7 max-lg:px-2 max-lg:py-1">
                  <span className="hidden xxs:inline">{t('common.becomePartner', 'Become Partner')}</span>
                  <span className="xxs:hidden">{t('common.partner', 'Partner')}</span>
                </Button>
              </>
            ) : (
              /* Mobile User Profile Section - Only show when logged in */
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-all duration-200 hover:shadow-sm border border-border bg-background"
                  onClick={() => {
                    const newMenuState = !isMenuOpen;
                    setIsMenuOpen(newMenuState);
                    handleDialogStateChange(newMenuState);
                  }}
                  aria-label="Toggle user menu"
                >
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-foreground font-medium hidden sm:block truncate max-w-20">
                    {profile?.full_name || user.email?.split('@')[0] || 'User'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation - Only for small screens */}
        {isMenuOpen && (
          <div ref={mobileMenuRef} className="sm:hidden py-3 border-t border-border bg-muted dark:bg-[hsl(var(--dark-surface-1))] dark:border-[hsl(var(--border))]">
            <div className="mx-3">
              <div className="bg-background dark:bg-[hsl(var(--dark-surface-2))] rounded-lg shadow-sm border border-border dark:border-[hsl(var(--border))] p-2.5">
                <nav className="flex flex-col space-y-2">
              {/* User Profile Section - Only show when logged in */}
              {user && (
                <div className="px-3 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[hsl(var(--dark-surface-3))]/50 dark:to-[hsl(var(--dark-surface-3))]/30 rounded-lg mx-3 mb-2 dark:border dark:border-[hsl(var(--border))]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm truncate">
                        {profile?.full_name || user.email?.split('@')[0] || 'User'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Language Selector in Mobile Menu - Only show when not logged in */}
              {!user && (
                <>
                  <div className="px-3 py-2">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">{t('common.language')}</div>
                    <LanguageSwitcher />
                  </div>
                  
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDialogStateChange(false);
                      window.location.href = '/';
                    }}
                    className="responsive-text text-foreground hover:text-primary transition-colors text-left py-2 px-3 rounded-lg hover:bg-accent"
                  >
                    {t('common.browseVenues')}
                  </button>
                  <button
                    className="hidden text-foreground hover:text-primary transition-colors py-2 px-3 rounded-lg hover:bg-accent text-left"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDialogStateChange(false);
                      setPartnerDialogOpen(true);
                    }}
                  >
                    {t('common.becomePartner', 'Become Partner')}
                  </button>
                </>
              )}
              <div className={user ? "" : "pt-3 border-t border-border"}>
                {user ? (
                  <div className="flex flex-col space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground pb-1">{t('common.account', 'Account')}</div>
                    <div className="h-px bg-border mb-1" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('common.signedInAs')} {user.email}
                      </span>
                    </div>
                    <ProfileDialog 
                      defaultTab="profile"
                      open={profileDialogOpen}
                      onOpenChange={setProfileDialogOpen}
                      showPaymentsTab={false}
                    >
                      <Button variant="ghost" className="justify-start w-full h-9 text-sm">
                        <User className="h-4 w-4 mr-2" />
                        {t('common.editProfile')}
                      </Button>
                    </ProfileDialog>
                    <Link
                      to="/booking-history"
                      className="w-full"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleDialogStateChange(false);
                      }}
                    >
                      <Button variant="ghost" className="justify-start w-full h-9 text-sm">
                        <History className="h-4 w-4 mr-2" />
                        {t('common.bookingHistory')}
                      </Button>
                    </Link>
                    <ProfileDialog 
                      defaultTab="payments"
                      open={paymentsDialogOpen}
                      onOpenChange={setPaymentsDialogOpen}
                      showPaymentsTab={false}
                    >
                      <Button variant="ghost" className="justify-start w-full h-9 text-sm">
                        <CreditCard className="h-4 w-4 mr-2" />
                        {t('common.paymentMethods')}
                      </Button>
                    </ProfileDialog>
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="justify-start w-full h-9 text-sm"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('common.signOut')}
                    </Button>
                  </div>
                ) : (
                  <Link to="/auth" className="w-full">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">{t('common.signIn')}</Button>
                  </Link>
                )}
              </div>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      <BecomePartnerDialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen} />
      {/* Mount dialogs outside menus so closing the menu doesn't auto-close dialogs */}
      <ProfileDialog
        defaultTab="profile"
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        showPaymentsTab={false}
      >
        {/* Invisible child to satisfy component API; triggers are handled via state */}
        <span style={{ display: 'none' }} />
      </ProfileDialog>
      <ProfileDialog
        defaultTab="payments"
        open={paymentsDialogOpen}
        onOpenChange={setPaymentsDialogOpen}
        showPaymentsTab={false}
      >
        <span style={{ display: 'none' }} />
      </ProfileDialog>
    </header>
  );
};

export default Header;