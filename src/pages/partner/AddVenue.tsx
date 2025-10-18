import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCreateVenue } from '@/hooks/usePartnerVenues';

import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { ArrowLeft, Plus, X, Check, ChevronsUpDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import PartnerLayout from '@/components/PartnerLayout';
import VenueImageUpload from '@/components/VenueImageUpload';
import EmployeeManagementSection from '@/components/EmployeeManagementSection';
import { ProductsManagement } from '@/components/ProductsManagement';
import { v4 as uuidv4 } from 'uuid';

import GoogleLocationPicker from '@/components/GoogleLocationPicker';
import { GuestPricingManager } from '@/components/GuestPricingManager';

import { isPerTableService, PRICING_MODELS } from '@/constants/services';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useTranslation } from 'react-i18next';
import { ServicePricingForm } from '@/components/ServicePricingForm';
import { getTableLabel } from '@/utils/pricingLabels';
import VenueDiscountConfig from '@/components/VenueDiscountConfig';
import { TBILISI_DISTRICTS, TBILISI_DISTRICT_EN } from '@/constants/districts';

interface VenueService {
  service_id: string;
  price: number | null;
  images: string[];
  discount_percentage: number;
  guest_pricing_rules: Array<{ maxGuests: number; price: number | null }>;
  max_tables: number | null;
  overall_discount_percent?: number;
  free_hour_discounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
  group_discounts?: Array<{ minGuests: number; discountPercent: number }>;
  timeslot_discounts?: Array<{ start: string; end: string; discountPercent: number }>;
}

import DailyWorkingHours, { WorkingHours } from '@/components/DailyWorkingHours';

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

