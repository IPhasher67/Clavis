const express = require("express");
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

// Initialize database (MongoDB via mongoose)
const { Admin, EventUser, Event, Organizer } = require('./db');

const app = express();

// Parse JSON bodies
app.use(express.json());

// Serve static frontend files from ../Frontend
const FRONTEND_DIR = path.join(__dirname, '..', 'Frontend');
app.use(express.static(FRONTEND_DIR));

// Root should serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Create a new Event
app.post('/api/events', async (req, res) => {
  try {
    const { admin_id, name, date, location, description, status } = req.body || {};
    if (!admin_id || !name || !date || !location || !description) {
      return res.status(400).json({ error: 'admin_id, name, date, location, and description are required' });
    }
    // Optional: verify admin exists
    const admin = await Admin.findOne({ admin_id });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    const event = await Event.create({
      event_id: uuidv4(),
      admin_id,
      name,
      date: new Date(date),
      location,
      description,
      status: status || 'review',
    });
    return res.status(201).json({ event });
  } catch (err) {
    console.error('Create event error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Organizer registration
app.post('/api/organizers/register', async (req, res) => {
  try {
    const { wallet_id, name, email, password, eventId } = req.body || {};
    if (!wallet_id || !name || !email || !password || !eventId) {
      return res.status(400).json({ error: 'wallet_id, name, email, password, and eventId are required' });
    }
    const ev = await Event.findOne({ event_id: eventId });
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const existing = await Organizer.findOne({ email: email.toLowerCase(), event_id: eventId });
    if (existing) return res.status(409).json({ error: 'Organizer already registered for this event' });
    const password_hash = await bcrypt.hash(password, 10);
    const organizer = await Organizer.create({
      organizer_id: uuidv4(),
      wallet_id,
      name,
      email: email.toLowerCase(),
      password_hash,
      event_id: eventId,
    });
    const { password_hash: _ignore, ...publicOrganizer } = organizer.toObject();
    return res.status(201).json({ organizer: publicOrganizer });
  } catch (err) {
    console.error('Organizer register error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Organizer login
app.post('/api/organizers/login', async (req, res) => {
  try {
    const { email, password, eventId } = req.body || {};
    if (!email || !password || !eventId) {
      return res.status(400).json({ error: 'email, password, and eventId are required' });
    }
    const organizer = await Organizer.findOne({ email: email.toLowerCase(), event_id: eventId });
    if (!organizer) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, organizer.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const { password_hash: _ignore, ...publicOrganizer } = organizer.toObject();
    return res.json({ organizer: publicOrganizer });
  } catch (err) {
    console.error('Organizer login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get event by event_id
app.get('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ event_id: eventId });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    return res.json({ event });
  } catch (err) {
    console.error('Get event error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper to map frontend user-type to schema enum
function mapUserType(input) {
  switch ((input || '').toLowerCase()) {
    case 'university':
    case 'university event':
      return 'University event';
    case 'ngo':
      return 'NGO';
    case 'community':
    case 'basic community':
      return 'Basic community';
    default:
      return undefined;
  }
}

// Admin registration
app.post('/api/admin/register', async (req, res) => {
  try {
    const { name, email, password, userType, wallet_id, avatar_url } = req.body || {};
    if (!name || !email || !password || !userType) {
      return res.status(400).json({ error: 'name, email, password, and userType are required' });
    }
    const type = mapUserType(userType);
    if (!type) {
      return res.status(400).json({ error: 'Invalid userType' });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      admin_id: uuidv4(),
      name,
      email,
      type,
      wallet_id: wallet_id || '',
      password_hash,
      avatar_url: avatar_url || '',
      role: 'ADMIN',
    });

    return res.status(201).json({ admin });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Return admin sans password (handled by toJSON transform)
    return res.json({ admin });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// EventUser registration (for attendees/users)
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password, eventId } = req.body || {};
    if (!name || !email || !password || !eventId) {
      return res.status(400).json({ error: 'name, email, password, and eventId are required' });
    }
    // prevent duplicate email within same event
    const exists = await EventUser.findOne({ event_id: eventId, email });
    if (exists) {
      return res.status(409).json({ error: 'User already registered for this event' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await EventUser.create({
      user_id: uuidv4(),
      event_id: eventId,
      name,
      email,
      password_hash,
      subevent_ids: [],
    });
    return res.status(201).json({ user });
  } catch (err) {
    console.error('User register error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// EventUser login
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password, eventId } = req.body || {};
    if (!email || !password || !eventId) {
      return res.status(400).json({ error: 'email, password and eventId are required' });
    }
    const user = await EventUser.findOne({ event_id: eventId, email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    return res.json({ user });
  } catch (err) {
    console.error('User login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});