// ==========================================================================
// 1. MODULE INITIALIZATION & CONFIGURATION WITH TRACE LOGGING
// ==========================================================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

console.log("[System Core]: Modules required successfully.");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

console.log("[System Core]: View engine and basic body parsers mounted.");

// ==========================================================================
// 2. CLOUD DATABASE CONNECTION
// ==========================================================================
const MONGO_URI = process.env.MONGODB_URI;
console.log(
  "[Database Engine]: MONGODB_URI presence check ->",
  MONGO_URI ? "FOUND" : "MISSING",
);

if (!MONGO_URI) {
  console.error(
    "[Database Engine]: CRITICAL - MONGODB_URI is not set. Halting.",
  );
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() =>
    console.log(
      "[Database Engine]: SUCCESS - Connected to MongoDB Atlas Cloud.",
    ),
  )
  .catch((err) =>
    console.error(
      "[Database Engine]: CRITICAL ERROR - Connection failed ->",
      err,
    ),
  );

// ==========================================================================
// 3. PERSISTENT SESSION MIDDLEWARE (AUTO-DETECTING CONNECT-MONGO VERSION)
// ==========================================================================
console.log(
  "[Session Engine]: Constructing MongoStore session configuration...",
);

let sessionStore;

try {
  const ConnectMongo = require("connect-mongo");

  if (typeof ConnectMongo.create === "function") {
    console.log(
      "[Session Engine]: Detected connect-mongo v4+ → using .create()",
    );
    sessionStore = ConnectMongo.create({
      mongoUrl: MONGO_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60,
    });
  } else if (typeof ConnectMongo === "function") {
    console.log(
      "[Session Engine]: Detected connect-mongo v3 → using factory pattern",
    );
    const MongoStoreV3 = ConnectMongo(session);
    sessionStore = new MongoStoreV3({
      url: MONGO_URI,
      collection: "sessions",
      ttl: 14 * 24 * 60 * 60,
    });
  } else {
    throw new Error("Unrecognized connect-mongo export shape.");
  }
} catch (err) {
  console.error(
    "[Session Engine]: CRITICAL - Could not initialize MongoStore:",
    err.message,
  );
  console.warn("[Session Engine]: Falling back to in-memory MemoryStore.");
  sessionStore = undefined;
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "devmoor_secret_key",
    resave: false,
    saveUninitialized: false,
    ...(sessionStore ? { store: sessionStore } : {}),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

console.log(
  "[Session Engine]: Middleware attached to express execution lifecycle.",
);

// ==========================================================================
// 4. ROUTE GUARD
// ==========================================================================
function isAuthenticated(req, res, next) {
  console.log(
    "[Route Guard]: Verifying session ID ->",
    req.session.userId || "No session active",
  );
  if (req.session.userId) return next();
  res.redirect("/login");
}

// ==========================================================================
// 5. AUTHENTICATION ROUTES
// ==========================================================================
app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.render("register", {
        error: "Username and password are required.",
        successUser: null,
      });
    }
    const cleanUsername = username.trim().toLowerCase();
    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) {
      return res.render("register", {
        error: "Username is already taken. Please choose another.",
        successUser: null,
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
    res.render("register", { error: null, successUser: cleanUsername });
  } catch (err) {
    res.render("register", {
      error: "System error during registration: " + err.message,
      successUser: null,
    });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.render("login", {
        error: "Username and password are required.",
      });
    const cleanUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });
    if (!user)
      return res.render("login", {
        error: "User not found. Please check your username.",
      });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.render("login", {
        error: "Incorrect password. Please try again.",
      });
    req.session.userId = user._id.toString();
    res.redirect("/");
  } catch (err) {
    res.render("login", { error: "System error during login: " + err.message });
  }
});

// ==========================================================================
// 6. APPLICATION ROUTES & API ENDPOINTS
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
    if (!user) return res.redirect("/auth/logout");
    res.render("manage", { title: "Manage Habits", habits: user.habits });
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/timer", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("timer", { title: "Focus Timer", habits: user.habits });
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/diary", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    // FIXED: Passed user habits array down to prevent EJS loop compilation errors
    res.render("diary", {
      title: "My Diary Wall",
      posts: user.posts,
      habits: user.habits,
    });
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/profile/details", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("profile-details", { title: "Profile Details", user: user });
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/profile/settings", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("profile-setting", { title: "Account Settings", user: user });
  } catch (err) {
    res.redirect("/");
  }
});

app.post("/api/profile/update", isAuthenticated, async (req, res) => {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).send("Unauthorized.");
    user.displayName = displayName;
    user.bio = bio;
    user.avatarUrl = avatarUrl;
    await user.save();
    res.redirect("/profile/details");
  } catch (err) {
    res.status(500).send("Error saving profile details.");
  }
});

app.post("/api/habits", isAuthenticated, async (req, res) => {
  try {
    const { name, requiredTimeFormat, schedule, urls } = req.body;
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).send("Unauthorized.");
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

// FIXED: Added inline modification update route used by manage.ejs dialogs
app.post("/api/habits/update", isAuthenticated, async (req, res) => {
  try {
    const { id, name, requiredTime } = req.body;
    const user = await User.findById(req.session.userId);
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const habit = user.habits.find((h) => h.id === id);
    if (habit) {
      habit.name = name;
      habit.requiredTime = parseFloat(requiredTime);
      await user.save();
      return res.json({ success: true });
    }
    res
      .status(404)
      .json({ success: false, message: "Habit routine not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/habits/:id", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    user.habits = user.habits.filter((habit) => habit.id !== req.params.id);
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// FIXED: Appended missing diary wall submission logging handler
app.post("/api/diary", isAuthenticated, async (req, res) => {
  try {
    const { content, habitTagged } = req.body;
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");

    let matchedHabitName = null;
    if (habitTagged && habitTagged.trim() !== "") {
      const targetHabit = user.habits.find((h) => h.id === habitTagged);
      if (targetHabit) matchedHabitName = targetHabit.name;
    }

    const currentDateObj = new Date();
    const formattedDate = currentDateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = currentDateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    user.posts.unshift({
      id: Date.now().toString(),
      date: formattedDate,
      time: formattedTime,
      content: content.trim(),
      habitName: matchedHabitName,
      imageUrl: null, // Defaults cleanly without multipart complexity configuration crash points
    });

    await user.save();
    res.redirect("/diary");
  } catch (err) {
    console.error("[Diary Post Engine]: Error saving update:", err.message);
    res.status(500).send("Error compiling diary post logs.");
  }
});

app.post("/api/habits/progress", isAuthenticated, async (req, res) => {
  try {
    const { habitId, minutesWorked } = req.body;
    const user = await User.findById(req.session.userId);
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

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
// 7. UTILITY ROUTES
// ==========================================================================
app.get("/login", (req, res) =>
  res.render("login", { title: "Login", error: null }),
);
app.get("/register", (req, res) =>
  res.render("register", { title: "Register", error: null, successUser: null }),
);
app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`[Application Framework]: Listening on port: ${PORT}`),
);
