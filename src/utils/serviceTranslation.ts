import { useTranslation } from 'react-i18next';

// Interface for service objects with multilingual names
export interface ServiceWithTranslations {
  name: string;
  name_en?: string;
  name_ka?: string;
}

/**
 * Gets the translated service name based on the current language
 * Now uses database-stored translations instead of hardcoded mappings
 */
export const getTranslatedServiceName = (
  service: ServiceWithTranslations | string | undefined, 
  currentLanguage: string
): string => {
  // Handle undefined or null services
  if (!service) {
    return 'Unknown Service';
  }

  // Handle old string-based API (backward compatibility)
  if (typeof service === 'string') {
    return service;
  }

  // Use database translations based on current language
  if (currentLanguage === 'ka' && service.name_ka) {
    return service.name_ka;
  }
  
  if (currentLanguage === 'en' && service.name_en) {
    return service.name_en;
  }

  // Fallback to database translations if available
  if (service.name_en && currentLanguage === 'en') {
    return service.name_en;
  }
  
  if (service.name_ka && currentLanguage === 'ka') {
    return service.name_ka;
  }

  // Final fallback to the original name
  return service.name || 'Unknown Service';
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use getTranslatedServiceName with service object instead
 */
export const getTranslatedServiceNameLegacy = (serviceName: string | undefined, t: any): string => {
  if (!serviceName) {
    return 'Unknown Service';
  }
  
  // For legacy support, just return the service name as-is
  // The admin should now set proper translations in the database
  return serviceName;
};

// Hook for using service translation
export const useServiceTranslation = () => {
  const { i18n } = useTranslation();
  
  return {
    translateService: (service: ServiceWithTranslations | string) => 
      getTranslatedServiceName(service, i18n.language),
    
    // Legacy method for backward compatibility
    translateServiceLegacy: (serviceName: string) => 
      getTranslatedServiceNameLegacy(serviceName, null)
  };
};

