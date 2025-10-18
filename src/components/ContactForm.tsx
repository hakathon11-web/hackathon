import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const ContactForm: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
        });

        toast({
          title: t('contact.success.title', 'Message sent successfully!'),
          description: t('contact.success.description', 'We\'ll get back to you as soon as possible.'),
        });

        // Reset submitted state after 5 seconds
        setTimeout(() => {
          setIsSubmitted(false);
        }, 5000);
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

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
    });
    setIsSubmitted(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          {isSubmitted ? (
            <>
              <CheckCircle className="h-6 w-6 text-green-600" />
              {t('contact.form.successTitle', 'Message Sent!')}
            </>
          ) : (
            <>
              <Send className="h-6 w-6 text-blue-600" />
              {t('contact.form.title', 'Contact Support')}
            </>
          )}
        </CardTitle>
        <p className="text-gray-600 mt-2">
          {isSubmitted
            ? t('contact.form.successDescription', 'Thank you for contacting us. We\'ll respond to your inquiry shortly.')
            : t('contact.form.description', 'Have a question or need help? Send us a message and we\'ll get back to you as soon as possible.')
          }
        </p>
      </CardHeader>
      
      <CardContent>
        {isSubmitted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('contact.form.thankYou', 'Thank you for your message!')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('contact.form.responseTime', 'We typically respond within 24 hours.')}
            </p>
            <Button
              onClick={handleReset}
              variant="outline"
              className="mx-auto"
            >
              {t('contact.form.sendAnother', 'Send Another Message')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name and Email Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('contact.form.name', 'Name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('contact.form.namePlaceholder', 'Enter your full name')}
                  className="w-full"
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">
                  {t('contact.form.email', 'Email')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('contact.form.emailPlaceholder', 'Enter your email address')}
                  className="w-full"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                {t('contact.form.subject', 'Subject')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder={t('contact.form.subjectPlaceholder', 'What is your message about?')}
                className="w-full"
                disabled={isSubmitting}
                maxLength={100}
                required
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">
                {t('contact.form.message', 'Message')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder={t('contact.form.messagePlaceholder', 'Please describe your inquiry in detail...')}
                className="w-full min-h-32 resize-y"
                disabled={isSubmitting}
                required
              />
              <p className="text-sm text-gray-500">
                {t('contact.form.messageCount', 'Minimum 10 characters')} 
                {formData.message && (
                  <span className={`ml-2 ${formData.message.length < 10 ? 'text-red-500' : 'text-green-600'}`}>
                    ({formData.message.length}/10)
                  </span>
                )}
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('contact.form.sending', 'Sending Message...')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('contact.form.send', 'Send Message')}
                </>
              )}
            </Button>

            {/* Contact Info */}
            <div className="border-t pt-6 mt-8">
              <div className="text-center text-sm text-gray-600">
                <p className="mb-2">
                  {t('contact.form.alternativeContact', 'You can also reach us directly:')}
                </p>
                <p className="flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">support@dajavshne.io</span>
                </p>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactForm;