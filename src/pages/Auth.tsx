import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { analyticsEvents } from '@/lib/analytics';
import { Loader2, User, Heart, ArrowLeft, Chrome, Eye, EyeOff, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation, Trans } from 'react-i18next';
import { isPasswordStrong, getPasswordValidationMessage, getMissingRequirements } from '@/utils/passwordValidation';

const setCookie = (key: string, value: string, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${key}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
};

// Strong password validation function
const validatePassword = (password: string) => {
  return {
    isValid: isPasswordStrong(password),
    errors: {
      length: !isPasswordStrong(password)
    }
  };
};

// Email validation function
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const { signInWithEmail, signUpWithEmail, resetPassword, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Function to clear form fields when switching tabs
  const clearFormFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAgreeTerms(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Update password validation when password changes
  React.useEffect(() => {
    setPasswordValidation(validatePassword(password));
  }, [password]);

  // Check if user is already signed in and redirect accordingly
  React.useEffect(() => {
    // Only check auth status after auth loading is complete
    if (authLoading) return;
    
    if (user) {
      // User is already authenticated, check for pending booking data first
      const pendingBookingData = localStorage.getItem('pendingBookingData');
      const pendingBookingDialog = localStorage.getItem('pendingBookingDialog');
      
      if (pendingBookingData && pendingBookingDialog === 'true') {
        try {
          const bookingData = JSON.parse(pendingBookingData);
          // Clear the pending data
          localStorage.removeItem('pendingBookingData');
          localStorage.removeItem('pendingBookingDialog');
          // Navigate back to the venue page
          navigate(`/venue/${bookingData.venueId}`);
        } catch (error) {
          console.error('Error parsing pending booking data:', error);
          navigate('/');
        }
      } else {
        // No pending booking data, redirect to main page
        navigate('/');
      }
    }
  }, [user, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      const { error } = await signInWithEmail(email, password);
      
      if (error) {
        let errorMessage = error.message;
        
        // Provide more user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = t('auth.invalidCredentials');
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = t('auth.emailNotConfirmed');
        } else if (error.message.includes('Too many requests')) {
          errorMessage = t('auth.tooManyRequests');
        }
        
        toast({
          title: t('auth.signInFailed'),
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.signInSuccess'),
        });
        
        // Track successful sign in
        analyticsEvents.userSignedIn('email');
        
        // Check if there's pending booking data
        const pendingBookingData = localStorage.getItem('pendingBookingData');
        const pendingBookingDialog = localStorage.getItem('pendingBookingDialog');
        
        if (pendingBookingData && pendingBookingDialog === 'true') {
          // Clear the pending data
          localStorage.removeItem('pendingBookingData');
          localStorage.removeItem('pendingBookingDialog');
          
          // Parse the booking data to get the venue ID
          try {
            const bookingData = JSON.parse(pendingBookingData);
            // Navigate back to the venue page where the booking was initiated
            navigate(`/venue/${bookingData.venueId}`);
          } catch (error) {
            console.error('Error parsing pending booking data:', error);
            navigate('/');
          }
        } else {
          navigate('/');
        }
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('auth.unexpectedError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      toast({
        title: t('auth.validationError'),
        description: t('auth.pleaseEnterEmail'),
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(forgotPasswordEmail)) {
      toast({
        title: t('auth.invalidEmail'),
        description: t('auth.pleaseEnterValidEmail'),
        variant: "destructive",
      });
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const { error } = await resetPassword(forgotPasswordEmail.trim());
      
      if (error) {
        toast({
          title: t('auth.forgotPasswordFailed'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        setForgotPasswordSent(true);
        toast({
          title: t('auth.forgotPasswordSuccess'),
          description: t('auth.checkEmailForReset'),
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('auth.unexpectedError'),
        variant: "destructive",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const resetForgotPasswordForm = () => {
    setForgotPasswordEmail('');
    setForgotPasswordSent(false);
    setShowForgotPasswordDialog(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast({
        title: t('auth.validationError'),
        description: t('auth.pleaseFillAllFields'),
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: t('auth.invalidEmail'),
        description: t('auth.pleaseEnterValidEmail'),
        variant: "destructive",
      });
      return;
    }

    if (!passwordValidation.isValid) {
      toast({
        title: t('auth.weakPassword'),
        description: getPasswordValidationMessage(password),
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('auth.passwordMismatchTitle'),
        description: t('auth.passwordMismatchDesc'),
        variant: "destructive",
      });
      return;
    }

    if (!agreeTerms) {
      toast({
        title: t('auth.termsRequired'),
        description: t('auth.termsRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await signUpWithEmail(email, password);
      
      if (error) {
        let errorMessage = error.message;
        
        // Provide more user-friendly error messages
        if (error.message.includes('User already registered')) {
          errorMessage = t('auth.userAlreadyExists');
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = t('auth.passwordTooShort');
        } else if (error.message.includes('Invalid email')) {
          errorMessage = t('auth.invalidEmail');
        }
        
        toast({
          title: t('auth.signUpFailed'),
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        // Store terms acceptance
        setCookie('terms_accepted', 'true', 365);
        
        toast({
          title: t('auth.accountCreated'),
          description: t('auth.verifyEmail'),
        });
        
        // Track successful sign up
        analyticsEvents.userSignedUp('email');
        
        // Clear form after successful signup
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setAgreeTerms(false);
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('auth.unexpectedError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    
    try {
      // Best practice: preserve exact current location to resume UX seamlessly
      const redirectTo = window.location.href;
      try {
        sessionStorage.setItem('postAuthRedirect', redirectTo);
      } catch {}
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo
        }
      });
      
      if (error) {
        toast({
          title: t('auth.loginFailed'),
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('auth.unexpectedError'),
        variant: "destructive",
      });
    } finally {
      setSocialLoading(null);
    }
  };

  // Show loading spinner while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gaming-mesh opacity-60" />
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gaming-mesh opacity-60" />
      
      <Card className="w-full max-w-md glass-effect border-primary/20 relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold gradient-text">{t('auth.welcomeTitle')}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {t('auth.welcomeSubtitle')}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Partner switch removed: unified auth for all users */}

          <Tabs defaultValue="signin" className="w-full" onValueChange={clearFormFields}>
            <TabsList className="grid w-full grid-cols-2 bg-muted/20">
              <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t('auth.signIn')}
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t('auth.signUp')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t('auth.email')}</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-primary"
                    placeholder={t('auth.enterEmail')}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background/50 border-border/50 focus:border-primary pr-10"
                      placeholder={t('auth.enterPassword')}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Forgot Password Link */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-sm text-muted-foreground hover:text-primary p-0 h-auto"
                      onClick={() => setShowForgotPasswordDialog(true)}
                    >
                      {t('auth.forgotPassword')}
                    </Button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full btn-primary" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.signIn')}
                </Button>

                {/* Switch to Partner Sign-In - removed (moved to top) */}
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-secondary"
                    placeholder={t('auth.enterEmail')}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background/50 border-border/50 focus:border-secondary pr-10"
                      placeholder={t('auth.enterPassword')}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Password requirements indicator */}
                  {password && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        <div
                          className={`h-1 flex-1 rounded ${
                            passwordValidation.errors.length
                              ? 'bg-red-300'
                              : 'bg-green-500'
                          }`}
                        />
                      </div>
                      <div className="text-xs space-y-1">
                        {passwordValidation.isValid ? (
                          <div className="text-green-600">✓ Password meets all requirements</div>
                        ) : (
                          <div>
                            <div className="text-red-600 font-medium">Missing requirements:</div>
                            {getMissingRequirements(password).map((requirement, index) => (
                              <div key={index} className="text-red-600">• {requirement}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-background/50 border-border/50 focus:border-secondary pr-10"
                      placeholder={t('auth.confirmPassword')}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Password match indicator */}
                  {confirmPassword && (
                    <div className={`text-xs ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                      {password === confirmPassword ? t('auth.passwordsMatch') : t('auth.passwordsDoNotMatch')}
                    </div>
                  )}
                </div>
                
                {/* Terms Checkbox for Sign Up */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3">
                    <Checkbox 
                      checked={agreeTerms} 
                      onCheckedChange={(v) => setAgreeTerms(Boolean(v))}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-relaxed">
                      <Trans
                        i18nKey="auth.agreeTerms"
                        components={{
                          1: <Link to="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />,
                          2: <Link to="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
                        }}
                      />
                    </span>
                  </label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full btn-secondary" 
                  disabled={loading || !agreeTerms || !passwordValidation.isValid || password !== confirmPassword}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.createAccount')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                disabled={socialLoading === 'google'}
                className="btn-outline"
              >
                {socialLoading === 'google' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Chrome className="mr-2 h-4 w-4" />
                )}
                {t('auth.google')}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('facebook')}
                disabled={socialLoading === 'facebook'}
                className="btn-outline"
              >
                {socialLoading === 'facebook' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                {t('auth.facebook')}
              </Button>
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="btn-ghost text-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.backToHome')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPasswordDialog} onOpenChange={setShowForgotPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('auth.forgotPasswordTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('auth.forgotPasswordDescription')}
            </DialogDescription>
          </DialogHeader>
          
          {!forgotPasswordSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-password-email">{t('auth.email')}</Label>
                <Input
                  id="forgot-password-email"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="bg-background/50 border-border/50 focus:border-primary"
                  placeholder={t('auth.enterEmail')}
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={resetForgotPasswordForm}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 btn-primary" 
                  disabled={forgotPasswordLoading || !forgotPasswordEmail.trim() || !validateEmail(forgotPasswordEmail)}
                >
                  {forgotPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.sendResetLink')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-600">{t('auth.resetLinkSent')}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('auth.checkEmailInstructions')}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={resetForgotPasswordForm}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setForgotPasswordSent(false);
                    setForgotPasswordEmail('');
                  }}
                  className="flex-1"
                >
                  {t('auth.sendAnotherLink')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;