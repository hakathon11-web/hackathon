import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { verifyPassword, verifyLegacyPassword, isLegacyHash } from '@/utils/passwordUtils';
import { sanitizeUsername, buildSafeUsernameQuery } from '@/utils/inputSanitization';

interface Employee {
  id: string;
  username: string;
  venue_id: string;
  is_active: boolean;
  venues: {
    name: string;
  };
}

// Initialize employee state from sessionStorage immediately
const getInitialEmployeeState = (): Employee | null => {
  try {
    const storedEmployee = sessionStorage.getItem('employee_session');
    if (storedEmployee) {
      const parsed = JSON.parse(storedEmployee);
      return parsed;
    }
  } catch (e) {
    sessionStorage.removeItem('employee_session');
  }
  return null;
};

export const useEmployeeAuth = () => {
  const [employee, setEmployee] = useState<Employee | null>(getInitialEmployeeState);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Additional check in useEffect as backup
  useEffect(() => {
    if (!employee) {
      const storedEmployee = sessionStorage.getItem('employee_session');
      if (storedEmployee) {
        try {
          const parsed = JSON.parse(storedEmployee);
          setEmployee(parsed);
          
          // Set the employee ID in the database session for RLS policies
          console.log('🔧 Restoring employee session for RLS:', parsed.id);
          supabase.rpc('set_config', {
            setting_name: 'app.current_employee_id',
            setting_value: parsed.id
          }).then(() => {
            console.log('✅ Employee session restored successfully');
          }).catch(error => {
            console.warn('Failed to set employee session setting:', error);
          });
        } catch (e) {
          sessionStorage.removeItem('employee_session');
        }
      }
    }
  }, [employee]);

  // Verify employee still exists in database (for deleted employees)
  useEffect(() => {
    if (employee && employee.id) {
      const verifyEmployeeExists = async () => {
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('id, is_active')
            .eq('id', employee.id)
            .single();

          if (error || !data || !data.is_active) {
            console.log('🚫 Employee no longer exists or is inactive, logging out');
            sessionStorage.removeItem('employee_session');
            setEmployee(null);
          }
        } catch (verifyError) {
          console.warn('⚠️ Employee verification error:', verifyError);
          // On error, assume employee is still valid to avoid unnecessary logouts
        }
      };

      // Verify every 30 seconds if employee is still valid
      const interval = setInterval(verifyEmployeeExists, 30000);
      
      // Also verify immediately
      verifyEmployeeExists();

      return () => clearInterval(interval);
    }
  }, [employee]);

  const signIn = async (username: string, password: string) => {
    setLoading(true);
    try {
      // Sanitize and validate username input to prevent SQL injection
      const sanitizedUsername = sanitizeUsername(username);
      
      // First get the employee record with password hash using safe query
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          username,
          venue_id,
          is_active,
          password_hash,
          venues (
            name
          )
        `)
        .eq('username', sanitizedUsername)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error('Invalid credentials');
      }

      // Verify password using secure hashing or legacy method
      let isValidPassword = false;
      
      if (isLegacyHash(data.password_hash)) {
        // Handle legacy base64 encoded passwords for backward compatibility
        isValidPassword = verifyLegacyPassword(password, data.password_hash);
      } else {
        // Use secure password verification
        isValidPassword = await verifyPassword(password, data.password_hash);
      }

      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Remove password_hash from the employee data before storing/returning
      const { password_hash, ...employeeData } = data;

      // Set the current employee ID in the database session for RLS policies
      console.log('🔧 Setting employee session for RLS:', employeeData.id);
      const { error: configError } = await supabase.rpc('set_config', {
        setting_name: 'app.current_employee_id',
        setting_value: employeeData.id
      });
      
      if (configError) {
        console.error('Failed to set employee session config:', configError);
      } else {
        console.log('✅ Employee session config set successfully');
      }

      // Store employee session
      sessionStorage.setItem('employee_session', JSON.stringify(employeeData));
      setEmployee(employeeData);

      return { success: true, employee: employeeData };
    } catch (error) {
      console.error('Employee login error:', error);
      return { success: false, error: 'Invalid username or password' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    // Clear the current employee ID from the database session
    try {
      await supabase.rpc('set_config', {
        setting_name: 'app.current_employee_id',
        setting_value: null
      });
    } catch (error) {
      console.warn('Failed to clear employee session setting:', error);
    }
    
    sessionStorage.removeItem('employee_session');
    setEmployee(null);
  };

  const isAuthenticated = !!employee;

  return {
    employee,
    loading,
    isAuthenticated,
    signIn,
    signOut,
  };
};
