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

  // connect-mongo v4+ uses ConnectMongo.create()
  if (typeof ConnectMongo.create === "function") {
    console.log(
      "[Session Engine]: Detected connect-mongo v4+ → using .create()",
    );
    sessionStore = ConnectMongo.create({
      mongoUrl: MONGO_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60,
    });

    // connect-mongo v3 is a factory function called directly
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
  console.warn(
    "[Session Engine]: Falling back to in-memory MemoryStore (sessions will not persist across restarts).",
  );
  sessionStore = undefined; // express-session will use MemoryStore by default
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "devmoor_secret_key",
    resave: false,
    saveUninitialized: false,
    ...(sessionStore ? { store: sessionStore } : {}),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
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
    console.log(
      "[Auth - Register]: Incoming registration request for raw user:",
      username,
    );

    if (!username || !password) {
      return res.render("register", {
        error: "Username and password are required.",
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    console.log(
      "[Auth - Register]: Normalized target input name:",
      cleanUsername,
    );

    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) {
      console.log("[Auth - Register]: HALT - Username collision detected.");
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

    console.log(
      "[Auth - Register]: SUCCESS - Saved new document to MongoDB Atlas.",
    );
    res.redirect("/login");
  } catch (err) {
    console.error("[Auth - Register]: Execution failure stack:", err.message);
    res.render("register", {
      error: "System error during registration: " + err.message,
    });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(
      "[Auth - Login]: Incoming login verification request for raw user:",
      username,
    );

    if (!username || !password) {
      return res.render("login", {
        error: "Username and password are required.",
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    console.log(
      "[Auth - Login]: Normalized login comparison target:",
      cleanUsername,
    );

    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      console.log(
        "[Auth - Login]: FAIL - Username not located in Atlas collections.",
      );
      return res.render("login", {
        error: "User not found. Please check your username.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("[Auth - Login]: FAIL - Password hash mismatch.");
      return res.render("login", {
        error: "Incorrect password. Please try again.",
      });
    }

    req.session.userId = user._id.toString();
    console.log(
      "[Auth - Login]: SUCCESS - Session provisioned with tracking ID:",
      req.session.userId,
    );
    res.redirect("/");
  } catch (err) {
    console.error("[Auth - Login]: Execution failure stack:", err.message);
    res.render("login", { error: "System error during login: " + err.message });
  }
});

// ==========================================================================
// 6. APPLICATION ROUTES & API ENDPOINTS
// ==========================================================================
app.get("/", isAuthenticated, async (req, res) => {
  try {
    console.log("[Dashboard Router]: Serving index workspace layout.");
    const user = await User.findById(req.session.userId);
    if (!user) {
      console.log(
        "[Dashboard Router]: Session bound to orphan reference. Clearing.",
      );
      return res.redirect("/auth/logout");
    }
    res.render("index", {
      title: "Dashboard",
      habits: user.habits,
      posts: user.posts,
    });
  } catch (err) {
    console.error("[Dashboard Router]: Read execution crashed:", err.message);
    res.redirect("/login");
  }
});

app.get("/manage", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("manage", { title: "Manage Habits", habits: user.habits });
  } catch (err) {
    console.error("[Manage Router]: Error:", err.message);
    res.redirect("/");
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
    console.error("[Habits API]: Save error:", err.message);
    res.status(500).send("Save error.");
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
    console.error("[Progress API]: Error:", err.message);
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
  res.render("register", { title: "Register", error: null }),
);
app.get("/auth/logout", (req, res) => {
  console.log("[Logout Router]: Invalidating active session token.");
  req.session.destroy(() => res.redirect("/login"));
});

// ==========================================================================
// 8. SERVER STARTUP
// ==========================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`[Application Framework]: Listening on port: ${PORT}`),
);
