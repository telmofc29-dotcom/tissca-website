# Email Branding Quick Start

## 5-Minute Setup

### 1. Go to Supabase Dashboard
- Navigate to: **Authentication** → **Email Templates**

### 2. Update Each Template (3 steps)

| Email Type | Sender Name | Subject Line | Template File |
|------------|------------|--------------|---------------|
| Confirm Signup | TISSCA | Confirm your TISSCA account | `confirm-signup.html` |
| Magic Link | TISSCA | Your TISSCA login link | `magic-link.html` |
| Reset Password | TISSCA | Reset your TISSCA password | `reset-password.html` |

### 3. For Each Template
1. **Sender Name:** Set to `TISSCA`
2. **Subject Line:** Copy from table above
3. **Body (HTML):** 
   - Open the corresponding `.html` file in this directory
   - Copy all content
   - Paste into Supabase email template editor
   - Click **Save**

### 4. Test It
- Sign up for an account
- Check email - should show TISSCA branding ✅

## Template Variables

These are automatically filled by Supabase:

- `{{ .ConfirmationURL }}` - Full link (most emails)
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Security token (if needed)

## Common Issues

**Emails still look like Supabase?**
→ Verify sender name is set to `TISSCA` in Supabase

**Variables showing as text?**
→ Variable name is incorrect. Check spelling and brackets `{{ }}`

**Styling looks broken?**
→ Email client doesn't support all CSS. Inline styles in templates handle most clients.

## Optional: Custom Domain

To send from `noreply@tissca.com`:

1. Go to **Authentication** → **Email**
2. Enable **Custom SMTP**
3. Configure your email provider's SMTP settings
4. Set Sender Email: `noreply@tissca.com`

(See EMAIL_BRANDING.md for detailed instructions)

---

📚 **Full Guide:** See [EMAIL_BRANDING.md](./EMAIL_BRANDING.md)
