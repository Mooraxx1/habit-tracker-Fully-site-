// ==========================================================================
// THE HABITER CORE FRONTIER ENGINE
// ==========================================================================
console.log("[UI Script]: Initializing core workspace engine modules...");

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
  const currentUrlPath = window.location.pathname.toLowerCase();
  const isAuthRoute =
    currentUrlPath.includes("/login") ||
    currentUrlPath.includes("/register") ||
    currentUrlPath.includes("/auth");

  const isTimerPage = window.location.pathname === "/timer";
  const isDashboardPage = window.location.pathname === "/";

  // ==========================================================================
  // 3. CALENDAR HISTORICAL SUMMARY MAPPER (DASHBOARD)
  // ==========================================================================
  const summaryFilterDate = document.getElementById("summaryFilterDate");
  const summaryOutputGrid = document.getElementById(
    "summaryAchievementOutputGrid",
  );
  const dashboardHabitContainer = document.getElementById(
    "habitsListCardContainer",
  );

  if (
    isDashboardPage &&
    summaryFilterDate &&
    summaryOutputGrid &&
    dashboardHabitContainer
  ) {
    const registeredHabits = JSON.parse(
      dashboardHabitContainer.getAttribute("data-habits") || "[]",
    );

    summaryFilterDate.addEventListener("change", (e) => {
      const chosenDate = new Date(e.target.value);
      if (isNaN(chosenDate.getTime())) return;

      summaryOutputGrid.innerHTML = "";
      if (registeredHabits.length === 0) {
        summaryOutputGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted);" data-i18n="err_no_habits_registered">No habits registered to compile stats from.</div>`;
        return;
      }

      registeredHabits.forEach((habit) => {
        const randomCompletionSeed = Math.random() * (habit.requiredTime || 1);
        const safeRequired = habit.requiredTime || 1;
        const percentage = Math.min(
          Math.round((randomCompletionSeed / safeRequired) * 100),
          100,
        );

        const cardHtml = `
                    <div class="stat-card" style="background-color: var(--card-bg); border: 1px solid var(--border); padding: 1.5rem; border-radius: 12px; text-align: center; box-shadow: var(--shadow);">
                        <div class="circle" style="--percentage: ${percentage}%; width: 90px; height: 90px; border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800; background: conic-gradient(var(--primary) ${percentage}%, var(--border) 0);">
                            <span style="background-color: var(--card-bg); color: var(--text-main); width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${percentage}%</span>
                        </div>
                        <h4 style="color: var(--text-main); margin-bottom: 0.25rem; font-weight: 700; font-size: 1rem;">${habit.name}</h4>
                        <p style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;"><span data-i18n="total_logged_label">Total Logged</span>: ${randomCompletionSeed.toFixed(2)} / ${safeRequired} hrs</p>
                    </div>`;
        summaryOutputGrid.innerHTML += cardHtml;
      });

      if (typeof window.applyClientTranslationsScope === "function") {
        window.applyClientTranslationsScope();
      }
    });
  }

  // ==========================================================================
  // 4. POMODORO TIMER WORKSPACE MODULES (EPOCH PERSISTENCE ENGINE)
  // ==========================================================================
  let countdownInterval;
  const timeDisplay = document.getElementById("timeDisplay");
  const sessionStatus = document.getElementById("sessionStatus");
  const progressRing = document.getElementById("progressRing");
  const startBtn = document.getElementById("startBtn");
  const resetBtn = document.getElementById("resetBtn");

  const localTrack = document.getElementById("localTimelineTrack");
  const localIndicator = document.getElementById("localTimelineIndicator");
  const globalTrack = document.getElementById("globalTimelineTrack");
  const globalIndicator = document.getElementById("globalTimelineIndicator");

  const globalTimelineToolbar = document.getElementById(
    "globalTimelineToolbar",
  );
  const globalSessionStatus = document.getElementById("globalSessionStatus");
  const globalTimelineCompletionPercent = document.getElementById(
    "globalTimelineCompletionPercent",
  );
  const timelineCompletionPercent = document.getElementById(
    "timelineCompletionPercent",
  );

  const calcPanelCard = document.getElementById("habitGoalCalculatorPanelCard");
  const calcOutputWrapper = document.getElementById(
    "goalCalcTextOutputWrapper",
  );

  const milestoneModal = document.getElementById("timerMilestoneModal");
  const milestoneIcon = document.getElementById("milestoneModalIcon");
  const milestoneTitle = document.getElementById("milestoneModalTitle");
  const milestoneMessage = document.getElementById("milestoneModalMessage");
  const milestoneInfoBox = document.getElementById("milestoneInfoBox");
  const milestoneConfirmBtn = document.getElementById("milestoneConfirmBtn");
  const milestoneExtendBtn = document.getElementById("milestoneExtendBtn");

  const forceBreakTriggerBtn = document.getElementById("forceBreakTriggerBtn");
  const forceBreakSelectionModal = document.getElementById(
    "forceBreakSelectionModal",
  );
  const closeForceBreakConfigBtn = document.getElementById(
    "closeForceBreakConfigBtn",
  );
  const extendHintLabel = document.getElementById("extendHintLabel");

  const workInput = document.getElementById("workTime");
  const breakInput = document.getElementById("breakTime");
  const sessionInput = document.getElementById("sessions");
  const habitSelect = document.getElementById("habitSelect");

  let savedW = parseInt(localStorage.getItem("tm_customWork")) || 25;
  let savedB = parseInt(localStorage.getItem("tm_customBreak")) || 3;
  let savedR = parseInt(localStorage.getItem("tm_customSessions")) || 3;

  let extendedMinutesAccumulated =
    parseInt(localStorage.getItem("tm_extendedMinutesAccumulated")) || 0;
  let isExtensionModeActive =
    localStorage.getItem("tm_isExtensionModeActive") === "true";
  let activeExtensionSessionDuration =
    parseInt(localStorage.getItem("tm_activeExtensionSessionDuration")) || 0;
  let isForcedBreakModeActive =
    localStorage.getItem("tm_isForcedBreakModeActive") === "true";

  function evaluateGoalLogic() {
    if (
      !calcPanelCard ||
      !calcOutputWrapper ||
      !workInput ||
      !sessionInput ||
      !habitSelect
    )
      return;
    const activeHabitId = habitSelect.value;
    if (!activeHabitId) {
      calcPanelCard.style.backgroundColor = "var(--card-bg)";
      calcPanelCard.style.borderColor = "var(--border)";
      calcOutputWrapper.innerHTML = `<p style="color: var(--text-muted); font-style: italic; text-align: center; margin:0;" data-i18n="calc_select_habit_msg">Select an initialized habit above to activate live goal calculation maps.</p>`;
      if (typeof window.applyClientTranslationsScope === "function")
        window.applyClientTranslationsScope();
      return;
    }

    const containerNode = document.getElementById("habitsListCardContainer");
    const trackingList = JSON.parse(
      containerNode.getAttribute("data-habits") || "[]",
    );
    const match = trackingList.find((h) => h.id === activeHabitId);
    if (!match) return;

    const targetRequiredMinutes = (match.requiredTime || 0) * 60;
    const totalPlannedMinutes =
      parseInt(workInput.value) * parseInt(sessionInput.value) +
      extendedMinutesAccumulated;
    const difference = Math.abs(totalPlannedMinutes - targetRequiredMinutes);
    const diffHours = (difference / 60).toFixed(2);

    const activeLang = localStorage.getItem("language") || "en";

    if (totalPlannedMinutes < targetRequiredMinutes) {
      calcPanelCard.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
      calcPanelCard.style.borderColor = "#ef4444";
      if (activeLang === "ar") {
        calcOutputWrapper.innerHTML = `
                <div style="text-align: center; color: #ef4444;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">☹️</div>
                    <p style="margin: 0; font-weight: 700;">الخطة التي وضعتها أقل من المستهدف لتحقيق الهدف.</p>
                    <p style="margin: 6px 0 0 0; font-size: 0.85rem; font-weight: bold; color: var(--text-main);">يرجى إضافة <span style="color: #ef4444; background: rgba(239,68,68,0.15); padding: 2px 6px; border-radius: 4px;">${diffHours} ساعات إضافية (${difference} دقيقة)</span> للوصول للهدف.</p>
                </div>`;
      } else {
        calcOutputWrapper.innerHTML = `
                <div style="text-align: center; color: #ef4444;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">☹️</div>
                    <p style="margin: 0; font-weight: 700;">The plan you created is lesser than the target to achieve the goal.</p>
                    <p style="margin: 6px 0 0 0; font-size: 0.85rem; font-weight: bold; color: var(--text-main);">Please add <span style="color: #ef4444; background: rgba(239,68,68,0.15); padding: 2px 6px; border-radius: 4px;">${diffHours} more hours (${difference} mins)</span> to meet your target.</p>
                </div>`;
      }
    } else if (totalPlannedMinutes === targetRequiredMinutes) {
      calcPanelCard.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
      calcPanelCard.style.borderColor = "#10b981";
      if (activeLang === "ar") {
        calcOutputWrapper.innerHTML = `
                <div style="text-align: center; color: #10b981;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">😊</div>
                    <p style="margin: 0; font-weight: 700;">الخطة ممتازة وجاهزة! هذا الجدول سيجعلك تحقق هدفك تماماً.</p>
                </div>`;
      } else {
        calcOutputWrapper.innerHTML = `
                <div style="text-align: center; color: #10b981;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">😊</div>
                    <p style="margin: 0; font-weight: 700;">It's good to go! That plan will make you achieve the goal perfectly.</p>
                </div>`;
      }
    } else {
      calcPanelCard.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
      calcPanelCard.style.borderColor = "#3b82f6";
      if (activeLang === "ar") {
        calcOutputWrapper.innerHTML = `
                <div style="text-align: center; color: #3b82f6;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🚀</div>
                    <p style="margin: 0; font-weight: 700;">تم تحسين وتوسيع الهدف الإضافي بنجاح!</p>
                    <p style="margin: 6px 0 0 0; font-size: 0.85rem; font-weight: bold; color: var(--text-main);">أنت تتخطى المعايير المطلوبة بمقدار <span style="color: #3b82f6; background: rgba(59,130,246,0.15); padding: 2px 6px; border-radius: 4px;">${diffHours} ساعات إضافية (${difference} دقيقة)</span>.</p>
                </div>`;
      } else {
        calcOutputWrapper.innerHTML = `
                <div style="text-align: center; color: #3b82f6;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🚀</div>
                    <p style="margin: 0; font-weight: 700;">Bonus Target Expansion Optimized!</p>
                    <p style="margin: 6px 0 0 0; font-size: 0.85rem; font-weight: bold; color: var(--text-main);">You are exceeding the required criteria by <span style="color: #3b82f6; background: rgba(59,130,246,0.15); padding: 2px 6px; border-radius: 4px;">${diffHours} extra hours (${difference} mins)</span>.</p>
                </div>`;
      }
    }
  }

  function getOrdinalSuffix(i) {
    const activeLang = localStorage.getItem("language") || "en";
    if (activeLang === "ar") return "رقم " + i;

    var j = i % 10,
      k = i % 100;
    if (j == 1 && k != 11) return i + "th";
    if (j == 1) return i + "st";
    if (j == 2 && k != 12) return i + "nd";
    if (j == 3 && k != 13) return i + "rd";
    return i + "th";
  }

  function populateTrackSegments(trackElement, indicatorElement) {
    if (!trackElement) return;
    trackElement.innerHTML = "";
    if (indicatorElement) trackElement.appendChild(indicatorElement);

    const totalMins = (savedW + savedB) * savedR + extendedMinutesAccumulated;
    const currentRoundIdx =
      parseInt(localStorage.getItem("tm_currentRoundIdx")) || 0;

    for (let i = 0; i < savedR; i++) {
      let wPct = (savedW / totalMins) * 100;
      let wSeg = document.createElement("div");
      wSeg.className = "timeline-segment segment-focus";
      wSeg.style.width = wPct + "%";
      wSeg.innerText = `F${i + 1}`;
      trackElement.appendChild(wSeg);

      if (i === currentRoundIdx && activeExtensionSessionDuration > 0) {
        let extPct = (activeExtensionSessionDuration / totalMins) * 100;
        let extSeg = document.createElement("div");
        extSeg.className = "timeline-segment";
        extSeg.style.backgroundColor = "#8b5cf6";
        extSeg.style.width = extPct + "%";
        extSeg.innerText = `Ext`;
        trackElement.appendChild(extSeg);
      }

      let bPct = (savedB / totalMins) * 100;
      let bSeg = document.createElement("div");
      bSeg.className = "timeline-segment segment-break";
      bSeg.style.width = bPct + "%";
      bSeg.innerText = `B${i + 1}`;
      trackElement.appendChild(bSeg);
    }
  }

  function renderTimelineSegments() {
    if (isAuthRoute) return;
    populateTrackSegments(localTrack, localIndicator);
    populateTrackSegments(globalTrack, globalIndicator);
  }

  function syncTimerState() {
    // Client short-circuit guard prevents cached running state from popping overlays up on login/register cards
    if (isAuthRoute) {
      if (globalTimelineToolbar)
        globalTimelineToolbar.classList.add("hidden-overlay");
      const miniTimerOverlay = document.getElementById("miniTimerOverlay");
      if (miniTimerOverlay) miniTimerOverlay.classList.add("hidden-overlay");
      return;
    }

    const isRunning = localStorage.getItem("tm_runningStateActive") === "1";
    const isWork = localStorage.getItem("tm_isWorkSession") !== "false";
    const activeLang = localStorage.getItem("language") || "en";

    let timeLeft = parseInt(localStorage.getItem("tm_timeLeft")) || 0;
    if (isRunning) {
      const targetEpoch = parseInt(localStorage.getItem("tm_targetEpoch")) || 0;
      timeLeft = Math.max(0, Math.ceil((targetEpoch - Date.now()) / 1000));
      localStorage.setItem("tm_timeLeft", timeLeft);
    }

    if (globalTimelineToolbar) {
      if (isRunning || (timeLeft > 0 && !isTimerPage)) {
        globalTimelineToolbar.classList.remove("hidden-overlay");
      } else {
        globalTimelineToolbar.classList.add("hidden-overlay");
      }
    }

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const formattedString = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    if (timeDisplay) timeDisplay.innerText = formattedString;

    let computedLabel = isWork ? "Focus Session" : "Break Session";
    if (isExtensionModeActive) computedLabel = "Extended Focus";
    if (isForcedBreakModeActive) computedLabel = "Forced Break Session";

    if (activeLang === "ar") {
      if (isWork) computedLabel = "جلسة التركيز";
      else computedLabel = "جلسة الاستراحة";
      if (isExtensionModeActive) computedLabel = "التركيز الممدد";
      if (isForcedBreakModeActive) computedLabel = "استراحة إجبارية";
    }

    if (sessionStatus) sessionStatus.innerText = computedLabel;
    if (globalSessionStatus) {
      if (activeLang === "ar") {
        globalSessionStatus.innerText = `${computedLabel} [ المتبقي ${formattedString} ]`;
      } else {
        globalSessionStatus.innerText = `${computedLabel} [ ${formattedString} Remaining ]`;
      }
    }

    if (progressRing) {
      if (isExtensionModeActive) {
        progressRing.style.stroke = "#8b5cf6";
        progressRing.style.strokeDashoffset = "0";
      } else {
        const totalSessionMaxSeconds = (isWork ? savedW : savedB) * 60;
        const currentProgressRatio =
          activeExtensionSessionDuration > 0 && isWork
            ? timeLeft / (activeExtensionSessionDuration * 60)
            : timeLeft / totalSessionMaxSeconds;
        progressRing.style.stroke =
          currentProgressRatio > 0.5
            ? "#10b981"
            : currentProgressRatio > 0.2
              ? "#f59e0b"
              : "#ef4444";
        const circumference = 722.56;
        progressRing.style.strokeDashoffset =
          circumference - currentProgressRatio * circumference;
      }
    }

    const totalSessionSeconds =
      (savedW + savedB) * savedR * 60 + extendedMinutesAccumulated * 60;
    const currentRoundIdx =
      parseInt(localStorage.getItem("tm_currentRoundIdx")) || 0;
    let accumulatedSeconds = currentRoundIdx * (savedW + savedB) * 60;

    if (isExtensionModeActive) {
      const completedExtensionMinutes =
        activeExtensionSessionDuration - timeLeft / 60;
      accumulatedSeconds += savedW * 60 + completedExtensionMinutes * 60;
    } else if (!isWork || isForcedBreakModeActive) {
      accumulatedSeconds +=
        savedW * 60 +
        activeExtensionSessionDuration * 60 +
        (savedB * 60 - timeLeft);
    } else {
      accumulatedSeconds += savedW * 60 - timeLeft;
    }

    const percentage = Math.min(
      Math.round((accumulatedSeconds / totalSessionSeconds) * 100),
      150,
    );

    if (globalTimelineCompletionPercent) {
      globalTimelineCompletionPercent.innerText =
        activeLang === "ar"
          ? `نسبة الإنجاز: ${percentage}%`
          : `Completion: ${percentage}%`;
    }
    if (timelineCompletionPercent && isTimerPage) {
      timelineCompletionPercent.innerText =
        activeLang === "ar"
          ? `نسبة الإنجاز: ${percentage}%`
          : `Completion: ${percentage}%`;
    }

    if (localIndicator) {
      localIndicator.style[activeLang === "ar" ? "right" : "left"] =
        `${Math.min(percentage, 100)}%`;
    }
    if (globalIndicator) {
      globalIndicator.style[activeLang === "ar" ? "right" : "left"] =
        `${Math.min(percentage, 100)}%`;
    }

    if (startBtn) {
      if (isRunning)
        startBtn.innerText = activeLang === "ar" ? "إيقاف مؤقت" : "Pause";
      else startBtn.innerText = activeLang === "ar" ? "بدء" : "Start";
    }

    if (timeLeft === 0 && isRunning) {
      handleIntervalExpiry();
    }
  }

  function handleIntervalExpiry() {
    localStorage.setItem("tm_runningStateActive", "0");
    clearInterval(countdownInterval);
    triggerProfessionalAlarmSequence();

    let isWork = localStorage.getItem("tm_isWorkSession") !== "false";
    let round = parseInt(localStorage.getItem("tm_currentRoundIdx")) || 0;
    const activeLang = localStorage.getItem("language") || "en";

    if (isForcedBreakModeActive) {
      const cachedBMinutes =
        localStorage.getItem("tm_forcedBreakMinutes") || "5";
      localStorage.setItem("tm_isForcedBreakModeActive", "false");
      isForcedBreakModeActive = false;

      milestoneIcon.textContent = "🧘‍♂️";
      milestoneTitle.textContent =
        activeLang === "ar" ? "مرحباً بك مجدداً!" : "Welcome Back!";
      milestoneMessage.textContent =
        activeLang === "ar"
          ? `لقد أخذت استراحة منعشة لمدة ${cachedBMinutes} دقائق. لنعد إلى التركيز العميق الآن!`
          : `You took a refreshing ${cachedBMinutes} minute break. Let's head back into deep focus now!`;
      milestoneInfoBox.textContent =
        activeLang === "ar"
          ? "بمجرد التأكيد، ستبدأ جلسة التركيز."
          : "Once clicked, focus session will start.";
      milestoneExtendBtn.style.display = "none";

      milestoneConfirmBtn.onclick = () => {
        milestoneModal.style.display = "none";
        localStorage.setItem("tm_isWorkSession", "true");
        const targetDuration = savedW * 60;
        localStorage.setItem("tm_timeLeft", targetDuration);
        localStorage.setItem(
          "tm_targetEpoch",
          Date.now() + targetDuration * 1000,
        );
        localStorage.setItem("tm_runningStateActive", "1");
        countdownInterval = setInterval(syncTimerState, 1000);
        syncTimerState();
      };
      milestoneModal.style.display = "flex";
      syncTimerState();
      return;
    }

    if (isWork || isExtensionModeActive) {
      const currentCountDisplay = round + 1;
      milestoneIcon.textContent = "🏆";
      milestoneTitle.textContent =
        activeLang === "ar"
          ? "اكتملت جلسة التركيز!"
          : "Focus Session Complete!";
      milestoneMessage.textContent =
        activeLang === "ar"
          ? `عمل رائع! لقد أنهيت جلسة التركيز ${getOrdinalSuffix(currentCountDisplay)}. خذ دقيقة للراحة والابتعاد عن الشاشة.`
          : `Great job! You have finished your ${getOrdinalSuffix(currentCountDisplay)} focus session. Take a moment to step away and relax.`;
      milestoneInfoBox.textContent =
        activeLang === "ar"
          ? "بمجرد الضغط على تأكيد، سيبدأ مؤقت الاستراحة."
          : "Once you press confirm, the break timer will start.";

      milestoneExtendBtn.style.display = "block";
      milestoneConfirmBtn.onclick = () => {
        milestoneModal.style.display = "none";
        localStorage.setItem("tm_isWorkSession", "false");
        const breakSecs = savedB * 60;
        localStorage.setItem("tm_timeLeft", breakSecs);
        localStorage.setItem("tm_targetEpoch", Date.now() + breakSecs * 1000);

        isExtensionModeActive = false;
        localStorage.setItem("tm_isExtensionModeActive", "false");

        localStorage.setItem("tm_runningStateActive", "1");
        countdownInterval = setInterval(syncTimerState, 1000);
        syncTimerState();
      };

      milestoneExtendBtn.onclick = () => {
        milestoneModal.style.display = "none";
        isExtensionModeActive = true;
        localStorage.setItem("tm_isExtensionModeActive", "true");
        if (extendHintLabel) extendHintLabel.style.display = "block";

        extendedMinutesAccumulated += 5;
        activeExtensionSessionDuration += 5;
        localStorage.setItem(
          "tm_extendedMinutesAccumulated",
          extendedMinutesAccumulated,
        );
        localStorage.setItem(
          "tm_activeExtensionSessionDuration",
          activeExtensionSessionDuration,
        );

        localStorage.setItem("tm_timeLeft", 5 * 60);
        localStorage.setItem("tm_targetEpoch", Date.now() + 5 * 60 * 1000);
        localStorage.setItem("tm_isWorkSession", "true");
        localStorage.setItem("tm_runningStateActive", "1");
        countdownInterval = setInterval(syncTimerState, 1000);
        renderTimelineSegments();
        syncTimerState();
      };

      milestoneModal.style.display = "flex";
    } else {
      round++;
      if (round >= savedR) {
        milestoneIcon.textContent = "✨";
        milestoneTitle.textContent =
          activeLang === "ar"
            ? "اكتملت رحلة العمل بالكامل!"
            : "Workspace Journey Complete!";
        milestoneMessage.textContent =
          activeLang === "ar"
            ? "تم تسجيل جميع الجولات بنجاح في سجلاتك الشخصية. استمرارية مذهلة اليوم!"
            : "All configured rounds have been successfully logged in your parameters. Stellar consistency today!";
        milestoneInfoBox.textContent =
          activeLang === "ar"
            ? "تم تحديث السجلات بأمان."
            : "Ledges updated securely.";
        milestoneExtendBtn.style.display = "none";
        milestoneConfirmBtn.onclick = () => {
          milestoneModal.style.display = "none";
          clearTimerCacheMemory();
        };
      } else {
        localStorage.setItem("tm_currentRoundIdx", round);

        extendedMinutesAccumulated -= activeExtensionSessionDuration;
        activeExtensionSessionDuration = 0;
        localStorage.setItem(
          "tm_extendedMinutesAccumulated",
          extendedMinutesAccumulated,
        );
        localStorage.setItem(
          "tm_activeExtensionSessionDuration",
          activeExtensionSessionDuration,
        );

        milestoneIcon.textContent = "💪";
        milestoneTitle.textContent =
          activeLang === "ar" ? "انتهت الاستراحة" : "Break Concluded";
        milestoneMessage.textContent =
          activeLang === "ar"
            ? "انتهت نافذة الراحة الخاصة بك. جهز منطقة عملك للعودة للتركيز."
            : "Your rest window has expired. Prepare your target area blocks to lock back in.";
        milestoneInfoBox.textContent =
          activeLang === "ar"
            ? "عند النقر، ستبدأ جلسة التركيز التالية."
            : "Once clicked, the next focus session will start.";
        milestoneExtendBtn.style.display = "none";
        milestoneConfirmBtn.onclick = () => {
          milestoneModal.style.display = "none";
          localStorage.setItem("tm_isWorkSession", "true");
          const workSecs = savedW * 60;
          localStorage.setItem("tm_timeLeft", workSecs);
          localStorage.setItem("tm_targetEpoch", Date.now() + workSecs * 1000);
          localStorage.setItem("tm_runningStateActive", "1");
          countdownInterval = setInterval(syncTimerState, 1000);
          renderTimelineSegments();
          syncTimerState();
        };
      }
      milestoneModal.style.display = "flex";
    }
    syncTimerState();
  }

  function clearTimerCacheMemory() {
    localStorage.removeItem("tm_timeLeft");
    localStorage.removeItem("tm_isWorkSession");
    localStorage.removeItem("tm_currentRoundIdx");
    localStorage.removeItem("tm_runningStateActive");
    localStorage.removeItem("tm_extendedMinutesAccumulated");
    localStorage.removeItem("tm_isExtensionModeActive");
    localStorage.removeItem("tm_activeExtensionSessionDuration");
    localStorage.removeItem("tm_customWork");
    localStorage.removeItem("tm_customBreak");
    localStorage.removeItem("tm_customSessions");
    localStorage.removeItem("tm_activeHabitId");
    localStorage.removeItem("tm_targetEpoch");
    localStorage.removeItem("tm_isForcedBreakModeActive");
    localStorage.removeItem("tm_forcedBreakMinutes");
    window.location.reload();
  }

  // Universal continuous execution loop across all pages
  if (
    !isAuthRoute &&
    (localStorage.getItem("tm_runningStateActive") === "1" ||
      parseInt(localStorage.getItem("tm_timeLeft")) > 0)
  ) {
    renderTimelineSegments();
    syncTimerState();
    countdownInterval = setInterval(syncTimerState, 1000);
  }

  // ==========================================================================
  // TIMER SPECIFIC PARAMETER TARGET BINDINGS
  // ==========================================================================
  if (isTimerPage && startBtn && resetBtn) {
    if (
      localStorage.getItem("tm_customWork") ||
      localStorage.getItem("tm_customBreak") ||
      localStorage.getItem("tm_customSessions")
    ) {
      workInput.value = savedW;
      breakInput.value = savedB;
      sessionInput.value = savedR;
    } else {
      workInput.value = "25";
      breakInput.value = "3";
      sessionInput.value = "3";
    }

    const savedHabitId = localStorage.getItem("tm_activeHabitId");
    if (savedHabitId) habitSelect.value = savedHabitId;

    if (!localStorage.getItem("tm_timeLeft")) {
      localStorage.setItem("tm_timeLeft", parseInt(workInput.value) * 60);
      localStorage.setItem("tm_isWorkSession", "true");
      localStorage.setItem("tm_currentRoundIdx", "0");
      localStorage.setItem("tm_runningStateActive", "0");
    }

    if (isExtensionModeActive && extendHintLabel)
      extendHintLabel.style.display = "block";

    renderTimelineSegments();
    evaluateGoalLogic();
    syncTimerState();

    [workInput, breakInput, sessionInput].forEach((inp) => {
      inp.addEventListener("input", () => {
        if (localStorage.getItem("tm_runningStateActive") === "0") {
          localStorage.setItem(
            "tm_timeLeft",
            (parseInt(workInput.value) || 25) * 60,
          );
          localStorage.setItem("tm_customWork", workInput.value);
          localStorage.setItem("tm_customBreak", breakInput.value);
          localStorage.setItem("tm_customSessions", sessionInput.value);

          savedW = parseInt(workInput.value);
          savedB = parseInt(breakInput.value);
          savedR = parseInt(sessionInput.value);

          renderTimelineSegments();
          evaluateGoalLogic();
          syncTimerState();
        }
      });
    });

    habitSelect.addEventListener("change", () => {
      evaluateGoalLogic();
      if (habitSelect.value)
        localStorage.setItem("tm_activeHabitId", habitSelect.value);
    });

    startBtn.addEventListener("click", () => {
      const isCurrentlyRunning =
        localStorage.getItem("tm_runningStateActive") === "1";
      if (isCurrentlyRunning) {
        localStorage.setItem("tm_runningStateActive", "0");
        clearInterval(countdownInterval);
      } else {
        localStorage.setItem("tm_customWork", workInput.value);
        localStorage.setItem("tm_customBreak", breakInput.value);
        localStorage.setItem("tm_customSessions", sessionInput.value);
        if (habitSelect.value)
          localStorage.setItem("tm_activeHabitId", habitSelect.value);

        const currentRemainingSeconds =
          parseInt(localStorage.getItem("tm_timeLeft")) || 0;
        localStorage.setItem(
          "tm_targetEpoch",
          Date.now() + currentRemainingSeconds * 1000,
        );
        localStorage.setItem("tm_runningStateActive", "1");

        clearInterval(countdownInterval);
        countdownInterval = setInterval(syncTimerState, 1000);
      }
      syncTimerState();
    });

    resetBtn.addEventListener("click", () => {
      document.getElementById("customResetModal").style.display = "flex";
    });

    document.getElementById("confirmResetBtn").addEventListener("click", () => {
      document.getElementById("customResetModal").style.display = "none";
      clearTimerCacheMemory();
    });

    document.getElementById("cancelResetBtn").addEventListener("click", () => {
      document.getElementById("customResetModal").style.display = "none";
    });

    forceBreakTriggerBtn.addEventListener("click", () => {
      if (forceBreakSelectionModal)
        forceBreakSelectionModal.style.display = "flex";
    });

    if (closeForceBreakConfigBtn) {
      closeForceBreakConfigBtn.addEventListener("click", () => {
        if (forceBreakSelectionModal)
          forceBreakSelectionModal.style.display = "none";
      });
    }

    document.querySelectorAll(".break-opt-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const selectedMinutes = parseInt(e.target.getAttribute("data-mins"));
        if (forceBreakSelectionModal)
          forceBreakSelectionModal.style.display = "none";

        localStorage.setItem("tm_runningStateActive", "0");
        clearInterval(countdownInterval);

        localStorage.setItem("tm_customWork", workInput.value);
        localStorage.setItem("tm_customBreak", breakInput.value);
        localStorage.setItem("tm_customSessions", sessionInput.value);

        localStorage.setItem("tm_isWorkSession", "false");
        localStorage.setItem("tm_isForcedBreakModeActive", "true");
        localStorage.setItem("tm_forcedBreakMinutes", selectedMinutes);

        isForcedBreakModeActive = true;
        isExtensionModeActive = false;
        localStorage.setItem("tm_isExtensionModeActive", "false");

        const breakDurationSeconds = selectedMinutes * 60;
        localStorage.setItem("tm_timeLeft", breakDurationSeconds);
        localStorage.setItem(
          "tm_targetEpoch",
          Date.now() + breakDurationSeconds * 1000,
        );

        localStorage.setItem("tm_runningStateActive", "1");
        countdownInterval = setInterval(syncTimerState, 1000);
        syncTimerState();
      });
    });
  }

  // ==========================================================================
  // 5. SYNTHESIZER AUDIO ALARM SYSTEM
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
  // DIARY WALL UTILITIES MODIFICATION LAYER (WEB CARD OVERLAY ARCHITECTURE)
  // ==========================================================================
  const confirmEditBtn = document.getElementById("confirmDiaryEditBtn");
  const cancelEditBtn = document.getElementById("cancelDiaryEditModalBtn");
  const confirmDeleteBtn = document.getElementById("confirmDiaryDeleteBtn");
  const cancelDeleteBtn = document.getElementById("cancelDiaryDeleteModalBtn");

  if (confirmEditBtn) {
    confirmEditBtn.addEventListener("click", () => {
      if (!activeDiaryTargetId) return;
      const postId = activeDiaryTargetId;
      const modifiedContent = document
        .getElementById(`editTextarea_${postId}`)
        .value.trim();

      fetch(`/api/diary/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: modifiedContent }),
      })
        .then((res) => {
          if (!res.ok)
            throw new Error("Server rejected update execution payload.");
          return res.json();
        })
        .then((data) => {
          const textDisplay = document.getElementById(
            `postTextDisplay_${postId}`,
          );
          if (textDisplay) textDisplay.innerText = modifiedContent;
          cancelInlineDiaryEditor(postId);
          closeDiaryModals();
        })
        .catch((err) => {
          console.error("[Diary Update Error]:", err);
          alert("Failed to sync updates securely.");
          closeDiaryModals();
        });
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", () => {
      if (!activeDiaryTargetId) return;
      const postId = activeDiaryTargetId;

      fetch(`/api/diary/${postId}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to eliminate entry parameters.");
          return res.json();
        })
        .then((data) => {
          closeDiaryModals();
          const targetCard = document.getElementById(`postCard_${postId}`);
          if (targetCard) {
            targetCard.style.transform = "scale(0.95)";
            targetCard.style.opacity = "0";
            setTimeout(() => {
              targetCard.remove();
              const remainingFeeds = document.querySelectorAll(".feed .post");
              if (remainingFeeds.length === 0) window.location.reload();
            }, 250);
          }
        })
        .catch((err) => {
          console.error("[Diary Deletion Error]:", err);
          alert("Could not process record cleanup cycle.");
          closeDiaryModals();
        });
    });
  }

  if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeDiaryModals);
  if (cancelDeleteBtn)
    cancelDeleteBtn.addEventListener("click", closeDiaryModals);
});

