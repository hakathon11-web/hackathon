import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, 
  User, 
  Search, 
  Calendar,
  Eye,
  Users,
  Building,
  Shield
} from 'lucide-react';

const AdminLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [viewMode, setViewMode] = useState('admin');
  const [dateRange, setDateRange] = useState('all');
  const { profile, signOut } = useAdminAuth();

  const handleSignOut = async () => {
    try {
      console.log('🔄 AdminLayout: Starting sign out...');
      await signOut();
      console.log('🔄 AdminLayout: Redirecting to home...');
    } catch (error) {
      console.error('❌ AdminLayout: Sign out error (continuing anyway):', error);
    } finally {
      // Always redirect regardless of what happens above
      window.location.href = '/';
    }
  };

  const getViewModeIcon = (mode: string) => {
    switch (mode) {
      case 'customer': return <Users className="h-4 w-4" />;
      case 'partner': return <Building className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getViewModeBadge = (mode: string) => {
    const colors = {
      customer: 'bg-green-500/20 text-green-400 border-green-500',
      partner: 'bg-blue-500/20 text-blue-400 border-blue-500',
      admin: 'bg-red-500/20 text-red-400 border-red-500'
    };
    
    return (
      <Badge variant="outline" className={colors[mode as keyof typeof colors]}>
        <div className="flex items-center space-x-1">
          {getViewModeIcon(mode)}
          <span>View as {mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
        </div>
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <AdminSidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Top Header */}
        <header className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div>
                <h2 className="text-xl font-semibold text-white">Admin Dashboard</h2>
                <p className="text-sm text-gray-400">Manage your booking platform</p>
              </div>
              
              {/* Global Search */}
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Global search across all entities..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Date Range Filter */}
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              
              {/* View Mode Switcher */}
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="admin">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Admin View</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="customer">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Customer View</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="partner">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4" />
                      <span>Partner View</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {viewMode !== 'admin' && getViewModeBadge(viewMode)}
              
              {/* User Info */}
              <div className="flex items-center space-x-2 text-gray-300">
                <User className="h-4 w-4" />
                <span className="text-sm">{profile?.full_name || profile?.email}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
          
          {/* View Mode Preview */}
          {viewMode !== 'admin' && (
            <div className="mt-4 bg-gray-700 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Preview Mode Active</h3>
                  <p className="text-sm text-gray-400">
                    You're viewing a read-only preview of the {viewMode} interface
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('admin')}
                  className="border-gray-500 text-gray-300"
                >
                  Back to Admin
                </Button>
              </div>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 bg-gray-900">
          {viewMode === 'admin' ? (
            <Outlet />
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 h-full flex items-center justify-center">
              <div className="text-center">
                <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View Preview
                </h2>
                <p className="text-gray-400 mb-4">
                  This would show a read-only preview of the {viewMode} interface
                </p>
                <Button onClick={() => setViewMode('admin')}>
                  Return to Admin View
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;