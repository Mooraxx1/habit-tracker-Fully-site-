// ==========================================================================
// 1. MODULE INITIALIZATION & CONFIGURATION
// ==========================================================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
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
// 3. PERSISTENT SESSION MIDDLEWARE (STORED IN MONGODB)
// ==========================================================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "devmoor_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
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
// 4. AUTHENTICATION ROUTES (NORMALIZED TO LOWERCASE)
// ==========================================================================
app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    // Normalize username to lowercase to prevent authentication mismatches
    const cleanUsername = username.trim().toLowerCase();

    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) return res.send("Username taken. Please go back.");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: cleanUsername,
      password: hashedPassword,
      habits: [],
      posts: [],
    });
    await newUser.save();
    res.redirect("/login");
  } catch (err) {
    res.status(500).send("Registration error.");
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    // Normalize login input to lowercase match
    const cleanUsername = username.trim().toLowerCase();

    const user = await User.findOne({ username: cleanUsername });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.send("Authentication Failed. <a href='/login'>Try Again</a>");
    }

    req.session.userId = user._id.toString();
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Login error.");
  }
});

// ==========================================================================
// 5. APPLICATION LOGIC & API ENDPOINTS
// ==========================================================================
app.get("/", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render("index", {
    title: "Dashboard",
    habits: user.habits,
    posts: user.posts,
  });
});

app.get("/manage", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render("manage", { title: "Manage Habits", habits: user.habits });
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
    }
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ==========================================================================
// 6. UTILITY ROUTES
// ==========================================================================
app.get("/login", (req, res) => res.render("login", { title: "Login" }));
app.get("/register", (req, res) =>
  res.render("register", { title: "Register" }),
);
app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
