const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.connectionString || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("[DB] No MongoDB connection string found. Set connectionString or MONGODB_URI in .env");
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

module.exports = {
  mongoose,
  Admin,
  EventUser,
  Organizer,
  Event,
};