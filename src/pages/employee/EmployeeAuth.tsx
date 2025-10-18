import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '@/components/ThemeToggle';

const EmployeeAuth = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { employee, loading, isAuthenticated, signIn } = useEmployeeAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Redirect already authenticated employees to dashboard
  useEffect(() => {
    if (isAuthenticated && employee && !loading) {
      navigate('/employee/dashboard', { replace: true });
    }
  }, [isAuthenticated, employee, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: t('common.error'),
        description: 'Please enter both username and password.',
        variant: 'destructive',
      });
      return;
    }

    const result = await signIn(username, password);
    
    if (result.success) {
      toast({
        title: t('employee.auth.loginSuccess'),
        description: t('employee.auth.loginSuccess'),
      });
      
      // Use immediate navigation as fallback and state will handle persistence
      setTimeout(() => {
        navigate('/employee/dashboard', { replace: true });
      }, 100);
    } else {
      toast({
        title: t('common.error'),
        description: t('employee.auth.invalidCredentials'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent)] opacity-70 dark:bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.2),transparent)]" />
      
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md backdrop-blur-sm bg-card/95 dark:bg-card/95 border-primary/10 dark:border-primary/20 relative z-10 shadow-2xl">
        <CardHeader className="space-y-1 pb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            {t('employee.auth.title')}
          </CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-400">
            {t('employee.auth.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
                {t('employee.auth.username')}
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-background dark:bg-gray-800 text-foreground dark:text-white"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                {t('employee.auth.password')}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-background dark:bg-gray-800 text-foreground dark:text-white"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white py-2"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('employee.auth.loggingIn')}</span>
                </div>
              ) : (
                t('employee.auth.login')
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeAuth;
