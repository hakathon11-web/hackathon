# Service Translations Guide

This guide explains the new admin-managed service translation system that replaces the hardcoded service translations.

## Overview

Previously, service translations were hardcoded in `serviceTranslation.ts`. Now, admins can add English and Georgian translations directly through the admin panel when creating or editing services.

## Database Changes

### New Columns Added
- `services.name_en` - English service name
- `services.name_ka` - Georgian service name
- `venue_services.name_en` - English service name (copied from services)
- `venue_services.name_ka` - Georgian service name (copied from services)

### Migration Scripts
- `20250929000000_add_service_name_translations.sql` - Adds the new columns
- `20250929000001_populate_service_translations.sql` - Populates existing services with translations

## Admin Interface Changes

### Service Form Updates
The admin services form (`/src/pages/admin/Services.tsx`) now includes:
- **English Name*** field - Required field for English service name
- **Georgian Name*** field - Required field for Georgian service name
- Both fields are displayed side-by-side with clear labels

### Validation
- Both English and Georgian names are required when creating/editing services
- Form validation prevents saving without both translations

## Usage in Code

### Updated Service Translation Logic

```typescript
// OLD WAY (deprecated)
import { getTranslatedServiceName } from '@/utils/serviceTranslation';
const translatedName = getTranslatedServiceName(serviceName, t);

// NEW WAY
import { useServiceTranslation } from '@/utils/serviceTranslation';

const { translateService } = useServiceTranslation();

// With service object (recommended)
const translatedName = translateService({
  name: 'pc_gaming',
  name_en: 'PC Gaming', 
  name_ka: 'კომპიუტერული თამაშები'
});

// With string (backward compatibility)
const translatedName = translateService('PC Gaming');
```

### Updated Hooks

#### useServiceTypes
Now returns services with translation fields:
```typescript
const { data: services } = useServiceTypes();
// Each service now includes name_en and name_ka fields
```

#### useAllServices
Updated to return full service objects with translations:
```typescript
const { data: services } = useAllServices();
// Returns ServiceData[] with id, name, name_en, name_ka

// For backward compatibility:
const { data: serviceNames } = useAllServiceNames();
// Returns string[] of service names only
```

#### useVenueServices
Now includes translation fields in venue services:
```typescript
const { data: venueServices } = useVenueServices(venueId);
// Each service includes name_en and name_ka fields
```

## How Translations Work

1. **Language Detection**: The system uses the current i18n language setting
2. **Priority Order**:
   - If language is 'ka' and `name_ka` exists → use Georgian name
   - If language is 'en' and `name_en` exists → use English name
   - Fallback to available translation
   - Final fallback to original `name` field

## Admin Workflow

1. **Creating New Services**:
   - Go to Admin Panel → Services
   - Click "Add Service"
   - Fill in Internal ID (name field)
   - **Required**: Add English Name
   - **Required**: Add Georgian Name
   - Configure other settings as normal

2. **Editing Existing Services**:
   - Services will be auto-populated with translations based on the migration
   - Admins can edit/improve the translations as needed

## Migration Notes

- Existing services have been automatically populated with appropriate translations
- The migration maps common service patterns to standard translations
- Admins should review and refine translations as needed

## Benefits

1. **Admin Control**: Translations managed through UI, no code changes needed
2. **Flexibility**: Admins can customize service names per venue/context
3. **Consistency**: Centralized translation management
4. **Scalability**: Easy to add new languages in the future

## Backward Compatibility

- Old translation functions still work but are deprecated
- Gradual migration path for existing code
- String-based service names still supported

## Next Steps

1. Run the migration scripts to add the database columns
2. Populate existing services with translations
3. Update admin panel with new fields (completed)
4. Gradually update components to use new translation system
5. Eventually remove deprecated hardcoded translations
