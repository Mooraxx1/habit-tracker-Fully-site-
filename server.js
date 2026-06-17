// ==========================================================================
// 1. MODULE INITIALIZATION & CONFIGURATION WITH TRACE LOGGING
// ==========================================================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const multer = require("multer"); // ENABLING MULTIPART STREAM DECODERS
const User = require("./models/User");

console.log("[System Core]: Modules required successfully.");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Configure disk space allocations for optional diary attachment uploads
const uploadConfiguration = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, "public/uploads/"));
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB File size limits
});

console.log("[System Core]: View engine, parsers, and multer mounted.");

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
        title: "Register",
        error: "Username and password are required.",
        successUser: null,
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
        title: "Register",
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

    console.log(
      "[Auth - Register]: SUCCESS - Saved new document to MongoDB Atlas.",
    );
    res.render("register", {
      title: "Register",
      error: null,
      successUser: cleanUsername,
    });
  } catch (err) {
    console.error("[Auth - Register]: Execution failure stack:", err.message);
    res.render("register", {
      title: "Register",
      error: "System error during registration: " + err.message,
      successUser: null,
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
        title: "Login",
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
        title: "Login",
        error: "User not found. Please check your username.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("[Auth - Login]: FAIL - Password hash mismatch.");
      return res.render("login", {
        title: "Login",
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
    res.render("login", {
      title: "Login",
      error: "System error during login: " + err.message,
    });
  }
});

// ==========================================================================
// 6. APPLICATION VIEW ROUTES (DASHBOARD, TIMER, DIARY, SETTINGS)
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
      user: user,
      habits: user.habits || [],
      posts: user.posts || [],
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
    res.render("manage", {
      title: "Manage Habits",
      user: user,
      habits: user.habits || [],
    });
  } catch (err) {
    console.error("[Manage Router]: Error:", err.message);
    res.redirect("/");
  }
});

app.get("/timer", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("timer", {
      title: "Focus Timer",
      user: user,
      habits: user.habits || [],
    });
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/diary", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("diary", {
      title: "My Diary Wall",
      user: user,
      posts: user.posts || [],
      habits: user.habits || [],
    });
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/settings/profile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("profile-details", { title: "Profile Details", user: user });
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/settings/account", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("profile-setting", { title: "Account Settings", user: user });
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/settings/tutorial", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("tutorial", { title: "App Tutorial", user: user });
  } catch (err) {
    res.redirect("/");
  }
});

// ==========================================================================
// 7. API CRUD ENDPOINTS (SETTINGS PROFILE, HABITS, DIARY)
// ==========================================================================
app.post("/api/profile/update", isAuthenticated, async (req, res) => {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).send("Unauthorized.");

    user.displayName = displayName;
    user.bio = bio;
    user.avatarUrl = avatarUrl;
    await user.save();

    res.redirect("/settings/profile");
  } catch (err) {
    res.status(500).send("Error saving profile details.");
  }
});

app.post("/api/profile/language", isAuthenticated, async (req, res) => {
  try {
    const { language } = req.body;
    if (!language || !["en", "ar"].includes(language)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid language code parameters map.",
        });
    }
    const user = await User.findById(req.session.userId);
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized." });

    user.language = language;
    await user.save();
    res.json({ success: true, language: user.language });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

app.post("/api/habits/progress", isAuthenticated, async (req, res) => {
  try {
    const { habitId, minutesWorked } = req.body;
    const user = await User.findById(req.session.userId);
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const habit = user.habits.find((h) => h.id === habitId);
    if (habit) {
      const fractionalHours = minutesWorked / 60;

      // Update overall progress maps
      habit.completedTime = Math.min(
        habit.completedTime + fractionalHours,
        habit.requiredTime,
      );

      // Extract current server localized date string index
      const todayStr = new Date().toISOString().split("T")[0];

      // Synchronize time parameters directly inside inner historical log ledger
      if (!habit.dailyLog) habit.dailyLog = [];
      let dailyEntry = habit.dailyLog.find((log) => log.date === todayStr);

      if (dailyEntry) {
        dailyEntry.completedTime += fractionalHours;
      } else {
        habit.dailyLog.push({
          date: todayStr,
          completedTime: fractionalHours,
          requiredTime: habit.requiredTime,
        });
      }

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

app.post(
  "/api/diary",
  isAuthenticated,
  uploadConfiguration.single("postImage"),
  async (req, res) => {
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

      let processedFileUrl = null;
      if (req.file) {
        processedFileUrl = `/uploads/${req.file.filename}`;
      }

      user.posts.unshift({
        id: Date.now().toString(),
        date: formattedDate,
        time: formattedTime,
        content: content.trim(),
        habitName: matchedHabitName,
        imageUrl: processedFileUrl,
      });

      await user.save();
      res.redirect("/diary");
    } catch (err) {
      console.error("[Diary API]: Save error:", err.message);
      res.status(500).send("Error compiling diary post logs.");
    }
  },
);

// --- INLINE DIARY API ACTIONS ---

app.put("/api/diary/:id", isAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    const user = await User.findById(req.session.userId);
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const post = user.posts.find((p) => p.id === req.params.id);
    if (post) {
      post.content = content.trim();
      await user.save();
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, message: "Diary entry not found" });
  } catch (err) {
    console.error("[Diary API Update Error]:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/diary/:id", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const originalLength = user.posts.length;
    user.posts = user.posts.filter((post) => post.id !== req.params.id);

    if (user.posts.length === originalLength) {
      return res
        .status(404)
        .json({ success: false, message: "Diary entry not found" });
    }

    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("[Diary API Delete Error]:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// 8. UTILITY ROUTES & SERVER STARTUP
// ==========================================================================
app.get("/login", (req, res) =>
  res.render("login", { title: "Login", error: null }),
);
app.get("/register", (req, res) =>
  res.render("register", { title: "Register", error: null, successUser: null }),
);
app.get("/auth/logout", (req, res) => {
  console.log("[Logout Router]: Invalidating active session token.");
  req.session.destroy(() => res.redirect("/login"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`[Application Framework]: Listening on port: ${PORT}`),
);
