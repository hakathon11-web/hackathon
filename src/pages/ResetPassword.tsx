import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { validatePassword as validateStrongPassword, getPasswordValidationMessage } from '@/utils/passwordValidation';
import { PasswordInput } from '@/components/ui/password-input';

// Password validation function with enhanced security
const validatePassword = (password: string) => {
  const validation = validateStrongPassword(password);
  
  return {
    isValid: validation.isValid,
    errors: validation.errors,
    score: validation.score,
    feedback: validation.feedback
  };
};

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));
  
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  // Update password validation when password changes
  useEffect(() => {
    setPasswordValidation(validatePassword(password));
  }, [password]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim() || !confirmPassword.trim()) {
      toast({
        title: t('auth.validationError'),
        description: t('auth.pleaseFillAllFields'),
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

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      
      if (error) {
        toast({
          title: t('auth.resetPasswordFailed'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSuccess(true);
        toast({
          title: t('auth.resetPasswordSuccess'),
          description: t('auth.passwordUpdatedSuccessfully'),
          variant: "default",
        });
        
        // Redirect to home after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
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

  if (success) {
    return (
      <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gaming-mesh opacity-60" />
        
        <Card className="w-full max-w-md glass-effect border-primary/20 relative z-10">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-green-600">
                {t('auth.resetPasswordSuccess')}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('auth.redirectingToHome')}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gaming-mesh opacity-60" />
      
      <Card className="w-full max-w-md glass-effect border-primary/20 relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold gradient-text">
              {t('auth.resetPasswordTitle')}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t('auth.resetPasswordDescription')}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <PasswordInput
              label={t('auth.newPassword')}
              placeholder={t('auth.enterNewPassword')}
              value={password}
              onChange={setPassword}
              showValidation={true}
              showStrengthIndicator={true}
              required={true}
              className="bg-background/50"
            />
            
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">{t('auth.confirmNewPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background/50 border-border/50 focus:border-primary pr-10"
                  placeholder={t('auth.confirmNewPassword')}
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
            
            <Button 
              type="submit" 
              className="w-full btn-primary" 
              disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Lock className="mr-2 h-4 w-4" />
              {t('auth.updatePassword')}
            </Button>
          </form>
          
          <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/auth')}
              className="btn-ghost text-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('auth.backToSignIn')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
