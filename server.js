// ==========================================================================
// 1. MODULE INITIALIZATION & CORE CONFIGURATION
// ==========================================================================
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const ObjectId = require("mongo-objectid");
const User = require("./models/User"); // We are bringing our Mongoose model back for the cloud!

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==========================================================================
// 2. HYBRID DATABASE CONFIGURATION (LOCAL MEMORY OR LIVE CLOUD)
// ==========================================================================
// Render will automatically look for a secure environment variable called MONGODB_URI.
// If it doesn't find it (like on your local machine), it safely runs the Simulation Engine.
const CLOUD_URI = process.env.MONGODB_URI;
let UserDatabaseSim = [];
let isCloud = false;

if (CLOUD_URI) {
  mongoose
    .connect(CLOUD_URI)
    .then(() => {
      console.log("[Database Connected]: Running on Live MongoDB Atlas Cloud!");
      isCloud = true;
    })
    .catch((err) =>
      console.error(
        "Cloud connection error, falling back to local simulation:",
        err,
      ),
    );
} else {
  console.log(
    "[Local Active]: Running on Local Isolated Memory Simulation Engine.",
  );
}

// ==========================================================================
// 3. SECURE SESSION MIDDLEWARE LAYER
// ==========================================================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "devmoor_secret_session_key_string",
    resave: false,
    saveUninitialized: false,
  }),
);

function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect("/login");
}

// ==========================================================================
// 4. USER AUTHENTICATION ENDPOINTS (SIGN UP / LOGIN)
// ==========================================================================

app.get("/register", (req, res) => {
  res.render("register", { title: "Register" });
});

app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = username.trim();

    if (isCloud) {
      const existingUser = await User.findOne({ username: cleanUsername });
      if (existingUser) return res.send("Username already taken.");

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        username: cleanUsername,
        password: hashedPassword,
        habits: [],
        posts: [],
      });
      await newUser.save();
    } else {
      const existingUser = UserDatabaseSim.find(
        (u) => u.username === cleanUsername,
      );
      if (existingUser) return res.send("Username already taken.");

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        _id: new ObjectId().toString(),
        username: cleanUsername,
        password: hashedPassword,
        habits: [],
        posts: [],
      };
      UserDatabaseSim.push(newUser);
    }
    res.redirect("/login");
  } catch (err) {
    res.status(500).send("Registration error: " + err);
  }
});

app.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = username.trim();
    let user;

    if (isCloud) {
      user = await User.findOne({ username: cleanUsername });
    } else {
      user = UserDatabaseSim.find((u) => u.username === cleanUsername);
    }

    if (!user) return res.send("Invalid username or password.");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send("Invalid username or password.");

    req.session.userId = user._id.toString();
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Login error: " + err);
  }
});

// ==========================================================================
// 5. SECURE APPLICATION OPERATIONS ENGINE
// ==========================================================================

app.get("/", isAuthenticated, async (req, res) => {
  const user = isCloud
    ? await User.findById(req.session.userId)
    : UserDatabaseSim.find((u) => u._id === req.session.userId);
  res.render("index", { title: "Dashboard", habits: user.habits });
});

app.get("/manage", isAuthenticated, (req, res) => {
  res.render("manage", { title: "Manage Habits" });
});

app.post("/api/habits", isAuthenticated, async (req, res) => {
  try {
    const { name, requiredTime, schedule } = req.body;
    const user = isCloud
      ? await User.findById(req.session.userId)
      : UserDatabaseSim.find((u) => u._id === req.session.userId);

    const newHabit = {
      id: Date.now().toString(),
      name: name,
      requiredTime: parseFloat(requiredTime) || 1,
      completedTime: 0,
      schedule: schedule || "",
    };

    user.habits.push(newHabit);
    if (isCloud) await user.save();
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Error saving habit.");
  }
});

app.get("/timer", isAuthenticated, async (req, res) => {
  const user = isCloud
    ? await User.findById(req.session.userId)
    : UserDatabaseSim.find((u) => u._id === req.session.userId);
  res.render("timer", { title: "Focus Timer", habits: user.habits });
});

app.post("/api/habits/progress", isAuthenticated, async (req, res) => {
  try {
    const { habitId, minutesWorked } = req.body;
    const user = isCloud
      ? await User.findById(req.session.userId)
      : UserDatabaseSim.find((u) => u._id === req.session.userId);
    const habit = user.habits.find((h) => h.id === habitId);

    if (habit) {
      habit.completedTime += minutesWorked / 60;
      if (habit.completedTime > habit.requiredTime)
        habit.completedTime = habit.requiredTime;

      if (isCloud) await user.save();
      return res.json({ success: true, habit: habit });
    }
    res.status(404).json({ success: false });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get("/diary", isAuthenticated, async (req, res) => {
  const user = isCloud
    ? await User.findById(req.session.userId)
    : UserDatabaseSim.find((u) => u._id === req.session.userId);
  res.render("diary", {
    title: "My Diary",
    habits: user.habits,
    posts: user.posts,
  });
});

app.post("/api/diary", isAuthenticated, async (req, res) => {
  try {
    const { content, habitTagged } = req.body;
    const user = isCloud
      ? await User.findById(req.session.userId)
      : UserDatabaseSim.find((u) => u._id === req.session.userId);

    const associatedHabit = user.habits.find((h) => h.id === habitTagged);
    const habitName = associatedHabit ? associatedHabit.name : null;

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newPost = {
      id: Date.now().toString(),
      date: formattedDate,
      time: formattedTime,
      content: content,
      habitName: habitName,
      imageUrl: null,
    };

    user.posts.unshift(newPost);
    if (isCloud) await user.save();
    res.redirect("/diary");
  } catch (err) {
    res.status(500).send("Error saving diary entry.");
  }
});

// ==========================================================================
// 6. SERVER RUNTIME LIFE CYCLE (PORT ENHANCED FOR CLOUD DEPLOYMENT)
// ==========================================================================
// Cloud services like Render assign ports dynamically using process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(
    `[Engine Running Online]: Live platform dashboard portal online on port ${PORT}`,
  ),
);
