import { useState, useEffect, forwardRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useLayoutStability } from "@/hooks/useLayoutStability";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validatePassword, getPasswordValidationMessage, getMissingRequirements } from "@/utils/passwordValidation";

interface PasswordChangeDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PasswordChangeDialog = forwardRef<HTMLDivElement, PasswordChangeDialogProps>(
  ({ children, open: controlledOpen, onOpenChange }, ref) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const { handleDialogStateChange } = useLayoutStability();
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    const [showPasswords, setShowPasswords] = useState({
      current: false,
      new: false,
      confirm: false,
    });
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Use controlled or internal open state
    const isOpen = controlledOpen !== undefined ? controlledOpen : open;

    // Password validation
    const passwordValidation = validatePassword(formData.newPassword);

    // Detect mobile devices
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768); // md breakpoint
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);
      
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleOpenChange = (isOpen: boolean) => {
      if (onOpenChange) {
        onOpenChange(isOpen);
      } else {
        setOpen(isOpen);
      }
      
      // Handle layout stability when dialog opens/closes
      handleDialogStateChange(isOpen);
      
      // Reset form when closing
      if (!isOpen) {
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowPasswords({
          current: false,
          new: false,
          confirm: false,
        });
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validate form
      if (!formData.currentPassword.trim()) {
        toast({
          title: t('auth.validationError'),
          description: t('auth.passwordChange.enterCurrentPassword'),
          variant: "destructive",
        });
        return;
      }

      if (!formData.newPassword.trim()) {
        toast({
          title: t('auth.validationError'),
          description: t('auth.passwordChange.enterNewPassword'),
          variant: "destructive",
        });
        return;
      }

      if (!passwordValidation.isValid) {
        toast({
          title: t('auth.weakPassword'),
          description: getPasswordValidationMessage(formData.newPassword),
          variant: "destructive",
        });
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        toast({
          title: t('auth.passwordMismatchTitle'),
          description: t('auth.passwordMismatchDesc'),
          variant: "destructive",
        });
        return;
      }

      if (formData.currentPassword === formData.newPassword) {
        toast({
          title: t('auth.passwordChange.samePasswordTitle'),
          description: t('auth.passwordChange.samePasswordDesc'),
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      try {
        // First verify current password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: formData.currentPassword,
        });

        if (signInError) {
          toast({
            title: t('auth.passwordChange.incorrectCurrentPassword'),
            description: t('auth.passwordChange.incorrectCurrentPasswordDesc'),
            variant: "destructive",
          });
          return;
        }

        // Update password
        const { error } = await supabase.auth.updateUser({
          password: formData.newPassword,
        });

        if (error) {
          throw error;
        }

        toast({
          title: t('auth.passwordChange.successTitle'),
          description: t('auth.passwordChange.successDesc'),
          variant: "default",
        });

        handleOpenChange(false);
      } catch (error: any) {
        toast({
          title: t('common.error'),
          description: error.message || t('auth.passwordChange.unexpectedError'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
      setShowPasswords(prev => ({
        ...prev,
        [field]: !prev[field],
      }));
    };

    if (!user) return null;

    const renderPasswordRequirements = () => {
      if (!formData.newPassword) return null;

      return (
        <div className="space-y-2">
          {/* Password strength indicator */}
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
              <div className="text-green-600">✓ {t('auth.passwordChange.passwordMeetsRequirements')}</div>
            ) : (
              <div>
                <div className="text-red-600 font-medium">{t('auth.passwordChange.missingRequirements')}</div>
                {getMissingRequirements(formData.newPassword).map((requirement, index) => (
                  <div key={index} className="text-red-600">• {requirement}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    };

    const renderContent = () => (
      <>
        <div className="pb-6">
          <div className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Lock className="h-6 w-6 text-blue-600" />
            {t('auth.passwordChange.title', 'Change Password')}
          </div>
          <p className="text-gray-600 mt-2">
            {t('auth.passwordChange.description', 'Update your password to keep your account secure')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-base font-semibold text-foreground">
              {t('auth.passwordChange.currentPassword', 'Current Password')}
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder={t('auth.passwordChange.enterCurrentPassword', 'Enter your current password')}
                className="h-12 text-base pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('current')}
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-base font-semibold text-foreground">
              {t('auth.passwordChange.newPassword', 'New Password')}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder={t('auth.passwordChange.enterNewPassword', 'Enter your new password')}
                className="h-12 text-base pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('new')}
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Password requirements */}
            {renderPasswordRequirements()}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-base font-semibold text-foreground">
              {t('auth.passwordChange.confirmPassword', 'Confirm New Password')}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder={t('auth.passwordChange.enterConfirmPassword', 'Confirm your new password')}
                className="h-12 text-base pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('confirm')}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Password match indicator */}
            {formData.confirmPassword && (
              <div className="flex items-center gap-2 text-sm">
                {formData.newPassword === formData.confirmPassword ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">{t('auth.passwordsMatch')}</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-600" />
                    <span className="text-red-700">{t('auth.passwordsDoNotMatch')}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1 h-12 text-base font-semibold"
              disabled={loading}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !passwordValidation.isValid || formData.newPassword !== formData.confirmPassword}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm"
            >
              {loading ? t('auth.passwordChange.updating', 'Updating...') : t('auth.passwordChange.updatePassword', 'Update Password')}
            </Button>
          </div>
        </form>
      </>
    );

    return (
      <>
        {/* Desktop Dialog */}
        {!isMobile && (
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <div ref={ref}>
                {children}
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-background shadow-2xl border border-border">
              {renderContent()}
            </DialogContent>
          </Dialog>
        )}

        {/* Mobile Drawer */}
        {isMobile && (
          <>
            <div ref={ref} onClick={() => handleOpenChange(true)}>
              {children}
            </div>
            <Drawer open={isOpen} onOpenChange={handleOpenChange}>
              <DrawerContent className="max-h-[90vh] flex flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {renderContent()}
                </div>
              </DrawerContent>
            </Drawer>
          </>
        )}
      </>
    );
  }
);

PasswordChangeDialog.displayName = "PasswordChangeDialog";

export default PasswordChangeDialog;
