// ==========================================================================
// 1. MODULE INITIALIZATION & CORE CONFIGURATION
// ==========================================================================
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const ObjectId = require("mongo-objectid");
const User = require("./models/User");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==========================================================================
// 2. HYBRID DATABASE CONFIGURATION (LOCAL MEMORY OR LIVE CLOUD)
// ==========================================================================
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
  const errorMsg = req.session.registerError || null;
  const successUser = req.session.registeredUser || null;

  req.session.registerError = null;
  req.session.registeredUser = null;

  res.render("register", { title: "Register", errorMsg, successUser });
});

app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = username.trim();

    if (isCloud) {
      const existingUser = await User.findOne({ username: cleanUsername });
      if (existingUser) {
        req.session.registerError =
          "This username is already taken. Try another identifier.";
        return res.redirect("/register");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        username: cleanUsername,
        password: hashedPassword,
        displayName: "",
        bio: "",
        avatarUrl: "",
        habits: [],
        posts: [],
      });
      await newUser.save();
    } else {
      const existingUser = UserDatabaseSim.find(
        (u) => u.username === cleanUsername,
      );
      if (existingUser) {
        req.session.registerError =
          "This username is already taken. Try another identifier.";
        return res.redirect("/register");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        _id: new ObjectId().toString(),
        username: cleanUsername,
        password: hashedPassword,
        displayName: "",
        bio: "",
        avatarUrl: "",
        habits: [],
        posts: [],
      };
      UserDatabaseSim.push(newUser);
    }

    req.session.registeredUser = cleanUsername;
    res.redirect("/register");
  } catch (err) {
    req.session.registerError = "Registration engine failure: " + err.message;
    res.redirect("/register");
  }
});

app.get("/login", (req, res) => {
  const errorMsg = req.session.loginError || null;
  req.session.loginError = null;

  res.render("login", { title: "Login", errorMsg });
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

    if (!user) {
      req.session.loginError =
        "Invalid profile credentials check tracker maps. Identity matches unindexed.";
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.session.loginError =
        "Invalid password data matrix entries. Access verification handshake failed.";
      return res.redirect("/login");
    }

    req.session.userId = user._id.toString();
    res.redirect("/");
  } catch (err) {
    req.session.loginError =
      "Security verification exception error mapping routine arrays.";
    res.redirect("/login");
  }
});

// ==========================================================================
// 5. SECURE APPLICATION OPERATIONS ENGINE
// ==========================================================================

app.get("/", isAuthenticated, async (req, res) => {
  const user = isCloud
    ? await User.findById(req.session.userId)
    : UserDatabaseSim.find((u) => u._id === req.session.userId);
  res.render("index", {
    title: "Dashboard",
    habits: user.habits,
    posts: user.posts,
  });
});

app.get("/manage", isAuthenticated, async (req, res) => {
  const user = isCloud
    ? await User.findById(req.session.userId)
    : UserDatabaseSim.find((u) => u._id === req.session.userId);
  res.render("manage", { title: "Manage Habits", habits: user.habits });
});

app.post("/api/habits", isAuthenticated, async (req, res) => {
  try {
    const { name, requiredTimeFormat, schedule, urls } = req.body;
    const user = isCloud
      ? await User.findById(req.session.userId)
      : UserDatabaseSim.find((u) => u._id === req.session.userId);

    let calculatedHoursDecimal = 1.0;
    if (requiredTimeFormat && requiredTimeFormat.includes(":")) {
      const [hoursPart, minutesPart] = requiredTimeFormat.split(":");
      calculatedHoursDecimal =
        parseFloat(hoursPart) + parseFloat(minutesPart) / 60;
    }

    // Sanitize incoming array items to store clean strings strings
    let cleanUrlsArray = [];
    if (urls) {
      const rawUrls = Array.isArray(urls) ? urls : [urls];
      cleanUrlsArray = rawUrls.map((u) => u.trim()).filter((u) => u.length > 0);
    }

    const newHabit = {
      id: Date.now().toString(),
      name: name.trim(),
      requiredTime: parseFloat(calculatedHoursDecimal.toFixed(2)) || 1,
      completedTime: 0,
      schedule: schedule || "",
      urls: cleanUrlsArray, // Injected securely down into schema data blocks
    };

    user.habits.push(newHabit);
    if (isCloud) await user.save();

    res.redirect("/manage?created=success");
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
// 6. PROFILE & PROFILE ACCOUNT MANAGEMENT SUB-SYSTEM
// ==========================================================================
app.get("/profile/details", isAuthenticated, async (req, res) => {
  const user = isCloud
    ? await User.findById(req.session.userId)
    : UserDatabaseSim.find((u) => u._id === req.session.userId);
  res.render("profile-details", { title: "Profile Details", user: user });
});

app.get("/profile/settings", isAuthenticated, async (req, res) => {
  const user = isCloud
    ? await User.findById(req.session.userId)
    : UserDatabaseSim.find((u) => u._id === req.session.userId);
  res.render("profile-setting", { title: "Account Settings", user: user });
});

app.post("/api/profile/update", isAuthenticated, async (req, res) => {
  try {
    const { displayName, bio, avatarUrl } = req.body;

    if (isCloud) {
      await User.findByIdAndUpdate(req.session.userId, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      });
    } else {
      const user = UserDatabaseSim.find((u) => u._id === req.session.userId);
      if (user) {
        user.displayName = displayName.trim();
        user.bio = bio.trim();
        user.avatarUrl = avatarUrl.trim();
      }
    }
    res.redirect("/profile/details");
  } catch (err) {
    res.status(500).send("Error updating data logs: " + err);
  }
});

// ==========================================================================
// 7. HABIT METRICS EDIT AND DELETION API SUB-ROUTES
// ==========================================================================
app.post("/api/habits/update", isAuthenticated, async (req, res) => {
  try {
    const { id, name, requiredTime } = req.body;
    const user = isCloud
      ? await User.findById(req.session.userId)
      : UserDatabaseSim.find((u) => u._id === req.session.userId);

    const habit = user.habits.find((h) => h.id === id);
    if (habit) {
      const oldName = habit.name;
      habit.name = name.trim();
      habit.requiredTime = parseFloat(requiredTime) || 1;

      user.posts.forEach((post) => {
        if (post.habitName === oldName) post.habitName = name.trim();
      });

      if (isCloud) {
        user.markModified("habits");
        user.markModified("posts");
        await user.save();
      }
      return res.json({ success: true });
    }
    res.status(404).json({ success: false });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post("/api/habits/delete", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.body;
    const user = isCloud
      ? await User.findById(req.session.userId)
      : UserDatabaseSim.find((u) => u._id === req.session.userId);

    const habitIndex = user.habits.findIndex((h) => h.id === id);
    if (habitIndex !== -1) {
      const targetHabitName = user.habits[habitIndex].name;
      user.habits.splice(habitIndex, 1);

      user.posts.forEach((post) => {
        if (post.habitName === targetHabitName) post.habitName = null;
      });

      if (isCloud) {
        user.markModified("habits");
        user.markModified("posts");
        await user.save();
      }
      return res.json({ success: true });
    }
    res.status(404).json({ success: false });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.send("Error logging out.");
    res.redirect("/login");
  });
});

app.use((req, res) => {
  res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(
    `[Engine Running Online]: Live platform portal active on port ${PORT}`,
  ),
);
