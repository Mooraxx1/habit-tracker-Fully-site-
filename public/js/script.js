// ==========================================================================
// HABIT TRACKER GENERAL CONTROL & ENGINE CONFIGURATIONS
// ==========================================================================
console.log("[UI Script]: Initializing core workspace engine modules...");

// Global reference pointer mapping targeted habit items across structural DOM cards
let currentDeleteTargetId = null;

/**
 * Universally visible hook used by individual habit components to trigger custom removal prompts
 */
function triggerDeleteConfirmation(habitId, habitName) {
  currentDeleteTargetId = habitId;
  const targetedTextNode = document.getElementById("deleteTargetHabitName");
  if (targetedTextNode) {
    targetedTextNode.innerText = habitName;
  }
  const modalOverlay = document.getElementById("deleteConfirmationModal");
  if (modalOverlay) {
    modalOverlay.style.display = "flex";
  }
}

/**
 * Safe utility to drop the visibility matrix of the confirmation popups
 */
function closeDeleteModal() {
  currentDeleteTargetId = null;
  const modalOverlay = document.getElementById("deleteConfirmationModal");
  if (modalOverlay) {
    modalOverlay.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const isTimerPage = window.location.pathname === "/timer";
  const isManagePage = window.location.pathname === "/manage";

  // ==========================================================================
  // 1. PERSISTENT THEME CONTROLLER MODULE (LIGHT / DARK RE-ENGINEERING)
  // ==========================================================================
  const themeToggleBtn = document.getElementById("themeToggle");

  // Ensure fallbacks are firmly recorded inside the client's memory storage
  if (!localStorage.getItem("theme")) {
    localStorage.setItem("theme", "dark");
  }

  const initialStoredTheme = localStorage.getItem("theme");
  document.documentElement.setAttribute("data-theme", initialStoredTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const activeDOMTheme =
        document.documentElement.getAttribute("data-theme");
      const structuralTargetTheme =
        activeDOMTheme === "dark" ? "light" : "dark";

      document.documentElement.setAttribute(
        "data-theme",
        structuralTargetTheme,
      );
      localStorage.setItem("theme", structuralTargetTheme);
      console.log(
        `[UI Engine]: System root theme mapping shifted to -> ${structuralTargetTheme}`,
      );
    });
  }

  // ==========================================================================
  // 2. HABIT DELETION ASYNCHRONOUS TRANSACTION FLOWS (MODAL BACKEND MATRIX)
  // ==========================================================================
  const confirmDeleteBtn = document.getElementById("confirmDeleteButton");
  if (isManagePage && confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (!currentDeleteTargetId) return;

      try {
        const networkSyncResponse = await fetch(
          `/api/habits/${currentDeleteTargetId}`,
          {
            method: "DELETE",
          },
        );
        const responseDataParsed = await networkSyncResponse.json();

        if (responseDataParsed.success) {
          window.location.reload();
        } else {
          console.error(
            "[Data Sync]: Error response received from removal endpoints.",
          );
        }
      } catch (networkTransportErr) {
        console.error(
          "[Transport Error]: Failed connecting to delete vector ->",
          networkTransportErr,
        );
      } finally {
        closeDeleteModal();
      }
    });
  }

  // ==========================================================================
  // 3. NATIVE PROFESSIONAL 10-SECOND OSCILLATOR AUDIO SYNTHESIS HUB
  // ==========================================================================
  function triggerProfessionalAlarmSequence() {
    console.log(
      "[Audio Engine]: Initiating dual-tone 10s professional Pomodoro alarm sequence.",
    );

    const WebAudioContextConstructor =
      window.AudioContext || window.webkitAudioContext;
    if (!WebAudioContextConstructor) return;

    const audioCtx = new WebAudioContextConstructor();
    const absoluteSessionStartTime = audioCtx.currentTime;
    const targetAlertDurationSeconds = 10; // Forced lock tracking parameter constraint

    // Synthesize rhythmic sound pulses repeating across exact 1-second chunks
    for (
      let secondBlockIdx = 0;
      secondBlockIdx < targetAlertDurationSeconds;
      secondBlockIdx++
    ) {
      const rhythmicPulseTriggerOffset =
        absoluteSessionStartTime + secondBlockIdx;

      // Frequency Pitch Oscillator node 1 (High crisp clear indicator tone)
      const structuralOscillatorNode1 = audioCtx.createOscillator();
      const gainNodeEnvelope1 = audioCtx.createGain();
      structuralOscillatorNode1.type = "sine";
      structuralOscillatorNode1.frequency.setValueAtTime(
        880,
        rhythmicPulseTriggerOffset,
      ); // Pitch standard A5

      // Frequency Pitch Oscillator node 2 (Deep warm underlying supporting harmonic anchor)
      const structuralOscillatorNode2 = audioCtx.createOscillator();
      const gainNodeEnvelope2 = audioCtx.createGain();
      structuralOscillatorNode2.type = "triangle";
      structuralOscillatorNode2.frequency.setValueAtTime(
        440,
        rhythmicPulseTriggerOffset,
      ); // Pitch standard A4

      // Map standard volume step curves to manage professional decay envelopes
      gainNodeEnvelope1.gain.setValueAtTime(0.2, rhythmicPulseTriggerOffset);
      gainNodeEnvelope1.gain.exponentialRampToValueAtTime(
        0.001,
        rhythmicPulseTriggerOffset + 0.15,
      );

      gainNodeEnvelope2.gain.setValueAtTime(0.1, rhythmicPulseTriggerOffset);
      gainNodeEnvelope2.gain.exponentialRampToValueAtTime(
        0.001,
        rhythmicPulseTriggerOffset + 0.15,
      );

      // Double beat bounce delay segment mapping calculations
      gainNodeEnvelope1.gain.setValueAtTime(
        0.2,
        rhythmicPulseTriggerOffset + 0.25,
      );
      gainNodeEnvelope1.gain.exponentialRampToValueAtTime(
        0.001,
        rhythmicPulseTriggerOffset + 0.4,
      );
      gainNodeEnvelope2.gain.setValueAtTime(
        0.1,
        rhythmicPulseTriggerOffset + 0.25,
      );
      gainNodeEnvelope2.gain.exponentialRampToValueAtTime(
        0.001,
        rhythmicPulseTriggerOffset + 0.4,
      );

      // Bind operational system hardware connection pipelines
      structuralOscillatorNode1.connect(gainNodeEnvelope1);
      gainNodeEnvelope1.connect(audioCtx.destination);

      structuralOscillatorNode2.connect(gainNodeEnvelope2);
      gainNodeEnvelope2.connect(audioCtx.destination);

      // Execute execution ranges cleanly across individual pulse spaces
      structuralOscillatorNode1.start(rhythmicPulseTriggerOffset);
      structuralOscillatorNode1.stop(rhythmicPulseTriggerOffset + 0.5);

      structuralOscillatorNode2.start(rhythmicPulseTriggerOffset);
      structuralOscillatorNode2.stop(rhythmicPulseTriggerOffset + 0.5);
    }
  }

  // ==========================================================================
  // 4. TIMELINE INDICATOR INTERFACE TRACK RENDER ENGINE
  // ==========================================================================
  const timelineIndicator = document.getElementById("timelineIndicator");
  const timelineCompletionPercent = document.getElementById(
    "timelineCompletionPercent",
  );
  const timelineTrack = document.getElementById("timelineTrack");

  function updateGlobalUIs() {
    // Halt entirely if target rendering controls don't explicitly load on layout models
    if (
      !isTimerPage ||
      !timelineIndicator ||
      !timelineCompletionPercent ||
      !timelineTrack
    ) {
      return;
    }

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

    // Trigger the professional synthesizer alarm array when the ticking values shift exactly to zero
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
  // 5. SECURITY VIEW PASSWORD FORMS DISPLAY TOGGLE ROUTINES
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
