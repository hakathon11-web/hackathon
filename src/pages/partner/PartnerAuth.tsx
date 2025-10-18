import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Shield, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { validatePassword, getPasswordValidationMessage, getMissingRequirements } from '@/utils/passwordValidation';

// Phone number validation function
const validatePhoneNumber = (phone: string) => {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  // Check if it has at least 8 digits (minimum for most phone numbers)
  return digitsOnly.length >= 8;
};

// Email validation function
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const PartnerAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Password validation
  const passwordValidation = validatePassword(password);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const { user, signInWithEmail } = useAuth();
  const { data: profile } = useProfile();
  const authLoading = false;
  const isPartner = !!profile; // unified: presence of account/profile suffices
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Function to clear form fields when switching tabs
  const clearFormFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhoneNumber('');
    setShowPassword(false);
  };

  // Redirect already authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && user && user.email_confirmed_at) {
      navigate('/partner/dashboard', { replace: true });
    }
  }, [user, profile, authLoading, isPartner, navigate]);

  // Show loading while checking authentication state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent)] opacity-70" />
        <Card className="w-full max-w-md backdrop-blur-sm bg-card/95 border-primary/10 relative z-10 shadow-2xl">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">{t('partner.auth.checkingAuth')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render the form if user is already authenticated
  if (user && user.email_confirmed_at) {
    return null; // This will be handled by the useEffect redirect
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      const { error } = await signInWithEmail(email, password);
      
      if (error) {
        toast({
          title: t('auth.signInFailed'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.signInSuccess'),
        });
        navigate('/partner/dashboard');
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email.trim() || !password.trim() || !confirmPassword.trim() || !fullName.trim() || !phoneNumber.trim()) {
      toast({
        title: t('auth.validationError', 'Validation Error'),
        description: t('auth.pleaseFillAllFields', 'Please fill in all fields'),
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: t('auth.invalidEmail', 'Invalid Email'),
        description: t('auth.pleaseEnterValidEmail', 'Please enter a valid email address'),
        variant: "destructive",
      });
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: t('auth.invalidPhoneNumber', 'Invalid Phone Number'),
        description: t('auth.pleaseEnterValidPhoneNumber', 'Please enter a valid phone number'),
        variant: "destructive",
      });
      return;
    }

    // Password strength validation
    if (!passwordValidation.isValid) {
      toast({
        title: t('auth.weakPassword', 'Weak Password'),
        description: getPasswordValidationMessage(password),
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('auth.passwordMismatchTitle', 'Password Mismatch'),
        description: t('auth.passwordMismatchDesc', 'Passwords do not match. Please try again.'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Unified flow: direct users to general sign-up page instead
      navigate('/auth');
      return;
      
      if (error) {
        toast({
          title: t('auth.signUpFailed', 'Sign Up Failed'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        // no-op
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
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
        title: t('auth.validationError', 'Validation Error'),
        description: t('auth.pleaseEnterEmail', 'Please enter your email address'),
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(forgotPasswordEmail)) {
      toast({
        title: t('auth.invalidEmail', 'Invalid Email'),
        description: t('auth.pleaseEnterValidEmail', 'Please enter a valid email address'),
        variant: "destructive",
      });
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
        redirectTo: `${window.location.origin}/auth`
      });
      
      if (error) {
        toast({
          title: t('auth.forgotPasswordFailed', 'Failed to Send Reset Link'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        setForgotPasswordSent(true);
        toast({
          title: t('auth.forgotPasswordSuccess', 'Reset Link Sent'),
          description: t('auth.checkEmailForReset', 'Please check your email for password reset instructions.'),
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('auth.unexpectedError', 'Something went wrong. Please try again.'),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent)] opacity-70" />
      
      <Card className="w-full max-w-md backdrop-blur-sm bg-card/95 border-primary/10 relative z-10 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
              <Shield className="w-6 h-6" />
              {t('partner.header.title', 'Partner Portal')}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t('partner.header.subtitle', 'Manage your venues and grow your business')}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Top switch to User Sign-In */}
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/50">
            <span className="text-sm text-muted-foreground">
              {t('auth.userPrompt', 'Looking to book as a user?')}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => navigate('/auth')}
            >
              {t('auth.signInAsUser', 'User sign in')}
            </Button>
          </div>

          <Tabs defaultValue="signin" className="w-full" onValueChange={clearFormFields}>
            <TabsList className="grid w-full grid-cols-2 bg-muted/30">
              <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t('auth.signIn')}
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t('auth.signUp')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-foreground">{t('auth.email')}</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-primary"
                    placeholder={t('auth.enterEmail', 'Enter your email')}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-foreground">{t('auth.password')}</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-primary"
                    placeholder={t('auth.enterPassword', 'Enter your password')}
                    required
                  />
                  
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
                
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('partner.auth.access', 'Access Partner Portal')}
                </Button>

                {/* Switch to User Sign-In - removed (moved to top) */}
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-foreground">{t('profile.fullName', 'Full Name')}</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-primary"
                    placeholder={t('profile.enterFullName', 'Enter your full name')}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-phone" className="text-foreground">
                    {t('profile.phoneNumber', 'Phone Number')}
                  </Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-primary"
                    placeholder={t('profile.enterPhoneNumber', 'Enter your phone number')}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground">{t('auth.email')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-primary"
                    placeholder={t('auth.enterEmail', 'Enter your email')}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background/50 border-border/50 focus:border-primary pr-10"
                      placeholder={t('auth.enterPassword', 'Enter your password')}
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
                            passwordValidation.isValid
                              ? 'bg-green-500'
                              : 'bg-red-300'
                          }`}
                        />
                      </div>
                      <div className="text-xs space-y-1">
                        {passwordValidation.isValid ? (
                          <div className="text-green-600">✓ {t('partner.auth.passwordMeetsRequirements')}</div>
                        ) : (
                          <div>
                            <div className="text-red-600 font-medium">{t('partner.auth.missingRequirements')}</div>
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
                  <Label htmlFor="confirm-password" className="text-foreground">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-primary"
                    placeholder={t('auth.confirmPassword')}
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5" 
                  disabled={loading || !email.trim() || !password.trim() || !confirmPassword.trim() || !fullName.trim() || !phoneNumber.trim() || password !== confirmPassword || !validateEmail(email) || !validatePhoneNumber(phoneNumber) || !passwordValidation.isValid}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Building2 className="mr-2 h-4 w-4" />
                  {t('partner.auth.become', 'Become a Partner')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {/* Switch to User Sign-In - removed (moved to top) */}
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
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" 
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

export default PartnerAuth;