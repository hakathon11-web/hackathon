
import React, { useState, useRef, useEffect } from "react";
import { modalHistory } from '@/lib/modalHistory';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { validatePassword, getPasswordValidationMessage, getMissingRequirements } from '@/utils/passwordValidation';

interface AuthDialogProps {
  children: React.ReactNode;
  defaultMode?: 'signin' | 'signup';
}

// Email validation function
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};


const AuthDialog = ({ children, defaultMode = 'signin' }: AuthDialogProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Password validation
  const passwordValidation = validatePassword(password);

  // Back-button friendly dialog behavior
  const registrationRef = useRef<ReturnType<typeof modalHistory.register> | null>(null);

  useEffect(() => {
    if (open) {
      if (!registrationRef.current) {
        registrationRef.current = modalHistory.register(() => setOpen(false));
      }
    } else {
      registrationRef.current?.unregister();
      registrationRef.current = null;
    }
  }, [open]);

  // Reset mode to defaultMode when dialog opens
  React.useEffect(() => {
    if (open) {
      setMode(defaultMode);
      // Also clear form fields when dialog opens
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [open, defaultMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!email.trim() || !password.trim()) {
      toast({
        title: t('auth.validationError', 'Validation Error'),
        description: t('auth.pleaseFillAllFields', 'Please fill in all fields'),
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      toast({
        title: t('auth.invalidEmail', 'Invalid Email'),
        description: t('auth.pleaseEnterValidEmail', 'Please enter a valid email address'),
        variant: "destructive",
      });
      return;
    }

    // Additional validation for signup
    if (mode === 'signup') {
      if (!confirmPassword.trim()) {
        toast({
          title: t('auth.validationError', 'Validation Error'),
          description: t('auth.pleaseConfirmPassword', 'Please confirm your password'),
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

      if (!passwordValidation.isValid) {
        toast({
          title: t('auth.weakPassword', 'Weak Password'),
          description: getPasswordValidationMessage(password),
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = mode === 'signin' 
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);

      if (error) {
        let errorMessage = error.message;
        
        // Provide more user-friendly error messages
        if (mode === 'signin') {
          if (error.message.includes('Invalid login credentials')) {
            errorMessage = t('auth.invalidCredentials', 'Invalid email or password');
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = t('auth.emailNotConfirmed', 'Please confirm your email address');
          } else if (error.message.includes('Too many requests')) {
            errorMessage = t('auth.tooManyRequests', 'Too many login attempts. Please try again later');
          }
        } else {
          if (error.message.includes('User already registered')) {
            errorMessage = t('auth.userAlreadyExists', 'An account with this email already exists');
          } else if (error.message.includes('Password should be at least')) {
            errorMessage = t('auth.passwordTooShort', 'Password is too short');
          } else if (error.message.includes('Invalid email')) {
            errorMessage = t('auth.invalidEmail', 'Invalid email address');
          }
        }
        
        toast({
          title: mode === 'signin' ? t('auth.signInFailed', 'Sign In Failed') : t('auth.signUpFailed', 'Sign Up Failed'),
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('auth.success', 'Success'),
          description: mode === 'signin' 
            ? t('auth.signInSuccess', 'Signed in successfully!') 
            : t('auth.signUpSuccess', 'Account created successfully! Please check your email to verify your account.'),
        });
        setOpen(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
      }
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('auth.unexpectedError', 'Something went wrong. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    
    try {
      // Preserve the page and dialog context the user started from
      const currentUrl = window.location.href;
      try {
        sessionStorage.setItem('postAuthRedirect', currentUrl);
      } catch {}

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Best practice: return to the exact page the user initiated auth from
          redirectTo: currentUrl
        }
      });

      if (error) {
        toast({
          title: t('auth.loginFailed', 'Login Failed'),
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('auth.unexpectedError', 'Something went wrong. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setSocialLoading(null);
    }
  };

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {t('auth.welcome', 'Welcome to Dajavshne')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'signin' 
              ? t('auth.signInToContinue', 'Sign in to your account to continue') 
              : t('auth.createAccountToStart', 'Create your account to start booking venues')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  {t('auth.connecting', 'Connecting...')}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t('auth.continueWithGoogle', 'Continue with Google')}
                </div>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => handleSocialLogin('facebook')}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'facebook' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  {t('auth.connecting', 'Connecting...')}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  {t('auth.continueWithFacebook', 'Continue with Facebook')}
                </div>
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('auth.orContinueWithEmail', 'Or continue with email')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.enterEmail', 'Enter your email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password', 'Password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.enterPassword', 'Enter your password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
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
              
              {/* Password requirements indicator for signup */}
              {mode === 'signup' && password && (
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

            {/* Confirm Password field for signup */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('auth.confirmPassword', 'Confirm Password')}</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t('auth.confirmPassword', 'Confirm your password')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 pr-10"
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
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-12 text-base" 
              disabled={loading || socialLoading !== null}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'signin' 
                    ? t('auth.signingIn', 'Signing in...') 
                    : t('auth.creatingAccount', 'Creating account...')}
                </div>
              ) : (
                mode === 'signin' 
                  ? t('auth.signIn', 'Sign In') 
                  : t('auth.createAccount', 'Create Account')
              )}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => handleModeChange(mode === 'signin' ? 'signup' : 'signin')}
              disabled={loading || socialLoading !== null}
            >
              {mode === 'signin' 
                ? t('auth.dontHaveAccount', "Don't have an account? Sign up") 
                : t('auth.alreadyHaveAccount', "Already have an account? Sign in")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
