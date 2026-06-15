// ==========================================================================
// 1. THEME TOGGLE ENGINE (DARK / LIGHT THEMES CONFIGURATOR)
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
// 2. BILINGUAL TRANSLATION LOCALIZATION SERVICE (EN / AR)
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
// 3. SECURE FIXED CALENDAR YEAR GRID VISUALIZER WITH LIVE TIMER TRACKING
// ==========================================================================
const graphContainer = document.getElementById("activityGraph");

if (graphContainer) {
  graphContainer.innerHTML = "";

  let realPostsData = [];
  try {
    const rawData = graphContainer.getAttribute("data-posts");
    realPostsData = JSON.parse(rawData || "[]");
  } catch (err) {
    console.error("Error parsing history log updates metrics:", err);
  }

  const dateContributionMap = {};

  realPostsData.forEach((post) => {
    if (post.date) {
      const parsedDateStr = new Date(post.date).toDateString();
      dateContributionMap[parsedDateStr] =
        (dateContributionMap[parsedDateStr] || 0) + 1;
    }
  });

  const localTimerCompletions = JSON.parse(
    localStorage.getItem("tm_completion_history") || "[]",
  );
  localTimerCompletions.forEach((item) => {
    const timestamp = typeof item === "string" ? item : item.timestamp;
    if (timestamp) {
      const parsedDateStr = new Date(timestamp).toDateString();
      dateContributionMap[parsedDateStr] =
        (dateContributionMap[parsedDateStr] || 0) + 1;
    }
  });

  const currentEngineTime = new Date();
  const currentYearInt = currentEngineTime.getFullYear();

  const baselineStartTimestamp = new Date(currentYearInt, 0, 1);
  const startDayOffset = baselineStartTimestamp.getDay();
  baselineStartTimestamp.setDate(
    baselineStartTimestamp.getDate() - startDayOffset,
  );

  const trackingBlocksArray = [];
  const totalGridCellsCount = 371;

  for (let i = 0; i < totalGridCellsCount; i++) {
    const activeCellDate = new Date(baselineStartTimestamp);
    activeCellDate.setDate(baselineStartTimestamp.getDate() + i);

    if (activeCellDate.getFullYear() > currentYearInt) {
      const dummyBlock = document.createElement("div");
      dummyBlock.className = "activity-block";
      dummyBlock.style.opacity = "0.05";
      graphContainer.appendChild(dummyBlock);
      continue;
    }

    const keyStringMatches = activeCellDate.toDateString();
    const countLoggedOnDate = dateContributionMap[keyStringMatches] || 0;

    let contributionIntensityLevel = "0";
    if (countLoggedOnDate > 0 && countLoggedOnDate <= 1)
      contributionIntensityLevel = "1";
    else if (countLoggedOnDate === 2) contributionIntensityLevel = "2";
    else if (countLoggedOnDate === 3) contributionIntensityLevel = "3";
    else if (countLoggedOnDate >= 4) contributionIntensityLevel = "4";

    const blockElement = document.createElement("div");
    blockElement.className = "activity-block";
    blockElement.setAttribute(
      "data-original-level",
      contributionIntensityLevel,
    );
    blockElement.setAttribute("data-level", contributionIntensityLevel);
    blockElement.setAttribute(
      "title",
      `${keyStringMatches} : ${countLoggedOnDate} activities logged`,
    );

    if (keyStringMatches === currentEngineTime.toDateString()) {
      blockElement.style.border = "1px solid #f59e0b";
    }

    graphContainer.appendChild(blockElement);
    trackingBlocksArray.push(blockElement);
  }

  setInterval(() => {
    const randomIndex = Math.floor(Math.random() * trackingBlocksArray.length);
    const targetBlock = trackingBlocksArray[randomIndex];
    if (!targetBlock) return;

    const originalIntensity = targetBlock.getAttribute("data-original-level");
    const randomFlashLevel = Math.floor(Math.random() * 3) + 2;

    targetBlock.setAttribute("data-level", randomFlashLevel.toString());
    targetBlock.classList.add("pulse-glow");

    setTimeout(() => {
      targetBlock.setAttribute("data-level", originalIntensity);
      targetBlock.classList.remove("pulse-glow");
    }, 1000);
  }, 450);
}

// ==========================================================================
// 3B. REACTIVE DYNAMIC SUMMARY OF ACHIEVEMENT SUBSYSTEM
// ==========================================================================
const summaryDateInput = document.getElementById("summaryFilterDate");
const summaryOutputGrid = document.getElementById(
  "summaryAchievementOutputGrid",
);
const habitsContainerEl = document.getElementById("habitsListCardContainer");

if (summaryDateInput && summaryOutputGrid && habitsContainerEl) {
  const todayObject = new Date();
  const localYear = todayObject.getFullYear();
  const localMonth = String(todayObject.getMonth() + 1).padStart(2, "0");
  const localDay = String(todayObject.getDate()).padStart(2, "0");

  summaryDateInput.value = `${localYear}-${localMonth}-${localDay}`;
  summaryDateInput.addEventListener(
    "change",
    processAchievementSummaryFiltering,
  );
  processAchievementSummaryFiltering();
}

function processAchievementSummaryFiltering() {
  if (!summaryDateInput || !summaryOutputGrid || !habitsContainerEl) return;

  summaryOutputGrid.innerHTML = "";
  const [year, month, day] = summaryDateInput.value.split("-");
  const selectedFilterDateString = new Date(
    year,
    month - 1,
    day,
  ).toDateString();

  let baseHabitsArray = [];
  try {
    baseHabitsArray = JSON.parse(
      habitsContainerEl.getAttribute("data-habits") || "[]",
    );
  } catch (e) {
    console.error(e);
  }

  const completedTimerHistory = JSON.parse(
    localStorage.getItem("tm_completion_history") || "[]",
  );
  const aggregatedMinutesPerHabitMap = {};

  completedTimerHistory.forEach((item) => {
    const timestamp = typeof item === "string" ? item : item.timestamp;
    const habitId =
      typeof item === "object"
        ? item.habitId
        : localStorage.getItem("tm_selectedHabit");
    const minutes =
      typeof item === "object"
        ? item.minutes
        : parseInt(localStorage.getItem("tm_workValue")) || 25;

    if (
      timestamp &&
      new Date(timestamp).toDateString() === selectedFilterDateString
    ) {
      aggregatedMinutesPerHabitMap[habitId] =
        (aggregatedMinutesPerHabitMap[habitId] || 0) + minutes;
    }
  });

  let renderedCardsCount = 0;

  baseHabitsArray.forEach((habit) => {
    const totalMinutesLoggedToday = aggregatedMinutesPerHabitMap[habit.id] || 0;

    if (totalMinutesLoggedToday > 0) {
      renderedCardsCount++;
      const completedHours = parseFloat(
        (totalMinutesLoggedToday / 60).toFixed(2),
      );
      const safeRequired = habit.requiredTime || 1;
      const dynamicPercentage = Math.min(
        Math.round((completedHours / safeRequired) * 100),
        100,
      );

      const cardNode = document.createElement("div");
      cardNode.className = "stat-card";
      cardNode.innerHTML = `
                <div class="circle" style="--percentage: ${dynamicPercentage}%;">
                    <span>${dynamicPercentage}%</span>
                </div>
                <h4 style="color: var(--text-main); margin-bottom: 0.25rem;">${habit.name}</h4>
                <p style="color: var(--primary); font-weight: 700; font-size: 0.9rem;">${completedHours} hrs tracked</p>
            `;
      summaryOutputGrid.appendChild(cardNode);
    }
  });

  if (renderedCardsCount === 0) {
    const [y, m, d] = summaryDateInput.value.split("-");
    const formattedDisplayDate = new Date(y, m - 1, d).toLocaleDateString(
      undefined,
      { month: "short", day: "numeric", year: "numeric" },
    );

    summaryOutputGrid.innerHTML = `
            <p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-style: italic; padding: 2rem 0;">
                No active focus tracking sessions logged on ${formattedDisplayDate}.
            </p>
        `;
  }
}

// ==========================================================================
// 4. PERSISTENT SYSTEM-WIDE POMODORO TIMER MANAGEMENT HUB CONFIGURATION
// ==========================================================================
let isRunning = localStorage.getItem("tm_isRunning") === "true";
let isWorkSession = localStorage.getItem("tm_isWorkSession") !== "false";
let totalDuration =
  parseInt(localStorage.getItem("tm_totalDuration")) || 25 * 60;
let timeLeft = parseInt(localStorage.getItem("tm_timeLeft")) || totalDuration;
let endTime = parseInt(localStorage.getItem("tm_endTime")) || 0;
let currentRoundIdx = parseInt(localStorage.getItem("tm_currentRoundIdx")) || 0;

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

const timelineTrack = document.getElementById("timelineTrack");
const timelineIndicator = document.getElementById("timelineIndicator");
const timelineCompletionPercent = document.getElementById(
  "timelineCompletionPercent",
);

const customResetModal = document.getElementById("customResetModal");
const confirmResetBtn = document.getElementById("confirmResetBtn");
const cancelResetBtn = document.getElementById("cancelResetBtn");

const CIRCUMFERENCE = 565.48;
let systemTimerInterval;
const isTimerPage = !!timeDisplay;

function initGlobalTimerState() {
  if (isRunning && endTime > 0) {
    const remainingDelta = Math.round((endTime - Date.now()) / 1000);
    if (remainingDelta > 0) {
      timeLeft = remainingDelta;
    } else {
      timeLeft = 0;
      executeSessionCompletion();
      return;
    }
  }

  if (isTimerPage && workInput && breakInput) {
    workInput.value = localStorage.getItem("tm_workValue") || "25";
    breakInput.value = localStorage.getItem("tm_breakValue") || "5";
    document.getElementById("sessions").value =
      localStorage.getItem("tm_sessionsValue") || "4";
    document.getElementById("habitSelect").value =
      localStorage.getItem("tm_selectedHabit") || "";
  }

  renderTimelineTrackStructure();
  updateGlobalUIs();
  evaluateOverlayVisibility();

  if (isRunning) {
    startTimerEngineLoop();
  }
}

function renderTimelineTrackStructure() {
  if (!isTimerPage || !timelineTrack) return;

  const segments = timelineTrack.querySelectorAll(".timeline-segment");
  segments.forEach((s) => s.remove());

  const wMins = parseInt(localStorage.getItem("tm_workValue")) || 25;
  const bMins = parseInt(localStorage.getItem("tm_breakValue")) || 5;
  const totalRounds = parseInt(localStorage.getItem("tm_sessionsValue")) || 4;
  const totalSessionMinutes = wMins * totalRounds + bMins * totalRounds;

  for (let i = 0; i < totalRounds; i++) {
    const focusW = (wMins / totalSessionMinutes) * 100;
    const fSeg = document.createElement("div");
    fSeg.className = "timeline-segment segment-focus";
    fSeg.style.width = `${focusW}%`;
    fSeg.innerText = `R${i + 1} Focus`;
    timelineTrack.appendChild(fSeg);

    const breakW = (bMins / totalSessionMinutes) * 100;
    const bSeg = document.createElement("div");
    bSeg.className = "timeline-segment segment-break";
    bSeg.style.width = `${breakW}%`;
    bSeg.innerText = `B${i + 1}`;
    timelineTrack.appendChild(bSeg);
  }
}

function updateGlobalUIs() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTextString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  if (timeDisplay) timeDisplay.innerText = formattedTextString;
  if (miniTimeDisplay) miniTimeDisplay.innerText = formattedTextString;

  const focusLabel = currentLang === "ar" ? "وقت التركيز!" : "Focus Time!";
  const breakLabel = currentLang === "ar" ? "خذ استراحة!" : "Take a Break!";
  const readyLabel =
    currentLang === "ar"
      ? translations.ar.status_ready
      : translations.en.status_ready;

  let currentStatusText = isWorkSession ? focusLabel : breakLabel;
  if (timeLeft === totalDuration && !isRunning && currentRoundIdx === 0)
    currentStatusText = readyLabel;

  if (sessionStatus) sessionStatus.innerText = currentStatusText;
  if (miniSessionStatus) miniSessionStatus.innerText = currentStatusText;

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

  if (isTimerPage && timelineIndicator && timelineCompletionPercent) {
    const wMins = parseInt(localStorage.getItem("tm_workValue")) || 25;
    const bMins = parseInt(localStorage.getItem("tm_breakValue")) || 5;
    const totalRounds = parseInt(localStorage.getItem("tm_sessionsValue")) || 4;
    const totalSessionSeconds =
      (wMins * totalRounds + bMins * totalRounds) * 60;

    let accumulatedSeconds = 0;
    for (let i = 0; i < currentRoundIdx; i++) {
      accumulatedSeconds += wMins * 60 + bMins * 60;
    }

    if (!isWorkSession) {
      accumulatedSeconds += wMins * 60;
      accumulatedSeconds += bMins * 60 - timeLeft;
    } else {
      accumulatedSeconds += wMins * 60 - timeLeft;
    }

    const linearGlobalPercentage = Math.min(
      (accumulatedSeconds / totalSessionSeconds) * 100,
      100,
    );
    timelineIndicator.style.left = `${linearGlobalPercentage}%`;
    timelineCompletionPercent.innerText = `Completion: ${Math.round(linearGlobalPercentage)}%`;
  }

  const startText =
    currentLang === "ar"
      ? translations.ar.btn_start
      : translations.en.btn_start;
  const pauseText = currentLang === "ar" ? "إيقاف مؤقت" : "Pause";
  const resumeText = currentLang === "ar" ? "استئناف" : "Resume";

  let btnLabel = startText;
  if (isRunning) btnLabel = pauseText;
  else if (timeLeft < totalDuration || currentRoundIdx > 0)
    btnLabel = resumeText;

  if (startBtn) startBtn.innerText = btnLabel;
  if (miniStartBtn) miniStartBtn.innerText = btnLabel;
}

function evaluateOverlayVisibility() {
  if (!miniTimerOverlay) return;
  const isAuthPage =
    window.location.pathname === "/login" ||
    window.location.pathname === "/register";
  if (isTimerPage || isAuthPage) {
    miniTimerOverlay.classList.add("hidden-overlay");
  } else {
    miniTimerOverlay.classList.remove("hidden-overlay");
  }
}

function startTimerEngineLoop() {
  clearInterval(systemTimerInterval);

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

function triggerWebNotificationCard(headerTitle, messageContent, iconTheme) {
  const oldModal = document.getElementById("webCompletionNotifyCard");
  if (oldModal) oldModal.remove();

  const modalBox = document.createElement("div");
  modalBox.id = "webCompletionNotifyCard";
  modalBox.style =
    "display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); z-index: 999999; justify-content: center; align-items: center;";

  modalBox.innerHTML = `
        <div class="card" style="max-width: 440px; width: 90%; text-align: center; padding: 2.5rem; border-radius: 14px; border: 1px solid var(--border); background-color: var(--card-bg); box-shadow: var(--shadow);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">${iconTheme}</div>
            <h3 style="margin-bottom: 0.75rem; color: var(--text-main); font-weight: 800; font-size: 1.4rem;">${headerTitle}</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5;">${messageContent}</p>
            <button onclick="document.getElementById('webCompletionNotifyCard').remove()" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; font-size: 1rem; border-radius: 6px;">Continue</button>
        </div>
    `;
  document.body.appendChild(modalBox);
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
  const totalRoundsSetting =
    parseInt(localStorage.getItem("tm_sessionsValue")) || 4;

  let habitTargetHours = 1;
  const habitsContainerEl = document.getElementById("habitsListCardContainer");
  if (habitsContainerEl) {
    try {
      const habitsArr = JSON.parse(
        habitsContainerEl.getAttribute("data-habits") || "[]",
      );
      const activeHabit = habitsArr.find((h) => h.id === cachedHabitId);
      if (activeHabit) habitTargetHours = activeHabit.requiredTime || 1;
    } catch (e) {}
  }

  if (isWorkSession && cachedHabitId) {
    const ongoingHistory = JSON.parse(
      localStorage.getItem("tm_completion_history") || "[]",
    );
    ongoingHistory.push({
      timestamp: new Date().toString(),
      habitId: cachedHabitId,
      minutes: cachedWorkMinutes,
    });
    localStorage.setItem(
      "tm_completion_history",
      JSON.stringify(ongoingHistory),
    );

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

  if (!isWorkSession) {
    currentRoundIdx++;
    localStorage.setItem("tm_currentRoundIdx", currentRoundIdx.toString());
  }

  const todayDateString = new Date().toDateString();
  const historyList = JSON.parse(
    localStorage.getItem("tm_completion_history") || "[]",
  );
  let totalMinutesLoggedToday = 0;

  historyList.forEach((item) => {
    const ts = typeof item === "string" ? item : item.timestamp;
    const hId =
      typeof item === "object"
        ? item.habitId
        : localStorage.getItem("tm_selectedHabit");
    const mins = typeof item === "object" ? item.minutes : cachedWorkMinutes;

    if (
      ts &&
      new Date(ts).toDateString() === todayDateString &&
      hId === cachedHabitId
    ) {
      totalMinutesLoggedToday += mins;
    }
  });

  const totalHoursLoggedToday = totalMinutesLoggedToday / 60;

  if (currentRoundIdx >= totalRoundsSetting) {
    if (totalHoursLoggedToday >= habitTargetHours) {
      triggerWebNotificationCard(
        "Target Achieved! 🏆",
        "You did it! You achieved your required daily target hours milestone for this routine perfectly!",
        "🎯",
      );
    } else {
      triggerWebNotificationCard(
        "GREAT JOB! 🎉",
        "Fantastic work! You completed the entire planned multi-round session sequence exactly as structured.",
        "💪",
      );
    }
    resetTimerTrigger(true);
    return;
  } else {
    const cycleText = isWorkSession
      ? "Focus interval completed! Time to slide into your restorative break phase row."
      : "Break cycle finished! Re-align focus vectors for the next segment.";
    triggerWebNotificationCard("Interval Matrix Crossed", cycleText, "⏱️");
  }

  isWorkSession = !isWorkSession;
  localStorage.setItem("tm_isWorkSession", isWorkSession.toString());

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
    clearInterval(systemTimerInterval);
    isRunning = false;
    endTime = 0;
    localStorage.setItem("tm_isRunning", "false");
    localStorage.removeItem("tm_endTime");
    updateGlobalUIs();
  } else {
    isRunning = true;
    localStorage.setItem("tm_isRunning", "true");
    startTimerEngineLoop();
    updateGlobalUIs();
  }
}

function openResetModal() {
  if (customResetModal) customResetModal.style.display = "flex";
}

function closeResetModal() {
  if (customResetModal) customResetModal.style.display = "none";
}

function resetTimerTrigger(bypassConfirm = false) {
  if (bypassConfirm !== true) {
    openResetModal();
    return;
  }

  closeResetModal();
  clearInterval(systemTimerInterval);
  isRunning = false;
  isWorkSession = true;
  endTime = 0;
  currentRoundIdx = 0;

  localStorage.setItem("tm_isRunning", "false");
  localStorage.setItem("tm_isWorkSession", "true");
  localStorage.setItem("tm_currentRoundIdx", "0");
  localStorage.removeItem("tm_endTime");

  const workMins = workInput
    ? parseInt(workInput.value)
    : parseInt(localStorage.getItem("tm_workValue")) || 25;
  totalDuration = workMins * 60;
  timeLeft = totalDuration;

  localStorage.setItem("tm_totalDuration", totalDuration.toString());
  localStorage.setItem("tm_timeLeft", timeLeft.toString());

  renderTimelineTrackStructure();
  updateGlobalUIs();
}

if (startBtn) startBtn.addEventListener("click", toggleTimerTrigger);
if (miniStartBtn) miniStartBtn.addEventListener("click", toggleTimerTrigger);
if (resetBtn)
  resetBtn.addEventListener("click", () => resetTimerTrigger(false));
if (miniResetBtn)
  miniResetBtn.addEventListener("click", () => resetTimerTrigger(false));
if (confirmResetBtn)
  confirmResetBtn.addEventListener("click", () => resetTimerTrigger(true));
if (cancelResetBtn) cancelResetBtn.addEventListener("click", closeResetModal);

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

    if (!isRunning && currentRoundIdx === 0) {
      const activeMins = isWorkSession
        ? parseInt(workInput.value)
        : parseInt(breakInput.value);
      totalDuration =
        isNaN(activeMins) || activeMins < 1 ? 1 * 60 : activeMins * 60;
      timeLeft = totalDuration;
      localStorage.setItem("tm_totalDuration", totalDuration.toString());
      localStorage.setItem("tm_timeLeft", timeLeft.toString());
      renderTimelineTrackStructure();
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

initGlobalTimerState();

// ==========================================================================
// 4B. APPENDED TAIL END: REACTIVE GOAL COMPLETENESS CHECKER
// ==========================================================================
const calcSelectElement = document.getElementById("habitSelect");
const calcWorkTimeElement = document.getElementById("workTime");
const calcSessionsElement = document.getElementById("sessions");
const calcOutputPanelWrapper = document.getElementById(
  "goalCalcTextOutputWrapper",
);
const targetHabitContainerElement = document.getElementById(
  "habitsListCardContainer",
);

if (
  calcSelectElement &&
  calcWorkTimeElement &&
  calcSessionsElement &&
  calcOutputPanelWrapper &&
  targetHabitContainerElement
) {
  function recomputeInteractiveGoalPlan() {
    const structuralHabitId = calcSelectElement.value;
    if (!structuralHabitId) {
      calcOutputPanelWrapper.innerHTML = `<p style="color: var(--text-muted); font-style: italic; font-size: 0.9rem; text-align: center; padding: 1rem 0;">Select an initialized habit above to activate live goal completeness checker.</p>`;
      return;
    }

    let habitsRegistryData = [];
    try {
      habitsRegistryData = JSON.parse(
        targetHabitContainerElement.getAttribute("data-habits") || "[]",
      );
    } catch (e) {
      console.error(e);
    }

    const chosenHabitObject = habitsRegistryData.find(
      (h) => h.id === structuralHabitId,
    );
    if (!chosenHabitObject) return;

    const totalTargetHoursRequired = chosenHabitObject.requiredTime || 1;
    const totalTargetMinutesRequired = totalTargetHoursRequired * 60;

    const inputWorkDurationMinutes = parseInt(calcWorkTimeElement.value) || 0;
    const inputRoundsCountSetting = parseInt(calcSessionsElement.value) || 0;
    const plannedProductionMinutes =
      inputWorkDurationMinutes * inputRoundsCountSetting;

    const reqH = Math.floor(totalTargetMinutesRequired / 60);
    const reqM = Math.round(totalTargetMinutesRequired % 60);
    const reqDisplayStr = `${reqH}H : ${reqM.toString().padStart(2, "0")}M`;

    if (plannedProductionMinutes === totalTargetMinutesRequired) {
      // GREEN CARD: Perfect Balance
      calcOutputPanelWrapper.innerHTML = `
                <div style="text-align: center; padding: 0.5rem 0;">
                    <p style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Target Habit: <span style="color: var(--primary);">${chosenHabitObject.name}</span></p>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">Total Requirement: <strong>${reqDisplayStr}</strong></p>
                    <div style="background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; padding: 12px; border-radius: 6px; font-weight: 700; font-size: 0.95rem;">
                        🎉 That's exactly what you need, good to go!
                    </div>
                </div>
            `;
    } else if (plannedProductionMinutes > totalTargetMinutesRequired) {
      // BLUE/ANY OTHER COLOR CARD: Over Target Plan Allocation
      calcOutputPanelWrapper.innerHTML = `
                <div style="text-align: center; padding: 0.5rem 0;">
                    <p style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Target Habit: <span style="color: var(--primary);">${chosenHabitObject.name}</span></p>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">Total Requirement: <strong>${reqDisplayStr}</strong></p>
                    <div style="background-color: rgba(59, 130, 246, 0.15); border: 1px solid #3b82f6; color: #3b82f6; padding: 12px; border-radius: 6px; font-weight: 700; font-size: 0.95rem;">
                        🚀 That's more than your plan!
                    </div>
                </div>
            `;
    } else {
      // RED CARD: Under Budget Plan Limits
      const missingMinutesDelta =
        totalTargetMinutesRequired - plannedProductionMinutes;
      const deltaH = Math.floor(missingMinutesDelta / 60);
      const deltaM = Math.round(missingMinutesDelta % 60);
      const deltaDisplayStr = `${deltaH}H : ${deltaM.toString().padStart(2, "0")}M`;

      calcOutputPanelWrapper.innerHTML = `
                <div style="text-align: left; padding: 0.25rem 0;">
                    <p style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">Routine: <span style="color: var(--primary);">${chosenHabitObject.name}</span></p>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Daily Goal: <strong>${reqDisplayStr}</strong></p>
                    <div style="background-color: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; padding: 12px; border-radius: 6px; font-weight: 600; font-size: 0.9rem; line-height: 1.4;">
                        To achieve your target layout thresholds, you still need to add more <strong style="font-family: monospace; font-size: 1rem;">${deltaDisplayStr}</strong> into your planned focus rounds configuration block.
                    </div>
                </div>
            `;
    }
  }

  calcSelectElement.addEventListener("change", recomputeInteractiveGoalPlan);
  calcWorkTimeElement.addEventListener("input", recomputeInteractiveGoalPlan);
  calcSessionsElement.addEventListener("input", recomputeInteractiveGoalPlan);
}

// ==========================================================================
// 5. SYNTHETIC AUDIO GENERATOR LAYER (WEB AUDIO API ENGINE)
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

// ==========================================================================
// 6. NAVIGATION INTERACTION DROPDOWN LAYOUT HANDLER
// ==========================================================================
function toggleProfileMenu(event) {
  event.stopPropagation();
  const menu = document.getElementById("profileMenu");
  if (menu.style.display === "none" || menu.style.display === "") {
    menu.style.display = "block";
  } else {
    menu.style.display = "none";
  }
}

window.addEventListener("click", function (event) {
  const menu = document.getElementById("profileMenu");
  if (menu && menu.style.display === "block") {
    if (
      !event.target.matches(".btn-profile") &&
      !event.target.closest("#profileMenu")
    ) {
      menu.style.display = "none";
    }
  }
});

// ==========================================================================
// 7. SECURE AUTHENTICATION PASSWORD VISIBILITY TOGGLE HIERARCHY
// ==========================================================================
const passwordToggleMappings = [
  { triggerId: 'togglePassword', inputId: 'loginPassword' },
  { triggerId: 'toggleRegPassword', inputId: 'regPassword' }
];

passwordToggleMappings.forEach(({ triggerId, inputId }) => {
  const triggerElement = document.getElementById(triggerId);
  const inputElement = document.getElementById(inputId);
  
  // Guard clause to prevent errors when elements aren't rendered on the DOM
  if (triggerElement && inputElement) {
    triggerElement.addEventListener('click', () => {
      const isPasswordType = inputElement.getAttribute('type') === 'password';
      inputElement.setAttribute('type', isPasswordType ? 'text' : 'password');
      console.log(`[UI Engine]: Toggled ${inputId} visibility to: ${isPasswordType ? 'text' : 'password'}`);
    });
  }
});