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

This is a **frontend-only Zoom App** that runs inside the Zoom desktop client as a webview:

- **Tech Stack**: React + TypeScript + Vite
- **State Management**: Zustand with localStorage persistence
- **CSV Parsing**: PapaParse
- **Zoom Integration**: Zoom Apps SDK (@zoom/appssdk)
- **No Backend Required**: All processing happens client-side

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Zoom desktop client (Windows/Mac)
- Zoom account with ability to create Zoom Apps
- ngrok (for local development) or static hosting (for production)

### Installation

```bash
# Navigate to project directory
cd zoomapps-sample-js

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will run on `http://localhost:3000`.

### Setting Up ngrok (for local development)

```bash
# Install ngrok globally
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

```
Home URL:               https://xxxxx.ngrok.io
Redirect URL for OAuth: https://xxxxx.ngrok.io/auth
```

> NOTE: ngrok URLs under ngrok's Free plan are ephemeral, meaning they will only live for up to a couple hours at most, and will change every time you reinitialize the application. This will require you to update these fields every time you restart your ngrok service.

#### OAuth allow list

- `https://example.ngrok.io`

#### Domain allow list

- `appssdk.zoom.us`
- `ngrok.io`

### Config: Information

The following information is required to activate your application:

- Basic Information
    - App name
    - Short description
    - Long description (entering a short message here is fine for now)
- Developer Contact Information
    - Name
    - Email address

> NOTE: if you intend to publish your application on the Zoom Apps Marketplace, more information will be required in this section before submitting.

### Config: App Features

Under the Zoom App SDK section, click the `+ Add APIs` button and enable the following options from their respective
sections:

#### APIs

- shareApp

### Scopes

Ensure that the following scope is selected on the Scopes tab:

- `zoomapp:inmeeting`

### Config `.env`

When building for Development, open the `.env` file in your text editor and enter the following information from the App Credentials section you just
configured:

```ini
# Client ID for your Zoom App
ZM_CLIENT_ID=[app_client_id]

# Client Secret for your Zoom app
ZM_CLIENT_SECRET=[app_client_secret]

# Redirect URI set for your app in the Zoom Marketplace
ZM_REDIRECT_URL=https://[xxxx-xx-xx-xxx-x].ngrok.io/auth
```

#### Zoom for Government

If you are a [Zoom for Government (ZfG)](https://www.zoomgov.com/) customer you can use the `ZM_HOST` variable to change
the base URL used for Zoom. This will allow you to adjust to the different Marketplace and API Base URLs used by ZfG
customers.

**Marketplace URL:** marketplace._zoomgov.com_

**API Base URL:** api._zoomgov.com_

## Start the App

### Development

Run the `dev` npm script to start in development mode using a Docker container.

```shell
npm run dev
```

The `dev` script will:

1. Watch JS files and built to the dist/ folder
1. Watch Server files and build to the dist/ folder
1. Start the application

### Production

When running your application in production no logs are sent to the console by default and the server is not restarted
on file changes.

We use the `NODE_ENV` environment variable here to tell the application to start in prodcution mode.

```shell
# Mac/Linux
NODE_ENV=production npm start

# Windows
set NODE_ENV=production && npm start
```

## Usage

To install the Zoom App, Navigate to the **Home URL** that you set in your browser and click the link to install.

After you authorize the app, Zoom will automatically open the app within the client.

### Keeping secrets secret

This application makes use of your Zoom App Client ID and Client Secret as well as a custom secret for signing session
cookies. During development, the application will read from the .env file. ;

In order to align with security best practices, this application does not read from the .env file in production mode.

This means you'll want to set environment variables on the hosting platform that you'
re using instead of within the .env file. This might include using a secret manager or a CI/CD pipeline.

> :warning: **Never commit your .env file to version control:** The file likely contains Zoom App Credentials and Session Secrets

### Code Style

This project uses [prettier](https://prettier.io/) and [eslint](https://eslint.org/) to enforce style and protect
against coding errors along with a pre-commit git hook(s) via [husky](https://typicode.github.io/husky/#/) to ensure
files pass checks prior to commit.

### Testing

At this time there are no e2e or unit tests.

## Need help?

If you're looking for help, try [Developer Support](https://devsupport.zoom.us) or
our [Developer Forum](https://devforum.zoom.us). Priority support is also available
with [Premier Developer Support](https://zoom.us/docs/en-us/developer-support-plans.html) plans.

### Documentation

Make sure to review [our documentation](https://marketplace.zoom.us/docs/zoom-apps/introduction/) as a reference when building your Zoom Apps.
