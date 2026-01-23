# Zoom Waiting Room Manager

A production-ready Zoom App for automating per-round participant exclusions in multi-round meetings. Automatically moves conflicted attendees to the Waiting Room during restricted rounds and admits them back afterward, based on CSV conflict lists.

## 📋 Overview

This app is designed for hosts running long meetings (e.g., 8-hour sessions) with multiple rounds where certain participants must not participate due to conflicts. The app:

- ✅ Parses CSV files with conflict lists (row-based or column-based format)
- ✅ Automatically moves conflicted participants to Waiting Room at round start
- ✅ Admits those same participants back when the round ends
- ✅ Handles 150+ participants with robust retry logic
- ✅ Provides fallback selection for participants without email addresses
- ✅ Persists state in localStorage for resilience across page refreshes

## 🏗️ Architecture

This is a Zoom App that runs inside the Zoom desktop client as a webview and is served by a small Express backend:

- **Tech Stack**: React + TypeScript + Vite
- **State Management**: Zustand with localStorage persistence
- **CSV Parsing**: PapaParse
- **Zoom Integration**: Zoom Apps SDK (@zoom/appssdk)
- **Backend**: Express for Zoom app hosting and browser tools (`/register`, `/getconflicts`)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Zoom desktop client (Windows/Mac)
- Zoom account with ability to create Zoom Apps
- ngrok (for local development) or static hosting (for production)

### Installation (dev)

```bash
# Navigate to project directory
cd zoomapps-sample-js

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will run on `http://localhost:3000`.

### Build & run (Express server)

```bash
# Build production bundle
npm run build

# Run the server (requires env vars below)
PORT=3000 \
ZM_CLIENT_ID=... \
ZM_CLIENT_SECRET=... \
ZM_REDIRECT_URL=https://your-domain/zoom \
SESSION_SECRET=your-random-string \
node app.js
```

- Zoom App is served at `/zoom` (set your Zoom Home URL to `https://your-domain/zoom`).
- Browser tools remain at `/register` and `/getconflicts` and do not load the Zoom SDK.

### Browser endpoints

- `GET /register` — Browser page to choose a user from `data/users.csv` and register the Zoom email they'll join with; writes to `data/registrants.csv`.
- `POST /register` — Body: `given_name, family_name, email, zoom_email, zoom_email_confirm`.
- `GET /getconflicts` — Generates `data/meeting_conflicts.csv` by swapping emails in `data/pcconflicts.csv` with the matching `zoom_email` from `data/registrants.csv`, then downloads the file.

### One-command setup (Ubuntu)

```bash
./scripts/setup.sh
```

Installs Node (via nvm), npm packages, and builds `dist/`. Afterward, set your env vars and run `node app.js` as shown above.

### Setting Up ngrok (for local development)

```bash
# Install ngrok globally (if not already installed)
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)
```

## 📝 Zoom Marketplace Setup

### Step 1: Create a Zoom App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click **Develop** → **Build App**
3. Choose **General App** (not OAuth or Meeting SDK)
4. Fill in basic information:
    - App Name: "Waiting Room Manager" (or your choice)
    - Company Name: Your organization
    - Developer Contact: Your email

### Step 2: Configure Zoom Apps SDK

1. In the **App Credentials** tab:
    - Note your **Client ID** and **Client Secret** (not needed for frontend-only app, but keep them safe)

2. In the **Zoom App SDK** section:
    - **Enable Zoom Apps SDK**: Toggle ON
    - **Home URL**:
        - For dev: `https://your-ngrok-url.ngrok-free.app` (from ngrok)
        - For production: `https://your-deployment-domain.com`
    - **Redirect URL for OAuth**: Leave blank (not needed for frontend-only app)
    - **Add Domain to Allow List**:
        - Dev: `your-ngrok-url.ngrok-free.app`
        - Production: `your-deployment-domain.com`

3. In the **Scopes** section, ensure the following capabilities are enabled:
    - Check "Zoom Apps SDK" is enabled
    - The app will request these capabilities at runtime:
        - `getMeetingParticipants`
        - `getMeetingParticipantsEmail`
        - `putParticipantToWaitingRoom`
        - `admitParticipantFromWaitingRoom`
        - `getWaitingRoomParticipants`
        - `showNotification`
        - `getMeetingContext`

### Step 3: Install the App

1. Go to the **Local Test** or **Activation** tab
2. Click **Add** to install the app to your Zoom account
3. The app should now appear in your Zoom Apps list

## 🖥️ Using the App in a Meeting

### As a Host:

1. **Start or join a Zoom meeting** as host or co-host
2. Click **Apps** button in the meeting toolbar
3. Find and click **Waiting Room Manager** (or your app name)
4. The app will open in a side panel

### App Interface:

The interface has three main panels:

#### Left Panel: CSV Data

- **Upload CSV**: Click to upload your conflict list CSV file
- **Parse Summary**: Shows rounds found, total emails, format detected
- **Rounds Preview**: Expandable list of all rounds and their conflict counts

