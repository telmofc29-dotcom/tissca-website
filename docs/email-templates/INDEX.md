# 📧 Email Branding Documentation Index

## Start Here 👈

**First time?** Start with this order:

1. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** (5 min read)
   - File locations
   - 5-minute setup checklist
   - Template variables
   - Quick troubleshooting

2. **[README.md](./README.md)** (10 min read)
   - Quick start guide
   - Template mapping table
   - Common issues and solutions

3. **[../EMAIL_BRANDING.md](../EMAIL_BRANDING.md)** (15 min read)
   - Complete setup guide
   - Detailed Supabase instructions
   - Optional SMTP setup
   - Security considerations

4. **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** (10 min read)
   - Testing checklist (12 items)
   - Feature verification
   - Customization guide

## Files in This Directory

### Documentation

| File | Purpose | Read Time |
|------|---------|-----------|
| **README.md** | Quick start guide with 5-minute setup | 5 min |
| **QUICK_REFERENCE.md** | Card-style reference for common tasks | 3 min |
| **IMPLEMENTATION_CHECKLIST.md** | Complete implementation verification | 10 min |

### Email Templates

| File | Use For | Variables |
|------|---------|-----------|
| **confirm-signup.html** | Signup verification email | `{{ .ConfirmationURL }}`, `{{ .Email }}` |
| **magic-link.html** | Passwordless login email | `{{ .ConfirmationURL }}`, `{{ .Email }}` |
| **reset-password.html** | Password recovery email | `{{ .ConfirmationURL }}`, `{{ .Email }}` |

## How to Use

### Quick Setup (5 minutes)
1. Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. Copy 3 template files into Supabase
3. Test with signup

### Full Setup (20 minutes)
1. Read [README.md](./README.md)
2. Read [../EMAIL_BRANDING.md](../EMAIL_BRANDING.md)
3. Configure in Supabase dashboard
4. Use [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) to test

### Troubleshooting
1. Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) "Common Mistakes" section
2. See [README.md](./README.md) "Common Issues"
3. Review [../EMAIL_BRANDING.md](../EMAIL_BRANDING.md) troubleshooting section

## What's Included

✅ **3 Professional Email Templates**
- BUILDR branding (gradient header)
- Responsive design (mobile + desktop)
- Professional styling (inline CSS)
- Supabase variable integration
- Security features (expiration notices, disclaimers)
- Fallback links (for non-HTML clients)

✅ **Comprehensive Documentation**
- Quick start guides
- Step-by-step setup instructions
- Variable reference
- Testing checklist
- Troubleshooting guide
- Optional SMTP setup

✅ **Production Ready**
- No hardcoded secrets
- Best practices implemented
- Email client compatibility tested
- Fully functional

## Template Details

### confirm-signup.html
- **Purpose:** Email verification during signup
- **Tone:** Welcoming and encouraging
- **Expiration:** 24 hours
- **Key Features:**
  - Clear welcome message
  - Prominent confirmation button
  - Security notice about expiration
  - Professional footer

### magic-link.html
- **Purpose:** Passwordless login authentication
- **Tone:** Secure and convenient
- **Expiration:** 24 hours
- **Key Features:**
  - Highlights passwordless security
  - One-click login button
  - Reassurance about expiration
  - Professional footer

### reset-password.html
- **Purpose:** Password recovery
- **Tone:** Helpful and secure
- **Expiration:** 1 hour (shorter for security)
- **Key Features:**
  - Red security warning
  - Step-by-step instructions
  - Explicit "didn't request?" disclaimer
  - Professional footer with security tips

## Setup Summary

1. **Sender Name:** Set to `BUILDR` in Supabase
2. **Subject Lines:** Match templates to email types
3. **Email Bodies:** Copy HTML from template files
4. **Test:** Sign up and verify emails look correct

## Key Variables

All templates use these Supabase variables:

```
{{ .ConfirmationURL }}    ← User clicks this link
{{ .Email }}              ← User's email address (shown in footer)
```

**Important:** Don't modify variable syntax - Supabase template engine requires exact format: `{{ .VarName }}`

## Security Notes

✅ **No sensitive data in templates**
- No API keys
- No passwords
- No database credentials
- No SMTP credentials

✅ **Safe to commit to version control**
- Templates are public
- No secrets embedded
- Configuration happens in Supabase UI

✅ **Production ready**
- Follows email best practices
- Compliant with email standards
- Compatible with all major email clients

## Customization

Safe to modify:
- Brand colors (change `#3b82f6` to your color)
- Footer links (update URLs)
- Company name/tagline
- Support contact information

Do NOT modify:
- Variable syntax `{{ .VariableName }}`
- HTML structure around variables
- Email template type assignments

## Support

- **Supabase Docs:** https://supabase.com/docs/guides/auth/auth-email
- **Email Standards:** See troubleshooting sections in documentation
- **Questions?** Check the troubleshooting sections in the documentation files

## Version Info

- **Created:** January 2026
- **Status:** ✅ Production Ready
- **Compatibility:** All Supabase projects with email templates
- **Email Clients:** Gmail, Outlook, Apple Mail, and standard email clients

---

**Ready to get started?** → Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) (5 minutes)
