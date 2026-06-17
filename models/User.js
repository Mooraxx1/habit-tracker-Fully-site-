// ==========================================================================
// USER DATABASE DATA STRUCTURE SCHEMA (MODELS/USER.JS)
// ==========================================================================
const mongoose = require("mongoose");

// --------------------------------------------------------------------------
// HABIT SCHEMA
// Tracks a single habit with time progress, schedule, and reference URLs
// --------------------------------------------------------------------------
const HabitSchema = new mongoose.Schema({
  id: { type: String, required: true },

  name: { type: String, required: true, trim: true },

  // Daily time goal stored in fractional hours (e.g. 1.5 = 1h 30m)
  requiredTime: { type: Number, required: true, min: 0 },

  // Accumulated time today stored in fractional hours
  completedTime: { type: Number, default: 0, min: 0 },

  // Optional schedule label e.g. "Daily", "Weekdays", "Mon/Wed/Fri"
  schedule: { type: String, default: "" },

  // Optional start date — used by dashboard grid to anchor habit tracking
  startDate: { type: Date, default: null },

  // Reference URLs attached to this habit (e.g. course links, articles)
  urls: [{ type: String, trim: true }],

  // Daily completion log — one entry per day, keyed by ISO date string (YYYY-MM-DD)
  // Allows the dashboard grid and history card to reconstruct any past day
  dailyLog: [
    {
      date: { type: String, required: true }, // "2026-06-15"
      completedTime: { type: Number, default: 0 }, // fractional hours that day
      requiredTime: { type: Number, default: 0 }, // snapshot of goal that day
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

// --------------------------------------------------------------------------
// TIMER SESSION SCHEMA
// Stores the last-used timer configuration per habit for the Timer tab
// --------------------------------------------------------------------------
const TimerSessionSchema = new mongoose.Schema({
  habitId: { type: String, required: true },

  // Minutes per focus block
  focusMinutes: { type: Number, default: 25 },

  // Minutes per break block
  breakMinutes: { type: Number, default: 5 },

  // How many focus rounds to target
  totalRounds: { type: Number, default: 4 },

  // Which round the user last left off on (0-indexed)
  currentRound: { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now },
});

// --------------------------------------------------------------------------
// POST / DIARY ENTRY SCHEMA
// One post per diary wall entry — text, optional image, optional habit tag
// --------------------------------------------------------------------------
const PostSchema = new mongoose.Schema({
  id: { type: String, required: true },

  // ISO date string "YYYY-MM-DD" for calendar filtering in history
  date: { type: String, required: true },

  // Human-readable time string "HH:MM" for display
  time: { type: String, required: true },

  // Full text body of the diary post
  content: { type: String, required: true },

  // Linked habit name (from manage tab dropdown)
  habitName: { type: String, default: null },

  // Hosted image URL (Cloudinary, imgur, etc.) or local /uploads path
  imageUrl: { type: String, default: null },

  // Optional file attachment URL (PDF, document, etc.)
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
});

// --------------------------------------------------------------------------
// ACHIEVEMENT SCHEMA
// Unlocked badges shown on the My Profile view
// --------------------------------------------------------------------------
const AchievementSchema = new mongoose.Schema({
  id: { type: String, required: true },

  // Short label shown on the badge e.g. "7-Day Streak"
  title: { type: String, required: true },

  // Longer description e.g. "Completed a habit 7 days in a row"
  description: { type: String, default: "" },

  // Emoji or icon identifier e.g. "🔥", "⭐", "💎"
  icon: { type: String, default: "🏆" },

  unlockedAt: { type: Date, default: Date.now },
});

// --------------------------------------------------------------------------
// MAIN USER SCHEMA
// --------------------------------------------------------------------------
const UserSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------
    // AUTHENTICATION
    // ------------------------------------------------------------------
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // always stored lowercase for case-insensitive login
    },
    password: { type: String, required: true },

    // ------------------------------------------------------------------
    // PROFILE — shown on My Profile tab and header avatar
    // ------------------------------------------------------------------

    // Friendly display name (e.g. "Amr Hassan") — separate from username
    displayName: { type: String, default: "", trim: true },

    // Short bio paragraph shown on profile card
    bio: { type: String, default: "", maxlength: 500 },

    // Hosted avatar image URL — empty string means use initials fallback
    avatarUrl: { type: String, default: "" },

    // ------------------------------------------------------------------
    // CONTENT COLLECTIONS
    // ------------------------------------------------------------------
    habits: [HabitSchema],
    posts: [PostSchema],
    achievements: [AchievementSchema],
    timerSessions: [TimerSessionSchema],

    // ------------------------------------------------------------------
    // STATISTICS — updated server-side when habits are logged
    // ------------------------------------------------------------------

    // Total cumulative hours logged across all habits, all time
    totalHoursLogged: { type: Number, default: 0 },

    // Longest consecutive-day streak across any habit
    longestStreak: { type: Number, default: 0 },

    // Current active streak (days in a row with at least one habit completed)
    currentStreak: { type: Number, default: 0 },

    // ------------------------------------------------------------------
    // PREFERENCES
    // ------------------------------------------------------------------

    // "light" | "dark" — persisted so theme survives logout/login
    theme: { type: String, default: "dark", enum: ["light", "dark"] },

    // "en" | "ar" — internationalization localization language preference configurations maps
    language: { type: String, default: "en", enum: ["en", "ar"] },
  },
  {
    // Adds createdAt and updatedAt timestamps automatically
    timestamps: true,
  },
);

// --------------------------------------------------------------------------
// VIRTUAL: fullName
// Returns displayName if set, otherwise falls back to username
// Usage in EJS: user.fullName
// --------------------------------------------------------------------------
UserSchema.virtual("fullName").get(function () {
  return this.displayName && this.displayName.trim() !== ""
    ? this.displayName
    : this.username;
});

// --------------------------------------------------------------------------
// VIRTUAL: initials
// Returns up to 2 uppercase initials for the avatar fallback circle
// e.g. "Amr Hassan" → "AH", "devmoor" → "D"
// --------------------------------------------------------------------------
UserSchema.virtual("initials").get(function () {
  const name = this.displayName || this.username || "?";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
});

// Make virtuals available when converting to JSON (useful in API responses)
UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("User", UserSchema);