#### Center Panel: Controls

- **Select Round**: Dropdown to choose which round to run
- **Fallback Mode**: Toggle to enable manual selection for participants without email
- **Start Round**: Moves conflicted participants to Waiting Room
- **End Round**: Admits previously moved participants back to meeting
- **Actions Summary**: Preview of matched/unmatched participants before execution

#### Right Panel: Activity Log

- **Stats**: Real-time success/failure counts
- **Log Entries**: Chronological list of all actions with status badges
- **Retry Failed**: Button to retry failed operations (if any)

## 📄 CSV Format

The app supports two CSV formats:

### Format A: Row-Based

```csv
round_id,email
1,alice@example.com
1,bob@example.com
2,carol@example.com
2,alice@example.com
```

- Each row = one conflict
- Columns: `round_id`, `email`

### Format B: Column-Based

```csv
email,round_1,round_2,round_3
alice@example.com,1,0,1
bob@example.com,1,1,0
carol@example.com,0,1,0
```

- Each row = one participant
- Columns: `email`, then round columns
- Values: `1` = conflict, `0` = no conflict
- Accepted conflict indicators: `1`, `true`, `yes`, `x`

### CSV Requirements

- **Email normalization**: Emails are automatically trimmed and lowercased
- **Invalid emails**: Skipped with warnings
- **Round IDs**: Can be strings or numbers (e.g., "Round 1", "1", "morning-session")

## 🎯 Workflow: Running a Round

### Starting a Round

1. Upload your CSV file
2. Select a round from the dropdown
3. Click **"Start Round (Exclude Conflicted)"**
4. The app will:
    - Fetch current meeting participants
    - Match conflict emails to participant UUIDs
    - Show a summary of matches/misses
    - Move matched participants to Waiting Room (with progress bar)
    - Record moved participants for later restoration

**Note**: Participants without email addresses will appear in the "No Email" section if Fallback Mode is enabled. You can manually select them by display name.

### Ending a Round

1. When the round is complete, click **"End Round (Restore Admitted)"**
2. The app will:
    - Only admit participants that were moved by the app for this round
    - Skip participants who left the meeting
    - Show progress and final success count

### Safety Features

- **Idempotency**: Starting a round twice won't duplicate actions
- **Selective Admit**: Ending a round only admits participants moved by this app
- **Reconciliation**: Before admitting, the app checks if participant is actually in waiting room
- **Retry Logic**: Failed operations are retried up to 3 times with exponential backoff

## 🛠️ Operator Guide

### Best Practices for 8-Hour Meetings

1. **Pre-load CSV**: Upload and validate your CSV before the meeting starts
2. **Test First**: Run a test meeting with a few participants to verify the CSV
3. **Monitor Logs**: Keep an eye on the Activity Log panel for any failures
4. **Late Joiners**: If someone joins mid-round, you can re-run "Start Round" - it will only move new matches
5. **Network Issues**: If operations fail, use the "Retry Failed Actions" button

### Handling Edge Cases

#### Email Not Available

Some participants may not expose their email to the Zoom app. Solutions:

- Enable **Fallback Mode** to manually select by display name
- Ask participants to update their Zoom profile with email
- Use display name matching as a workaround

#### Participant Left Meeting

If a participant leaves during a round:

- They won't be in Waiting Room when you try to admit them
- The app will skip them with a "not in waiting room" message
- No error occurs; this is expected behavior

#### Page Refresh / Browser Crash

- All critical state is saved to localStorage
- If you refresh the page, the app will restore:
    - Parsed rounds
    - Currently moved participants per round
    - Selected round
- Action logs are in-memory only and won't persist across refreshes

#### Zoom Client Restart

If the Zoom client restarts:

- You'll need to re-open the app from the Apps menu
- State will be restored from localStorage
- You can continue managing rounds

## 🔗 Additional Backend APIs

This app includes additional backend features for participant registration and conflict management.

### Registration API

**Endpoint**: `/register`

A web-based registration page where PC members can register their Zoom meeting email.

**Features**:
- Dropdown list of all PC members from `data/users.csv`
- Email input with confirmation
- Stores registrations in `data/registrants.csv`
- Updates existing registrations automatically

**Usage**: Navigate to `http://localhost:3000/register` (or your deployed URL) to access the registration form.

### Conflicts Export API

**Endpoint**: `/getconflicts`

Generates and downloads a `meeting_conflicts.csv` file by mapping PC member emails to their registered Zoom emails.

**What it does**:
1. Reads `data/pcconflicts.csv` (original PC conflicts)
2. Reads `data/registrants.csv` (registered Zoom emails)
3. Replaces PC emails with Zoom emails based on registration mapping
4. Returns the generated CSV file for download

**Usage**: 
- Visit `http://localhost:3000/getconflicts` in a browser to download the file
- Or use the Python script directly: `python scripts/python/generate_meeting_conflicts.py`

