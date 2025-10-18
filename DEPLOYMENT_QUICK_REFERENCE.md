# 🚀 Deployment Quick Reference

## First-Time Deployment (New Database)

### **Quick Commands**
```bash
# 1. Create squashed migration
npm run create-squash

# 2. Deploy database
supabase db push

# 3. Setup configuration
npm run setup-config

# 4. Deploy functions
supabase functions deploy

# 5. Start application
npm run dev
```

### **Prerequisites**
- ✅ Environment variables set in `.env`
- ✅ Supabase project linked (`supabase link`)
- ✅ Supabase CLI installed

### **Environment Variables Required**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co/
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### **Files to Update**
- `.env` - Environment variables
- `supabase/config.toml` - Project ID

---

## Regular Deployment (Existing Database)

### **Quick Commands**
```bash
# 1. Deploy new migrations
supabase db push

# 2. Deploy functions (if changed)
supabase functions deploy

# 3. Start application
npm run dev
```

---

## Troubleshooting

### **Configuration Issues**
```bash
# Validate configuration
npm run setup-config

# Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

### **Database Issues**
```bash
# Check migration status
supabase db diff

# Reset local database (development only)
supabase db reset
```

### **Function Issues**
```bash
# List deployed functions
supabase functions list

# View function logs
supabase functions logs function-name
```

---

## 📚 Full Documentation
- **Configuration**: `docs/CONFIGURATION.md`
- **First-Time Deployment**: `docs/FIRST_TIME_DEPLOYMENT.md`
- **Migration Guide**: `MIGRATION_GUIDE.md`
