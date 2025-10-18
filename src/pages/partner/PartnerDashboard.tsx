import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import { usePartnerVenues } from '@/hooks/usePartnerVenues';
import { Plus, Building2, Edit, MapPin, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDeleteVenue } from '@/hooks/usePartnerVenues';
import PartnerLayout from '@/components/PartnerLayout';
import { SkeletonList } from '@/components/ui/loading';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { useRealtimePartnerBookings } from '@/hooks/useRealtimePartnerBookings';
import { useTimerSync } from '@/hooks/useTimerSync';

const PartnerDashboard = () => {
  const { data: profile } = useProfile();
  const { data: venues, isLoading } = usePartnerVenues();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const deleteVenue = useDeleteVenue();
  
  // Enable partner real-time bookings (sounds disabled globally)
  useRealtimePartnerBookings();
  
  // Ensure partner dashboard uses admin-configured timeout
  const { timeoutMinutes } = useTimerSync();
  console.log('🏢 Partner Dashboard - Using admin timeout:', timeoutMinutes, 'minutes');

  if (isLoading) {
    return (
      <PartnerLayout>
        <div className="p-4 max-lg:p-3 space-y-4 max-lg:space-y-3">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
          </div>
          <SkeletonList count={3} />
        </div>
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout>
      {/* Main Content */}
      <div className="p-6 max-lg:p-4 space-y-6 max-lg:space-y-4">
        {/* Welcome Section */}
        <div className="mb-6 max-lg:mb-4">
          <h1 className="text-3xl max-lg:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('partner.dashboard.welcomeBack', { name: profile?.full_name })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-lg:text-sm">
            {t('partner.dashboard.manageVenues')}
          </p>
        </div>

        {/* Venues Section */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-col max-lg:flex-col space-y-4 max-lg:space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <CardTitle className="text-xl max-lg:text-lg text-gray-900 dark:text-white">{t('partner.dashboard.yourVenues')}</CardTitle>
            {venues && venues.length > 0 && (
              <Button 
                onClick={() => navigate('/partner/venues/add')}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full max-lg:w-full lg:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('partner.dashboard.addVenue')}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-6 max-lg:p-4">
            {venues && venues.length > 0 ? (
              <div className="space-y-4 max-lg:space-y-3">
                {venues.map((venue) => (
                  <div
                    key={venue.id}
                    className="flex flex-col max-lg:flex-col lg:flex-row items-start lg:items-center justify-between p-4 max-lg:p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start max-lg:items-start lg:items-center space-x-4 max-lg:space-x-3 w-full max-lg:w-full lg:w-auto">
                      <div className="w-12 h-12 max-lg:w-10 max-lg:h-10 lg:w-16 lg:h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                        {venue.images && venue.images.length > 0 ? (
                          <img 
                            src={venue.images[0]} 
                            alt={venue.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to Building2 icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center ${venue.images && venue.images.length > 0 ? 'hidden' : ''}`}>
                          <Building2 className="w-5 h-5 max-lg:w-4 max-lg:h-4 lg:w-6 lg:h-6 text-gray-500 dark:text-gray-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg max-lg:text-base font-semibold text-gray-900 dark:text-white truncate">{venue.name}</h3>
                        <div className="flex items-center mt-1 max-lg:mt-1 lg:mt-0">
                          <MapPin className="w-4 h-4 max-lg:w-3 max-lg:h-3 text-gray-400 mr-1 flex-shrink-0" />
                          <p className="text-sm max-lg:text-xs text-gray-600 dark:text-gray-400 truncate">{venue.location}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 max-lg:mt-3 lg:mt-0 w-full max-lg:w-full lg:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/partner/venues/${venue.id}/edit`)}
                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 w-full max-lg:w-full lg:w-auto"
                      >
                        <Edit className="w-4 h-4 max-lg:w-3 max-lg:h-4 mr-2" />
                        {t('partner.dashboard.edit')}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full max-lg:w-full lg:w-auto"
                          >
                            <Trash2 className="w-4 h-4 max-lg:w-3 max-lg:h-4 mr-2" />
                            {t('partner.dashboard.delete')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('partner.dashboard.deleteTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('partner.dashboard.deleteDescription', { name: venue.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteVenue.mutate(venue.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              {t('partner.dashboard.confirmDelete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 max-lg:py-8">
                <div className="w-16 h-16 max-lg:w-12 max-lg:h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 max-lg:mb-3">
                  <Building2 className="h-8 w-8 max-lg:h-6 max-lg:w-6 text-gray-400" />
                </div>
                <h3 className="text-lg max-lg:text-base font-semibold mb-2 text-gray-900 dark:text-white">{t('partner.dashboard.noVenuesYet')}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-lg:mb-4 max-w-sm mx-auto text-sm max-lg:text-xs">
                  {t('partner.dashboard.noVenuesDescription')}
                </p>
                <Button 
                  onClick={() => navigate('/partner/venues/add')}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full max-lg:w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('partner.dashboard.addFirstVenue')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
};

export default PartnerDashboard;