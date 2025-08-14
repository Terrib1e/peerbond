# 📧 Email Setup Guide

The email service now supports both SendGrid and SMTP (Gmail). Choose one option below:

## Option 1: Gmail SMTP (Free & Easy) ⭐ Recommended

### 1. Enable Gmail App Passwords
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Go to **App passwords** → **Select app** → **Mail** → **Generate**
4. Copy the 16-character app password (e.g., `abcd efgh ijkl mnop`)

### 2. Add Environment Variables
Add these to `server/.env`:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-character-app-password

# Email Settings
FROM_EMAIL=your-gmail@gmail.com
FROM_NAME=PeerBond Support
FRONTEND_URL=http://localhost:5174
```

### 3. Test Email Service
```bash
curl -X POST http://localhost:3001/api/auth/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test@email.com"}'
```

---

## Option 2: SendGrid (After Free Tier)

### 1. Get SendGrid API Key
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create API key with "Mail Send" permissions
3. Verify sender domain/email

### 2. Add Environment Variables
```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=PeerBond Support
FRONTEND_URL=http://localhost:5174
```

---

## Option 3: Other SMTP Providers

### Outlook/Hotmail SMTP
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo SMTP
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

---

## 🧪 Testing

1. **Start the server** - Email service will auto-detect configuration
2. **Test password reset** - Try forgot password flow
3. **Check logs** - Server will show which provider is being used

## 🔍 Troubleshooting

### Gmail "Less secure app access" Error
- **Solution**: Use App Passwords instead of your regular password
- Enable 2FA first, then generate an app password

### "Authentication failed" Error
- **Check**: SMTP credentials are correct
- **Try**: Different SMTP port (587, 465, or 25)
- **Verify**: App password is exactly 16 characters

### Emails going to spam
- **Add**: SPF record: `v=spf1 include:_spf.google.com ~all`
- **Consider**: Using a custom domain instead of Gmail
- **Test**: Send to different email providers

### Rate Limiting
- **Gmail**: ~500 emails/day for free accounts
- **SendGrid**: 100 emails/day on free tier
- **Solution**: Upgrade plan or use multiple providers

## 🚀 Production Recommendations

1. **Use custom domain** instead of Gmail
2. **Set up DKIM/SPF** records for better deliverability
3. **Monitor email metrics** (delivery, opens, clicks)
4. **Implement rate limiting** for password reset requests
5. **Add unsubscribe links** for non-transactional emails

## 📝 Current Implementation

The email service automatically:
- ✅ Tries SendGrid first, falls back to SMTP
- ✅ Logs tokens to console if no email service configured
- ✅ Sends beautiful HTML emails with fallback text
- ✅ Handles errors gracefully with fallback logging
- ✅ Supports both password reset and welcome emails

Your password reset system works even without email configured!