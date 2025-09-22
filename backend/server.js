const express = require("express");
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');
const { JsonRpcProvider } = require('ethers');
dotenv.config();

// Initialize database (MongoDB via mongoose)
const { Admin, EventUser, Event, Organizer, Program, FiatTxn } = require('./db');

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

// -------- Admin data endpoints --------
// List events for a specific admin
app.get('/api/admin/:adminId/events', async (req, res) => {
  try {
    const { adminId } = req.params;
    if (!adminId) return res.status(400).json({ error: 'adminId is required' });
    const events = await Event.find({ admin_id: adminId }).sort({ createdAt: -1 });
    return res.json({ events });
  } catch (err) {
    console.error('List admin events error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/hello', async (req, res) => {
  const artifactPath = 'C:/Users/visma/Desktop/New folder/blockchain/artifacts/contracts/FinalVaultWithTimeConstrain.sol/UniversityTokenVault.json';
  const raw = fs.readFileSync(artifactPath, 'utf-8');
  const json = JSON.parse(raw);
  return res.send(json);

});

// Optional: list events with query filters (e.g., by adminId)
app.get('/api/events', async (req, res) => {
  try {
    const { adminId } = req.query || {};
    const q = {};
    if (adminId) q.admin_id = adminId;
    const events = await Event.find(q).sort({ createdAt: -1 });
    return res.json({ events });
  } catch (err) {
    console.error('List events error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------- Programs (Organizers create programs for an event) --------
// Create program
app.post('/api/programs', async (req, res) => {
  try {
    const { eventId, organizerId, name, price } = req.body || {};
    if (!eventId || !organizerId || !name || typeof price !== 'number') {
      return res.status(400).json({ error: 'eventId, organizerId, name, and numeric price are required' });
    }

    const ev = await Event.findOne({ event_id: eventId });
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    const org = await Organizer.findOne({ organizer_id: organizerId, event_id: eventId });
    if (!org) return res.status(404).json({ error: 'Organizer not found for this event' });

    const program = await Program.create({
      program_id: uuidv4(),
      event_id: eventId,
      organizer_id: organizerId,
      name: String(name).trim(),
      price: Number(price),
    });

    return res.status(201).json({ program });
  } catch (err) {
    console.error('Create program error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List programs for an event
app.get('/api/programs', async (req, res) => {
  try {
    const { eventId } = req.query || {};
    if (!eventId) return res.status(400).json({ error: 'eventId is required' });
    const programs = await Program.find({ event_id: eventId }).sort({ createdAt: -1 });
    return res.json({ programs });
  } catch (err) {
    console.error('List programs error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper: load contract artifact (ABI & bytecode)
function loadVaultArtifact() {
  try {
    const candidates = [
      // Hardhat default output for your source/contract names
        'C:/Users/visma/Desktop/New folder/blockchain/artifacts/contracts/FinalVaultWithTimeConstrain.sol/UniversityTokenVault.json',
        'C:/Users/visma/Desktop/New folder/blockchain/artifacts/build-info/6488c99329bb87429dead351383ddb03.json',
        'C:/Users/visma/Desktop/New folder/blockchain/artifacts/contracts/FinalVaultWithTimeConstrain.sol/UniversityTokenVault.json',
        '(fallback) parse build-info under artifacts/build-info/*.json',
    ];
    let chosen = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) { chosen = p; break; }
    }
    // If not found in candidates, recursively search artifacts dir for UniversityTokenVault.json
    if (!chosen) {
      const root = path.join(__dirname, '..', 'blockchain', 'artifacts');
      if (fs.existsSync(root)) {
        const stack = [root];
        while (stack.length) {
          const dir = stack.pop();
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) stack.push(p);
            else if (ent.isFile() && ent.name === 'UniversityTokenVault.json') { chosen = p; break; }
          }
          if (chosen) break;
        }
      }
    }
    // Fallback: parse Hardhat build-info to extract ABI/bytecode when per-contract artifact isn't present
    if (!chosen) {
      const biDir = path.join(__dirname, '..', 'blockchain', 'artifacts', 'build-info');
      if (fs.existsSync(biDir)) {
        const files = fs.readdirSync(biDir).filter(f => f.endsWith('.json'));
        // Prefer most recent files first
        files.sort((a, b) => fs.statSync(path.join(biDir, b)).mtimeMs - fs.statSync(path.join(biDir, a)).mtimeMs);
        for (const f of files) {
          try {
            const p = path.join(biDir, f);
            const raw = fs.readFileSync(p, 'utf-8');
            const bi = JSON.parse(raw);
            const contracts = (bi && bi.output && bi.output.contracts) || {};
            for (const source of Object.keys(contracts)) {
              const dict = contracts[source] || {};
              const c = dict['UniversityTokenVault'];
              if (c && c.abi && c.evm && c.evm.bytecode && c.evm.bytecode.object) {
                const obj = c.evm.bytecode.object;
                const bytecode = obj && (obj.startsWith('0x') ? obj : ('0x' + obj));
                if (bytecode) return { abi: c.abi, bytecode, path: p };
              }
            }
          } catch {}
        }
      }
      return null;
    }
    const raw = fs.readFileSync(chosen, 'utf-8');
    const json = JSON.parse(raw);
    if (!json.abi || !json.bytecode) return null;
    return { abi: json.abi, bytecode: json.bytecode, path: chosen };
  } catch (_) { return null; }
}
app.get('/testing', (req, res) => {
  // artifactPath = 'C:/Users/visma/Desktop/New folder/blockchain/artifacts/contracts/FinalVaultWithTimeConstrain.sol/UniversityTokenVault.json';
  // const raw = fs.readFileSync(artifactPath, 'utf-8');
  // const json = JSON.parse(raw);
  // return res.send(json);
  res.send('hello')
  
})

// Expose contract artifact so the browser can deploy via MetaMask
app.get('/api/contracts/university-vault', (req, res) => {
  try {
    const artifact = loadVaultArtifact();
    if (!artifact) {
      const candidates = [
       ' C:/Users/visma/Desktop/New folder/blockchain/artifacts/contracts/FinalVaultWithTimeConstrain.sol/UniversityTokenVault.json',
        'C:/Users/visma/Desktop/New folder/blockchain/artifacts/build-info/6488c99329bb87429dead351383ddb03.json',
        'C:/Users/visma/Desktop/New folder/blockchain/artifacts/contracts/FinalVaultWithTimeConstrain.sol/UniversityTokenVault.json',
        '(fallback) parse build-info under artifacts/build-info/*.json',
      ];
      console.warn('Contract artifact not found. Tried paths:', candidates);
      return res.status(404).json({ error: 'Contract artifact not found', candidates });
    }
    return res.json(artifact);
  } catch (err) {
    console.error('Artifact load error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Save/Update deployed token address on an event
app.patch('/api/events/:eventId/token', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { token_contract } = req.body || {};
    if (!eventId || !token_contract) {
      return res.status(400).json({ error: 'eventId and token_contract are required' });
    }
    const ev = await Event.findOneAndUpdate(
      { event_id: eventId },
      { $set: { token_contract } },
      { new: true }
    );
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    return res.json({ event: ev });
  } catch (err) {
    console.error('Update event token error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new Event (optionally deploy ERC20 vault)
app.post('/api/events', async (req, res) => {
  try {
    const { admin_id, name, date, location, description, status, token_name, token_symbol } = req.body || {};
    if (!admin_id || !name || !date || !location || !description) {
      return res.status(400).json({ error: 'admin_id, name, date, location, and description are required' });
    }
    // Optional: verify admin exists
    const admin = await Admin.findOne({ admin_id });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    // Base event payload
    const baseEvent = {
      event_id: uuidv4(),
      admin_id,
      name,
      date: new Date(date),
      location,
      description,
      status: status || 'review',
      token_name: token_name || '',
      token_symbol: token_symbol || '',
      token_contract: '',
    };

    // Attempt contract deployment if configuration present
    const rpcUrl = process.env.RPC_URL;
    const privKey = process.env.DEPLOYER_PRIVATE_KEY;
    let deployedAddress = '';
    

    // Connect to the Ethereum network
    const provider = new JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/kmnge57atpDgxKY1qjgR9");
    
    // Get block by number
    const blockNumber = "latest";
    const block = await provider.getBlock(blockNumber);
    
    console.log(block);

    const event = await Event.create(baseEvent);
    return res.status(201).json({ event });
  } catch (err) {
    console.error('Create event error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------- Fiat Transactions (user registers/pays for a program) --------
// Create fiat transaction (dummy approval)
app.post('/api/txns', async (req, res) => {
  try {
    const { eventId, userId, programId, paymentMethod } = req.body || {};
    if (!eventId || !userId || !programId) {
      return res.status(400).json({ error: 'eventId, userId, and programId are required' });
    }

    const ev = await Event.findOne({ event_id: eventId });
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    const user = await EventUser.findOne({ user_id: userId, event_id: eventId });
    if (!user) return res.status(404).json({ error: 'User not found for this event' });

    const program = await Program.findOne({ program_id: programId, event_id: eventId });
    if (!program) return res.status(404).json({ error: 'Program not found for this event' });

    // compute amounts from program.price
    const base = Number(program.price) || 0;
    const gst = Math.round(base * 0.18 * 100) / 100;
    const total = Math.round((base + gst) * 100) / 100;

    const txn = await FiatTxn.create({
      txn_id: uuidv4(),
      event_id: eventId,
      user_id: userId,
      program_id: programId,
      amount: total,
      payment_method: paymentMethod || 'PayTM',
      base_amount: base,
      gst_amount: gst,
      total_amount: total,
      status: 'approved', // since payment interface is dummy for now
    });

    return res.status(201).json({ txn });
  } catch (err) {
    console.error('Create fiat txn error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List fiat transactions by event/user
app.get('/api/txns', async (req, res) => {
  try {
    const { eventId, userId } = req.query || {};
    if (!eventId || !userId) return res.status(400).json({ error: 'eventId and userId are required' });
    const txns = await FiatTxn.find({ event_id: eventId, user_id: userId }).sort({ createdAt: -1 });
    return res.json({ txns });
  } catch (err) {
    console.error('List fiat txns error:', err);
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