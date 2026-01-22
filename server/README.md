# Simple Backend Server for Association Storage

This is a simple Node.js/Express server for storing Zoom meeting associations.

## Quick Start

1. Install dependencies:
```bash
npm install express cors body-parser
```

2. Run the server:
```bash
node server/association-server.js
```

The server will run on http://localhost:3001

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/associations/:meetingId` - Get associations for a meeting
- `POST /api/associations/:meetingId` - Save associations for a meeting

## Data Storage

Associations are stored in memory. For production, use a database like MongoDB, PostgreSQL, or Redis.

## Configuration

The frontend can be configured to use a different server URL via the Settings (⚙️) button in the Association Manager panel.
