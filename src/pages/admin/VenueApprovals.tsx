import React, { useState } from 'react';
import { usePendingVenues, useApproveVenue, useRejectVenue } from '@/hooks/useAdminVenues';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { SkeletonList } from '@/components/ui/loading';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Check, 
  X, 
  Eye, 
  MapPin, 
  User, 
  Calendar, 
  Star,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

const VenueApprovals: React.FC = () => {
  const { data: pendingVenues, isLoading } = usePendingVenues();
  const approveVenue = useApproveVenue();
  const rejectVenue = useRejectVenue();
  const [rejectReason, setRejectReason] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const handleApprove = (venueId: string) => {
    approveVenue.mutate(venueId);
  };

  const handleReject = () => {
    if (selectedVenueId) {
      rejectVenue.mutate({ 
        venueId: selectedVenueId, 
        reason: rejectReason.trim() || undefined 
      });
      setSelectedVenueId(null);
      setRejectReason('');
    }
  };

  if (isLoading) {
    return <SkeletonList count={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Venue Approval Requests</h1>
          <p className="text-gray-400">Review and approve venue submissions from partners</p>
        </div>
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
          {pendingVenues?.length || 0} Pending
        </Badge>
      </div>

      {!pendingVenues?.length ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Check className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-400 text-center">
              No pending venue approvals at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingVenues.map((venue) => (
            <Card key={venue.id} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">{venue.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{venue.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{venue.profiles?.full_name || venue.profiles?.email || 'Unknown Partner'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(venue.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-purple-500 text-purple-400 w-fit">
                      Services Available
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <a href={`/venue/${venue.id}?preview=1`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </a>
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500 text-red-400 hover:bg-red-500/20"
                          onClick={() => setSelectedVenueId(venue.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-800 border-gray-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Reject Venue</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to reject "{venue.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2">
                          <Label htmlFor="rejection-reason" className="text-gray-300">
                            Reason for rejection (optional)
                          </Label>
                          <Textarea
                            id="rejection-reason"
                            placeholder="Provide a reason for the rejection..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel 
                            className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                            onClick={() => {
                              setSelectedVenueId(null);
                              setRejectReason('');
                            }}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleReject}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Reject Venue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    <Button
                      onClick={() => handleApprove(venue.id)}
                      disabled={approveVenue.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {approveVenue.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Business Details</h4>
                      <div className="space-y-1 text-sm text-gray-400">
                        <p>Partner: {venue.profiles?.email}</p>
                      </div>
                    </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Request Info</h4>
                    <div className="space-y-1 text-sm text-gray-400">
                      <p>Submitted: {format(new Date(venue.created_at), 'MMM dd, yyyy')}</p>
                      <p>Images: {venue.images?.length || 0} uploaded</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VenueApprovals;