const AddVenue = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { data: profile } = useProfile();

  // Generate a temporary venue ID for image uploads
  const [tempVenueId] = useState(() => uuidv4());
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [createdVenueId, setCreatedVenueId] = useState<string | null>(null);
  const [services, setServices] = useState<VenueService[]>([{
    service_id: '',
    price: null,
    images: [],
    discount_percentage: 0,
    guest_pricing_rules: [],
    max_tables: null
  }]);
  
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
  const [employees, setEmployees] = useState<Array<{ username: string; password: string }>>([]);
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
    longitude: undefined,
    max_booking_days_in_advance: 30
  });

  const createVenue = useCreateVenue();
  const { data: serviceTypesData } = useServiceTypes();
  const serviceTypeOptions = serviceTypesData || [];
  
  // Create a venue draft early (so later steps like employees/products have a real venue_id)
  const ensureVenueCreated = useCallback(async () => {
    if (createdVenueId) return createdVenueId;

    // Minimal validation required to create a venue
    const missingFields: string[] = [];
    if (!venue.name) missingFields.push(t('partner.addVenue.validationVenueName'));
    if (!venue.location) missingFields.push(t('partner.addVenue.validationVenueLocation'));
    if (!venue.district) missingFields.push(t('partner.addVenue.validationDistrict'));
    if (venue.latitude === undefined || venue.latitude === null) missingFields.push(t('partner.addVenue.validationLatitude'));
    if (venue.longitude === undefined || venue.longitude === null) missingFields.push(t('partner.addVenue.validationLongitude'));

    if (missingFields.length > 0) {
      toast({
        title: t('partner.addVenue.missingInformation'),
        description: t('partner.addVenue.pleaseFillIn', { fields: missingFields.join(', ') }),
        variant: 'destructive',
      });
      return null;
    }

    try {
      setLoading(true);
      const venueData = await createVenue.mutateAsync({
        name: venue.name,
        location: venue.location,
        district: venue.district,
        images: [],
        workingHours: venue.working_hours,
        latitude: venue.latitude,
        longitude: venue.longitude,
      });

      const newId = (venueData as any).id as string;
      setCreatedVenueId(newId);
      
      // If there are already uploaded images in temp storage, migrate them now so preview is accurate
      if (venue.images.length > 0) {
        const finalImageUrls: string[] = [];
        for (const imageUrl of venue.images) {
          if (imageUrl.includes(`/${tempVenueId}/`)) {
            const filename = imageUrl.split('/').pop();
            if (filename) {
              const { data: fileData } = await supabase.storage
                .from('venue-images')
                .download(`${tempVenueId}/${filename}`);
              if (fileData) {
                const { error: uploadError } = await supabase.storage
                  .from('venue-images')
                  .upload(`${newId}/${filename}`, fileData, { cacheControl: '3600', upsert: true });
                if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage
                    .from('venue-images')
                    .getPublicUrl(`${newId}/${filename}`);
                  finalImageUrls.push(publicUrl);
                  await supabase.storage.from('venue-images').remove([`${tempVenueId}/${filename}`]);
                }
              }
            }
          } else {
            finalImageUrls.push(imageUrl);
          }
        }
        if (finalImageUrls.length > 0) {
          await supabase.from('venues').update({ images: finalImageUrls } as any).eq('id', newId);
        }
      }

      return newId;
    } catch (err) {
      console.error('Failed to create venue draft', err);
      toast({ title: t('common.error'), description: t('partner.addVenue.failedToCreateVenue'), variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [createdVenueId, createVenue, i18n?.language, supabase, tempVenueId, toast, t, venue]);
  
  // Helper to get service ID for a service name
  const getServiceIdForName = (serviceName: string): string => {
    const serviceData = serviceTypesData?.find(s => s.name === serviceName);
    return serviceData?.id || '';
  };

  // Debounced venue name handler to prevent excessive updates
  const handleVenueNameChange = useCallback((newValue: string) => {
    setVenue(prev => ({...prev, name: newValue}));
  }, []);

  // Helper function to check if services are valid
  const hasValidServices = useCallback(() => {
    const validServices = services.filter(service => {
      const hasServiceId = !!service.service_id;
      const serviceTypeData = serviceTypeOptions.find(s => s.id === service.service_id);
      const isTableWise = isPerTableService(serviceTypeData?.pricing_model);

      if (isTableWise) {
        // Table-wise service: needs valid price and max_tables
        const hasValidTablePricing = (service.price ?? 0) > 0 && (service.max_tables ?? 0) > 0;
        return hasServiceId && hasValidTablePricing;
      } else {
        // Guest-wise service: needs valid guest pricing rules
        const hasGuestPricing = service.guest_pricing_rules && 
                               service.guest_pricing_rules.length > 0 && 
                               service.guest_pricing_rules.every(rule => (rule.price ?? 0) > 0 && rule.maxGuests > 0);
        return hasServiceId && hasGuestPricing;
      }
    });
    return validServices.length > 0;
  }, [services, serviceTypeOptions]);


  const handleSave = async () => {
    
    // More precise validation with detailed error messages
    const missingFields = [];
    if (!venue.name) missingFields.push(t('partner.addVenue.validationVenueName'));
    if (!venue.location) missingFields.push(t('partner.addVenue.validationVenueLocation'));
    if (!venue.district) missingFields.push(t('partner.addVenue.validationDistrict'));
    // Note: working_hours validation is handled by the component itself
    if (venue.latitude === undefined || venue.latitude === null) missingFields.push(t('partner.addVenue.validationLatitude'));
    if (venue.longitude === undefined || venue.longitude === null) missingFields.push(t('partner.addVenue.validationLongitude'));

    if (missingFields.length > 0) {
      
      toast({
        title: t('partner.addVenue.missingInformation'),
        description: t('partner.addVenue.pleaseFillIn', { fields: missingFields.join(', ') }),
        variant: "destructive",
      });
      return;
    }

    // Validate employees BEFORE creating venue
    if (employees.length > 0) {
      
      // Check for duplicate usernames
      const duplicateUsernames = [];
      const seenUsernames = new Set();
      
      for (const employee of employees) {
        if (employee.username && employee.username.trim()) {
          if (seenUsernames.has(employee.username.toLowerCase())) {
            duplicateUsernames.push(employee.username);
          }
          seenUsernames.add(employee.username.toLowerCase());
        }
      }
      
      if (duplicateUsernames.length > 0) {
        toast({
          title: t('partner.addVenue.duplicateUsernames'),
          description: t('partner.addVenue.duplicateUsernamesDescription', { usernames: duplicateUsernames.join(', ') }),
          variant: "destructive",
        });
        return;
      }
      
      // Check if employees already exist in database
      const employeeUsernames = employees
        .filter(emp => emp.username && emp.username.trim())
        .map(emp => emp.username.trim());
      
      if (employeeUsernames.length > 0) {
        const { data: existingEmployees, error: checkError } = await supabase
          .from('employees')
          .select('username')
          .in('username', employeeUsernames);
        
        if (checkError) {
          console.error('Error checking existing employees:', checkError);
          toast({
            title: t('common.error'),
            description: t('partner.addVenue.errorCheckingEmployees'),
            variant: "destructive",
          });
          return;
        }
        
        if (existingEmployees && existingEmployees.length > 0) {
          const existingUsernames = existingEmployees.map(emp => emp.username);
          toast({
            title: t('partner.addVenue.employeesAlreadyExist'),
            description: t('partner.addVenue.employeesAlreadyExistDescription', { usernames: existingUsernames.join(', ') }),
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Validate services - at least one required with valid pricing
    const validServices = services.filter(service => {
      const hasServiceId = !!service.service_id;
      const serviceTypeData = serviceTypeOptions.find(s => s.id === service.service_id);
      const isTableWise = isPerTableService(serviceTypeData?.pricing_model);

      if (isTableWise) {
        // Table-wise service: needs valid price and max_tables
        const hasValidTablePricing = (service.price ?? 0) > 0 && (service.max_tables ?? 0) > 0;
        return hasServiceId && hasValidTablePricing;
      } else {
        // Guest-wise service: needs valid guest pricing rules
        const hasGuestPricing = service.guest_pricing_rules && 
                               service.guest_pricing_rules.length > 0 && 
                               service.guest_pricing_rules.every(rule => (rule.price ?? 0) > 0 && rule.maxGuests > 0);
        return hasServiceId && hasGuestPricing;
      }
    });
    
    if (validServices.length === 0) {
      toast({
        title: t('partner.addVenue.serviceRequired'),
        description: t('partner.addVenue.serviceRequiredDescription'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // If we already created a venue earlier (for Employees/Products), reuse it
      let finalVenueId = createdVenueId;
      if (!finalVenueId) {
        const venueData = await createVenue.mutateAsync({
          name: venue.name,
          location: venue.location,
          district: venue.district,
          images: [], // Start with empty images
          workingHours: venue.working_hours,
          latitude: venue.latitude,
          longitude: venue.longitude
        });
        finalVenueId = (venueData as any).id;
        setCreatedVenueId(finalVenueId);
      }

      // Update venue with discount data and booking advance limit
      await supabase
        .from('venues')
        .update({
          overall_discount_percent: overallDiscountEnabled ? overallDiscountPercent : 0,
          overall_discount_service_ids: overallDiscountServiceIds,
          free_hour_discounts: freeHourDiscountEnabled ? freeHourDiscounts : [],
          group_discounts: groupDiscountEnabled ? groupDiscounts : [],
          timeslot_discounts: timeslotDiscountEnabled ? timeslotDiscounts : [],
          max_booking_days_in_advance: venue.max_booking_days_in_advance || null
        } as any)
        .eq('id', finalVenueId as any);

      // If there are images, move them from temp folder to real venue folder
      if (venue.images.length > 0) {
        const finalImageUrls: string[] = [];
        
        for (const imageUrl of venue.images) {
          if (imageUrl.includes(`/${tempVenueId}/`)) {
            const filename = imageUrl.split('/').pop();
            if (filename) {
              try {
                // Download from temp location
                const { data: fileData, error: downloadError } = await supabase.storage
                  .from('venue-images')
                  .download(`${tempVenueId}/${filename}`);
                
                if (!downloadError && fileData) {
                  // Upload to final location
                  const { error: uploadError } = await supabase.storage
                    .from('venue-images')
                    .upload(`${finalVenueId}/${filename}`, fileData, {
                      cacheControl: '3600',
                      upsert: true
                    });
                  
                  if (!uploadError) {
                    // Get new public URL
                    const { data: { publicUrl } } = supabase.storage
                      .from('venue-images')
                      .getPublicUrl(`${finalVenueId}/${filename}`);
                    
                    finalImageUrls.push(publicUrl);
                    
                    // Delete temp file
                    await supabase.storage
                      .from('venue-images')
                      .remove([`${tempVenueId}/${filename}`]);
                  }
                }
              } catch (error) {
                console.error('Failed to migrate image:', error);
                // Continue with other images even if one fails
              }
            }
          } else {
            // Image doesn't need migration
            finalImageUrls.push(imageUrl);
          }
        }
        
        // Update venue with final image URLs
        if (finalImageUrls.length > 0) {
          await supabase
            .from('venues')
            .update({ images: finalImageUrls } as any)
            .eq('id', finalVenueId as any);
        }
      }

      // Create services if any are provided
      if (validServices.length > 0) {
        for (const service of validServices) {
          const serviceTypeData = serviceTypeOptions.find(s => s.id === service.service_id);
          const serviceOverallDiscount = service.overall_discount_percent || 0;
          const serviceFreeHourDiscounts = service.free_hour_discounts || [];
          const serviceGroupDiscounts = service.group_discounts || [];
          const serviceTimeslotDiscounts = service.timeslot_discounts || [];
          
          const { data, error } = await supabase.from('venue_services').insert({
            venue_id: finalVenueId as any,
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
          
          if (error) {
            console.error('Error creating service:', error);
            throw new Error(`Failed to create service: ${error.message}`);
          }
        }
      }

      // Create employees if any are provided
      if (employees.length > 0) {
        const { hashPassword } = await import('@/utils/passwordUtils');
        
        for (const employee of employees) {
          if (employee.username && employee.password) {
            const hashedPassword = await hashPassword(employee.password);
            
            const { data: insertData, error: employeeError } = await supabase
              .from('employees')
              .insert({
                username: employee.username,
                password_hash: hashedPassword,
                venue_id: finalVenueId as any
              })
              .select();
            
            if (employeeError) {
              console.error('❌ Error creating employee:', employeeError);
            } else {
              // console.log('✅ Employee created successfully:', insertData); // Removed console.log
            }
          } else {
            // Skip invalid employee entries
          }
        }
      } else {
        // console.log('❌ No employees to create'); // Removed console.log
        // console.log('   - employees.length:', employees.length); // Removed console.log
      }

      toast({
        title: t('common.success'),
        description: t('partner.addVenue.venueCreatedSuccess'),
      });
      
      // Navigate to dashboard after successful venue creation
      navigate('/partner/dashboard');
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('partner.addVenue.failedToCreateVenue'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    setServices([...services, {
      service_id: '', // Start with empty service_id for progressive disclosure
      price: null,
      images: [],
      discount_percentage: 0,
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
    newServices[index] = { 
      ...newServices[index], 
      [field]: value
    };
    
    // Service changed - no additional cleanup needed
    
    setServices(newServices);
  };

  // Handle location selection from map
  const handleLocationSelect = (locationData: { address: string; latitude: number; longitude: number; district?: string }) => {
    
    setVenue(currentVenue => {
      const updatedVenue = {
        ...currentVenue,
        location: locationData.address,
        district: currentVenue.district,
        latitude: locationData.latitude,
        longitude: locationData.longitude
      };
      return updatedVenue;
    });
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

  // Helper function to format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
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
                <h1 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-white">{t('partner.addVenue.title')}</h1>
                <p className="text-gray-600 dark:text-gray-400 max-lg:text-sm">{t('partner.addVenue.subtitle')}</p>
              </div>
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
                }`}>{t('partner.addVenue.basicInfo')}</span>
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
                    : currentStep > 2 && !hasValidServices()
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>2</div>
                <span className={`text-sm max-lg:text-xs font-medium ${
                  currentStep === 2 
                    ? 'text-gray-700 dark:text-gray-300' 
                    : currentStep > 2 && !hasValidServices()
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>{t('partner.addVenue.services')}</span>
              </button>
              <div className="w-8 max-lg:w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
              <button 
                onClick={() => setCurrentStep(3)}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                disabled={!venue.name || !venue.location || !hasValidServices()}
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
                }`}>{t('partner.addVenue.discounts')}</span>
              </button>
              <div className="w-8 max-lg:w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
              <button 
                onClick={async () => { const id = await ensureVenueCreated(); if (id) setCurrentStep(4); }}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
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
                }`}>{t('partner.addVenue.employees')}</span>
              </button>
              <div className="w-8 max-lg:w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
              <button 
                onClick={async () => { const id = await ensureVenueCreated(); if (id) setCurrentStep(5); }}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
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
                  onChange={(e) => handleVenueNameChange(e.target.value)}
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
                venueId={tempVenueId}
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
                      {t('partner.addVenue.nextStep')} →
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
                          <CardTitle className="text-xl max-lg:text-lg">{t('partner.addVenue.services')}</CardTitle>
                        </div>
                        <Button onClick={addService} variant="outline" size="sm">
                          <Plus className="h-4 w-4 max-lg:h-3 max-lg:w-3 mr-2" />
                          {t('partner.addVenue.addService')}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 max-lg:space-y-3">
                      {services.length === 0 ? (
                        <div className="text-center py-12 max-lg:py-8 text-muted-foreground">
                          <div className="w-16 h-16 max-lg:w-12 max-lg:h-12 mx-auto mb-4 max-lg:mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Plus className="h-8 w-8 max-lg:h-6 max-lg:w-6 text-gray-400" />
                          </div>
                          <h4 className="text-lg max-lg:text-base font-medium text-gray-900 dark:text-white mb-2">{t('partner.addVenue.noServicesYet')}</h4>
                          <p className="text-sm max-lg:text-xs text-gray-600 dark:text-gray-400 mb-4 max-lg:mb-3">{t('partner.addVenue.addFirstServiceDescription')}</p>
                          <Button onClick={addService} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="h-4 w-4 max-lg:h-3 max-lg:w-3 mr-2" />
                            {t('partner.addVenue.addFirstService')}
                          </Button>
                </div>
              ) : (
                <div className="space-y-4 max-lg:space-y-3">
                  {services.map((service, index) => (
                            <Card key={index} className="border-dashed border-gray-300 dark:border-gray-600">
                              <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg max-lg:text-base">{t('partner.addVenue.service')} {index + 1}</CardTitle>
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
                                  <Label className="text-sm max-lg:text-xs font-medium">{t('partner.addVenue.serviceType')} *</Label>
                                  <Select
                                    value={service.service_id}
                                    onValueChange={(value) => updateService(index, 'service_id', value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder={t('partner.addVenue.selectServiceType')} />
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
                                        {t('partner.addVenue.maximumTables', { 
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
                                        placeholder={t('partner.addVenue.enterMaxTables')}
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
                                        onServiceUpdate={(field, value) => updateService(index, field as keyof VenueService, value)}
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
                      ← {t('partner.addVenue.previousStep')}
                    </Button>
                    <div className="flex flex-col items-end space-y-2">
                      <Button 
                        onClick={() => setCurrentStep(3)}
                        disabled={!hasValidServices()}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {t('partner.addVenue.continueToDiscounts')} →
                      </Button>
                    </div>
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
                        <CardTitle className="text-xl max-lg:text-lg">{t('partner.addVenue.serviceDiscounts')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <VenueDiscountConfig
                        services={services.map(s => ({ 
                          id: s.service_id || '', 
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
                      ← {t('partner.addVenue.previousStep')}
                    </Button>
                    <Button 
                      onClick={async () => { const id = await ensureVenueCreated(); if (id) setCurrentStep(4); }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {t('partner.addVenue.continueToEmployees')} →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Employee Management */}
              {currentStep === 4 && (
                <div className="space-y-6 max-lg:space-y-4">
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 max-lg:w-6 max-lg:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm max-lg:text-xs font-medium">4</div>
                        <CardTitle className="text-xl max-lg:text-lg">{t('partner.addVenue.employeeManagement')}</CardTitle>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm max-lg:text-xs mt-2">
                        {t('partner.addVenue.employeeManagementDescription')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">{t('partner.addVenue.employees')}</h3>
                          <Button
                            onClick={() => setEmployees([...employees, { username: '', password: '' }])}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('partner.addVenue.addEmployee')}
                          </Button>
                        </div>
                        
                        {employees.length === 0 ? (
                          <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                              {t('partner.addVenue.noEmployeesYet')}
                            </p>
                            <Button
                              onClick={() => setEmployees([{ username: '', password: '' }])}
                              variant="outline"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {t('partner.addVenue.addFirstEmployee')}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {employees.map((employee, index) => (
                              <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor={`employee-username-${index}`} className="text-sm">
                                      {t('partner.addVenue.username')}
                                    </Label>
                                    <Input
                                      id={`employee-username-${index}`}
                                      value={employee.username}
                                      onChange={(e) => {
                                        const newEmployees = [...employees];
                                        newEmployees[index].username = e.target.value;
                                        setEmployees(newEmployees);
                                      }}
                                      placeholder={t('partner.addVenue.enterUsername')}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`employee-password-${index}`} className="text-sm">
                                      {t('partner.addVenue.password')}
                                    </Label>
                                    <Input
                                      id={`employee-password-${index}`}
                                      type="password"
                                      value={employee.password}
                                      onChange={(e) => {
                                        const newEmployees = [...employees];
                                        newEmployees[index].password = e.target.value;
                                        setEmployees(newEmployees);
                                      }}
                                      placeholder={t('partner.addVenue.enterPassword')}
                                    />
                                  </div>
                                </div>
                                <Button
                                  onClick={() => {
                                    const newEmployees = employees.filter((_, i) => i !== index);
                                    setEmployees(newEmployees);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button 
                      onClick={() => setCurrentStep(3)}
                      variant="outline"
                    >
                      ← {t('partner.addVenue.previousStep')}
                    </Button>
                    <Button 
                      onClick={async () => { const id = await ensureVenueCreated(); if (id) setCurrentStep(5); }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {t('partner.addVenue.continueToProducts')} →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Products Management */}
              {currentStep === 5 && (
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
                      {createdVenueId && (
                        <ProductsManagement 
                          venueId={createdVenueId}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button 
                      onClick={() => setCurrentStep(4)}
                      variant="outline"
                    >
                      ← {t('partner.addVenue.previousStep')}
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loading ? t('partner.addVenue.creating') : t('partner.addVenue.finishAndGoToDashboard')} →
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
                              max="20"
                              value={service.max_tables ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                  updateService(index, 'max_tables', null);
                                } else {
                                  const parsed = parseInt(raw, 10);
                                  updateService(index, 'max_tables', Number.isNaN(parsed) ? null : parsed);
                                }
                              }}
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
        
      </div>
    </PartnerLayout>
  );
};

export default AddVenue;