# 🔐 Gmail App Password Setup Guide

## Why App Password?
Gmail requires **App Passwords** for SMTP access (not your regular password). This is more secure.

## Step-by-Step Setup

### 1. Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click **"2-Step Verification"**
3. Follow the prompts to enable it (you'll need your phone)

### 2. Generate App Password
1. **Still in Security settings**, scroll down to **"2-Step Verification"**
2. Click **"App passwords"** (only appears after 2FA is enabled)
3. Select app: **"Mail"**
4. Select device: **"Other (Custom name)"** → type **"PeerBond Server"**
5. Click **"Generate"**
6. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### 3. Update Environment Variable
Replace `your-app-password-here` in `server/.env` with the 16-character password:

```env
SMTP_PASS=abcd efgh ijkl mnop
```

**Important:** Use the app password exactly as shown (with or without spaces doesn't matter).

### 4. Test Email
Once updated, restart the server and test:

```bash
curl -X POST http://localhost:3001/api/auth/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test@email.com"}'
```

## 🔍 Troubleshooting

### "Invalid credentials" error:
- ✅ Make sure 2FA is enabled first
- ✅ Use the **app password**, not your regular Gmail password
- ✅ Copy the app password exactly (16 characters)

### "Less secure app" error:
- ✅ App passwords bypass this - you don't need to enable "less secure apps"

### Still not working?
- Try removing spaces from the app password
- Make sure you're using `peerbondrecovery@gmail.com` (the correct email)
- Check that SMTP settings are exactly as shown in .env

## 📧 Current Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=peerbondrecovery@gmail.com
SMTP_PASS=[your-16-char-app-password]
FROM_EMAIL=peerbondrecovery@gmail.com
```

Once this is set up, password reset emails will be sent automatically!