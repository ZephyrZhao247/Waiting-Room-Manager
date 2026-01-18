# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies (1 minute)

```bash
npm install
```

### 2. Start Dev Server (30 seconds)

```bash
npm run dev
```

Server runs at: `http://localhost:3000`

### 3. Set Up ngrok (1 minute)

```bash
# Install ngrok (if needed)
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Copy your HTTPS URL (e.g., https://abc123.ngrok-free.app)
```

### 4. Create Zoom App (2 minutes)

1. Go to https://marketplace.zoom.us/
2. Click **Develop** → **Build App** → **General App**
3. Fill in app name and details
4. In **Zoom App SDK** section:
    - Enable Zoom Apps SDK
    - Home URL: Your ngrok URL
    - Add Domain: Your ngrok domain (without https://)
5. Click **Save**

### 5. Install & Test (30 seconds)

1. Click **Add** to install the app
2. Start a Zoom meeting as host
3. Click **Apps** → Find your app
4. Upload a CSV and try it out!

## 📝 Sample CSV Templates

### Row-Based Format

```csv
round_id,email
1,alice@example.com
1,bob@example.com
2,alice@example.com
```

### Column-Based Format

```csv
email,round_1,round_2
alice@example.com,1,0
bob@example.com,1,1
```

## ✅ Checklist

- [ ] Dependencies installed
- [ ] Dev server running
- [ ] ngrok tunnel active
- [ ] Zoom App created and configured
- [ ] App installed to your account
- [ ] Test meeting started
- [ ] CSV uploaded successfully
- [ ] Round started and ended successfully

## 🆘 Troubleshooting

**App won't load in Zoom?**

- Check ngrok is running and URL matches Zoom App settings
- Ensure you're accessing the app from within a meeting

**Can't move participants?**

- Verify you're the meeting host or co-host
- Check that waiting room is enabled in meeting settings

**CSV not parsing?**

- Verify CSV format matches one of the supported formats
- Check for proper email formatting
- Look for parse errors in the Upload panel

## 📖 Need More Help?

See the full [README.md](README.md) for:

- Complete setup instructions
- Detailed operator guide
- Edge case handling
- Production deployment
- FAQ
