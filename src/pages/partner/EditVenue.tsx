import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getTableLabel } from '@/utils/pricingLabels';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import GoogleLocationPicker from "@/components/GoogleLocationPicker";
import VenueImageUpload from "@/components/VenueImageUpload";
import DailyWorkingHours, { WorkingHours } from "@/components/DailyWorkingHours";
import { isPerTableService, PRICING_MODELS } from '@/constants/services';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { ServicePricingForm } from '@/components/ServicePricingForm';
import VenueDiscountConfig from '@/components/VenueDiscountConfig';
import PartnerLayout from '@/components/PartnerLayout';
import EmployeeManagementSection from '@/components/EmployeeManagementSection';
import { ProductsManagement } from '@/components/ProductsManagement';
import { TBILISI_DISTRICTS, TBILISI_DISTRICT_EN } from '@/constants/districts';

interface VenueService {
  id?: string;
  service_id: string;
  price: number | null;
  images: string[];
  guest_pricing_rules: Array<{ maxGuests: number; price: number | null }>;
  max_tables?: number | null;
  overall_discount_percent?: number;
  free_hour_discounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
  group_discounts?: Array<{ minGuests: number; discountPercent: number }>;
  timeslot_discounts?: Array<{ start: string; end: string; discountPercent: number }>;
}

interface VenueData {
  name: string;
  location: string;
  district: string;
  working_hours: WorkingHours;
  images: string[];
  latitude?: number;
  longitude?: number;
  max_booking_days_in_advance?: number;
}

