# Migration Guide: From Hardcoded to Centralized Configuration

## 🎯 What Was Changed

This migration eliminates **all hardcoded references** to Supabase project IDs, URLs, and keys throughout the codebase. Here's what was implemented:

## ✅ Completed Changes

### 1. **Centralized Configuration System**
- **Created**: `src/config/supabase.ts` - Single source of truth for all Supabase configuration
- **Features**: 
  - Dynamic project ID extraction from URLs
  - Runtime configuration validation
  - Support for both client-side and server-side environments
  - Sanitized logging for security

### 2. **Updated Client-Side Components**
- **Updated**: `src/integrations/supabase/client.ts` - Now uses centralized config
- **Updated**: `src/hooks/useAuth.tsx` - Dynamic session storage keys
- **Updated**: `src/utils/googleMapsLoader.ts` - Centralized URL configuration
- **Updated**: `src/components/GoogleMapsWrapper.tsx` - Centralized URL configuration
- **Updated**: `src/components/LocationPicker.tsx` - Centralized URL configuration

### 3. **Database Configuration**
- **Updated**: `supabase/migrations/20250101000014_add_timeout_cron_job.sql` - Dynamic URL construction
- **Created**: `supabase/migrations/20250101000015_setup_dynamic_config.sql` - Configuration setup
- **Features**:
  - Dynamic URL construction using database functions
  - Environment-based configuration
  - Validation functions for configuration

### 4. **Deployment Tools**
- **Created**: `scripts/setup-project-config.js` - Automated configuration setup
- **Added**: `npm run setup-config` script to package.json
- **Features**:
  - Automated database configuration
  - Configuration validation
  - Error handling and reporting

### 5. **Documentation**
- **Created**: `docs/CONFIGURATION.md` - Comprehensive configuration guide
- **Created**: `MIGRATION_GUIDE.md` - This migration guide
- **Features**:
  - Step-by-step migration instructions
  - Troubleshooting guide
  - Best practices

## 🔧 How to Switch Supabase Projects Now

### Before (Hardcoded - ❌)
```bash
# Had to manually update multiple files:
# - supabase/config.toml (project_id)
# - .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
# - src/hooks/useAuth.tsx (session key)
# - supabase/migrations/*.sql (hardcoded URLs)
# - Various components (hardcoded URLs)
```

### After (Centralized - ✅)
```bash
# 1. Update environment variables
VITE_SUPABASE_URL=https://your-new-project.supabase.co/
VITE_SUPABASE_ANON_KEY=your-new-anon-key

# 2. Update project config
project_id = "your-new-project-id"  # in supabase/config.toml

# 3. Deploy and setup
supabase db push
supabase functions deploy
npm run setup-config
```

## 🎉 Benefits Achieved

### ✅ **Eliminated Hardcoded References**
- ❌ **Before**: Project ID `zwddcabpuqbkomwjiymv` hardcoded in 4+ files
- ✅ **After**: Dynamic project ID extraction from URL

### ✅ **Centralized Configuration**
- ❌ **Before**: Configuration scattered across multiple files
- ✅ **After**: Single source of truth in `src/config/supabase.ts`

### ✅ **Environment Flexibility**
- ❌ **Before**: Difficult to switch between dev/staging/prod
- ✅ **After**: Easy environment switching with just environment variables

### ✅ **Maintainability**
- ❌ **Before**: Changes required updating multiple files
- ✅ **After**: Changes only require updating environment variables

### ✅ **Security**
- ❌ **Before**: Hardcoded keys in database migrations
- ✅ **After**: Dynamic configuration with validation

## 🚀 Usage Examples

### Getting Configuration
```typescript
import { getSupabaseConfig, getSupabaseSessionKey } from '@/config/supabase';

// Get full configuration
const config = getSupabaseConfig();
console.log(config.url, config.anonKey, config.projectId);

// Get dynamic session key
const sessionKey = getSupabaseSessionKey();
// Returns: "sb-your-project-id-auth-token"
```

### Validating Configuration
```typescript
import { validateSupabaseConfig } from '@/config/supabase';

const validation = validateSupabaseConfig();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

### Getting Function URLs
```typescript
import { getFunctionUrl } from '@/config/supabase';

const functionUrl = getFunctionUrl('send-contact-email');
// Returns: "https://your-project.supabase.co/functions/v1/send-contact-email"
```

## 🔍 What to Check After Migration

### 1. **Environment Variables**
```bash
# Verify these are set correctly:
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

### 2. **Configuration Validation**
```bash
# Run the setup script to validate
npm run setup-config
```

### 3. **Application Startup**
```bash
# Start the app and check console for validation messages
npm run dev
```

### 4. **Database Functions**
```sql
-- Check configuration status
SELECT * FROM validate_cron_config();
```

## 🛠️ Troubleshooting

### Common Issues and Solutions

**"Supabase configuration validation failed"**
- ✅ **Solution**: Check that all environment variables are set correctly
- ✅ **Check**: URL format should be `https://project-id.supabase.co/`

**"Cron jobs not working"**
- ✅ **Solution**: Run `npm run setup-config` to configure database settings
- ✅ **Check**: Verify `SUPABASE_SERVICE_ROLE_KEY` is set

**"Session storage issues"**
- ✅ **Solution**: Clear browser storage when switching projects
- ✅ **Check**: Session keys are now dynamic based on project ID

## 📋 Migration Checklist

- [x] Created centralized configuration system
- [x] Updated all client-side components
- [x] Updated database migrations
- [x] Created deployment tools
- [x] Updated edge functions
- [x] Created comprehensive documentation
- [x] Added validation and error handling
- [x] Tested configuration system

## 🎯 Next Steps

1. **Test the new system** with your current project
2. **Verify all functionality** works as expected
3. **Update your deployment process** to use the new setup script
4. **Document any custom configuration** for your specific use case

## 💡 Best Practices Going Forward

1. **Always use the centralized config** - Never hardcode URLs or keys
2. **Validate configuration** - The system does this automatically
3. **Use environment variables** - Never commit secrets to version control
4. **Test after changes** - Verify everything works after configuration changes
5. **Keep documentation updated** - Update this guide when adding new configuration

---

**🎉 Congratulations!** Your application now has a robust, maintainable configuration system that makes it easy to switch between different Supabase projects and environments.
