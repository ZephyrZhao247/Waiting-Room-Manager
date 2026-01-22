import express from 'express';

const router = express.Router();

// In-memory storage (use a database in production)
const associationsStore = new Map();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get associations for a meeting
router.get('/:meetingId', (req, res) => {
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
router.post('/:meetingId', (req, res) => {
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

export default router;
