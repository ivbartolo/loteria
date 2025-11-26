# 🔐 Environment Variables Setup Guide

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** and fill in your actual values for each variable.

3. **Never commit the `.env` file** to Git - it's already in `.gitignore`.

---

## Security Best Practices

### ✅ DO:
- ✅ Copy `.env.example` to `.env` for local development
- ✅ Use `.env.local` for local overrides (optional)
- ✅ Add new variables to both `.env.example` and your `.env` file
- ✅ Use descriptive names for your variables
- ✅ Use strong, random values for secrets
- ✅ Document what each variable does in comments

### ❌ DON'T:
- ❌ Never commit `.env` files to version control
- ❌ Never share your `.env` file via email, Slack, etc.
- ❌ Never hardcode secrets in your source code
- ❌ Never use the same secrets across different environments
- ❌ Never log or expose environment variables in error messages

---

## Vite Environment Variables

In Vite, only environment variables prefixed with `VITE_` are exposed to the client-side code.

### Usage in Code:
```typescript
// Access environment variables
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDev = import.meta.env.VITE_APP_ENV === 'development';

// Type safety (recommended)
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: string;
  // ... other variables
}
```

---

## Environments

### Development
- File: `.env.local` or `.env`
- Used when running `npm run dev`

### Production
- File: `.env.production`
- Used when running `npm run build` in production mode
- ⚠️ Set these on your hosting provider (Vercel, Netlify, etc.)

---

## Common Variables Explained

### Application Settings
- `VITE_APP_ENV`: Current environment (development/production)
- `VITE_APP_NAME`: Your application name
- `VITE_API_BASE_URL`: Backend API endpoint

### Supabase (if using)
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Public/anonymous key (safe for client-side)
- `VITE_SUPABASE_SERVICE_ROLE_KEY`: Private key (server-side only!)

### Security Notes
⚠️ **Never expose service role keys or secrets to the client!**

---

## Adding New Variables

1. Add the variable to `.env.example` with a placeholder:
   ```env
   VITE_MY_NEW_VAR=your_value_here
   ```

2. Add it to your local `.env` file with the actual value

3. Update this documentation if needed

4. Deploy the new variable to your hosting provider

---

## Troubleshooting

### Variable not working?
- ✅ Check that it's prefixed with `VITE_`
- ✅ Restart the dev server after adding new variables
- ✅ Clear browser cache
- ✅ Check for typos in variable names

### Production issues?
- ✅ Verify variables are set in your hosting provider
- ✅ Check that variable names match exactly
- ✅ Ensure no typos in production environment config

---

## Need Help?

- Check [Vite Environment Variables Docs](https://vite.dev/guide/env-and-mode.html)
- Review your hosting provider's environment variable documentation

**Remember: Security starts with proper credential management! 🔒**
