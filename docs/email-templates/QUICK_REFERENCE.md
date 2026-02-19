# 📧 BUILDR Email Branding - Quick Reference Card

## 📍 File Locations

```
docs/
├── EMAIL_BRANDING.md ........................... Main Setup Guide
└── email-templates/
    ├── README.md ......................... Quick Start (READ THIS FIRST)
    ├── IMPLEMENTATION_CHECKLIST.md ..... Complete Checklist & Testing
    ├── confirm-signup.html ............. Email Template #1
    ├── magic-link.html ................. Email Template #2
    └── reset-password.html ............. Email Template #3
```

## ⚡ 5-Minute Setup

1. Open: https://app.supabase.com → Your Project → Authentication → Email Templates
2. For EACH of the 3 templates (Confirm Signup, Magic Link, Reset Password):
   - **Sender Name:** `BUILDR`
   - **Subject:** See table below
   - **Body:** Copy from corresponding `.html` file → Paste → Save

| Email Type | Subject Line | Template File |
|-----------|------|------|
| Confirm Signup | `Confirm your BUILDR account` | `confirm-signup.html` |
| Magic Link | `Your BUILDR login link` | `magic-link.html` |
| Reset Password | `Reset your BUILDR password` | `reset-password.html` |

3. Test: Sign up with test email → Check inbox ✅

## 🔑 Template Variables (Auto-Filled by Supabase)

- `{{ .ConfirmationURL }}` - Click link (uses this)
- `{{ .Email }}` - User's email (all use this)
- `{{ .Token }}` - Security token (optional)

## 🎨 What's Included

Each template has:
- ✅ BUILDR branding (blue gradient header)
- ✅ Responsive design (mobile + desktop)
- ✅ Professional styling (inline CSS)
- ✅ Security info (expiration times, warnings)
- ✅ Fallback links (if button doesn't render)
- ✅ Footer (privacy, terms, support)

## 🔐 Security Checklist

Before deploying:
- [ ] Sender name set to "BUILDR"
- [ ] No credentials in templates (✓ Already safe)
- [ ] Subject lines match emails (see table)
- [ ] All 3 email types configured
- [ ] Test emails received
- [ ] Branding looks correct
- [ ] Links clickable and working
- [ ] No sensitive data visible

## 📚 Documentation Map

| Read This | Time | Purpose |
|-----------|------|---------|
| `email-templates/README.md` | 5 min | Quick start |
| `EMAIL_BRANDING.md` | 15 min | Complete setup guide |
| `email-templates/IMPLEMENTATION_CHECKLIST.md` | 10 min | Testing checklist |

## ❌ Common Mistakes

| Problem | Solution |
|---------|----------|
| Still see Supabase branding | Verify sender name is `BUILDR` |
| Variables show as text | Check exact spelling: `{{ .VariableName }}` |
| Styling broken | Email client limitation (templates handle all major clients) |
| Button doesn't render | Fallback link works - always included |

## 🚀 Advanced Setup (Optional)

For `noreply@buildr.co` sender email:

1. Go to: **Authentication** → **Email** → **Custom SMTP**
2. Enable custom SMTP
3. Enter your email provider's settings:
   - **Host:** `smtp.your-provider.com`
   - **Port:** `587` (TLS) or `465` (SSL)
   - **Username:** Your email
   - **Password:** Provider-specific app password
   - **Sender Email:** `noreply@buildr.co`
   - **Sender Name:** `BUILDR`

⚠️ **Important:** Use environment variables for credentials, never hardcode!

## 📊 Template Overview

### confirm-signup.html (231 lines)
- Signup verification email
- 24-hour expiration
- Friendly greeting
- Used: `{{ .ConfirmationURL }}`, `{{ .Email }}`

### magic-link.html (222 lines)
- Passwordless login
- 24-hour expiration
- Security features highlighted
- Used: `{{ .ConfirmationURL }}`, `{{ .Email }}`

### reset-password.html (253 lines)
- Password recovery
- 1-hour expiration
- Red security warning
- Step-by-step instructions
- Used: `{{ .ConfirmationURL }}`, `{{ .Email }}`

## 🎯 Testing Checklist

After setup, test:
- [ ] Confirm Signup email sends with BUILDR branding
- [ ] Magic Link email sends with BUILDR branding
- [ ] Reset Password email sends with BUILDR branding
- [ ] All buttons work (click → redirects properly)
- [ ] Mobile rendering looks good
- [ ] Desktop rendering looks good
- [ ] Footer links work
- [ ] Fallback links work if button doesn't render

## 📞 Quick Troubleshooting

**Email not received?**
- Check spam folder
- Verify email address is correct
- Check Supabase email logs (Authentication → Email)

**Styling issues?**
- Normal - email clients support limited CSS
- Templates use inline CSS for compatibility
- Test in multiple clients (Gmail, Outlook, Apple Mail)

**Variable not working?**
- Check capitalization: `{{ .ConfirmationURL }}` (capital C, U)
- Verify brackets: Must be `{{ }}`
- Use exact name from variable list above

## 📖 Need More Info?

- **Full setup guide:** See `docs/EMAIL_BRANDING.md`
- **Testing details:** See `docs/email-templates/IMPLEMENTATION_CHECKLIST.md`
- **Supabase help:** https://supabase.com/docs/guides/auth/auth-email
- **Email standards:** Check troubleshooting section in EMAIL_BRANDING.md

---

**Status: ✅ Ready to Deploy**

Created: January 2026
Last Updated: January 2026
