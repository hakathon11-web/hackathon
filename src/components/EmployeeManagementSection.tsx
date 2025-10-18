import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Users, LogIn } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hashPassword } from '@/utils/passwordUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Employee {
  id: string;
  username: string;
  venue_id: string;
  created_at: string;
  is_active: boolean;
  venues?: {
    name?: string;
  } | null;
}

interface EmployeeManagementSectionProps {
  venueId: string;
  venueName?: string;
  isEditMode?: boolean;
}

const EmployeeManagementSection: React.FC<EmployeeManagementSectionProps> = ({ 
  venueId, 
  venueName,
  isEditMode = false 
}) => {
  const { data: profile } = useProfile();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  // Fetch employees for this specific venue
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['venue-employees', venueId],
    queryFn: async () => {
      if (!venueId || !profile?.id) return [];

      console.log('🔍 Fetching employees for venue:', venueId);

      // Get employees for this specific venue
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          username,
          venue_id,
          created_at,
          is_active,
          venues (
            name
          )
        `)
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }

      console.log('👥 Fetched employees for venue:', data);
      return data as Employee[];
    },
    enabled: !!venueId && !!profile?.id,
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async ({ username, password, venueId }: { username: string; password: string; venueId: string }) => {
      // Hash the password using secure PBKDF2 hashing
      const passwordHash = await hashPassword(password);

      const { data, error } = await supabase
        .from('employees')
        .insert({
          username,
          password_hash: passwordHash,
          venue_id: venueId,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error creating employee:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-employees', venueId] });
      toast({
        title: t('partner.employeeManagement.employeeCreated'),
        description: t('partner.employeeManagement.employeeCreated'),
      });
      setUsername('');
      setPassword('');
    },
    onError: (error: any) => {
      console.error('Error creating employee:', error);
      
      // Check if it's a unique constraint violation for username
      let errorMessage = t('partner.employeeManagement.failedToCreateEmployee');
      
      if (error?.code === '23505' && error?.message?.includes('employees_username_key')) {
        errorMessage = t('partner.employeeManagement.usernameAlreadyTaken', { username });
      } else if (error?.message?.includes('duplicate key value violates unique constraint') && 
                 error?.message?.includes('employees_username_key')) {
        errorMessage = t('partner.employeeManagement.usernameAlreadyTaken', { username });
      }
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      console.log('🗑️ Attempting to delete employee:', employeeId);
      setDeletingEmployeeId(employeeId);
      
      if (!profile?.id) {
        throw new Error('User not authenticated');
      }

      // Try deletion with venue verification
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select(`
          id,
          username,
          venue_id,
          venues!inner (
            id,
            partner_id
          )
        `)
        .eq('id', employeeId as any)
        .single();

      if (employeeError || !employeeData) {
        throw new Error('Employee not found or you do not have permission to delete this employee');
      }

      // Verify the venue belongs to the current partner
      const employee = employeeData as any;
      if (employee.venues?.partner_id !== profile.id) {
        throw new Error('You do not have permission to delete this employee');
      }

      // Delete the employee
      const { data, error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId as any)
        .select('id, username');

      if (error) {
        console.error('❌ Error deleting employee:', error);
        throw new Error(`Failed to delete employee: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('Employee deletion failed - employee may not exist or you may not have permission');
      }

      console.log('✅ Employee deleted successfully:', data[0]);
      return data[0];
    },
    onSuccess: (deletedEmployee) => {
      console.log('🎉 Employee deletion successful, invalidating queries');
      setDeletingEmployeeId(null);
      queryClient.invalidateQueries({ queryKey: ['venue-employees', venueId] });
      toast({
        title: t('partner.employeeManagement.employeeDeleted'),
        description: `${(deletedEmployee as any).username} has been successfully deleted.`,
      });
    },
    onError: (error) => {
      console.error('❌ Employee deletion failed:', error);
      setDeletingEmployeeId(null);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to delete employee. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateEmployee = async () => {
    if (!username || !password) {
      toast({
        title: t('common.error'),
        description: t('partner.employeeManagement.pleaseFillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    createEmployeeMutation.mutate({
      username,
      password,
      venueId,
    });
  };

  const handleDeleteEmployee = (employeeId: string) => {
    console.log('🎯 Delete employee triggered for ID:', employeeId);
    deleteEmployeeMutation.mutate(employeeId);
  };

  if (employeesLoading) {
    return (
      <div className="space-y-6 max-lg:space-y-4">
        <div className="text-center py-8 max-lg:py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-lg:space-y-4">
      {/* Employee Portal Access Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => window.open('/employee/auth', '_blank')}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2 max-lg:space-x-1"
          title={t('partner.employeeManagement.accessEmployeePortalDescription')}
        >
          <LogIn className="h-4 w-4 max-lg:h-3 max-lg:w-3" />
          <span className="text-sm max-lg:text-xs font-medium">
            {t('partner.employeeManagement.accessEmployeePortal')}
          </span>
        </Button>
      </div>

      <div className="grid gap-6 max-lg:gap-4 lg:grid-cols-2">
        {/* Add Employee Form */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="p-6 max-lg:p-4">
            <CardTitle className="text-gray-900 dark:text-white flex items-center space-x-2 text-xl max-lg:text-lg">
              <Plus className="h-5 w-5 max-lg:h-4 max-lg:w-4" />
              <span>{t('partner.employeeManagement.addEmployee')}</span>
            </CardTitle>
            {venueName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('partner.employeeManagement.forVenue')}: {venueName}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-6 max-lg:p-4 space-y-4 max-lg:space-y-3">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm max-lg:text-xs">{t('partner.employeeManagement.username')} *</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('partner.employeeManagement.enterUsername')}
                className="border-gray-300 dark:border-gray-600 text-sm max-lg:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm max-lg:text-xs">{t('partner.employeeManagement.password')} *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('partner.employeeManagement.enterPassword')}
                className="border-gray-300 dark:border-gray-600 text-sm max-lg:text-sm"
              />
            </div>

            <Button
              onClick={handleCreateEmployee}
              disabled={createEmployeeMutation.isPending || !username || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createEmployeeMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 max-lg:h-3 max-lg:w-3 border-b-2 border-white"></div>
                  <span className="text-sm max-lg:text-xs">{t('partner.employeeManagement.creating')}</span>
                </div>
              ) : (
                <span className="text-sm max-lg:text-xs">{t('partner.employeeManagement.createEmployee')}</span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Employees List */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="p-6 max-lg:p-4">
            <CardTitle className="text-gray-900 dark:text-white flex items-center space-x-2 text-xl max-lg:text-lg">
              <Users className="h-5 w-5 max-lg:h-4 max-lg:w-4" />
              <span>{t('partner.employeeManagement.employees')}</span>
            </CardTitle>
            {venueName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('partner.employeeManagement.forVenue')}: {venueName}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-6 max-lg:p-4">
            {employees && employees.length > 0 ? (
              <div className="space-y-4 max-lg:space-y-3">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex flex-col max-lg:flex-col lg:flex-row lg:items-center lg:justify-between p-4 max-lg:p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 max-lg:space-y-2 lg:space-y-0"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white text-base max-lg:text-sm">
                        {employee.username}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 max-lg:mt-0.5">
                        {t('partner.employeeManagement.createdAt')}: {new Date(employee.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 w-full max-lg:w-full lg:w-auto"
                        >
                          <Trash2 className="h-4 w-4 max-lg:h-3 max-lg:w-3 mr-2 max-lg:mr-1" />
                          <span className="text-sm max-lg:text-xs">{t('common.delete')}</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-lg:max-w-xs">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-lg max-lg:text-base text-red-600">
                            {t('partner.employeeManagement.deleteEmployee')}
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-sm max-lg:text-xs">
                            {t('partner.employeeManagement.confirmDelete')} <strong>"{employee.username}"</strong>? 
                            <br />
                            <span className="text-red-600 font-medium">{t('partner.employeeManagement.thisActionCannotBeUndone')}</span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex flex-col max-lg:flex-col lg:flex-row space-y-2 max-lg:space-y-2 lg:space-y-0 lg:space-x-2">
                          <AlertDialogCancel 
                            className="w-full max-lg:w-full lg:w-auto"
                            disabled={deleteEmployeeMutation.isPending || deletingEmployeeId === employee.id}
                          >
                            {t('common.cancel')}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="bg-red-600 hover:bg-red-700 w-full max-lg:w-full lg:w-auto"
                            disabled={deleteEmployeeMutation.isPending || deletingEmployeeId === employee.id}
                          >
                            {deleteEmployeeMutation.isPending && deletingEmployeeId === employee.id ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 max-lg:h-3 max-lg:w-3 border-b-2 border-white"></div>
                                <span className="text-sm max-lg:text-xs">{t('partner.employeeManagement.deleting')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Trash2 className="h-4 w-4 max-lg:h-3 max-lg:w-3" />
                                <span className="text-sm max-lg:text-xs">{t('common.delete')}</span>
                              </div>
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 max-lg:py-6">
                <Users className="h-12 w-12 max-lg:h-10 max-lg:w-10 text-gray-400 mx-auto mb-4 max-lg:mb-3" />
                <h3 className="text-lg max-lg:text-base font-medium text-gray-900 dark:text-white mb-2 max-lg:mb-1">
                  {t('partner.employeeManagement.noEmployees')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-lg:text-xs">
                  {t('partner.employeeManagement.noEmployeesDescription')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeManagementSection;
