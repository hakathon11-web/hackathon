import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, User, Settings, Calendar, CreditCard } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const LayoutStabilityTest = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [bodyStyles, setBodyStyles] = useState({
    overflow: '',
    paddingRight: '',
    position: '',
    scrollLocked: ''
  });

  // Monitor body styles in real-time
  useEffect(() => {
    const updateBodyStyles = () => {
      const body = document.body;
      setBodyStyles({
        overflow: body.style.overflow || 'auto',
        paddingRight: body.style.paddingRight || '0px',
        position: body.style.position || 'static',
        scrollLocked: body.getAttribute('data-scroll-locked') || 'none'
      });
    };

    // Update immediately
    updateBodyStyles();

    // Set up interval to monitor changes
    const interval = setInterval(updateBodyStyles, 100);

    // Set up mutation observer for immediate updates
    const observer = new MutationObserver(updateBodyStyles);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'data-scroll-locked']
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Layout Stability Test</h1>
        
        {/* Visual indicator for body position */}
        <div className="fixed top-4 left-4 bg-red-500 text-white px-3 py-1 rounded text-sm font-mono z-50">
          Body Position Monitor
        </div>
        
        {/* Test buttons that should remain visible and stable */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 mb-6 sm:mb-8 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <Button variant="outline" size="lg" className="bg-white">
            Show Filters
          </Button>
          <Button variant="outline" size="lg" className="bg-white">
            Explore on Map
          </Button>
          <Button variant="outline" size="lg" className="bg-white">
            Sort by Price
          </Button>
        </div>

        {/* Test grid to show layout stability */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-gray-100 p-4 rounded-lg border-2 border-gray-300">
              <h3 className="font-semibold">Test Card {i + 1}</h3>
              <p className="text-sm text-gray-600">This card should not shift when dialogs open.</p>
            </div>
          ))}
        </div>

        {/* Test notification dropdown */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Test Notification Dropdown</h2>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg">
                <Bell className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuItem>Test notification 1</DropdownMenuItem>
              <DropdownMenuItem>Test notification 2</DropdownMenuItem>
              <DropdownMenuItem>Test notification 3</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="ml-2 text-sm text-gray-600">
            Status: {isDropdownOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        {/* Test profile dialog */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Test Profile Dialog</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-lg">
                <User className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Test Profile Dialog</DialogTitle>
              </DialogHeader>
              <p>This is a test dialog content. The body should not shift when this opens.</p>
              <div className="mt-4">
                <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>
          <span className="ml-2 text-sm text-gray-600">
            Status: {isDialogOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        {/* Test settings dialog */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Test Settings Dialog</h2>
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-lg">
                <Settings className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Theme</label>
                  <select className="mt-1 block w-full rounded-md border-gray-300">
                    <option>Light</option>
                    <option>Dark</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Language</label>
                  <select className="mt-1 block w-full rounded-md border-gray-300">
                    <option>English</option>
                    <option>Georgian</option>
                  </select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <span className="ml-2 text-sm text-gray-600">
            Status: {isSettingsDialogOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        {/* Test booking dialog */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Test Booking Dialog</h2>
          <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-lg">
                <Calendar className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Book Venue</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Date</label>
                  <input type="date" className="mt-1 block w-full rounded-md border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Time</label>
                  <input type="time" className="mt-1 block w-full rounded-md border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Guests</label>
                  <input type="number" min="1" className="mt-1 block w-full rounded-md border-gray-300" />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <span className="ml-2 text-sm text-gray-600">
            Status: {isBookingDialogOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        {/* Test alert dialog */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Test Alert Dialog</h2>
          <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-lg">
                <CreditCard className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to proceed with this payment? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <span className="ml-2 text-sm text-gray-600">
            Status: {isAlertDialogOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        {/* Status indicators */}
        <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-300">
          <h3 className="font-semibold mb-2">Test Status:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <p>Dropdown: <span className={isDropdownOpen ? 'text-green-600' : 'text-gray-600'}>{isDropdownOpen ? 'Open' : 'Closed'}</span></p>
            <p>Profile Dialog: <span className={isDialogOpen ? 'text-green-600' : 'text-gray-600'}>{isDialogOpen ? 'Open' : 'Closed'}</span></p>
            <p>Settings Dialog: <span className={isSettingsDialogOpen ? 'text-green-600' : 'text-gray-600'}>{isSettingsDialogOpen ? 'Open' : 'Closed'}</span></p>
            <p>Booking Dialog: <span className={isBookingDialogOpen ? 'text-green-600' : 'text-gray-600'}>{isBookingDialogOpen ? 'Open' : 'Closed'}</span></p>
            <p>Alert Dialog: <span className={isAlertDialogOpen ? 'text-green-600' : 'text-gray-600'}>{isAlertDialogOpen ? 'Open' : 'Closed'}</span></p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
          <h3 className="font-semibold mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Verify that the "Show Filters", "Explore on Map", and "Sort by Price" buttons are visible and stable</li>
            <li>Check that the test cards in the grid don't shift position</li>
            <li>Click the notification bell icon - buttons should remain in place</li>
            <li>Close the notification dropdown</li>
            <li>Click the profile icon - buttons should remain in place</li>
            <li>Close the profile dialog</li>
            <li>Test all other dialogs (Settings, Booking, Alert) - no shifting should occur</li>
            <li>Open multiple dialogs simultaneously to test stability</li>
            <li>Check that the red "Body Position Monitor" stays in the same position</li>
          </ol>
        </div>

        {/* Body style monitor */}
        <div className="mt-8 bg-red-50 p-4 rounded-lg border-2 border-red-200">
          <h3 className="font-semibold mb-2">Body Style Monitor:</h3>
          <div className="text-sm font-mono">
            <p>Overflow: <span className={bodyStyles.overflow === 'scroll' ? 'text-green-600' : 'text-red-600'}>{bodyStyles.overflow}</span></p>
            <p>Padding-right: <span className={bodyStyles.paddingRight === '0px' ? 'text-green-600' : 'text-red-600'}>{bodyStyles.paddingRight}</span></p>
            <p>Position: <span className={bodyStyles.position === 'static' ? 'text-green-600' : 'text-red-600'}>{bodyStyles.position}</span></p>
            <p>Scroll-locked: <span className={bodyStyles.scrollLocked === 'none' ? 'text-green-600' : 'text-red-600'}>{bodyStyles.scrollLocked}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutStabilityTest;
