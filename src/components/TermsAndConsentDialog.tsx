import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation, Trans } from 'react-i18next';

const setCookie = (key: string, value: string, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${key}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
};

const TermsAndConsentDialog = () => {
  const { data: profile } = useProfile();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeLocation, setAgreeLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if terms are already accepted in cookies
    const termsAccepted = document.cookie.includes('terms_accepted=true');
    if (!termsAccepted) {
      setOpen(true);
    }
  }, []);

  const handleAccept = async () => {
    if (!agreeTerms || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Store terms acceptance
      setCookie('terms_accepted', 'true', 365);
      
      // Handle location permission if requested
      if (agreeLocation && 'geolocation' in navigator) {
        try {
          const permission = await new Promise<boolean>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(true),
              () => resolve(false),
              { timeout: 5000 }
            );
          });
          
          if (permission) {
            setCookie('location_consent', 'true', 365);
          }
        } catch (error) {
          console.log('Location permission error:', error);
        }
      }

      setOpen(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('consent.title', 'Terms and Permissions')}</DialogTitle>
          <DialogDescription>
            {t('consent.subtitle', 'Please review and accept to continue using the app.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <Checkbox checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(Boolean(v))} />
            <span className="text-sm">
              <Trans
                i18nKey="auth.agreeTerms"
                components={{
                  1: <Link to="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />,
                  2: <Link to="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
                }}
              />
            </span>
          </label>
          <label className="flex items-start gap-3">
            <Checkbox checked={agreeLocation} onCheckedChange={(v) => setAgreeLocation(Boolean(v))} />
            <span className="text-sm">
              {t('consent.location', 'Allow access to my approximate location to improve results.')}
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleAccept} 
            disabled={!agreeTerms || isSubmitting}
          >
            {isSubmitting ? t('common.processing', 'Processing...') : t('consent.accept', 'Accept and Continue')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAndConsentDialog;


