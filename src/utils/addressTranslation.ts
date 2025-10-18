import { useTranslation } from 'react-i18next';

export const translateAddress = (address: string, t: any): string => {
  if (!address) return address;

  // Common address translations
  const addressTranslations: { [key: string]: string } = {
    // Street names
    'street': t('addresses.street'),
    'st': t('addresses.street'),
    'avenue': t('addresses.avenue'),
    'ave': t('addresses.avenue'),
    'boulevard': t('addresses.boulevard'),
    'blvd': t('addresses.boulevard'),
    'road': t('addresses.road'),
    'rd': t('addresses.road'),
    
    // Cities
    "t'bilisi": t('addresses.tbilisi'),
    "tbilisi": t('addresses.tbilisi'),
    "თბილისი": t('addresses.tbilisi'),
    
    // Countries
    "georgia": t('addresses.georgia'),
    "საქართველო": t('addresses.georgia'),
    
    // Common words
    "str": t('addresses.street'),
    "building": t('addresses.building'),
    "floor": t('addresses.floor'),
    "entrance": t('addresses.entrance'),
  };

  let translatedAddress = address;

  // Replace common English terms with Georgian translations
  Object.entries(addressTranslations).forEach(([english, georgian]) => {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translatedAddress = translatedAddress.replace(regex, georgian);
  });

  return translatedAddress;
};

// Hook for using address translation
export const useAddressTranslation = () => {
  const { t } = useTranslation();
  
  return {
    translateAddress: (address: string) => translateAddress(address, t)
  };
};

