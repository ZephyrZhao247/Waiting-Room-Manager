const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (use a database in production)
const associationsStore = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get associations for a meeting
app.get('/api/associations/:meetingId', (req, res) => {
  const { meetingId } = req.params;
  
  if (!meetingId) {
    return res.status(400).json({ error: 'Meeting ID is required' });
  }

  const associations = associationsStore.get(meetingId);
  
  if (!associations) {
    return res.status(404).json({ error: 'No associations found for this meeting' });
  }

  res.json({ associations });
});

// Save associations for a meeting
app.post('/api/associations/:meetingId', (req, res) => {
  const { meetingId } = req.params;
  const { associations } = req.body;

  if (!meetingId) {
    return res.status(400).json({ error: 'Meeting ID is required' });
  }

  if (!associations || typeof associations !== 'object') {
    return res.status(400).json({ error: 'Invalid associations data' });
  }

  associationsStore.set(meetingId, associations);
  
  console.log(`[${new Date().toISOString()}] Saved ${Object.keys(associations).length} associations for meeting ${meetingId}`);

  res.json({ 
    success: true, 
    count: Object.keys(associations).length,
    meetingId 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Association server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
