# Admin Setup Guide for Fresh Database Deployment

This guide explains how to create admin accounts on a fresh database deployment after implementing the secure admin creation system.

## 🚨 Important Security Note

With the new security improvements, admin accounts are **NOT automatically created**. You must use one of the methods below to manually create admin accounts.

## Method 1: Using Database Migration (Recommended for Production)

### Step 1: Create a New Migration
```bash
cd /home/ec2-user/projects/dajavshne
npx supabase migration new create_initial_admin
```

### Step 2: Add Admin Creation SQL
Edit the new migration file and add:

```sql
-- Create initial admin user
-- Replace 'your-admin@example.com' with the actual admin email

-- First, ensure the user exists in auth.users (they need to sign up first)
-- Then create/update their profile with admin role
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Admin User'),
  'admin',
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'your-admin@example.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'admin',
  updated_at = NOW();

-- Verify the admin was created
SELECT 
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'your-admin@example.com';
```

### Step 3: Apply the Migration
```bash
npx supabase db push
```

## Method 2: Using Supabase Dashboard (Quick Setup)

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**

### Step 2: Run Admin Creation Query
```sql
-- Replace 'your-admin@example.com' with the actual admin email
-- The user must have already signed up through your app first

UPDATE profiles 
SET 
  role = 'admin',
  updated_at = NOW()
WHERE email = 'your-admin@example.com';

-- Verify the update
SELECT 
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'your-admin@example.com';
```

## Method 3: Using the make_user_admin Function (If Available)

If the `make_user_admin` function is still available in your database:

```sql
-- Call the function with the admin email
SELECT make_user_admin('your-admin@example.com');
```

## Method 4: Direct Database Access (Advanced)

If you have direct database access:

```sql
-- Connect to your PostgreSQL database directly
-- Update the profile role to admin
UPDATE public.profiles 
SET 
  role = 'admin',
  updated_at = NOW()
WHERE email = 'your-admin@example.com';

-- Verify the change
SELECT * FROM public.profiles WHERE email = 'your-admin@example.com';
```

## Step-by-Step Process for Fresh Deployment

### 1. Deploy Your Application
```bash
# Deploy your application with the new security features
npm run build
# Deploy to your hosting platform
```

### 2. Create the First User Account
- Have the intended admin user sign up through your application
- They will get a regular user account (customer role)

### 3. Grant Admin Privileges
Use one of the methods above to change their role to 'admin'

### 4. Verify Admin Access
- Have the user log out and log back in
- They should now have access to admin functionality
- Test the admin features to ensure everything works

## Security Best Practices

### ✅ Do:
- Use strong, unique passwords for admin accounts
- Enable two-factor authentication if available
- Regularly audit admin accounts
- Use the AdminManagement component to manage additional admins
- Keep admin accounts to a minimum (1-3 accounts)

### ❌ Don't:
- Create admin accounts through the frontend (security risk)
- Share admin credentials
- Leave admin accounts with default passwords
- Create admin accounts for testing (use regular accounts instead)

## Troubleshooting

### Issue: User can't access admin features after role change
**Solution:** Have the user log out and log back in to refresh their session.

### Issue: "No admin profile found" error
**Solution:** Ensure the user has signed up first, then use one of the methods above to grant admin privileges.

### Issue: Migration fails
**Solution:** Check that the user email exists in `auth.users` table first.

## Verification Commands

### Check if user exists in auth.users:
```sql
SELECT id, email, created_at FROM auth.users WHERE email = 'your-admin@example.com';
```

### Check if user has admin profile:
```sql
SELECT id, email, role, created_at FROM profiles WHERE email = 'your-admin@example.com';
```

### List all admin users:
```sql
SELECT id, email, full_name, created_at FROM profiles WHERE role = 'admin';
```

## Example: Complete Setup Script

Here's a complete example for setting up an admin:

```sql
-- 1. Check if user exists
SELECT id, email FROM auth.users WHERE email = 'admin@yourcompany.com';

-- 2. Create/update admin profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Admin User'),
  'admin',
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'admin@yourcompany.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'admin',
  updated_at = NOW();

-- 3. Verify admin was created
SELECT 
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'admin@yourcompany.com';
```

## Next Steps

After creating your first admin:

1. **Test Admin Access**: Log in and verify admin features work
2. **Create Additional Admins**: Use the AdminManagement component in your app
3. **Set Up Monitoring**: Monitor admin actions through audit logs
4. **Document Procedures**: Document your admin management procedures for your team

---

**Remember**: With the new security system, admin privileges must be explicitly granted and cannot be automatically created through the application interface.
