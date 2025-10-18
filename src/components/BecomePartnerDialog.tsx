import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Building2, User, Send, Loader2, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BecomePartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BecomePartnerDialog: React.FC<BecomePartnerDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setBusinessName('');
      setPhone('');
      setSubmitted(false);
    }
  }, [open]);

  const validate = () => {
    if (!name.trim()) {
      toast({ title: t('partnerLead.validation.name', 'Name is required'), variant: 'destructive' });
      return false;
    }
    if (!businessName.trim()) {
      toast({ title: t('partnerLead.validation.business', 'Business name is required'), variant: 'destructive' });
      return false;
    }
    const phoneRegex = /^[+\d][0-9\s\-()]{6,}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast({ title: t('partnerLead.validation.phone', 'Enter a valid phone number'), variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-partner-lead', {
        body: {
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed');
      setSubmitted(true);
      toast({ title: t('partnerLead.success', 'Request submitted! We will contact you shortly.') });
      setTimeout(() => onOpenChange(false), 2500);
    } catch (err) {
      console.error('BecomePartner submit error', err);
      toast({ title: t('partnerLead.error', 'Could not submit request. Try again later.'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && onOpenChange(false)} />
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', duration: 0.3 }} className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  {submitted ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Building2 className="w-5 h-5 text-blue-600" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('partnerLead.title', 'Become a Partner')}</h2>
                  <p className="text-sm text-gray-600">{submitted ? t('partnerLead.subtitleDone', 'We will reach out soon') : ""}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={submitting} onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
                  <div className="text-gray-700">{t('partnerLead.successDetail', 'Thanks! We received your request.')}</div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner-name">{t('partnerLead.name', 'Name')}</Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input id="partner-name" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner-business">{t('partnerLead.business', 'Business Name')}</Label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input id="partner-business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="pl-9" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner-phone">{t('partnerLead.phone', 'Phone Number')}</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input id="partner-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" required />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>{t('common.cancel', 'Cancel')}</Button>
                    <Button type="submit" className="flex-1" disabled={submitting}>
                      {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('partnerLead.sending', 'Sending...')}</>) : (<><Send className="w-4 h-4 mr-2" />{t('partnerLead.submit', 'Submit')}</>)}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BecomePartnerDialog;


