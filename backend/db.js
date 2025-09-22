const mongoose = require("mongoose");
require("dotenv").config();

let MONGODB_URI = process.env.connectionString || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Fallback to local MongoDB for development
  MONGODB_URI = "mongodb://127.0.0.1:27017/clavis";
  console.warn("[DB] No MongoDB connection string found in env. Falling back to local mongodb://127.0.0.1:27017/clavis");
}

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("[DB] Connected to MongoDB");
  })
  .catch((err) => {
    console.error("[DB] MongoDB connection error:", err.message);
  });

// Admin schema
const AdminSchema = new mongoose.Schema(
  {
    wallet_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["University event", "NGO", "Basic community"],
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /[^@\s]+@[^@\s]+\.[^@\s]+/,
      unique: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    admin_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["ADMIN"],
      default: "ADMIN",
      immutable: true,
    },
    avatar_url: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        delete ret.password_hash; // never expose password hash
        return ret;
      },
    },
    toObject: { virtuals: true, versionKey: false },
  }
);

// Helpful compound index for lookups by wallet + email
AdminSchema.index({ wallet_id: 1, email: 1 }, { unique: true });

const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

// EventUser schema
const EventUserSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    event_id: {
      // ID of the parent event (admin-created); storing as string for flexibility
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /[^@\s]+@[^@\s]+\.[^@\s]+/,
    },
    password_hash: {
      type: String,
      required: true,
    },
    subevent_ids: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        delete ret.password_hash;
        return ret;
      },
    },
    toObject: { virtuals: true, versionKey: false },
  }
);

// Ensure a user cannot register the same email twice for the same event
EventUserSchema.index({ event_id: 1, email: 1 }, { unique: true });

const EventUser =
  mongoose.models.EventUser || mongoose.model("EventUser", EventUserSchema);

// Organizer schema
const OrganizerSchema = new mongoose.Schema(
  {
    organizer_id: { type: String, required: true, unique: true, index: true },
    wallet_id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    password_hash: { type: String, required: true },
    event_id: { type: String, required: true, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false }, toObject: { virtuals: true, versionKey: false } }
);

OrganizerSchema.index({ email: 1, event_id: 1 }, { unique: true });

const Organizer = mongoose.models.Organizer || mongoose.model('Organizer', OrganizerSchema);

// Event schema
const EventSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true, unique: true, index: true },
    admin_id: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ['review', 'approve', 'deny'], default: 'review' },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false }, toObject: { virtuals: true, versionKey: false } }
);

EventSchema.index({ admin_id: 1, createdAt: -1 });

const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

// Program schema (programs created by organizers for an event)
const ProgramSchema = new mongoose.Schema(
  {
    program_id: { type: String, required: true, unique: true, index: true },
    event_id: { type: String, required: true, index: true },
    organizer_id: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false }, toObject: { virtuals: true, versionKey: false } }
);

ProgramSchema.index({ event_id: 1, name: 1 }, { unique: false });

const Program = mongoose.models.Program || mongoose.model('Program', ProgramSchema);

// Fiat transaction schema (user registers/pays for a program)
const FiatTxnSchema = new mongoose.Schema(
  {
    txn_id: { type: String, required: true, unique: true, index: true },
    event_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    program_id: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['created', 'approved', 'failed'], default: 'approved' },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false }, toObject: { virtuals: true, versionKey: false } }
);

FiatTxnSchema.index({ event_id: 1, user_id: 1, createdAt: -1 });

const FiatTxn = mongoose.models.FiatTxn || mongoose.model('FiatTxn', FiatTxnSchema);

module.exports = {
  mongoose,
  Admin,
  EventUser,
  Organizer,
  Event,
  Program,
  FiatTxn,
};