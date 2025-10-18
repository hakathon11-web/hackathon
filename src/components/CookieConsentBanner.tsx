import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import consent from '@/lib/consent';
import { updateAnalyticsConsent } from '@/lib/analytics';

export const CookieConsentBanner = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    if (!consent.raw.cookie_consent) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 px-4">
      <Card className="mx-auto max-w-3xl p-4 shadow-lg bg-background/95 backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t('cookies.message', 'We use cookies to improve your experience. By continuing, you consent to cookies as described in our policy.')}
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={async () => {
                consent.setAll(false);
                await updateAnalyticsConsent();
                setVisible(false);
              }}
            >
              {t('cookies.reject', 'Reject')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Open manage modal (mini embedded here): toggle switches
                setShowManage(true);
              }}
            >
              {t('cookies.manage', 'Manage settings')}
            </Button>
            <Button
              onClick={async () => {
                consent.setAll(true);
                await updateAnalyticsConsent();
                setVisible(false);
              }}
            >
              {t('cookies.accept', 'Accept')}
            </Button>
          </div>
        </div>
        {showManage && (
          <div className="mt-3 border-t pt-3 grid gap-2 text-sm">
            <label className="flex items-center justify-between">
              <span>{t('cookies.essential', 'Essential (always on)')}</span>
              <span className="opacity-60 text-xs">{t('cookies.alwaysOn', 'Always on')}</span>
            </label>
            <label className="flex items-center justify-between">
              <span>{t('cookies.functional', 'Functional')}</span>
              <input
                type="checkbox"
                defaultChecked={consent.raw.functional !== 'false'}
                onChange={async (e) => {
                  consent.set('functional', e.currentTarget.checked);
                  await updateAnalyticsConsent();
                }}
              />
            </label>
            <label className="flex items-center justify-between">
              <span>{t('cookies.analytics', 'Analytics')}</span>
              <input
                type="checkbox"
                defaultChecked={consent.raw.analytics !== 'false'}
                onChange={async (e) => {
                  consent.set('analytics', e.currentTarget.checked);
                  await updateAnalyticsConsent();
                }}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowManage(false)}>{t('common.cancel','Cancel')}</Button>
              <Button onClick={async () => {
                await updateAnalyticsConsent();
                setVisible(false);
              }}>{t('cookies.save','Save preferences')}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CookieConsentBanner;


