// ==========================================================================
// ALL FRONTIER EVENT IMPLEMENTATIONS & POMODORO HUB
// ==========================================================================
console.log("[UI Script]: Loading application scripts...");

document.addEventListener("DOMContentLoaded", () => {
  const isTimerPage = window.location.pathname === "/timer";
  const timelineIndicator = document.getElementById("timelineIndicator");
  const timelineCompletionPercent = document.getElementById(
    "timelineCompletionPercent",
  );
  const timelineTrack = document.getElementById("timelineTrack");

  // ==========================================================================
  // TIMELINE CORE RENDER INTERFACE DETECTOR GUARD Logic
  // ==========================================================================
  function updateGlobalUIs() {
    // Completely skip running timeline calculations if elements are missing
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

    const linearGlobalPercentage = Math.min(
      (accumulatedSeconds / totalSessionSeconds) * 100,
      100,
    );
    timelineIndicator.style.left = `${linearGlobalPercentage}%`;
    timelineCompletionPercent.innerText = `Completion: ${Math.round(linearGlobalPercentage)}%`;
  }

  // Set up periodic UI tracking check
  setInterval(updateGlobalUIs, 1000);
  updateGlobalUIs();

  // ==========================================================================
  // SECURE AUTHENTICATION PASSWORD VISIBILITY TOGGLE HIERARCHY
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
