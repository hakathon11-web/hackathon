import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Shield, 
  Building, 
  Users, 
  Calendar, 
  Settings,
  Star,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, onToggle }) => {
  const location = useLocation();

  const menuItems = [
    {
      title: 'Dashboard',
      icon: Shield,
      href: '/admin',
      exact: true
    },
    {
      title: 'Approvals',
      icon: Shield,
      href: '/admin/approvals'
    },
    {
      title: 'Venues',
      icon: Building,
      href: '/admin/venues'
    },
    {
      title: 'Users',
      icon: Users,
      href: '/admin/users'
    },
    {
      title: 'Bookings',
      icon: Calendar,
      href: '/admin/bookings'
    },

    {
      title: 'Services & Games',
      icon: Settings,
      href: '/admin/services'
    },
    {
      title: 'Reviews',
      icon: Star,
      href: '/admin/reviews'
    },
    {
      title: 'Notifications',
      icon: Users,
      href: '/admin/notifications'
    },
    {
      title: 'Audit Logs',
      icon: Shield,
      href: '/admin/audit-logs'
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/admin/settings'
    }
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className={cn(
      "bg-gray-800 text-white h-screen flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <Star className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">Dajavshne Admin</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-gray-400 hover:text-white hover:bg-gray-700"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive: linkActive }) => cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
              (linkActive && item.exact) || (isActive(item.href, item.exact))
                ? "bg-primary text-white" 
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400">Admin Dashboard v1.0</p>
        </div>
      )}
    </div>
  );
};

export default AdminSidebar;