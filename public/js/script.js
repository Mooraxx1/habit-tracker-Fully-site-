// ==========================================================================
// ALL FRONTIER EVENT IMPLEMENTATIONS & CONFIGURATIONS ENGINE
// ==========================================================================
console.log("[UI Script]: Initializing core workspace engine modules...");

let currentDeleteTargetId = null;

// Clean, global visibility configurations for deletion card execution handling
function triggerDeleteConfirmation(habitId, habitName) {
  currentDeleteTargetId = habitId;
  document.getElementById("deleteTargetHabitName").innerText = habitName;
  document.getElementById("deleteConfirmationModal").style.display = "flex";
}

function closeDeleteModal() {
  currentDeleteTargetId = null;
  document.getElementById("deleteConfirmationModal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const isTimerPage = window.location.pathname === "/timer";
  const isManagePage = window.location.pathname === "/manage";

  // ==========================================================================
  // 1. THEME MANAGEMENT ENGINE CONTROLLER (LIGHT/DARK ROUTINES)
  // ==========================================================================
  const themeToggleBtn = document.getElementById("themeToggle");

  // Set default storage configurations tracking fallback checks
  if (!localStorage.getItem("theme")) {
    localStorage.setItem("theme", "dark");
  }

  const currentTheme = localStorage.getItem("theme");
  document.documentElement.setAttribute("data-theme", currentTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const activeTheme = document.documentElement.getAttribute("data-theme");
      const targetTheme = activeTheme === "dark" ? "light" : "dark";

      document.documentElement.setAttribute("data-theme", targetTheme);
      localStorage.setItem("theme", targetTheme);
      console.log(
        `[UI Engine]: System root theme mapping shifted to -> ${targetTheme}`,
      );
    });
  }

  // ==========================================================================
  // 2. DYNAMIC CONFIRMATION DELETE EXECUTION BINDINGS
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

        if (result.success) {
          window.location.reload();
        } else {
          console.error(
            "Critical failure during routine data synchronization removal operations.",
          );
        }
      } catch (err) {
        console.error(
          "Networking transport vector error connecting to endpoints ->",
          err,
        );
      } finally {
        closeDeleteModal();
      }
    });
  }

  // ==========================================================================
  // 3. PROFESSIONAL 10-SECOND OSCILLATOR AUDIO SYNTHESIS HUB
  // ==========================================================================
  function triggerProfessionalAlarmSequence() {
    console.log(
      "[Audio Engine]: Initiating dual-tone 10s professional Pomodoro alarm sequence.",
    );

    // Check framework support parameters mapping execution structures
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const duration = 10; // Enforce exact 10 second run runtime restriction
    const startTime = ctx.currentTime;

    // Emits neat rhythmic dual pulses every second block tracking intervals loops
    for (let i = 0; i < duration; i++) {
      const pulseStart = startTime + i;

      // Primary tone oscillator sequence configuration blocks
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, pulseStart); // High professional A5 note pitch register

      // Secondary supporting harmonizing frequency array matching node maps
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(440, pulseStart); // Foundation pitch structure tone

      // Rhythmic envelope decay compression structure execution algorithms
      gain1.gain.setValueAtTime(0.15, pulseStart);
      gain1.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.15);

      gain2.gain.setValueAtTime(0.08, pulseStart);
      gain2.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.15);

      // Repeat a rapid secondary echo double beat step structure
      gain1.gain.setValueAtTime(0.15, pulseStart + 0.25);
      gain1.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.4);
      gain2.gain.setValueAtTime(0.08, pulseStart + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.4);

      // Wire nodes to hardware transport channels audio pipelines
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
  // 4. TIMELINE INDICATOR INTERFACE MOUNT ENGINE
  // ==========================================================================
  const timelineIndicator = document.getElementById("timelineIndicator");
  const timelineCompletionPercent = document.getElementById(
    "timelineCompletionPercent",
  );
  const timelineTrack = document.getElementById("timelineTrack");

  function updateGlobalUIs() {
    if (
      !isTimerPage ||
      !timelineIndicator ||
      !timelineCompletionPercent ||
      !timelineTrack
    )
      return;

    const currentRoundIdx =
      parseInt(localStorage.getItem("tm_currentRoundIdx")) || 0;
    const isWorkSession = localStorage.getItem("tm_isWorkSession") === "true";
    const timeLeft = parseInt(localStorage.getItem("tm_timeLeft")) || 0;

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

    // Capture state rollover triggers directly at edge completion vectors boundaries
    if (
      timeLeft === 0 &&
      parseInt(localStorage.getItem("tm_runningStateActive")) === 1
    ) {
      triggerProfessionalAlarmSequence();
    }

    const linearGlobalPercentage = Math.min(
      (accumulatedSeconds / totalSessionSeconds) * 100,
      100,
    );
    timelineIndicator.style.left = `${linearGlobalPercentage}%`;
    timelineCompletionPercent.innerText = `Completion: ${Math.round(linearGlobalPercentage)}%`;
  }

  setInterval(updateGlobalUIs, 1000);
  updateGlobalUIs();

  // ==========================================================================
  // 5. SECURE AUTHENTICATION PASSWORD VISIBILITY TOGGLE HIERARCHY
  // ==========================================================================
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
