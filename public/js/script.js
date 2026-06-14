// ==========================================================================
// 1. THEME TOGGLE (DARK / LIGHT)
// ==========================================================================
const themeToggle = document.getElementById("themeToggle");
const htmlEl = document.documentElement;

if (localStorage.getItem("theme") === "dark") {
  htmlEl.setAttribute("data-theme", "dark");
  if (themeToggle) themeToggle.innerText = "☀️";
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    if (htmlEl.getAttribute("data-theme") === "light") {
      htmlEl.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
      themeToggle.innerText = "☀️";
    } else {
      htmlEl.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
      themeToggle.innerText = "🌙";
    }
  });
}

// ==========================================================================
// 2. BILINGUAL TRANSLATION ENGINE (EN / AR)
// ==========================================================================
const translations = {
  en: {
    logo: "HabitTracker",
    nav_dashboard: "Dashboard",
    nav_manage: "Manage",
    nav_timer: "Timer",
    nav_diary: "Diary",
    dashboard_title: "Activity Overview",
    activity_graph: "365-Day Activity",
    manage_title: "Manage Habits",
    timer_title: "Focus Timer",
    diary_title: "My Diary Wall",
    select_habit_label: "Target Habit",
    select_habit: "Select a habit...",
    work_label: "Focus Session (Minutes)",
    break_label: "Break Session (Minutes)",
    sessions_label: "Total Target Rounds",
    status_ready: "Ready to Focus",
    btn_start: "Start",
    btn_reset: "Reset",
    empty_habits_title: "Here you will see and track your habits",
    empty_habits_desc:
      'Go to the "Manage" tab to add your first habit and start tracking your progress!',
  },
  ar: {
    logo: "متتبع العادات",
    nav_dashboard: "لوحة القيادة",
    nav_manage: "إدارة",
    nav_timer: "المؤقت",
    nav_diary: "اليوميات",
    dashboard_title: "نظرة عامة على النشاط",
    activity_graph: "نشاط 365 يوم",
    manage_title: "إدارة العادات",
    timer_title: "مؤقت التركيز",
    diary_title: "حائط يومياتي",
    select_habit_label: "العادة المستهدفة",
    select_habit: "اختر عادة...",
    work_label: "جلسة التركيز (بالدقائق)",
    break_label: "جلسة الاستراحة (بالدقائق)",
    sessions_label: "إجمالي الجولات المستهدفة",
    status_ready: "مستعد للتركيز",
    btn_start: "ابدأ",
    btn_reset: "إعادة ضبط",
    empty_habits_title: "هنا سوف ترى وتتتبع عاداتك",
    empty_habits_desc:
      'انتقل إلى علامة التبويب "إدارة" لإضافة عادتك الأولى وبدء تتبع تقدمك!',
  },
};

const langToggle = document.getElementById("langToggle");
let currentLang = localStorage.getItem("lang") || "en";

applyLanguage(currentLang);

if (langToggle) {
  langToggle.addEventListener("click", () => {
    currentLang = currentLang === "en" ? "ar" : "en";
    localStorage.setItem("lang", currentLang);
    applyLanguage(currentLang);
  });
}

function applyLanguage(lang) {
  htmlEl.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  if (langToggle) langToggle.innerText = lang === "ar" ? "English" : "عربي";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      el.innerText = translations[lang][key];
    }
  });
}

// ==========================================================================
// 3. Ambient 365-DAY GRID VISUALIZER
// ==========================================================================
const graphContainer = document.getElementById("activityGraph");

if (graphContainer) {
  const blocksArray = [];
  for (let i = 0; i < 365; i++) {
    const block = document.createElement("div");
    block.classList.add("activity-block");
    block.setAttribute("data-level", "0");
    graphContainer.appendChild(block);
    blocksArray.push(block);
  }

  setInterval(() => {
    const randomIndex = Math.floor(Math.random() * blocksArray.length);
    const targetBlock = blocksArray[randomIndex];
    const randomLevel = Math.floor(Math.random() * 4) + 1;

    targetBlock.setAttribute("data-level", randomLevel);
    targetBlock.classList.add("pulse-glow");

    setTimeout(() => {
      targetBlock.setAttribute("data-level", "0");
      targetBlock.classList.remove("pulse-glow");
    }, 1200);
  }, 300);
}

// ==========================================================================
// 4. PERSISTENT SYSTEM-WIDE POMODORO TIMER CONFIGURATION
// ==========================================================================
// Using LocalStorage caching to persist calculations across page navigation reloads
let isRunning = localStorage.getItem("tm_isRunning") === "true";
let isWorkSession = localStorage.getItem("tm_isWorkSession") !== "false"; // Default to true
let totalDuration =
  parseInt(localStorage.getItem("tm_totalDuration")) || 25 * 60;
let timeLeft = parseInt(localStorage.getItem("tm_timeLeft")) || totalDuration;
let endTime = parseInt(localStorage.getItem("tm_endTime")) || 0;

