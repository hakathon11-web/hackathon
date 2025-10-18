# First-Time Deployment Guide

## 🎯 Overview

This guide covers deploying your application to a **new Supabase database** for the first time. We'll use a **squashed migration** approach for optimal performance and cleanliness.

## 🚀 Why Squash Migrations for First-Time Deployment?

### ✅ **Benefits:**
- **Faster deployment** - Single migration instead of 49 individual ones
- **Cleaner database** - No intermediate states or temporary tables
- **Better performance** - No unnecessary rollback/forward operations
- **Easier debugging** - Clear initial state
- **Simpler rollback** - Single point to revert to

### ⚠️ **When to Use:**
- ✅ **New database** (no existing data)
- ✅ **First-time deployment**
- ✅ **Clean slate setup**
- ❌ **Existing production database** (would lose data)
- ❌ **Database with existing data** (migration history matters)

## 🛠️ Deployment Options

### **Option 1: Supabase CLI (Recommended)** ⭐

```bash
# 1. Create fresh squashed migration
./scripts/create-fresh-squash.sh

# 2. Deploy to new database
supabase db push

# 3. Setup configuration
npm run setup-config

# 4. Deploy edge functions
supabase functions deploy
```

### **Option 2: Manual Combination**

```bash
# 1. Combine all migrations
./scripts/combine-migrations.sh

# 2. Deploy to new database
supabase db push

# 3. Setup configuration
npm run setup-config

# 4. Deploy edge functions
supabase functions deploy
```

### **Option 3: Individual Migrations (Not Recommended)**

```bash
# This will run all 49 migrations sequentially (slow)
supabase db push
npm run setup-config
supabase functions deploy
```

## 📋 Step-by-Step Deployment

### **Step 1: Prepare Environment**

```bash
# 1. Set up your environment variables
cp .env.example .env
# Edit .env with your new Supabase project details:
# VITE_SUPABASE_URL=https://your-new-project.supabase.co/
# VITE_SUPABASE_ANON_KEY=your-new-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 2. Update Supabase config
# Edit supabase/config.toml:
# project_id = "your-new-project-id"
```

### **Step 2: Create Squashed Migration**

```bash
# Option A: Using Supabase CLI (Recommended)
./scripts/create-fresh-squash.sh

# Option B: Manual combination
./scripts/combine-migrations.sh
```

### **Step 3: Deploy Database Schema**

```bash
# Deploy the squashed migration
supabase db push

# Verify deployment
supabase db diff
```

### **Step 4: Configure Database Settings**

```bash
# Setup dynamic configuration for cron jobs
npm run setup-config

# Verify configuration
supabase db reset --linked  # Only if you want to test
```

### **Step 5: Deploy Edge Functions**

```bash
# Deploy all edge functions
supabase functions deploy

# Verify functions are deployed
supabase functions list
```

### **Step 6: Test Deployment**

```bash
# Start your application
npm run dev

# Check console for configuration validation messages
# Verify all features work correctly
```

## 🔧 Configuration Files

### **Environment Variables (.env)**
```bash
VITE_SUPABASE_URL=https://your-new-project.supabase.co/
VITE_SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### **Supabase Config (supabase/config.toml)**
```toml
project_id = "your-new-project-id"

[functions.get-google-maps-api-key]
verify_jwt = false

[functions.get-mapbox-token]
verify_jwt = false

[functions.send-contact-email]
verify_jwt = false
```

## 📊 Migration Comparison

### **Before (Individual Migrations)**
```
20250101000001_create_storage_buckets.sql
20250101000002_update_storage_buckets.sql
20250101000003_create_admin_user.sql
... (46 more files)
20250909062800_fix_admin_trigger_security.sql
```
**Total: 49 migrations, ~5-10 minutes deployment time**

### **After (Squashed Migration)**
```
00000000000000_squashed.sql
```
**Total: 1 migration, ~1-2 minutes deployment time**

## 🎉 Benefits Achieved

### **Performance Improvements**
- **Deployment time**: 5-10 minutes → 1-2 minutes
- **Database operations**: 49 separate transactions → 1 transaction
- **Rollback complexity**: 49 steps → 1 step

### **Maintenance Benefits**
- **Cleaner history**: Single migration vs 49 migrations
- **Easier debugging**: Clear initial state
- **Simpler documentation**: One migration to understand

### **Development Benefits**
- **Faster testing**: Quick database resets
- **Easier onboarding**: New developers see final state immediately
- **Better CI/CD**: Faster deployment pipelines

## 🔍 Verification Checklist

After deployment, verify these components work:

### **Database Schema**
- [ ] All tables created correctly
- [ ] All functions and triggers working
- [ ] RLS policies active
- [ ] Cron jobs configured

### **Edge Functions**
- [ ] All functions deployed successfully
- [ ] Functions responding to requests
- [ ] Authentication working
- [ ] CORS configured correctly

### **Application Features**
- [ ] User registration/login
- [ ] Venue management
- [ ] Booking system
- [ ] Payment processing
- [ ] Email notifications

### **Configuration**
- [ ] Environment variables loaded
- [ ] Dynamic URLs working
- [ ] Session storage functional
- [ ] No hardcoded references

## 🛠️ Troubleshooting

### **Common Issues**

**"Migration failed"**
- Check that your Supabase project is properly linked
- Verify your service role key has sufficient permissions
- Ensure no conflicting data exists

**"Configuration validation failed"**
- Verify all environment variables are set correctly
- Check that URLs are properly formatted
- Run `npm run setup-config` again

**"Functions not working"**
- Verify functions are deployed: `supabase functions list`
- Check function logs: `supabase functions logs`
- Ensure environment variables are set in Supabase dashboard

**"Cron jobs not running"**
- Run `npm run setup-config` to configure database settings
- Check cron job status in Supabase dashboard
- Verify service role key permissions

## 🎯 Best Practices

### **Before Deployment**
1. **Test locally** with `supabase start`
2. **Verify configuration** with validation scripts
3. **Backup existing data** (if migrating from another system)
4. **Document any custom changes**

### **During Deployment**
1. **Monitor deployment logs** for errors
2. **Test each component** after deployment
3. **Verify configuration** is working
4. **Check all integrations** (maps, payments, email)

### **After Deployment**
1. **Run full test suite** on production
2. **Monitor application logs** for issues
3. **Verify cron jobs** are running
4. **Test user workflows** end-to-end

## 🔄 Future Migrations

After your first deployment, you can continue with individual migrations:

```bash
# Create new migration
supabase migration new "your_new_feature"

# Apply to database
supabase db push

# Deploy functions if needed
supabase functions deploy
```

The squashed migration approach is only for **first-time deployment**. After that, use individual migrations for ongoing development.

---

**🎉 Congratulations!** You now have a clean, optimized database deployment that's ready for production use!
