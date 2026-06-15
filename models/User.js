// ==========================================================================
// USER DATABASE DATA STRUCTURE SCHEMA (MODELS/USER.JS)
// ==========================================================================
const mongoose = require("mongoose");

// Child structures mapped directly inside a unique user identity context
const HabitSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  requiredTime: { type: Number, required: true },
  completedTime: { type: Number, default: 0 },
  schedule: { type: String, default: "" },
});

const PostSchema = new mongoose.Schema({
  id: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  content: { type: String, required: true },
  habitName: { type: String, default: null },
  imageUrl: { type: String, default: null },
});

// Main Account Core Profile Document
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  displayName: { type: String, default: "" }, // Stores user's real name configuration
  bio: { type: String, default: "" }, // Stores user's personalization biography details
  avatarUrl: { type: String, default: "" }, // Stores image link URL references
  habits: [HabitSchema], // Array of habits unique to this single user account
  posts: [PostSchema], // Array of timeline logs unique to this single user account
});

module.exports = mongoose.model("User", UserSchema);
