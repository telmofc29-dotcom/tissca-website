# BUILDR Email Branding Guide

This guide explains how to brand Supabase Authentication emails with BUILDR branding instead of generic Supabase templates.

## Overview

Supabase sends three types of authentication emails:
1. **Confirm Signup** - Email verification during registration
2. **Magic Link** - Passwordless login authentication
3. **Reset Password** - Password recovery

By default, these emails come from Supabase with generic branding. This guide shows how to customize them with BUILDR branding.

## Setup Steps

### Step 1: Access Supabase Email Templates

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your BUILDR project
3. Go to **Authentication** → **Email Templates** in the left sidebar

### Step 2: Update Sender Information

For each email template, you need to update:

**Sender Name:**
```
BUILDR
```

**Sender Email:**
- Default: `noreply@{your-supabase-project}.supabase.co`
- Keep this unless you've set up custom SMTP (see Optional SMTP Setup below)

### Step 3: Update Email Templates

In the Supabase Email Templates panel, you'll see three templates to customize:

#### Template 1: Confirm Signup Email
- **Subject Line:** `Confirm your BUILDR account`
- **Body:** Copy the HTML from `confirm-signup.html` in this directory
- **Variables Available:** 
  - `{{ .ConfirmationURL }}` - Direct confirmation link
  - `{{ .Email }}` - User's email address

#### Template 2: Magic Link Email
- **Subject Line:** `Your BUILDR login link`
- **Body:** Copy the HTML from `magic-link.html` in this directory
- **Variables Available:**
  - `{{ .ConfirmationURL }}` - Magic link for login
  - `{{ .Email }}` - User's email address

#### Template 3: Reset Password Email
- **Subject Line:** `Reset your BUILDR password`
- **Body:** Copy the HTML from `reset-password.html` in this directory
- **Variables Available:**
  - `{{ .ConfirmationURL }}` - Password reset link
  - `{{ .Email }}` - User's email address
  - `{{ .Token }}` - Reset token (included in URL)

### Step 4: Copy Template HTML

Each template file in this directory contains ready-to-use HTML. Simply:

1. Open the corresponding `.html` file (e.g., `confirm-signup.html`)
2. Copy all the HTML content
3. Paste it into the Supabase Email Templates editor
4. Click **Save** for each template

### Step 5: Test Emails

To test the customized emails:

1. Go to your BUILDR application
2. **Test Confirm Signup:**
   - Sign up with a test email address
   - You should receive a verification email with BUILDR branding
   
3. **Test Magic Link:**
   - Use the Magic Link login feature with a test email
   - You should receive a login link email with BUILDR branding
   
4. **Test Reset Password:**
   - Click "Forgot Password" on the login page
   - You should receive a reset email with BUILDR branding

## Email Template Features

All three templates include:

- ✅ **BUILDR Header** - Professional branding with BUILDR logo styling
- ✅ **Responsive Design** - Works on mobile and desktop
- ✅ **Professional Styling** - Modern, clean appearance
- ✅ **Supabase Variables** - Dynamic content injection
- ✅ **Fallback Links** - Plain text link as backup
- ✅ **Clear CTAs** - Prominent call-to-action buttons
- ✅ **Footer** - Legal disclaimer and unsubscribe options
- ✅ **Color Scheme** - Consistent with BUILDR brand (Blue: #3B82F6)

## Optional: Custom SMTP Setup

For a fully branded experience, you can send emails from a custom domain using SMTP:

### Why Use Custom SMTP?

- Send from `noreply@buildr.co` instead of `noreply@{project}.supabase.co`
- Full control over email delivery
- Better email deliverability
- Professional sender identity

### How to Set Up Custom SMTP

1. In **Supabase Dashboard**, go to **Authentication** → **Email**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Fill in your email provider's SMTP details:
   - **Host:** `smtp.your-email-provider.com`
   - **Port:** `587` (TLS) or `465` (SSL)
   - **Username:** Your email account
   - **Password:** Your email account password or app-specific password
   - **Sender Email:** `noreply@buildr.co` (or your domain)
   - **Sender Name:** `BUILDR`

### Email Providers to Use

Popular SMTP providers with good documentation:
- **SendGrid** - `smtp.sendgrid.net` (Port 587)
- **AWS SES** - `email-smtp.{region}.amazonaws.com` (Port 587)
- **Mailgun** - `smtp.mailgun.org` (Port 587)
- **Postmark** - `smtp.postmarkapp.com` (Port 587)
- **Your Own Email Server** - Configure your mail server

### Security Considerations

⚠️ **Important:**
- Never commit SMTP credentials to version control
- Use environment variables or Supabase secrets for credentials
- Enable TLS/SSL for secure transmission
- Use app-specific passwords when available (Gmail, Office 365)
- Rotate credentials regularly

## Troubleshooting

### Emails still show Supabase branding
- Ensure you've copied the entire HTML from the template files
- Check that the **Sender Name** is set to `BUILDR`
- Refresh your browser and clear browser cache
- Test with a fresh email address

### Variables not rendering (showing `{{ .ConfirmationURL }}`)
- This means Supabase didn't properly substitute the variables
- Double-check the variable syntax in the template
- Ensure you're using correct template file for that email type
- Contact Supabase support if issue persists

### Emails going to spam
- If using custom SMTP, set up SPF/DKIM/DMARC records for your domain
- Test with different email addresses (Gmail, Outlook, etc.)
- Monitor Supabase email logs for bounce/rejection information
- Ensure your sender domain has proper email reputation

### Styling issues (broken layout, missing images)
- Most email clients don't support external images - templates use inline CSS
- Test in multiple email clients (Gmail, Outlook, Apple Mail, etc.)
- Inline CSS is preferred over stylesheets for email

## File Reference

This directory contains:

- **EMAIL_BRANDING.md** - This setup guide
- **confirm-signup.html** - Signup confirmation email template
- **magic-link.html** - Magic link login email template
- **reset-password.html** - Password reset email template

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial BUILDR email templates and documentation |

## Support

For issues with:
- **Supabase configuration:** See [Supabase Auth Email Documentation](https://supabase.com/docs/guides/auth/auth-email)
- **Email templates:** Check the `.html` files in this directory
- **BUILDR setup:** See main project documentation

---

Last updated: January 2026
