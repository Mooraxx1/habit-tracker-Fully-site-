// ==========================================================================
// 1. MODULE INITIALIZATION & CONFIGURATION
// ==========================================================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo"); // Modern v5+ syntax
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==========================================================================
// 2. CLOUD DATABASE CONNECTION
// ==========================================================================
const MONGO_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("[Database Connected]: MongoDB Atlas Cloud Active."))
  .catch((err) => console.error("Database connection error:", err));

// ==========================================================================
// 3. PERSISTENT SESSION MIDDLEWARE (MODERN CONNECT-MONGO SYNTAX)
// ==========================================================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "devmoor_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI, // Correct property for connect-mongo v5+
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // Keep users logged in for 7 days
    },
  }),
);

function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  res.redirect("/login");
}

// ==========================================================================
// 4. AUTHENTICATION ROUTES (CASE-INSENSITIVE & DYNAMIC ERRORS)
// ==========================================================================
app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = username.trim().toLowerCase();

    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) {
      return res.render("register", {
        error: "Username is already taken. Please choose another.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: cleanUsername,
      password: hashedPassword,
      habits: [],
      posts: [],
    });
    await newUser.save();

    // Pass a success flag to the login page if you want, or just redirect
    res.redirect("/login");
  } catch (err) {
    res.render("register", {
      error: "System error during registration: " + err.message,
    });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = username.trim().toLowerCase();

    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.render("login", {
        error: "User not found. Please check your username.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", {
        error: "Incorrect password. Please try again.",
      });
    }

    req.session.userId = user._id.toString();
    res.redirect("/");
  } catch (err) {
    res.render("login", { error: "System error during login: " + err.message });
  }
});

// ==========================================================================
// 5. APPLICATION LOGIC & API ENDPOINTS
// ==========================================================================
app.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("index", {
      title: "Dashboard",
      habits: user.habits,
      posts: user.posts,
    });
  } catch (err) {
    res.redirect("/login");
  }
});

app.get("/manage", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render("manage", { title: "Manage Habits", habits: user.habits });
  } catch (err) {
    res.redirect("/");
  }
});

app.post("/api/habits", isAuthenticated, async (req, res) => {
  try {
    const { name, requiredTimeFormat, schedule, urls } = req.body;
    const user = await User.findById(req.session.userId);

    let hours = 1;
    if (requiredTimeFormat && requiredTimeFormat.includes(":")) {
      const [h, m] = requiredTimeFormat.split(":");
      hours = parseFloat(h) + parseFloat(m) / 60;
    }

    user.habits.push({
      id: Date.now().toString(),
      name: name.trim(),
      requiredTime: parseFloat(hours.toFixed(2)),
      completedTime: 0,
      schedule: schedule,
      urls: Array.isArray(urls) ? urls.filter((u) => u) : urls ? [urls] : [],
    });
    await user.save();
    res.redirect("/manage?created=success");
  } catch (err) {
    res.status(500).send("Save error.");
  }
});

app.post("/api/habits/progress", isAuthenticated, async (req, res) => {
  try {
    const { habitId, minutesWorked } = req.body;
    const user = await User.findById(req.session.userId);
    const habit = user.habits.find((h) => h.id === habitId);
    if (habit) {
      habit.completedTime = Math.min(
        habit.completedTime + minutesWorked / 60,
        habit.requiredTime,
      );
      await user.save();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Habit not found" });
    }
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ==========================================================================
// 6. UTILITY ROUTES
// ==========================================================================
app.get("/login", (req, res) =>
  res.render("login", { title: "Login", error: null }),
);
app.get("/register", (req, res) =>
  res.render("register", { title: "Register", error: null }),
);
app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
