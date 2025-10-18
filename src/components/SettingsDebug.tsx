import React from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

const SettingsDebug: React.FC = () => {
  const { data: systemSettings } = useSystemSettings();

  const checkLocalStorage = () => {
    const stored = localStorage.getItem('admin_system_settings');
    console.log('🔍 localStorage settings:', stored);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('🔍 Parsed localStorage settings:', parsed);
        console.log('🔍 Current timeout from localStorage:', parsed.booking_timeout_minutes);
      } catch (error) {
        console.error('🔍 Error parsing localStorage:', error);
      }
    }
  };

  React.useEffect(() => {
    checkLocalStorage();
  }, [systemSettings]);

  if (!systemSettings) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg text-white">
      <h3 className="text-lg font-bold mb-2">🔧 System Settings Debug</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Booking Timeout:</strong> {systemSettings.booking_timeout_minutes} minutes
        </div>
        <div>
          <strong>Auto Approval:</strong> {systemSettings.auto_approval_enabled ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Email Notifications:</strong> {systemSettings.email_notifications_enabled ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Review Moderation:</strong> {systemSettings.review_moderation_enabled ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Require Email Verification:</strong> {systemSettings.require_email_verification ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Allow Guest Bookings:</strong> {systemSettings.allow_guest_bookings ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Default Commission Rate:</strong> {systemSettings.default_commission_rate}%
        </div>
        <div>
          <strong>Minimum Booking Amount:</strong> {systemSettings.minimum_booking_amount}
        </div>
        <div>
          <strong>Max Advance Booking Days:</strong> {systemSettings.max_advance_booking_days}
        </div>
        <div>
          <strong>Maintenance Mode:</strong> {systemSettings.maintenance_mode ? 'Yes' : 'No'}
        </div>
      </div>
      <button 
        onClick={checkLocalStorage}
        className="mt-4 px-3 py-1 bg-blue-600 rounded text-xs"
      >
        Check localStorage
      </button>
    </div>
  );
};

export default SettingsDebug;
