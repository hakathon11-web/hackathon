# Admin Setup Scripts

This directory contains scripts to help you create admin accounts on a fresh database deployment.

## Available Scripts

### 1. `create-admin.sql` - SQL Script
**Usage**: Run directly in Supabase SQL Editor or via psql

```sql
-- Edit the script to replace 'your-admin@example.com' with the actual email
-- Then run in Supabase SQL Editor
```

### 2. `create-admin.js` - Node.js Script
**Usage**: Run from the project root directory

```bash
# Make sure you have the required environment variables in .env.local
node scripts/create-admin.js admin@yourcompany.com
```

## Prerequisites

### For SQL Script:
- Access to Supabase SQL Editor or direct database access
- The user must have already signed up through your application

### For Node.js Script:
- Node.js installed
- Environment variables in `.env.local`:
  - `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- The user must have already signed up through your application

## Step-by-Step Process

### Option A: Using SQL Script (Recommended)

1. **Have the user sign up** through your application first
2. **Open Supabase SQL Editor**
3. **Edit the script** to replace `'your-admin@example.com'` with the actual admin email
4. **Run the script**
5. **Verify** the admin was created successfully

### Option B: Using Node.js Script

1. **Have the user sign up** through your application first
2. **Ensure environment variables** are set in `.env.local`
3. **Run the script**:
   ```bash
   node scripts/create-admin.js admin@yourcompany.com
   ```
4. **Follow the instructions** provided by the script

## Important Notes

- ⚠️ **The user must sign up first** through your application before running these scripts
- 🔐 **Admin privileges are not automatically granted** - you must use these scripts
- 📝 **All admin actions are logged** for security monitoring
- 🚫 **Do not create admin accounts through the frontend** - use these secure methods instead

## Troubleshooting

### "User not found in auth.users"
**Solution**: The user must sign up through your application first. Have them create an account, then run the script again.

### "Missing environment variables"
**Solution**: Ensure your `.env.local` file contains:
```
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### "Permission denied"
**Solution**: Make sure you're using the service role key, not the anon key.

## Security Best Practices

- ✅ Use strong, unique passwords for admin accounts
- ✅ Keep admin accounts to a minimum (1-3 accounts)
- ✅ Regularly audit admin accounts
- ✅ Monitor admin actions through audit logs
- ❌ Don't share admin credentials
- ❌ Don't create admin accounts for testing

## Next Steps

After creating your first admin:

1. **Test admin access** - Have the user log out and log back in
2. **Verify functionality** - Test admin features in your application
3. **Create additional admins** - Use the AdminManagement component
4. **Set up monitoring** - Monitor admin actions through audit logs
