# Configuration Management

This document explains how the application's configuration is managed and how to switch between different Supabase projects.

## 🎯 Overview

The application now uses a **centralized configuration system** that eliminates hardcoded references and makes it easy to switch between different Supabase projects or environments.

## 📁 Configuration Files

### 1. Environment Variables (`.env`)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co/
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Supabase Config (`supabase/config.toml`)
```toml
project_id = "your-project-id"
```

### 3. Centralized Config (`src/config/supabase.ts`)
This is the **single source of truth** for all Supabase configuration.

## 🔧 How It Works

### Client-Side Configuration
- The `src/config/supabase.ts` module provides functions to get configuration
- All components and utilities use this centralized config instead of hardcoded values
- Configuration is validated at runtime

### Server-Side Configuration (Edge Functions)
- Edge functions use `Deno.env.get()` to access environment variables
- No hardcoded URLs or keys in the function code

### Database Configuration
- Database functions use dynamic configuration via `current_setting()`
- Cron jobs construct URLs dynamically based on the current project
- Configuration can be set using the setup script

## 🚀 Switching to a Different Supabase Project

### Step 1: Update Environment Variables
```bash
# In your .env file
VITE_SUPABASE_URL=https://your-new-project.supabase.co/
VITE_SUPABASE_ANON_KEY=your-new-anon-key
```

### Step 2: Update Supabase Config
```toml
# In supabase/config.toml
project_id = "your-new-project-id"
```

### Step 3: Deploy Database Schema
```bash
supabase db push
```

### Step 4: Deploy Edge Functions
```bash
supabase functions deploy
```

### Step 5: Setup Database Configuration
```bash
# Set SUPABASE_SERVICE_ROLE_KEY in your .env file first
npm run setup-config
```

### Step 6: Verify Configuration
```bash
# Check that everything is working
npm run dev
```

## 🛠️ Available Scripts

### Setup Project Configuration
```bash
npm run setup-config
```
This script sets up the dynamic database configuration needed for cron jobs.

### Validate Configuration
You can validate the configuration by checking the console output when starting the app, or by calling the validation functions in the database.

## 📋 Configuration Validation

The system automatically validates configuration and provides helpful error messages:

- ✅ **Valid**: All required configuration is present and properly formatted
- ❌ **Invalid**: Missing or malformed configuration with specific error details

## 🔒 Security Features

### Client-Side Security
- Configuration is validated at runtime
- Sensitive information is sanitized in logs
- Session storage uses dynamic keys based on project ID

### Server-Side Security
- Environment variables are used consistently
- No hardcoded secrets in code
- Database configuration is set securely

## 🏗️ Architecture Benefits

### Before (Problems)
- Hardcoded project IDs in multiple files
- Hardcoded URLs in database migrations
- Difficult to switch between environments
- Maintenance nightmare

### After (Solutions)
- Single source of truth for configuration
- Dynamic URL construction
- Easy environment switching
- Maintainable and scalable

## 📝 Migration from Hardcoded References

If you're migrating from a version with hardcoded references, the system will:

1. **Automatically detect** missing configuration
2. **Provide clear error messages** about what needs to be configured
3. **Guide you** through the setup process

## 🔍 Troubleshooting

### Common Issues

**"Supabase configuration validation failed"**
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Verify the URL format is correct (https://project-id.supabase.co/)

**"Cron jobs not working"**
- Run `npm run setup-config` to configure database settings
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in your environment

**"Session storage issues"**
- The system now uses dynamic session keys based on project ID
- Clear browser storage if switching projects

### Debug Information

The system provides detailed debug information in development mode:
- Configuration validation results
- Session information
- Environment variable availability

## 🎉 Best Practices

1. **Always use the centralized config** - Don't hardcode URLs or keys
2. **Validate configuration** - The system does this automatically
3. **Use environment variables** - Never commit secrets to version control
4. **Test configuration** - Verify everything works after changes
5. **Document changes** - Update this file when adding new configuration

## 🔄 Environment-Specific Configuration

### Development
```bash
VITE_SUPABASE_URL=https://your-dev-project.supabase.co/
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
```

### Production
```bash
VITE_SUPABASE_URL=https://your-prod-project.supabase.co/
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
```

### Staging
```bash
VITE_SUPABASE_URL=https://your-staging-project.supabase.co/
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
```

Each environment can have its own Supabase project with different data and settings.
