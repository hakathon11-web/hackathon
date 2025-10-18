import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VenueRecipients: React.FC = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [venueName, setVenueName] = React.useState<string>('');
  const [bookingRecipients, setBookingRecipients] = React.useState<string>('');
  const [responseRecipients, setResponseRecipients] = React.useState<string>('');

  const load = React.useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const { data: venue } = await supabase
        .from('venues')
        .select('name')
        .eq('id', venueId)
        .single();
      setVenueName(venue?.name || 'Venue');

      const { data: recipients } = await supabase
        .from('venue_notification_recipients')
        .select('process, email')
        .eq('venue_id', venueId);

      const booking = (recipients || []).filter(r => r.process === 'booking').map(r => r.email).join(', ');
      const response = (recipients || []).filter(r => r.process === 'response').map(r => r.email).join(', ');
      setBookingRecipients(booking);
      setResponseRecipients(response);
    } catch (e: any) {
      toast({ title: t('adminVenueRecipients.error'), description: e.message || t('adminVenueRecipients.errorLoadRecipients'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [venueId, toast]);

  React.useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!venueId) return;
    setSaving(true);
    try {
      const parseEmails = (value: string) => Array.from(new Set(
        value.split(',').map(e => e.trim().toLowerCase()).filter(e => e.length > 0)
      ));
      const bookingList = parseEmails(bookingRecipients);
      const responseList = parseEmails(responseRecipients);

      const { data: existing } = await supabase
        .from('venue_notification_recipients')
        .select('email, process')
        .eq('venue_id', venueId);

      const existingBooking = new Set((existing || []).filter(r => r.process === 'booking').map(r => r.email));
      const existingResponse = new Set((existing || []).filter(r => r.process === 'response').map(r => r.email));

      const toAdd: Array<{ venue_id: string; process: 'booking' | 'response'; email: string }> = [];
      bookingList.forEach(e => { if (!existingBooking.has(e)) toAdd.push({ venue_id: venueId, process: 'booking', email: e }); });
      responseList.forEach(e => { if (!existingResponse.has(e)) toAdd.push({ venue_id: venueId, process: 'response', email: e }); });

      const toDelete: Array<{ process: 'booking' | 'response'; email: string }> = [];
      existingBooking.forEach(e => { if (!bookingList.includes(e)) toDelete.push({ process: 'booking', email: e }); });
      existingResponse.forEach(e => { if (!responseList.includes(e)) toDelete.push({ process: 'response', email: e }); });

      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('venue_notification_recipients')
          .insert(toAdd as any);
        if (addError) throw addError;
      }

      if (toDelete.length > 0) {
        for (const row of toDelete) {
          const { error: delError } = await supabase
            .from('venue_notification_recipients')
            .delete()
            .eq('venue_id', venueId)
            .eq('process', row.process)
            .eq('email', row.email);
          if (delError) throw delError;
        }
      }

      toast({ title: t('adminVenueRecipients.success'), description: t('adminVenueRecipients.recipientsUpdated') });
      navigate('/admin/venues');
    } catch (e: any) {
      toast({ title: t('adminVenueRecipients.error'), description: e.message || t('adminVenueRecipients.errorSaveRecipients'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Manage Recipients</h1>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">{venueName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Emails for new bookings (comma-separated)</Label>
            <Textarea
              disabled={loading}
              value={bookingRecipients}
              onChange={(e) => setBookingRecipients(e.target.value)}
              placeholder="partner@example.com, manager@example.com"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Emails for booking responses (comma-separated)</Label>
            <Textarea
              disabled={loading}
              value={responseRecipients}
              onChange={(e) => setResponseRecipients(e.target.value)}
              placeholder="ops@example.com"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => navigate('/admin/venues')}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || loading}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueRecipients;


