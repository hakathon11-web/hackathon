// Example component showing how to use the new service translation system
import React from 'react';
import { useServiceTranslation } from '@/utils/serviceTranslation';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useAllServices } from '@/hooks/useAllServices';

const ServiceTranslationExample: React.FC = () => {
  const { translateService } = useServiceTranslation();
  const { data: serviceTypes, isLoading } = useServiceTypes();
  const { data: allServices } = useAllServices();

  if (isLoading) {
    return <div>Loading services...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Service Translation Example</h1>
      
      {/* Example 1: Using service objects with translations */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Service Types with Translations</h2>
        <div className="grid gap-2">
          {serviceTypes?.map((service) => (
            <div key={service.id} className="p-3 border rounded">
              <div className="font-medium">
                {/* This will automatically use the correct language */}
                {translateService({
                  name: service.name,
                  name_en: service.name_en,
                  name_ka: service.name_ka
                })}
              </div>
              <div className="text-sm text-gray-500">
                Internal ID: {service.name}
              </div>
              <div className="text-xs text-gray-400">
                EN: {service.name_en || 'Not set'} | 
                KA: {service.name_ka || 'Not set'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example 2: Manual translation selection */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Manual Translation Examples</h2>
        {allServices?.slice(0, 3).map((service) => (
          <div key={service.id} className="p-3 border rounded mb-2">
            <div>Current Language: {translateService(service)}</div>
            <div>English: {service.name_en || service.name}</div>
            <div>Georgian: {service.name_ka || service.name}</div>
          </div>
        ))}
      </div>

      {/* Example 3: Backward compatibility */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Backward Compatibility</h2>
        <div className="p-3 border rounded">
          <div>String service name: {translateService('PC Gaming')}</div>
          <div className="text-sm text-gray-500">
            (This still works for backward compatibility)
          </div>
        </div>
      </div>

      {/* Admin Instructions */}
      <div className="bg-blue-50 p-4 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">For Admins:</h3>
        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
          <li>Go to Admin Panel → Services</li>
          <li>When creating/editing services, fill both English and Georgian names</li>
          <li>The system will automatically show the correct translation based on user's language</li>
          <li>Internal ID (name field) should remain as technical identifier</li>
        </ol>
      </div>
    </div>
  );
};

export default ServiceTranslationExample;