// Gather structural DOM pointers for both Main view elements and Mini elements
const timeDisplay = document.getElementById("timeDisplay");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const workInput = document.getElementById("workTime");
const breakInput = document.getElementById("breakTime");
const sessionStatus = document.getElementById("sessionStatus");
const progressRing = document.getElementById("progressRing");

const miniTimerOverlay = document.getElementById("miniTimerOverlay");
const miniTimeDisplay = document.getElementById("miniTimeDisplay");
const miniStartBtn = document.getElementById("miniStartBtn");
const miniResetBtn = document.getElementById("miniResetBtn");
const miniSessionStatus = document.getElementById("miniSessionStatus");

const CIRCUMFERENCE = 565.48;
let systemTimerInterval;

// Route Identification Switch
const isTimerPage = !!timeDisplay;

function initGlobalTimerState() {
  // If the timer was left running when we switched tabs, calculate the elapsed time gap
  if (isRunning && endTime > 0) {
    const remainingDelta = Math.round((endTime - Date.now()) / 1000);
    if (remainingDelta > 0) {
      timeLeft = remainingDelta;
    } else {
      // Timer expired while away
      timeLeft = 0;
      executeSessionCompletion();
      return;
    }
  }

  // Configure initial field states if on the settings view
  if (isTimerPage && workInput && breakInput) {
    workInput.value = localStorage.getItem("tm_workValue") || "25";
    breakInput.value = localStorage.getItem("tm_breakValue") || "5";
    document.getElementById("sessions").value =
      localStorage.getItem("tm_sessionsValue") || "4";
    document.getElementById("habitSelect").value =
      localStorage.getItem("tm_selectedHabit") || "";
  }

  updateGlobalUIs();
  evaluateOverlayVisibility();

  if (isRunning) {
    startTimerEngineLoop();
  }
}

function updateGlobalUIs() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTextString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Update Main clock text if it exists
  if (timeDisplay) timeDisplay.innerText = formattedTextString;
  // Update Floating mini bar text if it exists
  if (miniTimeDisplay) miniTimeDisplay.innerText = formattedTextString;

  // Synchronize text label blocks
  const focusLabel = currentLang === "ar" ? "وقت التركيز!" : "Focus Time!";
  const breakLabel = currentLang === "ar" ? "خذ استراحة!" : "Take a Break!";
  const readyLabel =
    currentLang === "ar"
      ? translations.ar.status_ready
      : translations.en.status_ready;

  let currentStatusText = isWorkSession ? focusLabel : breakLabel;
  if (timeLeft === totalDuration && !isRunning) currentStatusText = readyLabel;

  if (sessionStatus) sessionStatus.innerText = currentStatusText;
  if (miniSessionStatus) miniSessionStatus.innerText = currentStatusText;

  // Render SVG SVG animation if visible
  if (progressRing) {
    const progressFraction = timeLeft / totalDuration;
    const offset = CIRCUMFERENCE * (1 - progressFraction);
    progressRing.style.strokeDashoffset = offset;
    progressRing.className.baseVal = "ring-progress";

    if (!isWorkSession) {
      progressRing.classList.add("stage-break");
    } else {
      if (progressFraction <= 0.2) {
        progressRing.classList.add("stage-red");
      } else if (progressFraction <= 0.5) {
        progressRing.classList.add("stage-orange");
      } else {
        progressRing.classList.add("stage-green");
      }
    }
  }

  // Synchronize action buttons context words
  const startText =
    currentLang === "ar"
      ? translations.ar.btn_start
      : translations.en.btn_start;
  const pauseText = currentLang === "ar" ? "إيقاف مؤقت" : "Pause";
  const resumeText = currentLang === "ar" ? "استئناف" : "Resume";

  let btnLabel = startText;
  if (isRunning) btnLabel = pauseText;
  else if (timeLeft < totalDuration) btnLabel = resumeText;

  if (startBtn) startBtn.innerText = btnLabel;
  if (miniStartBtn) miniStartBtn.innerText = btnLabel;
}

function evaluateOverlayVisibility() {
  if (!miniTimerOverlay) return;

  // Check if the user is currently on the login or registration authentication pages
  const isAuthPage =
    window.location.pathname === "/login" ||
    window.location.pathname === "/register";

  // Condition: Hide the overlay if on the timer page OR if logged out on auth screens
  if (isTimerPage || isAuthPage) {
    miniTimerOverlay.classList.add("hidden-overlay");
  } else {
    miniTimerOverlay.classList.remove("hidden-overlay");
  }
}

function startTimerEngineLoop() {
  clearInterval(systemTimerInterval);

  // Set absolute timestamp target point used as single source of truth configuration
  if (endTime <= 0 || !localStorage.getItem("tm_endTime")) {
    endTime = Date.now() + timeLeft * 1000;
    localStorage.setItem("tm_endTime", endTime.toString());
  }

  systemTimerInterval = setInterval(() => {
    const delta = Math.round((endTime - Date.now()) / 1000);

    if (delta >= 0) {
      timeLeft = delta;
      localStorage.setItem("tm_timeLeft", timeLeft.toString());
      updateGlobalUIs();
    } else {
      clearInterval(systemTimerInterval);
      timeLeft = 0;
      localStorage.setItem("tm_timeLeft", "0");
      executeSessionCompletion();
    }
  }, 1000);
}

function executeSessionCompletion() {
  playAlarmSound();
  isRunning = false;
  endTime = 0;
  localStorage.setItem("tm_isRunning", "false");
  localStorage.removeItem("tm_endTime");

  const cachedHabitId = localStorage.getItem("tm_selectedHabit");
  const cachedWorkMinutes =
    parseInt(localStorage.getItem("tm_workValue")) || 25;

  // Credit session completion data back to server
  if (isWorkSession && cachedHabitId) {
    fetch("/api/habits/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habitId: cachedHabitId,
        minutesWorked: cachedWorkMinutes,
      }),
    })
      .then((res) => res.json())
      .then((data) => console.log("Progress flushed to backend:", data))
      .catch((err) => console.error("Data Sync failure:", err));
  }

  // Toggle cycle modes
  isWorkSession = !isWorkSession;
  localStorage.setItem("tm_isWorkSession", isWorkSession.toString());

  // Pull configuration parameters to step setup next run instances bounds
  const workMinutesSetting =
    parseInt(localStorage.getItem("tm_workValue")) || 25;
  const breakMinutesSetting =
    parseInt(localStorage.getItem("tm_breakValue")) || 5;

  totalDuration =
    (isWorkSession ? workMinutesSetting : breakMinutesSetting) * 60;
  timeLeft = totalDuration;

  localStorage.setItem("tm_totalDuration", totalDuration.toString());
  localStorage.setItem("tm_timeLeft", timeLeft.toString());

  updateGlobalUIs();
}

function toggleTimerTrigger() {
  if (isRunning) {
    // Halt Execution Logic Chain
    clearInterval(systemTimerInterval);
    isRunning = false;
    endTime = 0;
    localStorage.setItem("tm_isRunning", "false");
    localStorage.removeItem("tm_endTime");
    updateGlobalUIs();
  } else {
    // Fire Processing Sequences
    isRunning = true;
    localStorage.setItem("tm_isRunning", "true");
    startTimerEngineLoop();
    updateGlobalUIs();
  }
}

function resetTimerTrigger() {
  clearInterval(systemTimerInterval);
  isRunning = false;
  isWorkSession = true;
  endTime = 0;

  localStorage.setItem("tm_isRunning", "false");
  localStorage.setItem("tm_isWorkSession", "true");
  localStorage.removeItem("tm_endTime");

  const workMins = workInput
    ? parseInt(workInput.value)
    : parseInt(localStorage.getItem("tm_workValue")) || 25;
  totalDuration = workMins * 60;
  timeLeft = totalDuration;

  localStorage.setItem("tm_totalDuration", totalDuration.toString());
  localStorage.setItem("tm_timeLeft", timeLeft.toString());

  updateGlobalUIs();
}

// Bind Action Listeners to interface controls
if (startBtn) startBtn.addEventListener("click", toggleTimerTrigger);
if (miniStartBtn) miniStartBtn.addEventListener("click", toggleTimerTrigger);
if (resetBtn) resetBtn.addEventListener("click", resetTimerTrigger);
if (miniResetBtn) miniResetBtn.addEventListener("click", resetTimerTrigger);

if (isTimerPage && workInput && breakInput) {
  function saveInputsToStorage() {
    localStorage.setItem("tm_workValue", workInput.value);
    localStorage.setItem("tm_breakValue", breakInput.value);
    localStorage.setItem(
      "tm_sessionsValue",
      document.getElementById("sessions").value,
    );
    localStorage.setItem(
      "tm_selectedHabit",
      document.getElementById("habitSelect").value,
    );

    if (!isRunning) {
      const activeMins = isWorkSession
        ? parseInt(workInput.value)
        : parseInt(breakInput.value);
      totalDuration =
        isNaN(activeMins) || activeMins < 1 ? 1 * 60 : activeMins * 60;
      timeLeft = totalDuration;
      localStorage.setItem("tm_totalDuration", totalDuration.toString());
      localStorage.setItem("tm_timeLeft", timeLeft.toString());
      updateGlobalUIs();
    }
  }

  workInput.addEventListener("input", saveInputsToStorage);
  breakInput.addEventListener("input", saveInputsToStorage);
  document
    .getElementById("sessions")
    .addEventListener("input", saveInputsToStorage);
  document
    .getElementById("habitSelect")
    .addEventListener("change", saveInputsToStorage);
}

// Start context parsing
initGlobalTimerState();

// ==========================================================================
// 5. SYNTHETIC AUDIO GENERATOR (WEB AUDIO API)
// ==========================================================================
function playAlarmSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + 1.5,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1.5);
  } catch (e) {
    console.warn(
      "Audio context engine suspended by security block constraint handles.",
      e,
    );
  }
}
