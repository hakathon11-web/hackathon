import { useState, useEffect, forwardRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";
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
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Lock, CreditCard, Trash2, AlertTriangle, Calendar } from "lucide-react";
import PasswordChangeDialog from "./PasswordChangeDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BogSavedPaymentMethods from "@/components/BogSavedPaymentMethods";
// Stripe removed - using BOG payment methods

interface ProfileDialogProps {
  children: React.ReactNode;
  defaultTab?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showPaymentsTab?: boolean;
}

const ProfileDialog = forwardRef<HTMLDivElement, ProfileDialogProps>(
  ({ children, defaultTab = "profile", open: controlledOpen, onOpenChange, showPaymentsTab = true }, ref) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount();
  const { toast } = useToast();
  const { handleDialogStateChange } = useLayoutStability();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Use controlled or internal open state
  const isOpen = controlledOpen !== undefined ? controlledOpen : open;

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize form data when profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || "",
      });
    }
  }, [profile]);

  const handleOpenChange = (isOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    } else {
      setOpen(isOpen);
    }
    
    // Handle layout stability when dialog opens/closes
    handleDialogStateChange(isOpen);
    
    // Set tab when opening
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      // Update profile information
      if (formData.full_name !== profile?.full_name) {
        await updateProfile.mutateAsync({
          full_name: formData.full_name,
        });
      }

      // Update email if changed
      if (formData.email !== profile?.email && formData.email) {
        const { error } = await supabase.auth.updateUser({
          email: formData.email,
        });
        if (error) throw error;
      }


      toast({
        title: t('common.profile.updateProfile'),
        description: t('common.profile.updateProfile'),
      });
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('common.profile.updateProfile'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== t('common.profile.confirmWord')) {
      toast({
        title: t('common.error'),
        description: t('common.profile.confirmDeletion'),
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteAccount.mutateAsync(deleteConfirmation);
      setShowDeleteDialog(false);
      setDeleteConfirmation("");
    } catch (error) {
      // Error is handled by the hook
    }
  };

  if (!user) return null;

  const renderProfileContent = () => (
    <div className="space-y-8">
      {/* Profile Information Section */}
      <div className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="full_name" className="text-base font-semibold text-foreground">
            {t('profile.fullName', 'Full Name')}
          </Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            placeholder={t('profile.enterFullName', 'Enter your full name')}
            className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-4">
          <Label htmlFor="email" className="text-base font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            {t('profile.emailAddress', 'Email Address')}
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder={t('profile.enterEmail', 'Enter your email address')}
            className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-4">
          <Label className="text-base font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            {t('profile.password', 'Password')}
          </Label>
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('profile.passwordSecurity', 'Password Security')}
                </p>
                <p className="text-sm text-gray-500">
                  {t('profile.passwordDescription', 'Change your password to keep your account secure')}
                </p>
              </div>
            </div>
            <PasswordChangeDialog>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-4 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Lock className="h-4 w-4 mr-2" />
                {t('profile.changePassword', 'Change Password')}
              </Button>
            </PasswordChangeDialog>
          </div>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="flex flex-col space-y-4">
        {/* Primary Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={handleUpdateProfile}
            disabled={updateProfile.isPending}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm"
          >
            {updateProfile.isPending ? t('profile.updating', 'Updating...') : t('profile.updateProfile', 'Update Profile')}
          </Button>
        </div>

        {/* Danger Zone */}
        <div className="border-t border-gray-200 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  {t('profile.deleteAccount', 'Delete Account')}
                </h3>
                <p className="text-red-800 mb-4 leading-relaxed">
                  {t('profile.deleteAccountDescription', 'This action cannot be undone. This will permanently delete your account and remove all your data from our servers.')}
                </p>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={false}
                      className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('profile.deleteAccount', 'Delete Account')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-background border border-border shadow-2xl max-w-md mx-auto">
                    <AlertDialogHeader className="text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <AlertDialogTitle className="text-xl font-bold text-foreground">
                        {t('common.profile.deleteAccountTitle')}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-600 text-base leading-relaxed">
                        {t('common.profile.deleteAccountDescription')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="deleteConfirmation" className="text-sm font-semibold text-foreground">
                          {t('common.profile.confirmDeletion')}
                        </Label>
                        <Input
                          id="deleteConfirmation"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder={t('common.profile.confirmWord')}
                          className="h-12 text-base border-gray-300 focus:border-red-500 focus:ring-red-200"
                        />
                      </div>
                    </div>
                    <AlertDialogFooter className="flex gap-3">
                      <AlertDialogCancel className="h-11 px-6 bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 font-semibold">
                        {t('common.profile.deleteAccountCancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleteAccount.isPending || deleteConfirmation !== t('common.profile.confirmWord')}
                        className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        {deleteAccount.isPending ? t('common.profile.deleteAccountDeleting') : t('common.profile.deleteAccountButton')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Shared content component
  const renderContent = () => (
    <>
      <div className="pb-6">
        <div className="text-2xl font-bold text-foreground flex items-center gap-3">
          {activeTab === 'payments' ? (
            <>
              <CreditCard className="h-6 w-6 text-blue-600" />
              {t('common.paymentMethods', 'Payment Methods')}
            </>
          ) : activeTab === 'history' || activeTab === 'bookingHistory' ? (
            <>
              <Calendar className="h-6 w-6 text-blue-600" />
              {t('common.bookingHistory', 'Booking History')}
            </>
          ) : (
            <>
              <User className="h-6 w-6 text-blue-600" />
              {t('profile.editProfile', 'Edit Profile')}
            </>
          )}
        </div>
      </div>
      
      {showPaymentsTab ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
              <User className="h-4 w-4" />
              {t('profile.profile', 'Profile')}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
              <CreditCard className="h-4 w-4" />
              {t('common.paymentMethods', 'Payment Methods')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-6">
            {renderProfileContent()}
          </TabsContent>
          
          <TabsContent value="payments" className="mt-6">
            <BogSavedPaymentMethods />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-6">
          {activeTab === 'payments' ? (
            <BogSavedPaymentMethods />
          ) : (
            renderProfileContent()
          )}
        </div>
      )}
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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background shadow-2xl border border-border">
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
});

export default ProfileDialog;