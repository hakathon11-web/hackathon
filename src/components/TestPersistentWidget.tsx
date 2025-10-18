import React from 'react';
import { usePersistentWidgetState } from '@/hooks/usePersistentWidgetState';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, RefreshCw, Trash2 } from 'lucide-react';

/**
 * Test component to verify persistent widget state functionality
 *
 * To test:
 * 1. Toggle any category expanded/collapsed
 * 2. Refresh the page (Cmd+R or F5)
 * 3. The states should be preserved
 *
 * You can also check localStorage in browser DevTools:
 * - Open DevTools (F12)
 * - Go to Application/Storage tab
 * - Look for "booking-widget-state" key
 */
const TestPersistentWidget: React.FC = () => {
  const {
    isExpanded,
    categories,
    setIsExpanded,
    setCategoryExpanded,
    resetState,
  } = usePersistentWidgetState({
    storageKey: 'booking-widget-state',
    syncAcrossTabs: true,
    debounceMs: 500,
  });

  // Get current localStorage value for debugging
  const getStoredState = () => {
    try {
      const stored = localStorage.getItem('booking-widget-state');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const [debugState, setDebugState] = React.useState(getStoredState());

  // Update debug state when localStorage changes
  const refreshDebugState = () => {
    setDebugState(getStoredState());
  };

  // Category configuration
  const categoryConfig = [
    { key: 'activeBookings', label: 'Active Bookings', color: 'bg-green-500' },
    { key: 'pendingApprovals', label: 'Pending Approvals', color: 'bg-yellow-500' },
    { key: 'pendingReviews', label: 'Pending Reviews', color: 'bg-blue-500' },
    { key: 'rejectedBookings', label: 'Rejected Bookings', color: 'bg-red-500' },
    { key: 'cancelledBookings', label: 'Cancelled Bookings', color: 'bg-gray-500' },
    { key: 'expiredBookings', label: 'Expired Bookings', color: 'bg-orange-500' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Persistent Widget State Test</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDebugState}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh Debug
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  resetState();
                  refreshDebugState();
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Reset State
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Testing Instructions:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Toggle any category below (expand/collapse)</li>
              <li>Refresh the page (Cmd+R or F5)</li>
              <li>The states should be preserved after refresh</li>
              <li>Open this page in another tab - changes sync instantly</li>
            </ol>
          </div>

          {/* Main Widget Expanded State */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Widget Expanded</h3>
              <p className="text-sm text-gray-500">Main widget expand/collapse state</p>
            </div>
            <Button
              variant={isExpanded ? 'default' : 'outline'}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Expanded
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Collapsed
                </>
              )}
            </Button>
          </div>

          {/* Category States */}
          <div className="space-y-2">
            <h3 className="font-semibold mb-3">Category States</h3>
            {categoryConfig.map(({ key, label, color }) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="font-medium">{label}</span>
                  <Badge variant={categories[key as keyof typeof categories] ? 'default' : 'secondary'}>
                    {categories[key as keyof typeof categories] ? 'Expanded' : 'Collapsed'}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCategoryExpanded(key as keyof typeof categories, !categories[key as keyof typeof categories])}
                >
                  {categories[key as keyof typeof categories] ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* Debug: Current State in localStorage */}
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">localStorage Debug Info:</h3>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Storage Key:</span> booking-widget-state
              </div>
              <div className="text-sm">
                <span className="font-medium">Stored Value:</span>
                {debugState ? (
                  <pre className="mt-2 p-2 bg-white rounded border text-xs overflow-auto">
                    {JSON.stringify(debugState, null, 2)}
                  </pre>
                ) : (
                  <span className="text-gray-500 ml-2">No data in localStorage</span>
                )}
              </div>
            </div>
          </div>

          {/* Console Output Info */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">Check Console:</h3>
            <p className="text-sm text-yellow-800">
              Open browser DevTools (F12) and check the Console tab.
              You should see "[PersistentWidget]" logs showing when state is saved/loaded.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestPersistentWidget;