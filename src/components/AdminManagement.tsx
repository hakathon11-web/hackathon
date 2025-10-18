/**
 * Secure Admin Management Component
 * 
 * This component provides a secure interface for managing admin accounts.
 * Only existing admins can access this functionality.
 */

import React, { useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { requestAdminPrivileges, getAdminUsers, canGrantAdminPrivileges } from '@/utils/adminSecurity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, UserPlus, Users, AlertTriangle } from 'lucide-react';

export const AdminManagement: React.FC = () => {
  const { isAdmin, loading } = useAdminAuth();
  const [canGrant, setCanGrant] = useState<boolean>(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [requestForm, setRequestForm] = useState({
    email: '',
    fullName: '',
    reason: ''
  });
  const [requestStatus, setRequestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check if current user can grant admin privileges
  React.useEffect(() => {
    const checkPermissions = async () => {
      const canGrantPrivileges = await canGrantAdminPrivileges();
      setCanGrant(canGrantPrivileges);
    };
    checkPermissions();
  }, [isAdmin]);

  // Load admin users
  const loadAdminUsers = async () => {
    setLoadingAdmins(true);
    try {
      const result = await getAdminUsers();
      if (result.success && result.admins) {
        setAdminUsers(result.admins);
      }
    } catch (error) {
      console.error('Failed to load admin users:', error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Load admin users on component mount
  React.useEffect(() => {
    if (isAdmin) {
      loadAdminUsers();
    }
  }, [isAdmin]);

  // Handle admin privilege request
  const handleAdminRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestForm.email || !requestForm.fullName || !requestForm.reason) {
      setRequestStatus({ type: 'error', message: 'All fields are required' });
      return;
    }

    try {
      const result = await requestAdminPrivileges({
        email: requestForm.email,
        fullName: requestForm.fullName,
        reason: requestForm.reason,
        authorizedBy: 'current-admin' // This would be the current admin's email in a real implementation
      });

      if (result.success) {
        setRequestStatus({ 
          type: 'success', 
          message: 'Admin privilege request submitted successfully. The request will be reviewed by system administrators.' 
        });
        setRequestForm({ email: '', fullName: '', reason: '' });
      } else {
        setRequestStatus({ type: 'error', message: result.error || 'Failed to submit request' });
      }
    } catch (error) {
      setRequestStatus({ type: 'error', message: 'An unexpected error occurred' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading admin management...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Access denied. You must be an administrator to access this functionality.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Management</h1>
      </div>

      {requestStatus && (
        <Alert variant={requestStatus.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{requestStatus.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Admin Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Admin Users
            </CardTitle>
            <CardDescription>
              List of users with administrative privileges
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAdmins ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading admin users...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {adminUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No admin users found</p>
                ) : (
                  adminUsers.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{admin.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Admin since: {new Date(admin.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                  ))
                )}
              </div>
            )}
            <Button 
              onClick={loadAdminUsers} 
              variant="outline" 
              size="sm" 
              className="mt-4"
              disabled={loadingAdmins}
            >
              Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Admin Request Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Request Admin Privileges
            </CardTitle>
            <CardDescription>
              Submit a request to grant admin privileges to a user
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canGrant ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You do not have permission to grant admin privileges. Contact a system administrator.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleAdminRequest} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={requestForm.email}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={requestForm.fullName}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="reason">Reason for Admin Access</Label>
                  <Textarea
                    id="reason"
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Explain why this user needs admin privileges..."
                    rows={3}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  Submit Admin Request
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> Admin privileges grant full access to the system. 
          All admin actions are logged and monitored. Only grant admin access to trusted personnel 
          who require it for their job responsibilities.
        </AlertDescription>
      </Alert>
    </div>
  );
};