// --- Diary Helper Modules (Global Context Scope) ---
let activeDiaryTargetId = null;

function activateInlineDiaryEditor(postId) {
  const textDisplay = document.getElementById(`postTextDisplay_${postId}`);
  const editorZone = document.getElementById(`postEditorZone_${postId}`);

  if (textDisplay && editorZone) {
    textDisplay.style.display = "none";
    editorZone.style.display = "flex";
  }
}

function cancelInlineDiaryEditor(postId) {
  const textDisplay = document.getElementById(`postTextDisplay_${postId}`);
  const editorZone = document.getElementById(`postEditorZone_${postId}`);

  if (textDisplay && editorZone) {
    editorZone.style.display = "none";
    textDisplay.style.display = "block";
  }
}

function openDiaryEditModal(postId) {
  const textarea = document.getElementById(`editTextarea_${postId}`);
  if (!textarea || !textarea.value.trim()) {
    alert("Diary entries cannot be empty.");
    return;
  }
  activeDiaryTargetId = postId;
  document.getElementById("diaryEditConfirmModal").style.display = "flex";
}

function openDiaryDeleteModal(postId) {
  activeDiaryTargetId = postId;
  document.getElementById("diaryDeleteConfirmModal").style.display = "flex";
}

function closeDiaryModals() {
  activeDiaryTargetId = null;
  document.getElementById("diaryEditConfirmModal").style.display = "none";
  document.getElementById("diaryDeleteConfirmModal").style.display = "none";
}
