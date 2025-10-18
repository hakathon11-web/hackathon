import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Users, 
  User, 
  Upload,
  Check,
  X,
  Clock,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';

interface NotificationLog {
  id: string;
  type: 'single' | 'bulk' | 'segment';
  channel: 'email' | 'in-app' | 'sms';
  subject: string;
  content: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: 'draft' | 'sending' | 'completed' | 'failed';
  createdAt: string;
  sentAt?: string;
  createdBy: string;
}

const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('compose');
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  
  // Form state
  const [recipientType, setRecipientType] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [channels, setChannels] = useState<{ email: boolean; inApp: boolean; sms: boolean }>({
    email: false,
    inApp: true,
    sms: false
  });
  const [subject, setSubject] = useState<string>('');
  const [content, setContent] = useState<string>('');

  // Fetch users for recipient selection
  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('full_name');
      if (error) throw error;
      return data;
    }
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (notificationData: {
      recipientIds: string[];
      subject: string;
      content: string;
      channels: { email: boolean; inApp: boolean; sms: boolean };
    }) => {
      const { recipientIds, subject, content, channels } = notificationData;
      
      // Send in-app notifications
      if (channels.inApp) {
        const notifications = recipientIds.map(userId => ({
          user_id: userId,
          booking_id: null, // Null for admin notifications
          type: 'admin_message' as const,
          title: subject,
          message: content,
          read: false
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(notifications);
        
        if (error) {
          console.error('Notification insert error:', error);
          throw error;
        }
      }

      return { success: true, count: recipientIds.length };
    },
    onSuccess: (data) => {
      toast.success(t('notifications.admin.notificationsSent', { count: data.count }));
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setIsComposeDialogOpen(false);
      // Reset form
      setRecipientType('');
      setUserEmail('');
      setSubject('');
      setContent('');
    },
    onError: (error: any) => {
      toast.error(t('notifications.admin.failedToSend', { error: error.message }));
    }
  });

  const handleSendNotification = () => {
    console.log('Send notification clicked', { recipientType, userEmail, subject, content, channels });
    
    if (!subject.trim() || !content.trim()) {
      toast.error(t('notifications.admin.fillSubjectAndContent'));
      return;
    }

    if (!channels.inApp && !channels.email && !channels.sms) {
      toast.error(t('notifications.admin.selectChannel'));
      return;
    }

    if (!recipientType) {
      toast.error(t('notifications.admin.selectRecipientType'));
      return;
    }

    let recipientIds: string[] = [];

    if (recipientType === 'single') {
      if (!userEmail.trim()) {
        toast.error(t('notifications.admin.enterUserEmail'));
        return;
      }
      const user = users?.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
      console.log('Looking for user:', userEmail, 'Found:', user, 'All users:', users);
      if (!user) {
        toast.error(t('notifications.admin.userNotFound'));
        return;
      }
      recipientIds = [user.id];
    } else if (recipientType === 'all-users') {
      recipientIds = users?.map(u => u.id) || [];
    } else if (recipientType === 'customers') {
      recipientIds = users?.filter(u => u.role === 'customer').map(u => u.id) || [];
    } else if (recipientType === 'partners') {
      recipientIds = users?.filter(u => u.role === 'partner').map(u => u.id) || [];
    }

    console.log('Recipients found:', recipientIds);

    if (recipientIds.length === 0) {
      toast.error(t('notifications.admin.noRecipientsFound'));
      return;
    }

    sendNotificationMutation.mutate({
      recipientIds,
      subject,
      content,
      channels
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: 'bg-gray-500/20 text-gray-400 border-gray-500',
      sending: 'bg-blue-500/20 text-blue-400 border-blue-500',
      completed: 'bg-green-500/20 text-green-400 border-green-500',
      failed: 'bg-red-500/20 text-red-400 border-red-500'
    };
    
    const statusIcons = {
      draft: <Clock className="h-3 w-3" />,
      sending: <Clock className="h-3 w-3 animate-spin" />,
      completed: <Check className="h-3 w-3" />,
      failed: <X className="h-3 w-3" />
    };
    
    return (
      <Badge variant="outline" className={statusStyles[status as keyof typeof statusStyles]}>
        <div className="flex items-center space-x-1">
          {statusIcons[status as keyof typeof statusIcons]}
          <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
      </Badge>
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'in-app': return <Bell className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const ComposeForm = React.memo(() => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="recipient-type" className="text-gray-300">Send To</Label>
        <Select value={recipientType} onValueChange={setRecipientType}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Choose recipients" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            <SelectItem value="single">Single User</SelectItem>
            <SelectItem value="all-users">All Users</SelectItem>
            <SelectItem value="customers">All Customers</SelectItem>
            <SelectItem value="partners">All Partners</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {recipientType === 'single' && (
        <div>
          <Label htmlFor="user-search" className="text-gray-300">User Email</Label>
          <Input
            id="user-search"
            placeholder="Enter user email..."
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
            autoComplete="off"
          />
        </div>
      )}

      <div>
        <Label htmlFor="channels" className="text-gray-300">Channels</Label>
        <div className="flex space-x-4 mt-2">
          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={channels.email}
              onChange={(e) => setChannels(prev => ({ ...prev, email: e.target.checked }))}
              className="rounded" 
            />
            <Mail className="h-4 w-4 text-blue-400" />
            <span className="text-gray-300">Email</span>
          </label>
          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={channels.inApp}
              onChange={(e) => setChannels(prev => ({ ...prev, inApp: e.target.checked }))}
              className="rounded" 
            />
            <Bell className="h-4 w-4 text-green-400" />
            <span className="text-gray-300">In-App</span>
          </label>
          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={channels.sms}
              onChange={(e) => setChannels(prev => ({ ...prev, sms: e.target.checked }))}
              className="rounded" 
            />
            <MessageSquare className="h-4 w-4 text-purple-400" />
            <span className="text-gray-300">SMS</span>
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="subject" className="text-gray-300">Subject</Label>
        <Input
          id="subject"
          placeholder="Enter notification subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white"
          autoComplete="off"
        />
      </div>

      <div>
        <Label htmlFor="content" className="text-gray-300">Message Content</Label>
        <Textarea
          id="content"
          placeholder="Enter your message here..."
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white"
        />
      </div>

      <div className="border-t border-gray-600 pt-4">
        <div className="flex items-center justify-between">
          <div>
            {recipientType && (
              <p className="text-sm text-gray-300">
                Recipients: <strong>
                  {recipientType === 'single' ? '1 user' : 
                   recipientType === 'all-users' ? `${users?.length || 0} users` :
                   recipientType === 'customers' ? `${users?.filter(u => u.role === 'customer').length || 0} customers` :
                   recipientType === 'partners' ? `${users?.filter(u => u.role === 'partner').length || 0} partners` : '0'}
                </strong>
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={handleSendNotification}
              disabled={sendNotificationMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendNotificationMutation.isPending ? 'Sending...' : 'Send Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  ));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400">Send messages and manage notification campaigns</p>
        </div>
        
        <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" />
              Compose Message
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Compose New Notification</DialogTitle>
            </DialogHeader>
            <ComposeForm />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800">
          <TabsTrigger value="compose" className="data-[state=active]:bg-gray-700">
            Compose
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-gray-700">
            History
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-gray-700">
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Quick Send</CardTitle>
            </CardHeader>
            <CardContent>
              <ComposeForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Notification History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No notification history available yet.</p>
                <p className="text-sm text-gray-500">Sent notifications will appear here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Message Templates</CardTitle>
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Welcome Message', description: 'Welcome new users to the platform' },
                  { name: 'Booking Confirmation', description: 'Confirm successful bookings' },
                  { name: 'Promotional Offer', description: 'Send special offers and discounts' },
                  { name: 'Booking Reminder', description: 'Remind users of upcoming bookings' },
                  { name: 'Review Request', description: 'Ask users to leave reviews' }
                ].map((template, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <h3 className="font-medium text-white">{template.name}</h3>
                      <p className="text-sm text-gray-400">{template.description}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300">
                        Use
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;