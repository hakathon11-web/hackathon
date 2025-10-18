import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmailConfirmationGuardProps {
  children: React.ReactNode;
}

const EmailConfirmationGuard: React.FC<EmailConfirmationGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [resending, setResending] = React.useState(false);
  const location = useLocation();

  // Bypass email confirmation on employee and partner routes
  const isEmployeeRoute = location.pathname.startsWith('/employee');
  const isPartnerRoute = location.pathname.startsWith('/partner');

  // Don't render anything while loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, let the route handle authentication
  if (!user) {
    return <>{children}</>;
  }

  // If on employee or partner routes, bypass email confirmation entirely
  if (isEmployeeRoute || isPartnerRoute) {
    return <>{children}</>;
  }

  // If email is confirmed, render children
  if (user.email_confirmed_at) {
    return <>{children}</>;
  }

  // If email is not confirmed, show confirmation required screen
  const handleResendConfirmation = async () => {
    if (!user?.email) return;
    
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast({
          title: "Failed to resend",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email sent!",
          description: "Please check your inbox for the confirmation email.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('🔄 EmailConfirmationGuard: Starting sign out...');
      await supabase.auth.signOut();
      const employeeSession = sessionStorage.getItem('employee_session');
      localStorage.clear();
      sessionStorage.clear();
      if (employeeSession) {
        sessionStorage.setItem('employee_session', employeeSession);
      }
      console.log('🔄 EmailConfirmationGuard: Redirecting to home...');
    } catch (error) {
      console.error('❌ EmailConfirmationGuard: Sign out error (continuing anyway):', error);
      const employeeSession = sessionStorage.getItem('employee_session');
      localStorage.clear();
      sessionStorage.clear();
      if (employeeSession) {
        sessionStorage.setItem('employee_session', employeeSession);
      }
    } finally {
      // Always redirect regardless of what happens above
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gaming-mesh opacity-60" />
      
      <Card className="w-full max-w-md glass-effect border-primary/20 relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold gradient-text flex items-center justify-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Email Confirmation Required
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Please confirm your email to continue
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-foreground">
              We've sent a confirmation email to:
            </p>
            <p className="font-semibold text-primary bg-primary/10 px-4 py-2 rounded-lg">
              {user.email}
            </p>
            <p className="text-sm text-muted-foreground">
              Click the confirmation link in your email to activate your account and gain full access to VenueSpot.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleResendConfirmation}
              disabled={resending}
              className="w-full btn-primary"
            >
              {resending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {resending ? 'Sending...' : 'Resend Confirmation Email'}
            </Button>
            
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="w-full btn-outline"
            >
              Sign Out
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmationGuard;