// ==========================================================================
// DEVMOOR FRONTIER ENGINE & CORE CONFIGURATIONS
// ==========================================================================
console.log("[UI Script]: Initializing core workspace engine modules...");

// Global Deletion Hooks
let currentDeleteTargetId = null;

function triggerDeleteConfirmation(habitId, habitName) {
  currentDeleteTargetId = habitId;
  const targetedTextNode = document.getElementById("deleteTargetHabitName");
  if (targetedTextNode) targetedTextNode.innerText = habitName;
  const modalOverlay = document.getElementById("deleteConfirmationModal");
  if (modalOverlay) modalOverlay.style.display = "flex";
}

function closeDeleteModal() {
  currentDeleteTargetId = null;
  const modalOverlay = document.getElementById("deleteConfirmationModal");
  if (modalOverlay) modalOverlay.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const isTimerPage = window.location.pathname === "/timer";
  const isManagePage = window.location.pathname === "/manage";
  const isDashboardPage = window.location.pathname === "/";

  // ==========================================================================
  // 1. THEME ENGINE: SUN & MOON ICONS
  // ==========================================================================
  const themeToggleBtn = document.getElementById("themeToggle");

  function updateThemeUI(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = theme === "dark" ? "🌙 Dark" : "☀️ Light";
    }
  }

  if (!localStorage.getItem("theme")) localStorage.setItem("theme", "dark");
  updateThemeUI(localStorage.getItem("theme"));

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const activeDOMTheme =
        document.documentElement.getAttribute("data-theme");
      updateThemeUI(activeDOMTheme === "dark" ? "light" : "dark");
    });
  }

  // ==========================================================================
  // 2. GITHUB 365-DAY ACTIVITY GRID GENERATOR (DASHBOARD)
  // ==========================================================================
  const activityGraph = document.getElementById("activityGraph");
  if (isDashboardPage && activityGraph) {
    const postsData = JSON.parse(
      activityGraph.getAttribute("data-posts") || "[]",
    );
    const postCountsByDate = {};

    // Tally posts per day
    postsData.forEach((post) => {
      postCountsByDate[post.date] = (postCountsByDate[post.date] || 0) + 1;
    });

    // Generate 371 blocks (53 weeks * 7 days)
    for (let i = 0; i < 371; i++) {
      const block = document.createElement("div");
      block.className = "activity-block";

      // Backtrack dates from today
      let d = new Date();
      d.setDate(d.getDate() - (371 - i));
      const formattedDate = d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const count = postCountsByDate[formattedDate] || 0;
      block.setAttribute("data-level", Math.min(count, 4));
      block.title = `${count} logs on ${formattedDate}`;

      activityGraph.appendChild(block);
    }
  }

  // ==========================================================================
  // 3. POMODORO TIMER EXECUTION ENGINE
  // ==========================================================================
  let countdownInterval;
  const timeDisplay = document.getElementById("timeDisplay");
  const sessionStatus = document.getElementById("sessionStatus");
  const progressRing = document.getElementById("progressRing");
  const startBtn = document.getElementById("startBtn");
  const resetBtn = document.getElementById("resetBtn");
  const timelineTrack = document.getElementById("timelineTrack");
  const timelineIndicator = document.getElementById("timelineIndicator");
  const timelineCompletionPercent = document.getElementById(
    "timelineCompletionPercent",
  );

  // Form inputs
  const workInput = document.getElementById("workTime");
  const breakInput = document.getElementById("breakTime");
  const sessionInput = document.getElementById("sessions");
  const habitSelect = document.getElementById("habitSelect");

  function renderTimelineSegments() {
    if (!timelineTrack || !workInput || !breakInput || !sessionInput) return;

    // Clear track except for the moving indicator
    const indicator = document.getElementById("timelineIndicator");
    timelineTrack.innerHTML = "";
    if (indicator) timelineTrack.appendChild(indicator);

    const wMins = parseInt(workInput.value) || 25;
    const bMins = parseInt(breakInput.value) || 5;
    const rounds = parseInt(sessionInput.value) || 4;
    const totalMins = (wMins + bMins) * rounds;

    for (let i = 0; i < rounds; i++) {
      // Focus Segment
      let wPct = (wMins / totalMins) * 100;
      let wSeg = document.createElement("div");
      wSeg.className = "timeline-segment segment-focus";
      wSeg.style.width = wPct + "%";
      wSeg.innerText = "F";
      timelineTrack.appendChild(wSeg);

      // Break Segment
      let bPct = (bMins / totalMins) * 100;
      let bSeg = document.createElement("div");
      bSeg.className = "timeline-segment segment-break";
      bSeg.style.width = bPct + "%";
      bSeg.innerText = "B";
      timelineTrack.appendChild(bSeg);
    }
  }

  function syncTimerState() {
    if (!isTimerPage) return;

    const isRunning = localStorage.getItem("tm_runningStateActive") === "1";
    const isWork = localStorage.getItem("tm_isWorkSession") !== "false";
    const timeLeft =
      parseInt(localStorage.getItem("tm_timeLeft")) ||
      (parseInt(workInput.value) || 25) * 60;

    // Update Clock Display
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timeDisplay.innerText = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    // Update Status & Colors
    sessionStatus.innerText = isWork ? "Focus Session" : "Break Session";
    progressRing.className.baseVal = isWork
      ? "ring-progress stage-green"
      : "ring-progress stage-break";

    // Update SVG Progress
    const maxTime =
      (isWork ? parseInt(workInput.value) : parseInt(breakInput.value)) * 60;
    const offset = 565.48 - (timeLeft / maxTime) * 565.48;
    progressRing.style.strokeDashoffset = offset;

    // Sync Button
    startBtn.innerText = isRunning ? "Pause" : "Start";

    // Sync Indicator
    updateTimelineIndicator();
  }

  function updateTimelineIndicator() {
    if (!timelineIndicator) return;
    const wMins = parseInt(workInput.value) || 25;
    const bMins = parseInt(breakInput.value) || 5;
    const rounds = parseInt(sessionInput.value) || 4;
    const currentRoundIdx =
      parseInt(localStorage.getItem("tm_currentRoundIdx")) || 0;
    const isWorkSession = localStorage.getItem("tm_isWorkSession") !== "false";
    const timeLeft = parseInt(localStorage.getItem("tm_timeLeft")) || 0;

    const totalSessionSeconds = (wMins + bMins) * rounds * 60;
    let accumulatedSeconds = currentRoundIdx * (wMins + bMins) * 60;

    if (!isWorkSession) {
      accumulatedSeconds += wMins * 60 + (bMins * 60 - timeLeft);
    } else {
      accumulatedSeconds += wMins * 60 - timeLeft;
    }

    const percentage = Math.min(
      (accumulatedSeconds / totalSessionSeconds) * 100,
      100,
    );
    timelineIndicator.style.left = `${percentage}%`;
    if (timelineCompletionPercent)
      timelineCompletionPercent.innerText = `Completion: ${Math.round(percentage)}%`;
  }

  function handleTimerTick() {
    let timeLeft = parseInt(localStorage.getItem("tm_timeLeft"));
    if (timeLeft > 0) {
      timeLeft--;
      localStorage.setItem("tm_timeLeft", timeLeft);
      syncTimerState();
    } else {
      // Time is up!
      triggerProfessionalAlarmSequence();

      let isWork = localStorage.getItem("tm_isWorkSession") !== "false";
      let round = parseInt(localStorage.getItem("tm_currentRoundIdx")) || 0;
      const rounds = parseInt(sessionInput.value) || 4;

      if (isWork) {
        // Save progress to DB
        const hId = localStorage.getItem("tm_activeHabitId");
        const wMins = parseInt(workInput.value);
        if (hId) {
          fetch("/api/habits/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ habitId: hId, minutesWorked: wMins }),
          });
        }
        // Switch to Break
        localStorage.setItem("tm_isWorkSession", "false");
        localStorage.setItem("tm_timeLeft", parseInt(breakInput.value) * 60);
      } else {
        // Switch to Next Work Round
        round++;
        if (round >= rounds) {
          // Full cycle complete!
          localStorage.setItem("tm_runningStateActive", "0");
          localStorage.setItem("tm_currentRoundIdx", "0");
          localStorage.setItem("tm_isWorkSession", "true");
          localStorage.setItem("tm_timeLeft", parseInt(workInput.value) * 60);
          alert("All Pomodoro Rounds Completed! Outstanding work.");
          clearInterval(countdownInterval);
          syncTimerState();
          return;
        }
        localStorage.setItem("tm_currentRoundIdx", round);
        localStorage.setItem("tm_isWorkSession", "true");
        localStorage.setItem("tm_timeLeft", parseInt(workInput.value) * 60);
      }
      syncTimerState();
    }
  }

  // Timer Controls
  if (isTimerPage && startBtn && resetBtn) {
    // Initial setup on load
    if (!localStorage.getItem("tm_timeLeft")) {
      localStorage.setItem("tm_timeLeft", parseInt(workInput.value) * 60);
      localStorage.setItem("tm_isWorkSession", "true");
      localStorage.setItem("tm_currentRoundIdx", "0");
      localStorage.setItem("tm_runningStateActive", "0");
    }

    renderTimelineSegments();
    syncTimerState();

    // Restore active interval if refreshing page
    if (localStorage.getItem("tm_runningStateActive") === "1") {
      countdownInterval = setInterval(handleTimerTick, 1000);
    }

    // Input listeners to update segments
    [workInput, breakInput, sessionInput].forEach((inp) => {
      inp.addEventListener("change", () => {
        if (localStorage.getItem("tm_runningStateActive") === "0") {
          localStorage.setItem("tm_timeLeft", parseInt(workInput.value) * 60);
          renderTimelineSegments();
          syncTimerState();
        }
      });
    });

    startBtn.addEventListener("click", () => {
      if (localStorage.getItem("tm_runningStateActive") === "1") {
        // Pause
        localStorage.setItem("tm_runningStateActive", "0");
        clearInterval(countdownInterval);
      } else {
        // Start
        if (habitSelect.value)
          localStorage.setItem("tm_activeHabitId", habitSelect.value);
        localStorage.setItem("tm_runningStateActive", "1");
        countdownInterval = setInterval(handleTimerTick, 1000);
      }
      syncTimerState();
    });

    resetBtn.addEventListener("click", () => {
      document.getElementById("customResetModal").style.display = "flex";
    });

    document.getElementById("confirmResetBtn").addEventListener("click", () => {
      localStorage.setItem("tm_runningStateActive", "0");
      clearInterval(countdownInterval);
      localStorage.setItem("tm_timeLeft", parseInt(workInput.value) * 60);
      localStorage.setItem("tm_isWorkSession", "true");
      localStorage.setItem("tm_currentRoundIdx", "0");
      document.getElementById("customResetModal").style.display = "none";
      syncTimerState();
    });

    document.getElementById("cancelResetBtn").addEventListener("click", () => {
      document.getElementById("customResetModal").style.display = "none";
    });
  }

  // ==========================================================================
  // 4. SYNTHESIZER AUDIO ALARM ENGINE
  // ==========================================================================
  function triggerProfessionalAlarmSequence() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const duration = 10;
    const startTime = ctx.currentTime;

    for (let i = 0; i < duration; i++) {
      const pulseStart = startTime + i;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, pulseStart);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(440, pulseStart);

      gain1.gain.setValueAtTime(0.15, pulseStart);
      gain1.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.15);
      gain2.gain.setValueAtTime(0.08, pulseStart);
      gain2.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.15);

      gain1.gain.setValueAtTime(0.15, pulseStart + 0.25);
      gain1.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.4);
      gain2.gain.setValueAtTime(0.08, pulseStart + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.4);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(pulseStart);
      osc1.stop(pulseStart + 0.5);
      osc2.start(pulseStart);
      osc2.stop(pulseStart + 0.5);
    }
  }

  // ==========================================================================
  // 5. DELETION FLOW BINDINGS & SECURE PASSWORD REVEALS
  // ==========================================================================
  const confirmDeleteBtn = document.getElementById("confirmDeleteButton");
  if (isManagePage && confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (!currentDeleteTargetId) return;
      try {
        const response = await fetch(`/api/habits/${currentDeleteTargetId}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (result.success) window.location.reload();
      } catch (err) {
        console.error("Networking transport error ->", err);
      } finally {
        closeDeleteModal();
      }
    });
  }

  const passwordToggleMappings = [
    { triggerId: "togglePassword", inputId: "loginPassword" },
    { triggerId: "toggleRegPassword", inputId: "regPassword" },
  ];

  passwordToggleMappings.forEach(({ triggerId, inputId }) => {
    const triggerElement = document.getElementById(triggerId);
    const inputElement = document.getElementById(inputId);
    if (triggerElement && inputElement) {
      triggerElement.addEventListener("click", () => {
        const isPasswordType = inputElement.getAttribute("type") === "password";
        inputElement.setAttribute("type", isPasswordType ? "text" : "password");
      });
    }
  });
});
