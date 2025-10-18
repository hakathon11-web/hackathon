import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { handleApiError } from '@/utils/secureErrorHandling';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactFormState {
  isSubmitting: boolean;
  isSubmitted: boolean;
  error: string | null;
}

export const useContactForm = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [state, setState] = useState<ContactFormState>({
    isSubmitting: false,
    isSubmitted: false,
    error: null,
  });

  const validateForm = (data: ContactFormData): boolean => {
    if (!data.name.trim()) {
      toast({
        title: t('contact.validation.nameRequired', 'Name is required'),
        variant: 'destructive',
      });
      return false;
    }

    if (!data.email.trim()) {
      toast({
        title: t('contact.validation.emailRequired', 'Email is required'),
        variant: 'destructive',
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      toast({
        title: t('contact.validation.emailInvalid', 'Please enter a valid email address'),
        variant: 'destructive',
      });
      return false;
    }

    if (!data.subject.trim()) {
      toast({
        title: t('contact.validation.subjectRequired', 'Subject is required'),
        variant: 'destructive',
      });
      return false;
    }

    if (!data.message.trim()) {
      toast({
        title: t('contact.validation.messageRequired', 'Message is required'),
        variant: 'destructive',
      });
      return false;
    }

    if (data.message.trim().length < 10) {
      toast({
        title: t('contact.validation.messageTooShort', 'Message must be at least 10 characters long'),
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const submitForm = async (formData: ContactFormData): Promise<boolean> => {
    if (!validateForm(formData)) {
      return false;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

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
        setState(prev => ({ 
          ...prev, 
          isSubmitting: false, 
          isSubmitted: true, 
          error: null 
        }));

        toast({
          title: t('contact.success.title', 'Message sent successfully!'),
          description: t('contact.success.description', 'We\'ll get back to you as soon as possible.'),
        });

        // Reset submitted state after 5 seconds
        setTimeout(() => {
          setState(prev => ({ ...prev, isSubmitted: false }));
        }, 5000);

        return true;
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      const { userMessage } = handleApiError(error, {
        componentName: 'useContactForm',
        action: 'submitForm'
      });
      
      setState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        error: userMessage 
      }));

      toast({
        title: t('contact.error.title', 'Failed to send message'),
        description: t('contact.error.description', 'Please try again later or contact us directly.'),
        variant: 'destructive',
      });

      return false;
    }
  };

  const resetForm = () => {
    setState({
      isSubmitting: false,
      isSubmitted: false,
      error: null,
    });
  };

  return {
    ...state,
    submitForm,
    resetForm,
    validateForm,
  };
};

export default useContactForm;