**Data Flow**:
```
users.csv → Registration Form → registrants.csv
                                        ↓
pcconflicts.csv + registrants.csv → meeting_conflicts.csv (Zoom-ready)
```

## 🐍 Python Scripts

Located in `scripts/python/`:

- **generate_meeting_conflicts.py**: Standalone script to generate meeting conflicts CSV
  - Can be run independently: `python scripts/python/generate_meeting_conflicts.py`
  - Also triggered by the `/getconflicts` API endpoint

See [scripts/python/README.md](scripts/python/README.md) for details.

### Recovery Procedures

#### Lost Track of Who Was Moved

If you're unsure which participants were moved by the app:

1. Check the localStorage state (browser dev tools → Application → Local Storage)
2. Look for `zoom-waiting-room-manager-state`
3. The `activeRounds` object contains `movedParticipants` arrays per round

#### Need to Manually Admit Someone

If you need to manually override:

1. Use Zoom's built-in Waiting Room controls (Security → Participants → Waiting Room)
2. The app won't interfere with manual admissions
3. When you "End Round", the app will only try to admit its tracked participants

#### CSV Errors After Upload

If you uploaded a bad CSV:

1. The parse summary will show errors and warnings
2. Upload a corrected CSV - it will replace the previous data
3. Re-select your round and proceed

## 🚢 Production Deployment

### Option 1: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Build the app
npm run build

# Deploy
vercel --prod

# Copy the production URL (e.g., https://your-app.vercel.app)
```

### Option 2: Netlify

```bash
# Build the app
npm run build

# Drag and drop the 'dist' folder to Netlify
# Or use Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Option 3: Cloudflare Pages

```bash
# Build the app
npm run build

# Upload the 'dist' folder to Cloudflare Pages
# Configure build settings:
# - Build command: npm run build
# - Publish directory: dist
```

### Update Zoom App Settings

After deploying:

1. Go to your Zoom App settings in Marketplace
2. Update **Home URL** to your production URL
3. Update **Domain Allow List** to match
4. Save and test

## 🧪 Development & Testing

### Local Development

```bash
# Start dev server with hot reload
npm run dev

# Run in Zoom client (requires ngrok tunnel)
# 1. Start ngrok: ngrok http 3000
# 2. Update Zoom App Home URL to ngrok URL
# 3. Open app from Zoom meeting
```

### Building for Production

```bash
# TypeScript check + build
npm run build

# Preview production build locally
npm run preview
```

### Linting

```bash
npm run lint
```

## 📊 Performance Considerations

- **Concurrency**: Waiting room operations are batched with a limit of 5 concurrent requests
- **Retry Logic**: Failed operations retry up to 3 times with exponential backoff (300ms, 900ms, 2700ms)
- **Large Meetings**: Tested with 150+ participants; operations complete in under 30 seconds
- **CSV Size**: Can handle CSVs with thousands of rows; parsing is fast (< 1 second)

## 🔒 Security & Privacy

- **No Data Upload**: All CSV processing happens in the browser
- **localStorage Only**: State is stored locally in the browser, not on any server
- **Email Privacy**: Participant emails are only used for matching; not stored or transmitted
- **Zoom APIs Only**: No external API calls except to Zoom

## ❓ FAQ

**Q: Can I use this without email addresses?**  
A: Yes, enable Fallback Mode and manually select participants by display name.

**Q: What happens if I close the app mid-round?**  
A: State is saved in localStorage. Re-open the app and click "End Round" to restore participants.

**Q: Can co-hosts use this app?**  
A: Yes, if they have waiting room permissions. The app checks for host/co-host role.

**Q: Does this work with Zoom webinars?**  
A: This is designed for meetings. Webinars have different participant management.

**Q: Can I edit rounds mid-meeting?**  
A: Yes, upload a new CSV anytime. It will replace the previous data.

## 📞 Support

For issues or questions:

- Check the Activity Log panel for error details
- Review this README and Operator Guide
- Check browser console for technical errors (F12 → Console)

## 📂 Project Structure

```
src/
├── sdk/
│   └── zoom.ts              # Zoom SDK wrapper with typed methods
├── csv/
│   └── parse.ts             # CSV parsing (row & column formats)
├── operations/
│   ├── matching.ts          # Participant matching logic
│   └── waitingRoom.ts       # Waiting room ops with retry
├── state/
│   └── store.ts             # Zustand store + localStorage
├── components/
│   ├── UploadPanel.tsx      # CSV upload & preview
│   ├── RoundSelector.tsx    # Round dropdown
│   ├── ControlPanel.tsx     # Start/End round controls
│   └── LogPanel.tsx         # Activity log
├── types.ts                 # TypeScript type definitions
├── utils.ts                 # Utility functions
├── App.tsx                  # Main app component
├── main.tsx                 # Entry point
└── index.css                # Tailwind + custom styles
```

## 📜 License

ISC License

---

**Built with ❤️ for seamless Zoom meeting management**
