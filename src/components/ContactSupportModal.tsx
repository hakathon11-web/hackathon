import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, CheckCircle, AlertCircle, MessageSquare, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactSupportModal: React.FC<ContactSupportModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState<ContactFormData>({
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
        email: user?.email || '',
        subject: '',
        message: '',
      });
      setIsSubmitted(false);
    }
  }, [isOpen, user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast({
        title: t('contact.validation.nameRequired', 'Name is required'),
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.email.trim()) {
      toast({
        title: t('contact.validation.emailRequired', 'Email is required'),
        variant: 'destructive',
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: t('contact.validation.emailInvalid', 'Please enter a valid email address'),
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.subject.trim()) {
      toast({
        title: t('contact.validation.subjectRequired', 'Subject is required'),
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.message.trim()) {
      toast({
        title: t('contact.validation.messageRequired', 'Message is required'),
        variant: 'destructive',
      });
      return false;
    }

    if (formData.message.trim().length < 10) {
      toast({
        title: t('contact.validation.messageTooShort', 'Message must be at least 10 characters long'),
        variant: 'destructive',
      });
      return false;
    }

    if (formData.message.trim().length > 500) {
      toast({
        title: t('contact.validation.messageTooLong', 'Message must be less than 500 characters'),
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setIsSubmitted(true);
        toast({
          title: t('contact.success.title', 'Message sent successfully!'),
          description: t('contact.success.description', 'We\'ll get back to you as soon as possible.'),
        });

        // Auto close after 3 seconds
        setTimeout(() => {
          onClose();
          setIsSubmitted(false);
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      toast({
        title: t('contact.error.title', 'Failed to send message'),
        description: t('contact.error.description', 'Please try again later or contact us directly.'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Shared content component
  const renderContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            {isSubmitted ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <MessageSquare className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isSubmitted 
                ? t('support.modal.successTitle', 'Message Sent!')
                : t('support.modal.title', 'Contact Support')
              }
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSubmitted
                ? t('support.modal.successSubtitle', 'We\'ll respond soon')
                : t('support.modal.subtitle', 'How can we help you?')
              }
            </p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-8 w-8 p-0 hover:bg-accent rounded-full"
          disabled={isSubmitting}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isSubmitted ? (
          <div className="p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-8 h-8 text-green-600" />
            </motion.div>
            
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('support.modal.thankYou', 'Thank you for contacting us!')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('support.modal.responseTime', 'We typically respond within 24 hours.')}
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Mail className="w-4 h-4" />
              <span>support@dajavshne.io</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Quick Contact Info */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium text-sm">
                  {t('support.modal.responseInfo', 'We respond within 24 hours')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">support@dajavshne.io</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modal-name" className="text-sm font-medium text-gray-700">
                  {t('contact.form.name', 'Name')}
                </Label>
                <Input
                  id="modal-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="h-9"
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="modal-email" className="text-sm font-medium text-gray-700">
                  {t('contact.form.email', 'Email')}
                </Label>
                <Input
                  id="modal-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="h-9"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-subject" className="text-sm font-medium text-gray-700">
                {t('contact.form.subject', 'Subject')}
              </Label>
              <Input
                id="modal-subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder={t('support.modal.subjectPlaceholder', 'What do you need help with?')}
                className="h-9"
                disabled={isSubmitting}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-message" className="text-sm font-medium text-gray-700">
                {t('contact.form.message', 'Message')}
              </Label>
              <Textarea
                id="modal-message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder={t('support.modal.messagePlaceholder', 'Please describe your issue or question in detail...')}
                className="min-h-20 resize-none"
                disabled={isSubmitting}
                maxLength={500}
                required
              />
              <div className="flex justify-between items-center">
                {formData.message && (
                  <p className={`text-xs ${
                    formData.message.length < 10 
                      ? 'text-red-500' 
                      : formData.message.length > 450 
                      ? 'text-orange-500' 
                      : 'text-green-600'
                  }`}>
                    {formData.message.length < 10 
                      ? `${formData.message.length}/10 ${t('contact.form.minChars', 'minimum characters')}`
                      : t('contact.form.charactersValid', 'Characters valid')
                    }
                  </p>
                )}
                <p className={`text-xs ml-auto ${
                  formData.message.length > 450 
                    ? 'text-orange-500 font-medium' 
                    : formData.message.length === 500 
                    ? 'text-red-500 font-medium'
                    : 'text-gray-400'
                }`}>
                  {formData.message.length}/500
                </p>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      {!isSubmitted && (
        <div className="p-6 border-t border-border bg-muted/50">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('contact.form.sending', 'Sending...')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('contact.form.send', 'Send Message')}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Dialog */}
      {!isMobile && (
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop with Flex Centering */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                onClick={handleClose}
              >
                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", duration: 0.3 }}
                  className="w-full max-w-lg max-h-[85vh] bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden mx-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderContent()}
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {renderContent()}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

export default ContactSupportModal;