const EditVenue = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: serviceTypesData } = useServiceTypes();

  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [venue, setVenue] = useState<VenueData>({
    name: '',
    location: '',
    district: '',
    working_hours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '22:00', closed: false }
    },
    images: [],
    latitude: undefined,
    longitude: undefined
  });

  const [services, setServices] = useState<VenueService[]>([]);
  const [originalServices, setOriginalServices] = useState<VenueService[]>([]);
  
  // Venue-level discount state
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);
  const [overallDiscountEnabled, setOverallDiscountEnabled] = useState<boolean>(false);
  const [overallDiscountServiceIds, setOverallDiscountServiceIds] = useState<string[]>([]);
  
  const [freeHourDiscountEnabled, setFreeHourDiscountEnabled] = useState<boolean>(false);
  const [freeHourDiscounts, setFreeHourDiscounts] = useState<Array<{ thresholdHours: number; freeHours: number; serviceIds: string[] }>>([]);
  
  const [groupDiscounts, setGroupDiscounts] = useState<Array<{ minGuests: number; discountPercent: number; serviceIds: string[] }>>([]);
  const [groupDiscountEnabled, setGroupDiscountEnabled] = useState<boolean>(false);
  
  const [timeslotDiscounts, setTimeslotDiscounts] = useState<Array<{ start: string; end: string; discountPercent: number; serviceIds: string[] }>>([]);
  const [timeslotDiscountEnabled, setTimeslotDiscountEnabled] = useState<boolean>(false);
  
  // Recipients now managed by Admin UI
  const serviceTypeOptions = serviceTypesData || [];

  // Helper to get service ID for a service name
  const getServiceIdForName = (serviceName: string): string => {
    const serviceData = serviceTypesData?.find(s => s.name === serviceName);
    return serviceData?.id || '';
  };

  const fetchVenue = async () => {
    if (!venueId) return;

    try {
      // Fetch venue data
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single();

      if (venueError) throw venueError;

      if (venueData) {
        setVenue({
          name: venueData.name || '',
          location: venueData.location || '',
          district: (venueData as any).district || '',
          working_hours: venueData.working_hours || {
            monday: { open: '09:00', close: '22:00', closed: false },
            tuesday: { open: '09:00', close: '22:00', closed: false },
            wednesday: { open: '09:00', close: '22:00', closed: false },
            thursday: { open: '09:00', close: '22:00', closed: false },
            friday: { open: '09:00', close: '22:00', closed: false },
            saturday: { open: '09:00', close: '22:00', closed: false },
            sunday: { open: '09:00', close: '22:00', closed: false }
          },
          images: venueData.images || [],
          latitude: venueData.latitude,
          longitude: venueData.longitude,
          max_booking_days_in_advance: (venueData as any).max_booking_days_in_advance ?? 30
        });

        // Load venue-level discount data
        const venueDiscountData = venueData as any;
        setOverallDiscountPercent(venueDiscountData.overall_discount_percent || 0);
        setOverallDiscountEnabled((venueDiscountData.overall_discount_percent || 0) > 0);
        setOverallDiscountServiceIds(Array.isArray(venueDiscountData.overall_discount_service_ids) 
          ? venueDiscountData.overall_discount_service_ids 
          : []);
        
        setFreeHourDiscounts(Array.isArray(venueDiscountData.free_hour_discounts) 
          ? venueDiscountData.free_hour_discounts 
          : []);
        setFreeHourDiscountEnabled(Array.isArray(venueDiscountData.free_hour_discounts) && venueDiscountData.free_hour_discounts.length > 0);
        
        setGroupDiscounts(Array.isArray(venueDiscountData.group_discounts) 
          ? venueDiscountData.group_discounts 
          : []);
        setGroupDiscountEnabled(Array.isArray(venueDiscountData.group_discounts) && venueDiscountData.group_discounts.length > 0);
        
        setTimeslotDiscounts(Array.isArray(venueDiscountData.timeslot_discounts) 
          ? venueDiscountData.timeslot_discounts 
          : []);
        setTimeslotDiscountEnabled(Array.isArray(venueDiscountData.timeslot_discounts) && venueDiscountData.timeslot_discounts.length > 0);
      }

      // Fetch venue services
      const { data: servicesData, error: servicesError } = await supabase
        .from('venue_services')
        .select(`
          *,
          services (
            name,
            pricing_model,
            description,
            duration
          )
        `)
        .eq('venue_id', venueId);

      if (servicesError) throw servicesError;

      if (servicesData) {
        const formattedServices: VenueService[] = servicesData.map(service => ({
          id: service.id,
          service_id: service.service_id,
          price: service.price as number | null,
          guest_pricing_rules: Array.isArray((service as any).guest_pricing_rules) 
            ? (service as any).guest_pricing_rules as Array<{ maxGuests: number; price: number | null }>
            : [],
          max_tables: service.max_tables || null,
          overall_discount_percent: service.overall_discount_percent || 0,
          free_hour_discounts: Array.isArray((service as any).free_hour_discounts) 
            ? (service as any).free_hour_discounts as Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>
            : [],
          group_discounts: Array.isArray((service as any).group_discounts) 
            ? (service as any).group_discounts as Array<{ minGuests: number; discountPercent: number }>
            : [],
          timeslot_discounts: Array.isArray((service as any).timeslot_discounts) 
            ? (service as any).timeslot_discounts as Array<{ start: string; end: string; discountPercent: number }>
            : []
        }));

        setServices(formattedServices);
        setOriginalServices(formattedServices);
      }

      // Recipients are edited in Admin panel
    } catch (error: any) {
      console.error('Error fetching venue:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch venue data",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchVenue();
  }, [venueId]);

  const handleSave = async () => {
    if (!venueId) return;

    setSaving(true);
    try {
      // Update venue data
      const { error: venueError } = await supabase
        .from('venues')
        .update({
          name: venue.name,
          location: venue.location,
          district: venue.district,
          working_hours: venue.working_hours,
          images: venue.images,
          latitude: venue.latitude,
          longitude: venue.longitude,
          // Venue-level discount data
          overall_discount_percent: overallDiscountEnabled ? overallDiscountPercent : 0,
          overall_discount_service_ids: overallDiscountServiceIds,
          free_hour_discounts: freeHourDiscountEnabled ? freeHourDiscounts : [],
          group_discounts: groupDiscountEnabled ? groupDiscounts : [],
          timeslot_discounts: timeslotDiscountEnabled ? timeslotDiscounts : [],
          max_booking_days_in_advance: venue.max_booking_days_in_advance || null
        })
        .eq('id', venueId);

      if (venueError) throw venueError;

      // Recipients are edited in Admin panel

      // Handle service deletions first
      const currentServiceIds = services.filter(s => s.id).map(s => s.id);
      const deletedServices = originalServices.filter(original => 
        original.id && !currentServiceIds.includes(original.id)
      );

      // Delete removed services from database
      for (const deletedService of deletedServices) {
        if (deletedService.id) {
          const { error: deleteError } = await supabase
            .from('venue_services')
            .delete()
            .eq('id', deletedService.id);

          if (deleteError) throw deleteError;
        }
      }

      // Update services
      for (const service of services) {
        const serviceOverallDiscount = service.overall_discount_percent || 0;
        const serviceFreeHourDiscounts = service.free_hour_discounts || [];
        const serviceGroupDiscounts = service.group_discounts || [];
        const serviceTimeslotDiscounts = service.timeslot_discounts || [];
        const serviceTypeData = serviceTypeOptions.find(s => s.id === service.service_id);

        if (service.id) {
          // Update existing service
          const { error: updateError } = await supabase
            .from('venue_services')
            .update({
              service_id: service.service_id,
              name: serviceTypeData?.name || 'Unknown Service', // Still required by schema
              price: service.price ?? 0,
              guest_pricing_rules: service.guest_pricing_rules || [],
              max_tables: service.max_tables ?? 1,
              overall_discount_percent: serviceOverallDiscount,
              free_hour_discounts: serviceFreeHourDiscounts,
              group_discounts: serviceGroupDiscounts,
              timeslot_discounts: serviceTimeslotDiscounts,
              pricing_model: serviceTypeData?.pricing_model ?? PRICING_MODELS.GUEST_WISE
            } as any)
            .eq('id', service.id);

          if (updateError) throw updateError;
        } else {
          // Create new service
          const { error: insertError } = await supabase
            .from('venue_services')
            .insert({
              venue_id: venueId,
              service_id: service.service_id,
              name: serviceTypeData?.name || 'Unknown Service', // Still required by schema
              price: service.price ?? 0,
              guest_pricing_rules: service.guest_pricing_rules || [],
              max_tables: service.max_tables ?? 1,
              overall_discount_percent: serviceOverallDiscount,
              free_hour_discounts: serviceFreeHourDiscounts,
              group_discounts: serviceGroupDiscounts,
              timeslot_discounts: serviceTimeslotDiscounts,
              pricing_model: serviceTypeData?.pricing_model ?? PRICING_MODELS.GUEST_WISE
            } as any);

          if (insertError) throw insertError;
        }
      }

      toast({
        title: "Success",
        description: t('partner.editVenue.venueUpdatedSuccess'),
      });
      
      navigate('/partner/dashboard');
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || t('partner.editVenue.failedToUpdateVenue'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!venueId) return;

    const confirmDelete = window.confirm(t('partner.editVenue.deleteConfirm'));
    if (!confirmDelete) return;

    try {
      // Delete venue services first
      const { error: servicesError } = await supabase
        .from('venue_services')
        .delete()
        .eq('venue_id', venueId);

      if (servicesError) throw servicesError;

      // Delete the venue
      const { error: venueError } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);

      if (venueError) throw venueError;

      toast({
        title: "Success",
        description: t('partner.editVenue.venueDeletedSuccess'),
      });
      
      navigate('/partner/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || t('partner.editVenue.failedToDeleteVenue'),
        variant: "destructive"
      });
    }
  };

  const addService = () => {
    console.log('EditVenue addService - adding new service with empty service_id');
    setServices([...services, {
      service_id: '', // Start with empty service_id for progressive disclosure
      price: null,
      images: [],
      guest_pricing_rules: [],
      max_tables: null
    }]);
  };

  const removeService = (index: number) => {
    const newServices = services.filter((_, i) => i !== index);
    setServices(newServices);
  };

  const updateService = (index: number, field: keyof VenueService, value: any) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], [field]: value };
    
    // Service changed - no additional cleanup needed
    setServices(newServices);
  };

  // Generate 15-minute time slots
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  // Handle location selection from map
  const handleLocationSelect = (locationData: { address: string; latitude: number; longitude: number; district?: string }) => {
    console.log('handleLocationSelect called with:', locationData);
    
    setVenue(currentVenue => {
      console.log('Current venue state in functional update:', currentVenue);
      const updatedVenue = {
        ...currentVenue,
        location: locationData.address,
        district: currentVenue.district,
        latitude: locationData.latitude,
        longitude: locationData.longitude
      };
      console.log('Updated venue state:', updatedVenue);
      return updatedVenue;
    });
  };

  return (
    <PartnerLayout>
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="p-6 max-lg:p-4">
          <div className="flex flex-col max-lg:flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 max-lg:space-y-3 lg:space-y-0">
            <div className="flex items-center space-x-4 max-lg:space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/partner/dashboard')}
                className="hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5 max-lg:h-4 max-lg:w-4" />
              </Button>
              <div>
                <h1 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-white">{t('partner.editVenue.title')}</h1>
                <p className="text-gray-600 dark:text-gray-400 max-lg:text-sm">{t('partner.editVenue.subtitle')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 max-lg:space-x-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full max-lg:w-full lg:w-auto"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 max-lg:h-3 max-lg:w-3 border-b-2 border-white mr-2"></div>
                    <span className="text-sm max-lg:text-xs">{t('partner.editVenue.saving')}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 max-lg:h-3 max-lg:w-3 mr-2" />
                    <span className="text-sm max-lg:text-xs">{t('partner.editVenue.saveChanges')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 max-lg:p-4">
        <div className="max-w-6xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8 max-lg:mb-6">
            <div className="flex items-center justify-center space-x-4 max-lg:space-x-2">
              <button 
                onClick={() => setCurrentStep(1)}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <div className={`w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full flex items-center justify-center text-sm max-lg:text-xs font-medium ${
                  currentStep === 1 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>1</div>
                <span className={`text-sm max-lg:text-xs font-medium ${
                  currentStep === 1 
                    ? 'text-gray-700 dark:text-gray-300' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>{t('partner.editVenue.basicInfo')}</span>
              </button>
              <div className="w-8 max-lg:w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
              <button 
                onClick={() => setCurrentStep(2)}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                disabled={!venue.name || !venue.location}
              >
                <div className={`w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full flex items-center justify-center text-sm max-lg:text-xs font-medium ${
                  currentStep === 2 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>2</div>
                <span className={`text-sm max-lg:text-xs font-medium ${
                  currentStep === 2 
                    ? 'text-gray-700 dark:text-gray-300' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>{t('partner.editVenue.services')}</span>
              </button>
              <div className="w-8 max-lg:w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
              <button 
                onClick={() => setCurrentStep(3)}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                disabled={!venue.name || !venue.location}
              >
                <div className={`w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full flex items-center justify-center text-sm max-lg:text-xs font-medium ${
                  currentStep === 3 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>3</div>
                <span className={`text-sm max-lg:text-xs font-medium ${
                  currentStep === 3 
                    ? 'text-gray-700 dark:text-gray-300' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>{t('partner.editVenue.discounts')}</span>
              </button>
              <div className="w-8 max-lg:w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
              <button 
                onClick={() => setCurrentStep(4)}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                disabled={!venueId}
              >
                <div className={`w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full flex items-center justify-center text-sm max-lg:text-xs font-medium ${
                  currentStep === 4 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>4</div>
                <span className={`text-sm max-lg:text-xs font-medium ${
                  currentStep === 4 
                    ? 'text-gray-700 dark:text-gray-300' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>{t('partner.editVenue.employees')}</span>
              </button>
              <div className="w-8 max-lg:w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
              <button 
                onClick={() => setCurrentStep(5)}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                disabled={!venueId}
              >
                <div className={`w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full flex items-center justify-center text-sm max-lg:text-xs font-medium ${
                  currentStep === 5 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>5</div>
                <span className={`text-sm max-lg:text-xs font-medium ${
                  currentStep === 5 
                    ? 'text-gray-700 dark:text-gray-300' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>{t('partner.addVenue.products')}</span>
              </button>
            </div>
          </div>

            {/* Main Content Grid */}
            <div className={`grid grid-cols-1 gap-8 max-lg:gap-6 lg:grid-cols-1`}>
            
            {/* Left Column - Basic Information */}
            <div className={`space-y-6 max-lg:space-y-4 ${currentStep === 2 ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
              
              {/* Step 1: Basic Information, Working Hours & Images */}
              {currentStep === 1 && (
                <div className="space-y-6 max-lg:space-y-4">
                  {/* Basic Information */}
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm max-lg:text-xs font-medium">1</div>
                        <CardTitle className="text-gray-900 dark:text-white text-xl max-lg:text-lg">{t('partner.editVenue.basicInformation')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 max-lg:space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-lg:gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm max-lg:text-xs font-medium">{t('partner.editVenue.venueName')} *</Label>
                          <Input
                            id="name"
                            value={venue.name}
                            onChange={(e) => setVenue({...venue, name: e.target.value})}
                            placeholder={t('partner.editVenue.venueNamePlaceholder')}
                            className="text-sm max-lg:text-sm"
                            maxLength={50}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm max-lg:text-xs font-medium">{t('partner.editVenue.district')} *</Label>
                          <Select
                            value={venue.district}
                            onValueChange={(value) => setVenue({ ...venue, district: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('partner.editVenue.districtPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {TBILISI_DISTRICTS.map((d) => (
                                <SelectItem key={d} value={d}>{i18n.language === 'en' ? TBILISI_DISTRICT_EN[d as keyof typeof TBILISI_DISTRICT_EN] : d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Location Picker */}
                      <div className="space-y-2">
                        <Label className="text-sm max-lg:text-xs font-medium">{t('partner.editVenue.location')} *</Label>
                        <GoogleLocationPicker 
                          onLocationSelect={handleLocationSelect}
                          initialLocation={venue.latitude && venue.longitude ? {
                            address: venue.location,
                            latitude: venue.latitude,
                            longitude: venue.longitude,
                            district: venue.district
                          } : undefined}
                        />
                      </div>

                      {/* Booking Advance Limit */}
                      <div className="space-y-2">
                        <Label htmlFor="bookingAdvanceLimit" className="text-sm max-lg:text-xs font-medium">
                          {t('partner.editVenue.bookingAdvanceLimit')}
                        </Label>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {t('partner.editVenue.bookingAdvanceLimitDescription')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            id="bookingAdvanceLimit"
                            type="number"
                            min="1"
                            value={venue.max_booking_days_in_advance || ''}
                            onChange={(e) => {
                              const value = e.target.value ? parseInt(e.target.value) : undefined;
                              setVenue({...venue, max_booking_days_in_advance: value});
                            }}
                            placeholder={t('partner.editVenue.bookingAdvanceLimitPlaceholder')}
                            className="text-sm max-lg:text-sm"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {t('partner.editVenue.bookingAdvanceLimitDays')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Working Hours */}
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm max-lg:text-xs font-medium">
                          <svg className="w-4 h-4 max-lg:w-3 max-lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <CardTitle className="text-xl max-lg:text-lg">{t('partner.editVenue.workingHours')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <DailyWorkingHours
                        workingHours={venue.working_hours}
                        onWorkingHoursChange={(workingHours) => setVenue({...venue, working_hours: workingHours})}
                      />
                    </CardContent>
                  </Card>

                  {/* Venue Images */}
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm max-lg:text-xs font-medium">
                          <svg className="w-4 h-4 max-lg:w-3 max-lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <CardTitle className="text-xl max-lg:text-lg">{t('partner.editVenue.venueImages')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <VenueImageUpload
                        images={venue.images}
                        onImagesChange={(images) => setVenue({...venue, images})}
                        venueId={venueId || ''}
                      />
                    </CardContent>
                  </Card>

                  {/* Next Step Button */}
                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={() => setCurrentStep(2)}
                      disabled={!venue.name || !venue.location}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {t('partner.editVenue.nextStep')} →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Services Configuration */}
              {currentStep === 2 && (
                <div className="space-y-6 max-lg:space-y-4">

                  {/* Services Configuration */}
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm max-lg:text-xs font-medium">2</div>
                          <CardTitle className="text-xl max-lg:text-lg">{t('partner.editVenue.services')}</CardTitle>
                        </div>
                        <Button onClick={addService} variant="outline" size="sm">
                          <Plus className="h-4 w-4 max-lg:h-3 max-lg:w-3 mr-2" />
                          {t('partner.editVenue.addService')}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 max-lg:space-y-3">
                      {services.length === 0 ? (
                        <div className="text-center py-12 max-lg:py-8 text-muted-foreground">
                          <div className="w-16 h-16 max-lg:w-12 max-lg:h-12 mx-auto mb-4 max-lg:mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Plus className="h-8 w-8 max-lg:h-6 max-lg:w-6 text-gray-400" />
                          </div>
                          <h4 className="text-lg max-lg:text-base font-medium text-gray-900 dark:text-white mb-2">{t('partner.editVenue.noServicesYet')}</h4>
                          <p className="text-sm max-lg:text-xs text-gray-600 dark:text-gray-400 mb-4 max-lg:mb-3">{t('partner.editVenue.addFirstServiceDescription')}</p>
                          <Button onClick={addService} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="h-4 w-4 max-lg:h-3 max-lg:w-3 mr-2" />
                            {t('partner.editVenue.addFirstService')}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 max-lg:space-y-3">
                          {services.map((service, index) => (
                            <Card key={index} className="border-dashed border-gray-300 dark:border-gray-600">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg max-lg:text-base">{t('partner.editVenue.service')} {index + 1}</CardTitle>
                                  <Button
                                    onClick={() => removeService(index)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <X className="h-4 w-4 max-lg:h-3 max-lg:w-3" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4 max-lg:space-y-3">
                                {/* Service Type Selection */}
                                <div className="space-y-2">
                                  <Label className="text-sm max-lg:text-xs font-medium">{t('partner.editVenue.serviceType')} *</Label>
                                  <Select
                                    value={service.service_id}
                                    onValueChange={(value) => updateService(index, 'service_id', value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder={t('partner.editVenue.selectServiceType')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {serviceTypeOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                          {option.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Progressive disclosure: Show additional fields only after service is selected */}
                                {service.service_id && (
                                  <>
                                    {/* Maximum Tables */}
                                    <div className="space-y-2">
                                      <Label className="text-sm max-lg:text-xs font-medium">
                                        {t('partner.editVenue.maximumTables', { 
                                          table: getTableLabel(
                                            serviceTypeOptions.find(s => s.id === service.service_id),
                                            t('pricing.table'),
                                            i18n.language as 'en' | 'ka'
                                          )
                                        })}
                                      </Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={service.max_tables ?? ''}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          updateService(index, 'max_tables', value === '' ? null : parseInt(value, 10));
                                        }}
                                        className="w-full"
                                        placeholder={t('partner.editVenue.enterMaxTables')}
                                      />
                                    </div>

                                    {/* Pricing Configuration */}
                                    <div className="space-y-2">
                                      <ServicePricingForm
                                        service={{
                                          ...service,
                                          pricing_model: serviceTypeOptions.find(s => s.id === service.service_id)?.pricing_model || 'hourly',
                                          table_label: serviceTypeOptions.find(s => s.id === service.service_id)?.table_label,
                                          guest_label: serviceTypeOptions.find(s => s.id === service.service_id)?.guest_label,
                                          table_label_ka: serviceTypeOptions.find(s => s.id === service.service_id)?.table_label_ka,
                                          guest_label_ka: serviceTypeOptions.find(s => s.id === service.service_id)?.guest_label_ka
                                        }}
                                        onServiceUpdate={(field, value) => updateService(index, field, value)}
                                      />
                                    </div>
                                  </>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button 
                      onClick={() => setCurrentStep(1)}
                      variant="outline"
                    >
                      ← {t('partner.editVenue.previousStep')}
                    </Button>
                    <Button 
                      onClick={() => setCurrentStep(3)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {t('partner.editVenue.continueToDiscounts')} →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Discounts Only */}
              {currentStep === 3 && (
                <div className="space-y-6 max-lg:space-y-4">
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm max-lg:text-xs font-medium">
                          <svg className="w-4 h-4 max-lg:w-3 max-lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <CardTitle className="text-xl max-lg:text-lg">{t('partner.editVenue.serviceDiscounts')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <VenueDiscountConfig
                        services={services.map(s => ({ 
                          id: s.id || '', 
                          name: serviceTypeOptions.find(st => st.id === s.service_id)?.name || 'Unknown Service' 
                        }))}
                        overallDiscountPercent={overallDiscountPercent}
                        setOverallDiscountPercent={setOverallDiscountPercent}
                        overallDiscountEnabled={overallDiscountEnabled}
                        setOverallDiscountEnabled={setOverallDiscountEnabled}
                        overallDiscountServiceIds={overallDiscountServiceIds}
                        setOverallDiscountServiceIds={setOverallDiscountServiceIds}
                        freeHourDiscountEnabled={freeHourDiscountEnabled}
                        setFreeHourDiscountEnabled={setFreeHourDiscountEnabled}
                        freeHourDiscounts={freeHourDiscounts}
                        setFreeHourDiscounts={setFreeHourDiscounts}
                        groupDiscounts={groupDiscounts}
                        setGroupDiscounts={setGroupDiscounts}
                        groupDiscountEnabled={groupDiscountEnabled}
                        setGroupDiscountEnabled={setGroupDiscountEnabled}
                        timeslotDiscounts={timeslotDiscounts}
                        setTimeslotDiscounts={setTimeslotDiscounts}
                        timeslotDiscountEnabled={timeslotDiscountEnabled}
                        setTimeslotDiscountEnabled={setTimeslotDiscountEnabled}
                      />
                    </CardContent>
                  </Card>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button 
                      onClick={() => setCurrentStep(2)}
                      variant="outline"
                    >
                      ← {t('partner.editVenue.previousStep')}
                    </Button>
                    <Button 
                      onClick={() => setCurrentStep(4)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {t('partner.editVenue.continueToEmployees')} →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Employee Management */}
              {currentStep === 4 && venueId && (
                <div className="space-y-6 max-lg:space-y-4">
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm max-lg:text-xs font-medium">4</div>
                        <CardTitle className="text-xl max-lg:text-lg">{t('partner.editVenue.employeeManagement')}</CardTitle>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm max-lg:text-xs mt-2">
                        {t('partner.editVenue.employeeManagementDescription')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <EmployeeManagementSection 
                        venueId={venueId} 
                        venueName={venue.name}
                        isEditMode={true}
                      />
                    </CardContent>
                  </Card>

                  {/* Navigation Buttons */}
                  <div className="flex justify-start pt-4">
                    <Button 
                      onClick={() => setCurrentStep(3)}
                      variant="outline"
                    >
                      ← {t('partner.editVenue.previousStep')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Products Management */}
              {currentStep === 5 && venueId && (
                <div className="space-y-6 max-lg:space-y-4">
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm max-lg:text-xs font-medium">5</div>
                        <CardTitle className="text-xl max-lg:text-lg">{t('partner.addVenue.productManagement')}</CardTitle>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm max-lg:text-xs mt-2">
                        {t('partner.addVenue.productManagementDescription')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ProductsManagement 
                        venueId={venueId}
                      />
                    </CardContent>
                  </Card>

                  {/* Navigation Buttons */}
                  <div className="flex justify-start pt-4">
                    <Button 
                      onClick={() => setCurrentStep(4)}
                      variant="outline"
                    >
                      ← {t('partner.editVenue.previousStep')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Services - REMOVED */}
            {false && (
              <div className="space-y-6 max-lg:space-y-4">
                
                {/* Step 2: Services */}
                <Card className="sticky top-6">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm max-lg:text-xs font-medium">2</div>
                        <CardTitle className="text-xl max-lg:text-lg">{t('partner.editVenue.services')}</CardTitle>
                      </div>
                      <Button onClick={addService} variant="outline" size="sm">
                        <Plus className="h-4 w-4 max-lg:h-3 max-lg:w-3 mr-2" />
                        {t('partner.editVenue.addService')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 max-lg:space-y-3">
                    {services.length === 0 ? (
                      <div className="text-center py-8 max-lg:py-6 text-muted-foreground">
                        <div className="w-16 h-16 max-lg:w-12 max-lg:h-12 mx-auto mb-4 max-lg:mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <svg className="w-8 h-8 max-lg:w-6 max-lg:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <p className="text-sm max-lg:text-xs font-medium">{t('partner.editVenue.noServicesYet')}</p>
                        <p className="text-xs max-lg:text-xs text-gray-500 dark:text-gray-400 mt-1">{t('partner.editVenue.addServicesToGetStarted')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-lg:space-y-2">
                        {services.map((service, index) => (
                          <Card key={index} className="border-dashed border-gray-300 dark:border-gray-600">
                            <CardHeader className="pb-3 p-4 max-lg:p-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm max-lg:text-xs">{t('partner.editVenue.service')} {index + 1}</h4>
                                <Button
                                  onClick={() => removeService(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 max-lg:p-3 space-y-3 max-lg:space-y-2">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">{t('partner.editVenue.serviceType')} *</Label>
                                <Select 
                                  value={service.service_id} 
                                  onValueChange={(value) => updateService(index, 'service_id', value)}
                                >
                                  <SelectTrigger className="text-xs h-8">
                                    <SelectValue placeholder={t('partner.editVenue.selectServiceType')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {serviceTypeOptions.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Service Configuration - Only show after service is selected */}
                              {service.service_id && (
                                <div className="space-y-3 max-lg:space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3 max-lg:pt-2">
                                  {/* Maximum Tables */}
                                  <div className="space-y-2">
                                    <Label className="text-xs font-medium">
                                      {t('partner.editVenue.maximumTables', { 
                                        table: getTableLabel(
                                          serviceTypeOptions.find(s => s.id === service.service_id),
                                          t('pricing.table'),
                                          i18n.language as 'en' | 'ka'
                                        )
                                      })}
                                    </Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={service.max_tables || 1}
                                      onChange={(e) => updateService(index, 'max_tables', parseInt(e.target.value) || 1)}
                                      className="text-xs h-8"
                                    />
                                  </div>

                                  {/* Pricing Configuration */}
                                  <ServicePricingForm
                                    service={{
                                      ...service,
                                      pricing_model: serviceTypeOptions.find(s => s.id === service.service_id)?.pricing_model || 'hourly',
                                      table_label: serviceTypeOptions.find(s => s.id === service.service_id)?.table_label,
                                      guest_label: serviceTypeOptions.find(s => s.id === service.service_id)?.guest_label,
                                      table_label_ka: serviceTypeOptions.find(s => s.id === service.service_id)?.table_label_ka,
                                      guest_label_ka: serviceTypeOptions.find(s => s.id === service.service_id)?.guest_label_ka
                                    }}
                                    onServiceUpdate={(field, value) => updateService(index, field as keyof VenueService, value)}
                                  />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom Save Button Section */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 max-lg:p-3 mt-8 max-lg:mt-6">
          <div className="max-w-6xl mx-auto flex flex-col max-lg:flex-col lg:flex-row lg:items-center lg:justify-end space-y-3 max-lg:space-y-2 lg:space-y-0">
            <div className="flex flex-col max-lg:flex-col lg:flex-row items-stretch max-lg:items-stretch lg:items-center space-y-2 max-lg:space-y-2 lg:space-y-0 lg:space-x-3">
              <Button
                variant="outline"
                onClick={() => navigate('/partner/dashboard')}
                className="px-6 max-lg:px-4 w-full max-lg:w-full lg:w-auto"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 max-lg:px-6 w-full max-lg:w-full lg:w-auto"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 max-lg:h-3 max-lg:w-3 border-b-2 border-white mr-2"></div>
                    {t('partner.editVenue.saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 max-lg:h-3 max-lg:w-3 mr-2" />
                    {t('partner.editVenue.saveChanges')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PartnerLayout>
  );
};

export default EditVenue;