/**
 * Study Buddy - College Productivity & Study Tracker
 * Main Application Logic, State Store, Timer Engine, Analytics & AI Copilot
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. CONSTANTS & INITIAL DATA STORE
  // ==========================================================================
  const STORAGE_KEY = 'study_buddy_data_v3';
  const THEME_KEY = 'study_buddy_theme';

  // Helpers to get today's and past dates in YYYY-MM-DD
  function getIsoDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }

  // Default starter data for fresh users
  function getDefaultData() {
    return {
      subjects: [],
      tasks: [],
      todos: [],
      timer: {
        mode: 'pomodoro',
        durations: {
          pomodoro: 25 * 60,
          shortBreak: 5 * 60,
          longBreak: 15 * 60,
          custom: 25 * 60
        },
        timeRemaining: 25 * 60,
        stopwatchSeconds: 0,
        isRunning: false,
        lastTickTimestamp: null,
        activeSubjectId: null,
        soundEnabled: true,
        completedCyclesToday: 0,
        todayStudySeconds: 0,
        recentSessions: []
      },
      mockTests: [],
      reminders: [],
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        dailyHistory: {}
      },
      chatHistory: [
        {
          role: 'assistant',
          timestamp: 'Welcome',
          text: `Hello! I'm your college study assistant. How can I help you succeed today?
- 📚 **Explain complex topics** simply (Algorithms, Calculus, Physics, Economics, etc.)
- 📅 **Draft revision schedules** tailored to your exam deadlines
- 🧠 **Quiz you** to test your active recall and retention
- 💡 **Solve homework doubts** step-by-step

Pick a quick prompt above or ask any question!`
        }
      ],
      settings: {
        theme: 'dark',
        sound: true,
        geminiApiKey: ''
      }
    };
  }

  // ==========================================================================
  // 2. STATE MANAGER & PERSISTENCE
  // ==========================================================================
  let state = loadState();

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...getDefaultData(),
          ...parsed,
          timer: {
            ...getDefaultData().timer,
            ...(parsed.timer || {})
          },
          streak: {
            ...getDefaultData().streak,
            ...(parsed.streak || {})
          },
          settings: {
            ...getDefaultData().settings,
            ...(parsed.settings || {})
          }
        };
      }
    } catch (e) {
      console.error('Error loading data from localStorage, falling back to defaults:', e);
    }
    return getDefaultData();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
      showToast('⚠️ Storage limit reached or localStorage blocked.', 'warning');
    }
  }

  // Check & update streak consistency
  function evaluateStreak() {
    if (!state.streak.lastActiveDate) {
      state.streak.currentStreak = 0;
      return;
    }
    const today = getIsoDate(0);
    const yesterday = getIsoDate(-1);
    const lastActive = state.streak.lastActiveDate;

    if (lastActive === today) {
      // already active today
      return;
    } else if (lastActive === yesterday) {
      // active yesterday, waiting for today's session
      // streak maintained
    } else {
      // missed more than 1 day
      state.streak.currentStreak = 0;
    }
  }

  function recordActivity(seconds = 0) {
    const today = getIsoDate(0);
    if (!state.streak.dailyHistory[today]) {
      state.streak.dailyHistory[today] = 0;
    }
    state.streak.dailyHistory[today] += seconds;

    if (state.streak.lastActiveDate !== today) {
      state.streak.currentStreak += 1;
      if (state.streak.currentStreak > state.streak.longestStreak) {
        state.streak.longestStreak = state.streak.currentStreak;
      }
      state.streak.lastActiveDate = today;
      showToast(`🔥 Streak continued! ${state.streak.currentStreak} days in a row!`, 'success');
      playToneChime();
    }
    saveState();
    renderDashboard();
    renderAnalytics();
  }

  // ==========================================================================
  // 3. AUDIO SYNTHESIZER (WEB AUDIO API - ZERO EXTERNAL ASSETS)
  // ==========================================================================
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playToneChime() {
    if (!state.settings.sound && !state.timer.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // High pleasant chime (D5: 587.33Hz, A5: 880Hz, D6: 1174.66Hz)
      [587.33, 880, 1174.66].forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        gain.gain.setValueAtTime(0.2, now + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.1 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.85);
      });
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  // ==========================================================================
  // 4. TOAST NOTIFICATIONS HELPER
  // ==========================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3600);
  }

  // ==========================================================================
  // 5. NAVIGATION & VIEW SWITCHING
  // ==========================================================================
  function setupNavigation() {
    const navButtons = document.querySelectorAll('[data-view]');
    const sections = document.querySelectorAll('.view-section');
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    function switchView(targetView) {
      sections.forEach(sec => sec.classList.remove('active'));
      const activeSec = document.getElementById(`view-${targetView}`);
      if (activeSec) {
        activeSec.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      navButtons.forEach(btn => {
        if (btn.getAttribute('data-view') === targetView) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Close mobile drawer if open
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');

      // Refresh corresponding view data
      if (targetView === 'dashboard') renderDashboard();
      if (targetView === 'subjects') renderSubjects();
      if (targetView === 'tasks') renderTasks();
      if (targetView === 'todo') renderTodos();
      if (targetView === 'timer') renderTimerView();
      if (targetView === 'mocktests') renderMockTests();
      if (targetView === 'analytics') renderAnalytics();
      if (targetView === 'reminders') renderReminders();
      if (targetView === 'assistant') renderAiChat();
    }

    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const view = btn.getAttribute('data-view');
        switchView(view);
      });
    });

    // Links inside cards like "Open Full Timer →"
    document.querySelectorAll('[data-goto-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-goto-view');
        switchView(view);
      });
    });

    // Mobile Hamburger drawer
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }
  }

  // ==========================================================================
  // 6. THEME (DARK / LIGHT MODE) TOGGLE
  // ==========================================================================
  function setupTheme() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const modalThemeBtn = document.getElementById('modalThemeToggleBtn');
    const sunIcons = document.querySelectorAll('.sun-icon');
    const moonIcons = document.querySelectorAll('.moon-icon');

    const savedTheme = localStorage.getItem(THEME_KEY) || state.settings.theme || 'dark';
    applyTheme(savedTheme);

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      state.settings.theme = theme;
      localStorage.setItem(THEME_KEY, theme);
      saveState();

      if (theme === 'light') {
        sunIcons.forEach(i => i.classList.remove('hidden'));
        moonIcons.forEach(i => i.classList.add('hidden'));
      } else {
        sunIcons.forEach(i => i.classList.add('hidden'));
        moonIcons.forEach(i => i.classList.remove('hidden'));
      }
    }

    function toggle() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      showToast(`Theme switched to ${next} mode ☀️`, 'info');
    }

    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggle);
    if (modalThemeBtn) modalThemeBtn.addEventListener('click', toggle);
  }

  // ==========================================================================
  // 7. POMODORO, STOPWATCH & CUSTOM TIMER ENGINE
  // ==========================================================================
  // Reference to the active timer interval ID (null when timer is paused/stopped)
  let timerInterval = null;

  /**
   * Formats seconds into MM:SS, or HH:MM:SS when duration is 1 hour or more, or mode is manual timer.
   */
  function formatTime(seconds) {
    const totalSec = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0 || state.timer.mode === 'custom') {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function formatHoursMinutes(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  /**
   * Initializes timer buttons, listeners, dropdowns, and handles state recovery.
   */
  function setupTimerEngine() {
    const miniToggle = document.getElementById('miniTimerToggle');
    const dashPlayBtn = document.getElementById('dashTimerPlayBtn');
    const dashResetBtn = document.getElementById('dashTimerResetBtn');
    const mainPlayBtn = document.getElementById('timerMainPlayBtn');
    const mainResetBtn = document.getElementById('timerResetBtn');
    const mainSkipBtn = document.getElementById('timerSkipBtn');
    const modeTabs = document.querySelectorAll('.timer-mode-btn');
    const soundToggle = document.getElementById('timerSoundToggle');
    const subjectSelect = document.getElementById('timerSubjectSelect');
    const dashSubjectSelect = document.getElementById('dashTimerSubjectSelect');

    // Setup Manual Timer inputs and button
    const manualPanel = document.getElementById('manualTimerPanel');
    const startManualBtn = document.getElementById('startManualTimerBtn');
    const inputH = document.getElementById('manualTimerHours');
    const inputM = document.getElementById('manualTimerMinutes');
    const inputS = document.getElementById('manualTimerSeconds');

    // Populate Subject Selects
    populateTimerSubjects();

    if (subjectSelect) {
      subjectSelect.value = state.timer.activeSubjectId;
      subjectSelect.addEventListener('change', () => {
        state.timer.activeSubjectId = subjectSelect.value;
        if (dashSubjectSelect) dashSubjectSelect.value = subjectSelect.value;
        saveState();
        updateTimerDisplay();
      });
    }

    if (dashSubjectSelect) {
      dashSubjectSelect.value = state.timer.activeSubjectId;
      dashSubjectSelect.addEventListener('change', () => {
        state.timer.activeSubjectId = dashSubjectSelect.value;
        if (subjectSelect) subjectSelect.value = dashSubjectSelect.value;
        saveState();
        updateTimerDisplay();
      });
    }

    if (soundToggle) {
      soundToggle.checked = state.timer.soundEnabled;
      soundToggle.addEventListener('change', () => {
        state.timer.soundEnabled = soundToggle.checked;
        saveState();
      });
    }

    // Mode switching tabs
    modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode');
        switchTimerMode(mode);
      });
    });

    // Control triggers (toggle Play / Pause)
    const togglePlay = () => {
      if (state.timer.isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    };

    if (miniToggle) miniToggle.addEventListener('click', togglePlay);
    if (dashPlayBtn) dashPlayBtn.addEventListener('click', togglePlay);
    if (mainPlayBtn) mainPlayBtn.addEventListener('click', togglePlay);

    if (dashResetBtn) dashResetBtn.addEventListener('click', resetTimer);
    if (mainResetBtn) mainResetBtn.addEventListener('click', resetTimer);
    if (mainSkipBtn) mainSkipBtn.addEventListener('click', skipTimer);

    // Restore saved custom timer input values
    if (inputH && state.timer.customInputHours !== undefined) inputH.value = state.timer.customInputHours;
    if (inputM && state.timer.customInputMinutes !== undefined) inputM.value = state.timer.customInputMinutes;
    if (inputS && state.timer.customInputSeconds !== undefined) inputS.value = state.timer.customInputSeconds;

    // Toggle manual timer setup panel visibility
    if (manualPanel) {
      manualPanel.style.display = state.timer.mode === 'custom' ? 'block' : 'none';
    }

    // Start Manual Timer Button handler
    if (startManualBtn) {
      startManualBtn.addEventListener('click', () => {
        const h = parseInt(document.getElementById('manualTimerHours')?.value, 10) || 0;
        const m = parseInt(document.getElementById('manualTimerMinutes')?.value, 10) || 0;
        const s = parseInt(document.getElementById('manualTimerSeconds')?.value, 10) || 0;
        const totalSec = h * 3600 + m * 60 + s;

        if (totalSec <= 0) {
          showToast('Please enter a duration greater than 0 seconds.', 'warning');
          return;
        }

        // If timer is already running in custom mode, prevent duplicate start
        if (state.timer.isRunning && state.timer.mode === 'custom' && state.timer.timeRemaining > 0) {
          showToast('Manual timer is already running! ⏳', 'info');
          return;
        }

        setCustomTimer(h, m, s);
        startTimer();
      });
    }

    // Dynamic input sync when typing custom timer values while paused/stopped
    const onManualInputChange = () => {
      if (state.timer.mode === 'custom' && !state.timer.isRunning) {
        const h = parseInt(document.getElementById('manualTimerHours')?.value, 10) || 0;
        const m = parseInt(document.getElementById('manualTimerMinutes')?.value, 10) || 0;
        const s = parseInt(document.getElementById('manualTimerSeconds')?.value, 10) || 0;
        const totalSec = h * 3600 + m * 60 + s;
        if (totalSec > 0) {
          state.timer.durations.custom = totalSec;
          state.timer.timeRemaining = totalSec;
          state.timer.customInputHours = h;
          state.timer.customInputMinutes = m;
          state.timer.customInputSeconds = s;
          saveState();
          updateTimerDisplay();
        }
      }
    };
    if (inputH) inputH.addEventListener('input', onManualInputChange);
    if (inputM) inputM.addEventListener('input', onManualInputChange);
    if (inputS) inputS.addEventListener('input', onManualInputChange);

    // Sync active mode tab button with state
    modeTabs.forEach(btn => {
      if (btn.getAttribute('data-mode') === state.timer.mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Recover timer state if it was active before page reload
    recoverTimerStateOnLoad();

    updateTimerDisplay();
  }

  /**
   * Recovers timer state across page reloads.
   * If the timer was running before reload, calculates the exact elapsed time
   * using Date.now() - saved timestamp and applies it without losing time.
   */
  function recoverTimerStateOnLoad() {
    if (state.timer.isRunning && state.timer.lastTickTimestamp) {
      const now = Date.now();
      const elapsedMs = now - state.timer.lastTickTimestamp;
      const elapsedSec = Math.floor(elapsedMs / 1000);

      if (elapsedSec > 0) {
        if (state.timer.mode === 'stopwatch') {
          // Cap elapsed time to 12 hours to prevent runaway numbers if tab was closed for days
          const cappedSec = Math.min(elapsedSec, 12 * 3600);
          state.timer.stopwatchSeconds += cappedSec;
          logStudyTime(cappedSec);
          state.timer.lastTickTimestamp = now;
          startTimer(true);
        } else {
          // Countdown mode
          if (elapsedSec >= state.timer.timeRemaining) {
            // Timer completed while away
            const studySec = state.timer.timeRemaining;
            state.timer.timeRemaining = 0;
            state.timer.lastTickTimestamp = null;
            if (state.timer.mode === 'pomodoro' || state.timer.mode === 'custom') {
              logStudyTime(studySec);
            }
            saveState();
            handleTimerComplete();
          } else {
            // Still active with remaining time
            state.timer.timeRemaining -= elapsedSec;
            if (state.timer.mode === 'pomodoro' || state.timer.mode === 'custom') {
              logStudyTime(elapsedSec);
            }
            state.timer.lastTickTimestamp = now;
            saveState();
            startTimer(true);
          }
        }
      } else {
        // Less than 1 second elapsed (instant refresh)
        startTimer(true);
      }
    } else {
      // Timer was not running: ensure clean paused state
      state.timer.isRunning = false;
      state.timer.lastTickTimestamp = null;
      updatePlayPauseIcons(false);
    }
  }

  function populateTimerSubjects() {
    const subjectSelect = document.getElementById('timerSubjectSelect');
    const dashSubjectSelect = document.getElementById('dashTimerSubjectSelect');
    const selects = [subjectSelect, dashSubjectSelect].filter(Boolean);

    selects.forEach(select => {
      select.innerHTML = '';
      state.subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = `${sub.code} - ${sub.name}`;
        select.appendChild(opt);
      });
    });
  }

  /**
   * Switch timer mode between 'pomodoro', 'shortBreak', 'longBreak', 'stopwatch', or 'custom'.
   */
  function switchTimerMode(mode) {
    pauseTimer();
    state.timer.mode = mode;

    document.querySelectorAll('.timer-mode-btn').forEach(btn => {
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle Manual Timer setup panel visibility
    const manualPanel = document.getElementById('manualTimerPanel');
    if (manualPanel) {
      manualPanel.style.display = mode === 'custom' ? 'block' : 'none';
    }

    if (mode === 'stopwatch') {
      state.timer.stopwatchSeconds = 0;
    } else if (mode === 'custom') {
      const h = parseInt(document.getElementById('manualTimerHours')?.value, 10) || 0;
      const m = parseInt(document.getElementById('manualTimerMinutes')?.value, 10) || 25;
      const s = parseInt(document.getElementById('manualTimerSeconds')?.value, 10) || 0;
      const total = h * 3600 + m * 60 + s;
      state.timer.durations.custom = total > 0 ? total : (state.timer.durations.custom || (25 * 60));
      state.timer.timeRemaining = state.timer.durations.custom;
    } else {
      state.timer.timeRemaining = state.timer.durations[mode] || (25 * 60);
    }

    state.timer.lastTickTimestamp = null;
    saveState();
    updateTimerDisplay();
  }

  /**
   * Start or resume the timer.
   * Uses real Date.now() timestamp tracking to guarantee accuracy across browser throttling.
   * Prevents multiple duplicate setInterval loops.
   */
  function startTimer(isRecovery = false) {
    // Prevent duplicate intervals if timer is already running
    if (state.timer.isRunning && timerInterval !== null) return;

    // Clear any existing stale interval
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    state.timer.isRunning = true;
    // Set timestamp baseline for accurate elapsed time calculation
    state.timer.lastTickTimestamp = Date.now();

    // Start tone for pleasant feedback
    getAudioContext();

    // Tick every 500ms for responsive UI updates while computing whole seconds from timestamps
    timerInterval = setInterval(timerTick, 500);

    saveState();
    updatePlayPauseIcons(true);
    updateTimerDisplay();

    if (!isRecovery) {
      const modeLabel = state.timer.mode === 'custom' ? 'MANUAL' : state.timer.mode.toUpperCase();
      showToast(`Timer started (${modeLabel}) 🎯`, 'info');
    }
  }

  /**
   * Pause the timer accurately without losing elapsed seconds.
   * Cleans up interval and saves remaining/elapsed time to localStorage.
   */
  function pauseTimer() {
    if (!state.timer.isRunning && timerInterval === null) return;

    // Account for any unlogged elapsed seconds right up to pause click
    if (state.timer.lastTickTimestamp) {
      const now = Date.now();
      const elapsedSec = Math.floor((now - state.timer.lastTickTimestamp) / 1000);
      if (elapsedSec > 0) {
        if (state.timer.mode === 'stopwatch') {
          state.timer.stopwatchSeconds += elapsedSec;
          logStudyTime(elapsedSec);
        } else {
          const deduct = Math.min(state.timer.timeRemaining, elapsedSec);
          state.timer.timeRemaining -= deduct;
          if (state.timer.mode === 'pomodoro' || state.timer.mode === 'custom') {
            logStudyTime(deduct);
          }
        }
      }
    }

    state.timer.isRunning = false;
    state.timer.lastTickTimestamp = null;

    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    saveState();
    updatePlayPauseIcons(false);
    updateTimerDisplay();
  }

  /**
   * Reset timer to selected mode duration (or 0 for stopwatch).
   * Does not count paused or reset time as study time.
   */
  function resetTimer() {
    pauseTimer();
    if (state.timer.mode === 'stopwatch') {
      state.timer.stopwatchSeconds = 0;
    } else {
      state.timer.timeRemaining = state.timer.durations[state.timer.mode] || (25 * 60);
    }
    state.timer.lastTickTimestamp = null;
    saveState();
    updateTimerDisplay();
    showToast('Timer reset to start.', 'info');
  }

  /**
   * Skip to the next session interval.
   */
  function skipTimer() {
    pauseTimer();
    if (state.timer.mode === 'pomodoro' || state.timer.mode === 'custom') {
      switchTimerMode('shortBreak');
    } else {
      switchTimerMode('pomodoro');
    }
    showToast('Skipped to next session interval.', 'info');
  }

  /**
   * Manual timer function: allows setting custom hours, minutes, and seconds.
   * Can be invoked programmatically or connected to custom UI inputs later.
   * @param {number} hours
   * @param {number} minutes
   * @param {number} seconds
   * @returns {boolean} True if successfully set
   */
  function setCustomTimer(hours = 0, minutes = 0, seconds = 0) {
    const h = Math.max(0, parseInt(hours, 10) || 0);
    const m = Math.max(0, parseInt(minutes, 10) || 0);
    const s = Math.max(0, parseInt(seconds, 10) || 0);
    const totalSec = h * 3600 + m * 60 + s;

    if (totalSec <= 0) {
      showToast('Please enter a duration greater than 0 seconds.', 'warning');
      return false;
    }

    pauseTimer();
    state.timer.mode = 'custom';
    if (!state.timer.durations) state.timer.durations = {};
    state.timer.durations.custom = totalSec;
    state.timer.timeRemaining = totalSec;
    state.timer.lastTickTimestamp = null;
    state.timer.customInputHours = h;
    state.timer.customInputMinutes = m;
    state.timer.customInputSeconds = s;

    // Sync input fields in UI if they exist
    const inputH = document.getElementById('manualTimerHours');
    const inputM = document.getElementById('manualTimerMinutes');
    const inputS = document.getElementById('manualTimerSeconds');
    if (inputH) inputH.value = h;
    if (inputM) inputM.value = m;
    if (inputS) inputS.value = s;

    // Sync mode tab buttons
    document.querySelectorAll('.timer-mode-btn').forEach(btn => {
      if (btn.getAttribute('data-mode') === 'custom') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const manualPanel = document.getElementById('manualTimerPanel');
    if (manualPanel) manualPanel.style.display = 'block';

    saveState();
    updateTimerDisplay();
    showToast(`Manual countdown set to ${formatTime(totalSec)}.`, 'info');
    return true;
  }

  /**
   * Returns a copy of current timer state for external or future UI inspection.
   */
  function getTimerState() {
    return { ...state.timer };
  }

  /**
   * Timestamp-based timer tick.
   * Calculates actual elapsed seconds using Date.now() - lastTickTimestamp.
   * Ensures accurate countdown/countup even if setInterval was delayed or tab was backgrounded.
   */
  function timerTick() {
    if (!state.timer.isRunning || !state.timer.lastTickTimestamp) {
      pauseTimer();
      return;
    }

    const now = Date.now();
    const elapsedMs = now - state.timer.lastTickTimestamp;
    const elapsedSec = Math.floor(elapsedMs / 1000);

    // Only process whole seconds elapsed
    if (elapsedSec <= 0) return;

    // Advance baseline by whole seconds consumed
    state.timer.lastTickTimestamp += elapsedSec * 1000;

    // Stopwatch mode
    if (state.timer.mode === 'stopwatch') {
      state.timer.stopwatchSeconds += elapsedSec;
      logStudyTime(elapsedSec);
      updateTimerDisplay();
      return;
    }

    // Countdown modes (pomodoro, shortBreak, longBreak, custom)
    if (state.timer.timeRemaining > elapsedSec) {
      state.timer.timeRemaining -= elapsedSec;
      // Only count study time during active focus blocks (pomodoro or custom)
      if (state.timer.mode === 'pomodoro' || state.timer.mode === 'custom') {
        logStudyTime(elapsedSec);
      }
      updateTimerDisplay();
    } else {
      // Countdown completed!
      const remainingSeconds = state.timer.timeRemaining;
      state.timer.timeRemaining = 0;
      if (state.timer.mode === 'pomodoro' || state.timer.mode === 'custom') {
        logStudyTime(remainingSeconds);
      }
      updateTimerDisplay();
      handleTimerComplete();
    }
  }

  /**
   * Credits elapsed focus seconds to today's total study time and the selected subject.
   */
  function logStudyTime(seconds) {
    if (seconds <= 0) return;
    state.timer.todayStudySeconds += seconds;
    
    // Credit to active subject
    const subject = state.subjects.find(s => s.id === state.timer.activeSubjectId);
    if (subject) {
      subject.studySeconds = (subject.studySeconds || 0) + seconds;
    }

    // Record streak activity
    recordActivity(seconds);
    saveState();
  }

  /**
   * Triggered when a countdown study block finishes.
   * Records completed session to recentSessions, increments cycles, and switches modes.
   */
  function handleTimerComplete() {
    pauseTimer();
    playToneChime();

    if (state.timer.mode === 'pomodoro' || state.timer.mode === 'custom') {
      state.timer.completedCyclesToday += 1;

      // Add to recent sessions list
      const sub = state.subjects.find(s => s.id === state.timer.activeSubjectId);
      const sessionName = sub ? sub.name : 'General Study';
      const durationSeconds = state.timer.durations[state.timer.mode] || (25 * 60);
      const durationMin = Math.max(1, Math.round(durationSeconds / 60));

      state.timer.recentSessions.unshift({
        subjectId: state.timer.activeSubjectId,
        subjectName: sessionName,
        durationMin: durationMin,
        date: getIsoDate(0),
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      if (state.timer.recentSessions.length > 20) state.timer.recentSessions.pop();

      showToast('🎉 Focus session complete! Fantastic job! Take a well-deserved break.', 'success');

      // Next session setup
      if (state.timer.mode === 'custom') {
        // Reset manual timer countdown back to configured custom duration so user can repeat or adjust
        state.timer.timeRemaining = state.timer.durations.custom || (25 * 60);
      } else if (state.timer.completedCyclesToday % 4 === 0) {
        switchTimerMode('longBreak');
      } else {
        switchTimerMode('shortBreak');
      }
    } else {
      showToast('🔔 Break finished! Ready to dive into your next focus block?', 'info');
      switchTimerMode('pomodoro');
    }

    saveState();
    renderDashboard();
    renderTimerView();
  }

  function updatePlayPauseIcons(isRunning) {
    const playIcons = document.querySelectorAll('.play-icon, .play-svg');
    const pauseIcons = document.querySelectorAll('.pause-icon, .pause-svg');
    const miniDot = document.getElementById('headerTimerDot');
    const mainBtnText = document.getElementById('timerMainPlayBtnText');

    if (isRunning) {
      playIcons.forEach(i => i.classList.add('hidden'));
      pauseIcons.forEach(i => i.classList.remove('hidden'));
      if (miniDot) miniDot.classList.add('active');
      if (mainBtnText) mainBtnText.textContent = 'Pause Focus';
    } else {
      playIcons.forEach(i => i.classList.remove('hidden'));
      pauseIcons.forEach(i => i.classList.add('hidden'));
      if (miniDot) miniDot.classList.remove('active');
      if (mainBtnText) {
        const totalTarget = state.timer.durations[state.timer.mode] || (25 * 60);
        const isPartiallyElapsed = state.timer.mode === 'stopwatch' 
          ? state.timer.stopwatchSeconds > 0 
          : (state.timer.timeRemaining < totalTarget && state.timer.timeRemaining > 0);
        mainBtnText.textContent = isPartiallyElapsed ? 'Resume Focus' : 'Start Focus';
      }
    }
  }

  function updateTimerDisplay() {
    let currentSeconds = state.timer.timeRemaining;
    let totalTarget = state.timer.durations[state.timer.mode] || (25 * 60);

    if (state.timer.mode === 'stopwatch') {
      currentSeconds = state.timer.stopwatchSeconds;
      totalTarget = 3600; // 1 hour reference
    }

    const timeString = formatTime(currentSeconds);

    // Update document title for background productivity
    document.title = state.timer.isRunning 
      ? `(${timeString}) Study Buddy | Focus Mode` 
      : 'Study Buddy | College Productivity & Study Tracker';

    // Update Header Mini Pill
    const miniDisplay = document.getElementById('headerTimerMini');
    if (miniDisplay) miniDisplay.textContent = timeString;

    // Update Dashboard widget
    const dashDisplay = document.getElementById('dashTimerDisplay');
    const dashModeBadge = document.getElementById('dashTimerModeBadge');
    if (dashDisplay) dashDisplay.textContent = timeString;
    if (dashModeBadge) {
      if (state.timer.mode === 'custom') {
        dashModeBadge.textContent = 'MANUAL • Focus';
      } else {
        dashModeBadge.textContent = state.timer.mode.toUpperCase() + (state.timer.mode === 'pomodoro' ? ' • Focus' : ' • Break');
      }
    }

    // Update Timer view giant dial
    const giantDisplay = document.getElementById('timerDisplayGiant');
    const statusLabel = document.getElementById('timerStatusLabel');
    const subjectTag = document.getElementById('timerActiveSubjectTag');
    const todayTotal = document.getElementById('timerViewTodayTotal');
    const progressRing = document.getElementById('timerCircleProgress');

    if (giantDisplay) giantDisplay.textContent = timeString;
    if (todayTotal) todayTotal.textContent = formatHoursMinutes(state.timer.todayStudySeconds);

    const activeSub = state.subjects.find(s => s.id === state.timer.activeSubjectId);
    if (subjectTag) {
      subjectTag.textContent = activeSub ? `Tag: ${activeSub.code} - ${activeSub.name}` : 'Tag: General';
    }

    if (statusLabel) {
      if (!state.timer.isRunning) {
        statusLabel.textContent = state.timer.mode === 'custom' ? 'Ready to Focus (Manual)' : 'Ready to Focus';
      } else {
        statusLabel.textContent = (state.timer.mode === 'pomodoro' || state.timer.mode === 'custom') ? 'Focusing...' : 'Recharging...';
      }
    }

    // Update SVG progress ring (circumference = 2 * PI * 120 ≈ 754)
    if (progressRing) {
      const circumference = 754;
      let progress = 0;
      if (state.timer.mode === 'stopwatch') {
        progress = (currentSeconds % 3600) / 3600;
      } else {
        progress = totalTarget > 0 ? (totalTarget - currentSeconds) / totalTarget : 0;
      }
      const offset = circumference - (progress * circumference);
      progressRing.style.strokeDashoffset = offset;
    }
  }

  /**
   * Renders the complete Timer View components:
   * displays, completed cycles dots, and recent sessions log list.
   */
  function renderTimerView() {
    updateTimerDisplay();

    // 1. Completed cycles dots (groups of 4 Pomodoros)
    const cyclesContainer = document.getElementById('cyclesDotsContainer');
    if (cyclesContainer) {
      cyclesContainer.innerHTML = '';
      const completedInCycle = state.timer.completedCyclesToday % 4;
      const filledCount = (state.timer.completedCyclesToday > 0 && completedInCycle === 0) ? 4 : completedInCycle;
      for (let i = 0; i < 4; i++) {
        const dot = document.createElement('span');
        dot.className = `cycle-dot ${i < filledCount ? 'filled' : ''}`;
        cyclesContainer.appendChild(dot);
      }
    }

    // 2. Recent study sessions list
    const sessionsList = document.getElementById('timerSessionsList');
    const totalSessionsBadge = document.getElementById('timerTotalSessionsCount');

    if (totalSessionsBadge) {
      totalSessionsBadge.textContent = `${state.timer.recentSessions.length} logged`;
    }

    if (sessionsList) {
      sessionsList.innerHTML = '';
      if (state.timer.recentSessions.length === 0) {
        sessionsList.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.9rem;">No study sessions recorded yet. Finish a Pomodoro session to log your first block! 🎯</div>`;
      } else {
        state.timer.recentSessions.forEach(session => {
          const sub = state.subjects.find(s => s.id === session.subjectId);
          const color = sub ? sub.color : '#6366f1';
          const item = document.createElement('div');
          item.className = 'timer-session-item';
          item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="session-subject-dot" style="background: ${color}"></span>
              <div>
                <strong style="font-size: 0.92rem;">${session.subjectName || 'General Study'}</strong>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${session.date || ''} • ${session.timeStr || ''}</div>
              </div>
            </div>
            <span class="badge" style="background: ${color}20; color: ${color}; font-weight: 600;">+${session.durationMin}m</span>
          `;
          sessionsList.appendChild(item);
        });
      }
    }
  }

  // Expose manual timer and control functions globally for future UI binding or console usage
  window.StudyBuddyTimer = {
    setCustomTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    switchTimerMode,
    getTimerState
  };
  window.setCustomTimer = setCustomTimer;

  // ==========================================================================
  // 8. SUBJECT MANAGEMENT (VIEW & MODAL)
  // ==========================================================================
  function setupSubjectManagement() {
    const openBtn = document.getElementById('openAddSubjectModalBtn');
    const modal = document.getElementById('subjectModal');
    const form = document.getElementById('subjectForm');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        document.getElementById('subjectModalTitle').textContent = 'Add New Subject';
        document.getElementById('subjectEditId').value = '';
        form.reset();
        modal.showModal();
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('subjectEditId').value;
        const name = document.getElementById('subjectNameInput').value.trim();
        const code = document.getElementById('subjectCodeInput').value.trim().toUpperCase() || 'GEN';
        const targetHours = parseInt(document.getElementById('subjectTargetHoursInput').value, 10) || 4;
        const color = document.getElementById('subjectColorInput').value;
        const instructor = document.getElementById('subjectInstructorInput').value.trim() || 'TBD';

        if (editId) {
          // Edit existing subject
          const sub = state.subjects.find(s => s.id === editId);
          if (sub) {
            sub.name = name;
            sub.code = code;
            sub.targetHours = targetHours;
            sub.color = color;
            sub.instructor = instructor;
            showToast(`Updated subject ${code} ✏️`, 'success');
          }
        } else {
          // Add new subject
          const newSub = {
            id: 'sub-' + Date.now(),
            name,
            code,
            targetHours,
            color,
            instructor,
            studySeconds: 0
          };
          state.subjects.push(newSub);
          showToast(`Added subject ${code}! 📚`, 'success');
        }

        saveState();
        modal.close();
        renderSubjects();
        renderDashboard();
        populateTimerSubjects();
        populateTaskSubjectDropdown();
      });
    }
  }

  function renderSubjects() {
    const grid = document.getElementById('subjectGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const navCount = document.getElementById('navSubjectCount');
    if (navCount) navCount.textContent = state.subjects.length;

    if (state.subjects.length === 0) {
      grid.innerHTML = `
        <div class="card full-width" style="text-align: center; padding: 40px;">
          <h3>No subjects added yet!</h3>
          <p class="text-muted" style="margin: 8px 0 16px;">Add your semester subjects to start organizing tasks and timer logs.</p>
          <button class="btn btn-primary" onclick="document.getElementById('openAddSubjectModalBtn').click()">+ Add Your First Subject</button>
        </div>`;
      return;
    }

    state.subjects.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'subject-card';
      card.style.borderTopColor = sub.color;

      const subTasks = state.tasks.filter(t => t.subjectId === sub.id);
      const pendingTasks = subTasks.filter(t => t.status !== 'completed').length;
      const subMocks = state.mockTests.filter(m => m.subjectId === sub.id).length;
      const loggedHours = (sub.studySeconds / 3600).toFixed(1);

      card.innerHTML = `
        <div>
          <div class="subject-header-row">
            <span class="subject-code-tag" style="color: ${sub.color}; border-color: ${sub.color}40">${sub.code}</span>
            <div class="subject-actions">
              <button class="icon-btn edit-sub-btn" data-id="${sub.id}" title="Edit Subject" aria-label="Edit Subject">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="icon-btn delete-sub-btn" data-id="${sub.id}" title="Delete Subject" aria-label="Delete Subject">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <h3 class="subject-title">${sub.name}</h3>
          <p class="subject-instructor">👨‍🏫 ${sub.instructor}</p>
        </div>

        <div>
          <div class="subject-metrics">
            <div class="sub-metric-item">
              <span class="sub-metric-label">Logged Study</span>
              <span class="sub-metric-val" style="color: ${sub.color}">${loggedHours} hrs</span>
            </div>
            <div class="sub-metric-item">
              <span class="sub-metric-label">Target / Wk</span>
              <span class="sub-metric-val">${sub.targetHours} hrs</span>
            </div>
            <div class="sub-metric-item">
              <span class="sub-metric-label">Pending Tasks</span>
              <span class="sub-metric-val">${pendingTasks}</span>
            </div>
            <div class="sub-metric-item">
              <span class="sub-metric-label">Mock Tests</span>
              <span class="sub-metric-val">${subMocks}</span>
            </div>
          </div>

          <div class="subject-footer-actions">
            <button class="btn btn-secondary btn-sm quick-focus-btn" data-id="${sub.id}">Start Focus ⏱️</button>
            <span class="badge" style="background: ${sub.color}20; color: ${sub.color}">Active</span>
          </div>
        </div>
      `;

      // Event handlers
      card.querySelector('.edit-sub-btn').addEventListener('click', () => editSubject(sub.id));
      card.querySelector('.delete-sub-btn').addEventListener('click', () => deleteSubject(sub.id));
      card.querySelector('.quick-focus-btn').addEventListener('click', () => {
        state.timer.activeSubjectId = sub.id;
        saveState();
        populateTimerSubjects();
        updateTimerDisplay();
        // Switch to timer view
        const timerNav = document.querySelector('[data-view="timer"]');
        if (timerNav) timerNav.click();
      });

      grid.appendChild(card);
    });
  }

  function editSubject(id) {
    const sub = state.subjects.find(s => s.id === id);
    if (!sub) return;

    document.getElementById('subjectModalTitle').textContent = 'Edit Subject';
    document.getElementById('subjectEditId').value = sub.id;
    document.getElementById('subjectNameInput').value = sub.name;
    document.getElementById('subjectCodeInput').value = sub.code;
    document.getElementById('subjectTargetHoursInput').value = sub.targetHours;
    document.getElementById('subjectColorInput').value = sub.color;
    document.getElementById('subjectInstructorInput').value = sub.instructor;

    const modal = document.getElementById('subjectModal');
    if (modal) modal.showModal();
  }

  function deleteSubject(id) {
    const sub = state.subjects.find(s => s.id === id);
    if (!sub) return;
    if (confirm(`Are you sure you want to delete "${sub.name}"? Associated tasks will remain.`)) {
      state.subjects = state.subjects.filter(s => s.id !== id);
      showToast(`Subject ${sub.code} deleted.`, 'warning');
      saveState();
      renderSubjects();
      renderDashboard();
      populateTimerSubjects();
      populateTaskSubjectDropdown();
    }
  }

  // ==========================================================================
  // 9. TASK MANAGEMENT (VIEW & MODAL)
  // ==========================================================================
  function setupTaskManagement() {
    const openBtn = document.getElementById('openAddTaskModalBtn');
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const searchInput = document.getElementById('taskSearchInput');
    const subjectFilter = document.getElementById('taskSubjectFilter');
    const priorityFilter = document.getElementById('taskPriorityFilter');
    const statusFilter = document.getElementById('taskStatusFilter');
    const clearCompletedBtn = document.getElementById('clearCompletedTasksBtn');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        document.getElementById('taskModalTitle').textContent = 'Create Study Task';
        document.getElementById('taskEditId').value = '';
        form.reset();
        document.getElementById('taskDueDateInput').value = getIsoDate(1);
        populateTaskSubjectDropdown();
        modal.showModal();
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('taskEditId').value;
        const title = document.getElementById('taskTitleInput').value.trim();
        const subjectId = document.getElementById('taskSubjectSelect').value;
        const dueDate = document.getElementById('taskDueDateInput').value || getIsoDate(1);
        const priority = document.getElementById('taskPrioritySelect').value;
        const category = document.getElementById('taskCategorySelect').value;
        const notes = document.getElementById('taskNotesInput').value.trim();

        if (editId) {
          const task = state.tasks.find(t => t.id === editId);
          if (task) {
            task.title = title;
            task.subjectId = subjectId;
            task.dueDate = dueDate;
            task.priority = priority;
            task.category = category;
            task.notes = notes;
            showToast('Task updated successfully! 📋', 'success');
          }
        } else {
          const newTask = {
            id: 'task-' + Date.now(),
            title,
            subjectId,
            dueDate,
            priority,
            category,
            status: 'todo',
            notes
          };
          state.tasks.unshift(newTask);
          showToast('New study task created! 🎯', 'success');
        }

        saveState();
        modal.close();
        renderTasks();
        renderDashboard();
      });
    }

    [searchInput, subjectFilter, priorityFilter, statusFilter].forEach(el => {
      if (el) el.addEventListener('input', renderTasks);
    });

    if (clearCompletedBtn) {
      clearCompletedBtn.addEventListener('click', () => {
        const count = state.tasks.filter(t => t.status === 'completed').length;
        if (count === 0) {
          showToast('No completed tasks to clear.', 'info');
          return;
        }
        state.tasks = state.tasks.filter(t => t.status !== 'completed');
        saveState();
        renderTasks();
        renderDashboard();
        showToast(`Cleared ${count} completed tasks!`, 'info');
      });
    }

    populateTaskSubjectDropdown();
  }

  function populateTaskSubjectDropdown() {
    const taskSubSelect = document.getElementById('taskSubjectSelect');
    const filterSubSelect = document.getElementById('taskSubjectFilter');
    const mockSubSelect = document.getElementById('mockSubjectSelect');
    const mockFilterSub = document.getElementById('mockSubjectFilter');
    const remSubSelect = document.getElementById('reminderSubjectSelect');

    const formSelects = [taskSubSelect, mockSubSelect, remSubSelect].filter(Boolean);
    formSelects.forEach(select => {
      select.innerHTML = '';
      state.subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = `${sub.code} - ${sub.name}`;
        select.appendChild(opt);
      });
    });

    const filterSelects = [filterSubSelect, mockFilterSub].filter(Boolean);
    filterSelects.forEach(select => {
      select.innerHTML = '<option value="all">All Subjects</option>';
      state.subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = sub.code;
        select.appendChild(opt);
      });
    });
  }

  function renderTasks() {
    const list = document.getElementById('tasksList');
    if (!list) return;

    const search = (document.getElementById('taskSearchInput')?.value || '').toLowerCase();
    const subFilter = document.getElementById('taskSubjectFilter')?.value || 'all';
    const prioFilter = document.getElementById('taskPriorityFilter')?.value || 'all';
    const statusFilter = document.getElementById('taskStatusFilter')?.value || 'all';

    let filtered = state.tasks.filter(task => {
      const matchSearch = task.title.toLowerCase().includes(search) || (task.notes && task.notes.toLowerCase().includes(search));
      const matchSub = subFilter === 'all' || task.subjectId === subFilter;
      const matchPrio = prioFilter === 'all' || task.priority === prioFilter;
      const matchStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchSearch && matchSub && matchPrio && matchStatus;
    });

    // Update filter count badge
    const countEl = document.getElementById('tasksFilterCount');
    if (countEl) countEl.textContent = `Showing ${filtered.length} of ${state.tasks.length} tasks`;

    const navTaskCount = document.getElementById('navTaskCount');
    const pendingTasksCount = state.tasks.filter(t => t.status !== 'completed').length;
    if (navTaskCount) navTaskCount.textContent = pendingTasksCount;

    list.innerHTML = '';
    if (filtered.length === 0) {
      list.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">No tasks found matching your filters.</div>`;
      return;
    }

    filtered.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-card-item ${task.status === 'completed' ? 'completed' : ''}`;

      const sub = state.subjects.find(s => s.id === task.subjectId) || { name: 'General', code: 'GEN', color: '#6366f1' };
      const isCompleted = task.status === 'completed';

      item.innerHTML = `
        <div class="task-item-left">
          <input type="checkbox" class="task-check-circle" ${isCompleted ? 'checked' : ''} aria-label="Mark task as complete">
          <div class="task-main-content">
            <h4 class="task-main-title">${task.title}</h4>
            ${task.notes ? `<p class="task-notes-preview">${task.notes}</p>` : ''}
            <div class="task-tags-row">
              <span class="task-subject-tag" style="background: ${sub.color}20; color: ${sub.color}">${sub.code}</span>
              <span class="badge badge-${task.priority}">${task.priority}</span>
              <span class="badge-subtle">${task.category}</span>
              <span class="task-date-tag">📅 Due: ${task.dueDate}</span>
            </div>
          </div>
        </div>
        <div class="task-item-right">
          <button class="icon-btn edit-task-btn" title="Edit Task" aria-label="Edit Task">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="icon-btn delete-task-btn" title="Delete Task" aria-label="Delete Task">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Checkbox toggle
      item.querySelector('.task-check-circle').addEventListener('change', (e) => {
        task.status = e.target.checked ? 'completed' : 'todo';
        if (e.target.checked) {
          playToneChime();
          showToast('Task completed! Great momentum! 🚀', 'success');
          recordActivity(0);
        }
        saveState();
        renderTasks();
        renderDashboard();
      });

      // Edit task
      item.querySelector('.edit-task-btn').addEventListener('click', () => {
        document.getElementById('taskModalTitle').textContent = 'Edit Study Task';
        document.getElementById('taskEditId').value = task.id;
        document.getElementById('taskTitleInput').value = task.title;
        document.getElementById('taskSubjectSelect').value = task.subjectId;
        document.getElementById('taskDueDateInput').value = task.dueDate;
        document.getElementById('taskPrioritySelect').value = task.priority;
        document.getElementById('taskCategorySelect').value = task.category;
        document.getElementById('taskNotesInput').value = task.notes || '';
        document.getElementById('taskModal').showModal();
      });

      // Delete task
      item.querySelector('.delete-task-btn').addEventListener('click', () => {
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        saveState();
        renderTasks();
        renderDashboard();
        showToast('Task deleted.', 'info');
      });

      list.appendChild(item);
    });
  }

  // ==========================================================================
  // 10. DAILY TO-DO LIST
  // ==========================================================================
  function setupTodoList() {
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodoBtn');
    const clearCompletedBtn = document.getElementById('clearAllCompletedTodosBtn');
    const dashTodoInput = document.getElementById('dashQuickTodoInput');
    const dashAddBtn = document.getElementById('dashQuickTodoAddBtn');

    function addTodo(text) {
      if (!text || !text.trim()) return;
      state.todos.push({
        id: 'todo-' + Date.now(),
        text: text.trim(),
        completed: false
      });
      saveState();
      renderTodos();
      renderDashboard();
      showToast('Added to daily checklist! 📝', 'success');
    }

    if (addTodoBtn && todoInput) {
      addTodoBtn.addEventListener('click', () => {
        addTodo(todoInput.value);
        todoInput.value = '';
      });
      todoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          addTodo(todoInput.value);
          todoInput.value = '';
        }
      });
    }

    if (dashAddBtn && dashTodoInput) {
      dashAddBtn.addEventListener('click', () => {
        addTodo(dashTodoInput.value);
        dashTodoInput.value = '';
      });
      dashTodoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          addTodo(dashTodoInput.value);
          dashTodoInput.value = '';
        }
      });
    }

    if (clearCompletedBtn) {
      clearCompletedBtn.addEventListener('click', () => {
        state.todos = state.todos.filter(t => !t.completed);
        saveState();
        renderTodos();
        renderDashboard();
        showToast('Cleared completed to-dos.', 'info');
      });
    }
  }

  function renderTodos() {
    const list = document.getElementById('fullTodoList');
    if (!list) return;

    list.innerHTML = '';
    const completedCount = state.todos.filter(t => t.completed).length;
    const totalCount = state.todos.length;
    const pct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    const subEl = document.getElementById('todoProgressSubtitle');
    const pctEl = document.getElementById('todoPercentageText');
    const dateEl = document.getElementById('todoCurrentDate');

    if (dateEl) {
      const opts = { weekday: 'long', month: 'short', day: 'numeric' };
      dateEl.textContent = new Date().toLocaleDateString(undefined, opts);
    }
    if (subEl) subEl.textContent = `${completedCount} of ${totalCount} tasks completed`;
    if (pctEl) pctEl.textContent = `${pct}%`;

    state.todos.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <div class="todo-item-left">
          <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} aria-label="Mark task done">
          <span class="todo-text">${todo.text}</span>
        </div>
        <button class="todo-delete-btn" title="Delete To-do" aria-label="Delete To-do">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      li.querySelector('.todo-checkbox').addEventListener('change', (e) => {
        todo.completed = e.target.checked;
        if (e.target.checked) {
          playToneChime();
          recordActivity(0);
        }
        saveState();
        renderTodos();
        renderDashboard();
      });

      li.querySelector('.todo-delete-btn').addEventListener('click', () => {
        state.todos = state.todos.filter(t => t.id !== todo.id);
        saveState();
        renderTodos();
        renderDashboard();
      });

      list.appendChild(li);
    });
  }

  // ==========================================================================
  // 11. MOCK TESTS & PYQ TRACKER
  // ==========================================================================
  function setupMockTestTracker() {
    const openBtn = document.getElementById('openAddMockTestModalBtn');
    const modal = document.getElementById('mockTestModal');
    const form = document.getElementById('mockTestForm');
    const subFilter = document.getElementById('mockSubjectFilter');
    const typeFilter = document.getElementById('mockTypeFilter');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('mockDateInput').value = getIsoDate(0);
        populateTaskSubjectDropdown();
        modal.showModal();
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('mockTitleInput').value.trim();
        const subjectId = document.getElementById('mockSubjectSelect').value;
        const type = document.getElementById('mockTypeSelect').value;
        const score = parseFloat(document.getElementById('mockScoreInput').value);
        const maxScore = parseFloat(document.getElementById('mockMaxScoreInput').value);
        const timeMinutes = parseInt(document.getElementById('mockTimeTakenInput').value, 10) || 60;
        const date = document.getElementById('mockDateInput').value || getIsoDate(0);
        const weakTopics = document.getElementById('mockWeakTopicsInput').value.trim();

        if (score > maxScore) {
          showToast('Score cannot exceed maximum score!', 'warning');
          return;
        }

        const newTest = {
          id: 'mock-' + Date.now(),
          title,
          subjectId,
          type,
          score,
          maxScore,
          timeMinutes,
          date,
          weakTopics
        };

        state.mockTests.unshift(newTest);
        saveState();
        modal.close();
        renderMockTests();
        renderDashboard();
        showToast('Recorded test result! Keep grinding! 🎯', 'success');
        playToneChime();
      });
    }

    [subFilter, typeFilter].forEach(el => {
      if (el) el.addEventListener('change', renderMockTests);
    });
  }

  function renderMockTests() {
    const list = document.getElementById('mockTestsList');
    if (!list) return;

    const subFilter = document.getElementById('mockSubjectFilter')?.value || 'all';
    const typeFilter = document.getElementById('mockTypeFilter')?.value || 'all';

    let filtered = state.mockTests.filter(test => {
      const matchSub = subFilter === 'all' || test.subjectId === subFilter;
      const matchType = typeFilter === 'all' || test.type === typeFilter;
      return matchSub && matchType;
    });

    // Update KPI cards
    const totalTests = state.mockTests.length;
    let avgPercent = 0;
    let highestPercent = 0;
    let highestSubName = 'N/A';
    let totalMins = 0;
    let pyqCount = 0;
    let mockCount = 0;

    if (totalTests > 0) {
      let sumPct = 0;
      state.mockTests.forEach(m => {
        const pct = (m.score / m.maxScore) * 100;
        sumPct += pct;
        if (pct > highestPercent) {
          highestPercent = pct;
          const s = state.subjects.find(sub => sub.id === m.subjectId);
          highestSubName = s ? s.name : 'Unknown';
        }
        totalMins += (m.timeMinutes || 60);
        if (m.type === 'PYQ') pyqCount++;
        else mockCount++;
      });
      avgPercent = (sumPct / totalTests).toFixed(1);
    }

    const avgKpi = document.getElementById('mockAvgScoreKpi');
    const highKpi = document.getElementById('mockHighestScoreKpi');
    const highSub = document.getElementById('mockHighestSubject');
    const papersKpi = document.getElementById('mockTotalPapersKpi');
    const pyqCountSub = document.getElementById('mockPyqPapersCount');
    const avgSpeedKpi = document.getElementById('mockAvgSpeedKpi');
    const badgeCount = document.getElementById('mockTestCountBadge');

    if (avgKpi) avgKpi.textContent = `${avgPercent}%`;
    if (highKpi) highKpi.textContent = `${highestPercent.toFixed(1)}%`;
    if (highSub) highSub.textContent = highestSubName;
    if (papersKpi) papersKpi.textContent = totalTests;
    if (pyqCountSub) pyqCountSub.textContent = `${pyqCount} PYQs • ${mockCount} Mocks`;
    if (avgSpeedKpi && totalTests > 0) avgSpeedKpi.textContent = `${Math.round(totalMins / totalTests)} min`;
    if (badgeCount) badgeCount.textContent = `${filtered.length} tests`;

    list.innerHTML = '';
    if (filtered.length === 0) {
      list.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">No mock tests or PYQs found for this filter.</div>`;
      return;
    }

    filtered.forEach(test => {
      const item = document.createElement('div');
      item.className = 'mock-test-item';

      const sub = state.subjects.find(s => s.id === test.subjectId) || { name: 'General', code: 'GEN', color: '#6366f1' };
      const pct = Math.round((test.score / test.maxScore) * 100);

      let scoreClass = 'score-needs-work';
      if (pct >= 80) scoreClass = 'score-great';
      else if (pct >= 60) scoreClass = 'score-good';

      item.innerHTML = `
        <div class="mock-test-left">
          <div class="mock-test-title-row">
            <span class="mock-badge-type">${test.type}</span>
            <span class="badge" style="background: ${sub.color}20; color: ${sub.color}">${sub.code}</span>
            <h4 class="mock-test-title">${test.title}</h4>
          </div>
          <div class="task-date-tag">
            <span>📅 Taken: ${test.date}</span> • <span>⏱️ Time: ${test.timeMinutes} mins</span>
          </div>
          ${test.weakTopics ? `<p class="mock-test-remarks"><strong>Weak Areas:</strong> ${test.weakTopics}</p>` : ''}
        </div>

        <div class="mock-test-center">
          <span class="mock-score-big">${test.score} / ${test.maxScore}</span>
          <span class="mock-score-percent ${scoreClass}">${pct}% Accuracy</span>
        </div>

        <div>
          <button class="icon-btn delete-mock-btn" title="Delete Record" aria-label="Delete Record">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      item.querySelector('.delete-mock-btn').addEventListener('click', () => {
        state.mockTests = state.mockTests.filter(m => m.id !== test.id);
        saveState();
        renderMockTests();
        renderDashboard();
        showToast('Test record deleted.', 'info');
      });

      list.appendChild(item);
    });
  }

  // ==========================================================================
  // 12. DAILY REMINDERS
  // ==========================================================================
  function setupReminders() {
    const openBtn = document.getElementById('openAddReminderModalBtn');
    const modal = document.getElementById('reminderModal');
    const form = document.getElementById('reminderForm');
    const reqPermBtn = document.getElementById('requestNotifyPermissionBtn');

    checkNotificationPermissionUI();

    if (reqPermBtn) {
      reqPermBtn.addEventListener('click', () => {
        if (!('Notification' in window)) {
          showToast('Desktop notifications are not supported in this browser.', 'warning');
          return;
        }
        Notification.requestPermission().then(perm => {
          checkNotificationPermissionUI();
          if (perm === 'granted') {
            showToast('Desktop notifications enabled! 🔔', 'success');
            new Notification('Study Buddy', { body: 'Study reminders are now activated!' });
          } else {
            showToast('Notification permission denied.', 'warning');
          }
        });
      });
    }

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        form.reset();
        populateTaskSubjectDropdown();
        modal.showModal();
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('reminderTitleInput').value.trim();
        const time = document.getElementById('reminderTimeInput').value;
        const subjectId = document.getElementById('reminderSubjectSelect').value;
        const frequency = document.getElementById('reminderDaysSelect').value;

        const newRem = {
          id: 'rem-' + Date.now(),
          title,
          time,
          subjectId,
          frequency,
          active: true
        };

        state.reminders.push(newRem);
        saveState();
        modal.close();
        renderReminders();
        showToast('Study reminder created! ⏰', 'success');
      });
    }

    // Interval checker for reminder times (runs every 30 seconds)
    setInterval(checkTriggerReminders, 30000);
  }

  function checkNotificationPermissionUI() {
    const textEl = document.getElementById('notifyPermissionText');
    if (!textEl) return;

    if (!('Notification' in window)) {
      textEl.textContent = 'Not supported in this browser environment. In-app toasts are active.';
      return;
    }

    if (Notification.permission === 'granted') {
      textEl.textContent = 'Active & Allowed (Desktop Notifications Ready)';
    } else if (Notification.permission === 'denied') {
      textEl.textContent = 'Blocked by browser. In-app banner toasts will be used.';
    } else {
      textEl.textContent = 'Click "Enable Notifications" to receive desktop alert popups.';
    }
  }

  let lastCheckedMinute = '';
  function checkTriggerReminders() {
    const now = new Date();
    const currentHHMM = now.toTimeString().slice(0, 5);
    if (currentHHMM === lastCheckedMinute) return;
    lastCheckedMinute = currentHHMM;

    state.reminders.forEach(rem => {
      if (rem.active && rem.time === currentHHMM) {
        // Trigger alert!
        const sub = state.subjects.find(s => s.id === rem.subjectId);
        const subName = sub ? sub.name : 'Study Session';

        showToast(`⏰ REMINDER: ${rem.title} (${subName})`, 'warning');
        playToneChime();

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Study Buddy Reminder', {
            body: `${rem.title} (${subName}) - Time to hit the books!`,
            icon: 'favicon.ico'
          });
        }
      }
    });
  }

  function renderReminders() {
    const grid = document.getElementById('remindersGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (state.reminders.length === 0) {
      grid.innerHTML = `<div class="card full-width" style="text-align: center; padding: 30px; color: var(--text-muted);">No study reminders set. Click "Add Reminder" to never miss a study block.</div>`;
      return;
    }

    state.reminders.forEach(rem => {
      const card = document.createElement('div');
      card.className = 'reminder-card';

      const sub = state.subjects.find(s => s.id === rem.subjectId) || { code: 'GEN', color: '#6366f1' };

      card.innerHTML = `
        <div>
          <div class="reminder-time-badge">${rem.time}</div>
          <h4 class="reminder-title">${rem.title}</h4>
          <div class="reminder-sub-meta">
            <span class="badge" style="background: ${sub.color}20; color: ${sub.color}">${sub.code}</span>
            <span>🔁 ${rem.frequency}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <label class="switch" title="Toggle active">
            <input type="checkbox" class="reminder-toggle" ${rem.active ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <button class="icon-btn delete-rem-btn" title="Delete Reminder" aria-label="Delete Reminder">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      card.querySelector('.reminder-toggle').addEventListener('change', (e) => {
        rem.active = e.target.checked;
        saveState();
        showToast(rem.active ? 'Reminder activated.' : 'Reminder paused.', 'info');
      });

      card.querySelector('.delete-rem-btn').addEventListener('click', () => {
        state.reminders = state.reminders.filter(r => r.id !== rem.id);
        saveState();
        renderReminders();
        showToast('Reminder deleted.', 'info');
      });

      grid.appendChild(card);
    });
  }

  // ==========================================================================
  // 13. PROGRESS ANALYTICS & VISUAL CHARTS
  // ==========================================================================
  function renderAnalytics() {
    renderBarChart();
    renderSubjectBreakdown();
    renderHeatmap();
    renderMilestones();
  }

  function renderBarChart() {
    const container = document.getElementById('studyBarChart');
    if (!container) return;
    container.innerHTML = '';

    // Past 7 days
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const past7 = [];
    let weekTotalSec = 0;
    let maxSec = 3600; // minimum baseline

    for (let i = 6; i >= 0; i--) {
      const dateStr = getIsoDate(-i);
      const d = new Date(dateStr);
      const dayName = days[(d.getDay() + 6) % 7];
      const sec = state.streak.dailyHistory[dateStr] || 0;
      past7.push({ dateStr, dayName, sec });
      weekTotalSec += sec;
      if (sec > maxSec) maxSec = sec;
    }

    const weekTotalEl = document.getElementById('analyticsWeekTotal');
    if (weekTotalEl) {
      weekTotalEl.textContent = `Total: ${(weekTotalSec / 3600).toFixed(1)} hrs`;
    }

    past7.forEach(item => {
      const col = document.createElement('div');
      col.className = 'chart-bar-col';

      const pct = Math.min(100, Math.round((item.sec / maxSec) * 100));
      const hrs = (item.sec / 3600).toFixed(1);

      col.innerHTML = `
        <span class="chart-bar-val">${item.sec > 0 ? hrs + 'h' : ''}</span>
        <div class="chart-bar-track" title="${item.dateStr}: ${hrs} hrs studied">
          <div class="chart-bar-fill" style="height: ${pct}%"></div>
        </div>
        <span class="chart-bar-label">${item.dayName}</span>
      `;
      container.appendChild(col);
    });
  }

  function renderSubjectBreakdown() {
    const list = document.getElementById('analyticsSubjectBreakdown');
    if (!list) return;
    list.innerHTML = '';

    const totalSeconds = state.subjects.reduce((sum, s) => sum + (s.studySeconds || 0), 0);

    state.subjects.forEach(sub => {
      const sec = sub.studySeconds || 0;
      const hrs = (sec / 3600).toFixed(1);
      const pct = totalSeconds === 0 ? 0 : Math.round((sec / totalSeconds) * 100);

      const row = document.createElement('div');
      row.className = 'breakdown-row';
      row.innerHTML = `
        <div class="breakdown-info">
          <span>${sub.name} (${sub.code})</span>
          <span style="color: ${sub.color}">${hrs} hrs (${pct}%)</span>
        </div>
        <div class="breakdown-track">
          <div class="breakdown-fill" style="width: ${pct}%; background: ${sub.color}"></div>
        </div>
      `;
      list.appendChild(row);
    });
  }

  function renderHeatmap() {
    const grid = document.getElementById('analyticsHeatmapGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Last 14 days
    for (let i = 13; i >= 0; i--) {
      const dateStr = getIsoDate(-i);
      const d = new Date(dateStr);
      const label = d.toLocaleDateString(undefined, { weekday: 'narrow' });
      const sec = state.streak.dailyHistory[dateStr] || 0;
      const mins = Math.round(sec / 60);

      let lvl = 'lvl-0';
      if (mins >= 120) lvl = 'lvl-3';
      else if (mins >= 45) lvl = 'lvl-2';
      else if (mins > 0) lvl = 'lvl-1';

      const cell = document.createElement('div');
      cell.className = `heatmap-cell ${lvl}`;
      cell.title = `${dateStr}: ${mins} minutes studied`;
      cell.innerHTML = `
        <span class="heatmap-day-text">${label}</span>
        <span class="heatmap-minutes">${mins > 0 ? mins + 'm' : '-'}</span>
      `;
      grid.appendChild(cell);
    }
  }

  function renderMilestones() {
    const grid = document.getElementById('milestoneBadgesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const completedTasksCount = state.tasks.filter(t => t.status === 'completed').length;
    const streak = state.streak.currentStreak;
    const testCount = state.mockTests.length;
    const hasPerfectScore = state.mockTests.some(m => m.score === m.maxScore);

    const badges = [
      {
        icon: '🔥',
        title: '3-Day Momentum',
        desc: 'Maintained 3 consecutive days of study habits.',
        unlocked: streak >= 3
      },
      {
        icon: '⚡',
        title: '7-Day Scholar Streak',
        desc: 'Full 1-week continuous study streak.',
        unlocked: streak >= 7
      },
      {
        icon: '🎯',
        title: 'Task Executioner',
        desc: 'Completed at least 5 study tasks.',
        unlocked: completedTasksCount >= 5
      },
      {
        icon: '📝',
        title: 'Exam Veteran',
        desc: 'Completed at least 3 mock tests or PYQs.',
        unlocked: testCount >= 3
      },
      {
        icon: '🌟',
        title: 'Century Club (100%)',
        desc: 'Achieved a perfect 100% score on any practice exam.',
        unlocked: hasPerfectScore
      }
    ];

    badges.forEach(b => {
      const card = document.createElement('div');
      card.className = `badge-card ${b.unlocked ? 'unlocked' : ''}`;
      card.innerHTML = `
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-info">
          <h4>${b.title} ${b.unlocked ? '✅' : '🔒'}</h4>
          <p>${b.desc}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ==========================================================================
  // 14. BUILT-IN AI STUDY ASSISTANT (COLLEGE ACADEMIC TUTOR & COPILOT)
  // ==========================================================================
  let isAiResponding = false;

  function setupAiAssistant() {
    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const clearBtn = document.getElementById('clearAiChatBtn');
    const chipBtns = document.querySelectorAll('.ai-chip, .quick-chip');

    chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (isAiResponding) return;
        const text = btn.getAttribute('data-ai-text') || btn.getAttribute('data-ai-prompt');
        if (text) {
          // Switch to assistant view if clicked from dashboard or sidebar
          const assistantNav = document.querySelector('[data-view="assistant"]');
          if (assistantNav && !document.getElementById('view-assistant').classList.contains('active')) {
            assistantNav.click();
          }
          sendUserMessage(text);
        }
      });
    });

    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => {
        if (isAiResponding) return;
        const val = input.value;
        input.value = '';
        sendUserMessage(val);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (isAiResponding) return;
          const val = input.value;
          input.value = '';
          sendUserMessage(val);
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.chatHistory = state.chatHistory.slice(0, 1); // Keep welcome message
        saveState();
        renderAiChat();
        showToast('Chat history cleared.', 'info');
      });
    }
  }

  function sendUserMessage(text) {
    if (isAiResponding) return;
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    isAiResponding = true;
    const sendBtn = document.getElementById('aiSendBtn');
    const input = document.getElementById('aiChatInput');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.5';
    }

    // Push User message
    state.chatHistory.push({
      role: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: cleanText
    });

    saveState();
    renderAiChat();

    // Show temporary typing indicator
    const scrollContainer = document.getElementById('aiMessagesContainer');
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'ai-message-row bot-row typing-temp';
    typingIndicator.innerHTML = `
      <div class="ai-avatar">🤖</div>
      <div class="ai-bubble">
        <div class="ai-bubble-content"><em>Analyzing query and synthesizing answer...</em></div>
      </div>`;
    if (scrollContainer) {
      scrollContainer.appendChild(typingIndicator);
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }

    const finishAiResponse = (replyText) => {
      try {
        if (typingIndicator && typingIndicator.parentNode) {
          typingIndicator.remove();
        }
        state.chatHistory.push({
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: replyText
        });
        saveState();
        renderAiChat();
        playToneChime();
      } catch (err) {
        console.error('Error rendering AI response:', err);
      } finally {
        isAiResponding = false;
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.style.opacity = '1';
        }
        if (input) input.focus();
      }
    };

    // If user has provided a custom Gemini API key in settings, attempt live call
    if (state.settings && state.settings.geminiApiKey) {
      fetchLiveGeminiResponse(cleanText, typingIndicator, finishAiResponse);
    } else {
      // Simulate realistic intelligent response after 600ms
      setTimeout(() => {
        const reply = generateCollegeAiResponse(cleanText);
        finishAiResponse(reply);
      }, 600);
    }
  }

  async function fetchLiveGeminiResponse(prompt, typingIndicator, callback) {
    const key = state.settings.geminiApiKey;
    if (!key) {
      const fallback = generateCollegeAiResponse(prompt);
      callback(fallback);
      return;
    }

    const systemInstruction = `You are Study Buddy AI, an expert, encouraging, and sharp college academic tutor.
Guidelines:
1. Answer the user's EXACT question directly first. Never use generic intro filler or academic analysis templates.
2. For programming questions (C, Python, Data Structures, etc.):
   - Explain the requested concept directly in clear, beginner-friendly language.
   - Provide correct syntax and a small, working code example.
   - Explain the output and how the code works step by step.
   - Do NOT introduce unrelated topics (e.g. do not discuss null pointers or time complexity unless asked).
3. For errors and debugging: explain what went wrong in plain English, why it happened, and how to fix it with an example.
4. For mathematics, physics, chemistry, and engineering: answer the specific question asked, state relevant formulas, and show clear, step-by-step logic.
5. Keep answers concise, high-yield, and beginner-friendly. Structure your response with clean markdown headings and bullet points.`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1200
      }
    };

    // Try gemini-2.0-flash first, then gemini-1.5-flash
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastErrorReason = '';

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          let errDetail = `Status ${res.status}`;
          try {
            const errJson = await res.json();
            if (errJson.error?.message) {
              errDetail += `: ${errJson.error.message}`;
            }
          } catch (_) {}
          lastErrorReason = errDetail;
          if (res.status === 404) continue; // Try next model
          break;
        }

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply && reply.trim()) {
          callback(reply.trim());
          return;
        } else {
          lastErrorReason = 'Empty response from model';
          break;
        }
      } catch (err) {
        lastErrorReason = err.name === 'AbortError' ? 'Request timed out (15s)' : (err.message || 'Network connection failed');
        break;
      }
    }

    // Gracefully use built-in fallback tutor
    console.warn('Gemini live API unavailable, using offline tutor:', lastErrorReason);
    const offlineReply = generateCollegeAiResponse(prompt);
    const gracefulMessage = `> 💡 **Offline Mode Notice:** Live API is currently unavailable (${lastErrorReason || 'Request failed'}). Displaying comprehensive answer from the built-in Study Buddy academic tutor:\n\n${offlineReply}`;
    callback(gracefulMessage);
  }

  // ==========================================================================
  // DIRECT ACADEMIC TUTOR SYSTEM (ACCURATE, SPECIFIC & BEGINNER-FRIENDLY)
  // ==========================================================================
  function generateCollegeAiResponse(input) {
    const q = input.toLowerCase().trim();
    const hasWord = (w) => new RegExp(`\\b${w}\\b`, 'i').test(q);
    const isC = hasWord('c') || q.includes('in c') || q.includes('c program') || q.includes('c language') || q.includes('c code');
    const isPython = hasWord('python') || q.includes('in python') || q.includes('python code') || q.includes('pythonic');

    // ------------------------------------------------------------------------
    // 1. C PROGRAMMING CONCEPTS (DIRECT & BEGINNER-FRIENDLY)
    // ------------------------------------------------------------------------
    // If-Else in C
    if ((q.includes('if-else') || q.includes('if else') || (hasWord('if') && (hasWord('else') || q.includes('condition')))) && (isC || !isPython)) {
      return `### If-Else Statements in C 🚦

**1. What is If-Else?**
An \`if-else\` statement lets your program make decisions based on a condition:
- If the condition evaluates to **true** (non-zero), the code inside the \`if\` block executes.
- If the condition evaluates to **false** (zero), the code inside the \`else\` block executes instead.

**2. Basic Syntax:**
\`\`\`c
if (condition) {
    // Code to run if condition is true
} else {
    // Code to run if condition is false
}
\`\`\`

**3. Simple Working Example:**
\`\`\`c
#include <stdio.h>

int main() {
    int age = 18;

    // Check if age is 18 or older
    if (age >= 18) {
        printf("You are eligible to vote!\\n");
    } else {
        printf("You are not eligible to vote yet.\\n");
    }

    return 0;
}
\`\`\`

**4. Expected Output:**
\`\`\`text
You are eligible to vote!
\`\`\`

**5. How It Works:**
1. The program declares an integer variable \`age\` initialized to \`18\`.
2. It tests the condition \`age >= 18\`.
3. Since 18 is greater than or equal to 18, the condition is **true**.
4. The program executes \`printf("You are eligible to vote!\\n");\` inside the \`if\` block.
5. The \`else\` block is completely skipped.
*(If you changed \`age = 15\`, the condition would be false, and it would execute the \`else\` block instead).*`;
    }

    // Switch Case in C
    if ((q.includes('switch') || q.includes('switch case')) && (isC || !isPython)) {
      return `### Switch Statement in C 🔀

**1. What is a Switch Statement?**
A \`switch\` statement tests a single variable against multiple possible values (called \`case\`s) as a cleaner alternative to a long chain of \`if-else if\` statements.

**2. Basic Syntax:**
\`\`\`c
switch (variable) {
    case value1:
        // code
        break;
    case value2:
        // code
        break;
    default:
        // code if no case matches
}
\`\`\`

**3. Simple Working Example:**
\`\`\`c
#include <stdio.h>

int main() {
    int day = 3;

    switch (day) {
        case 1:
            printf("Monday\\n");
            break;
        case 2:
            printf("Tuesday\\n");
            break;
        case 3:
            printf("Wednesday\\n");
            break;
        default:
            printf("Another day\\n");
    }

    return 0;
}
\`\`\`

**4. Expected Output:**
\`\`\`text
Wednesday
\`\`\`

**5. How It Works:**
- The program evaluates \`day\` (value 3).
- It jumps directly to \`case 3:\` and prints *"Wednesday"*.
- The \`break;\` statement stops execution so it doesn't fall through to subsequent cases.`;
    }

    // For Loop in C
    if ((q.includes('for loop') || (q.includes('loop') && hasWord('for'))) && (isC || !isPython)) {
      return `### For Loop in C 🔄

**1. What is a For Loop?**
A \`for\` loop repeats a block of code a specific number of times.

**2. Basic Syntax:**
\`\`\`c
for (initialization; condition; update) {
    // code to repeat
}
\`\`\`

**3. Simple Working Example:**
\`\`\`c
#include <stdio.h>

int main() {
    // Print numbers from 1 to 5
    for (int i = 1; i <= 5; i++) {
        printf("Count: %d\\n", i);
    }
    return 0;
}
\`\`\`

**4. Expected Output:**
\`\`\`text
Count: 1
Count: 2
Count: 3
Count: 4
Count: 5
\`\`\`

**5. How It Works:**
1. \`int i = 1\`: The loop counter starts at 1.
2. \`i <= 5\`: Checks if \`i\` is less than or equal to 5 (true).
3. The body runs, printing the current value.
4. \`i++\`: Increments \`i\` by 1.
5. Steps 2–4 repeat until \`i\` reaches 6, when the loop terminates.`;
    }

    // While & Do-While Loops in C
    if ((q.includes('while') || q.includes('do-while') || q.includes('do while')) && (isC || !isPython)) {
      return `### While & Do-While Loops in C 🔁

**1. What is a While Loop?**
A \`while\` loop repeatedly executes code as long as a test condition remains true.

**2. Basic Syntax:**
\`\`\`c
while (condition) {
    // code runs while condition is true
}
\`\`\`

**3. Simple Working Example:**
\`\`\`c
#include <stdio.h>

int main() {
    int count = 3;

    while (count > 0) {
        printf("%d...\\n", count);
        count--; // Decrement to avoid infinite loop!
    }
    printf("Liftoff!\\n");
    return 0;
}
\`\`\`

**4. Expected Output:**
\`\`\`text
3...
2...
1...
Liftoff!
\`\`\`

**5. While vs. Do-While:**
- **\`while\`**: Checks the condition **before** entering the loop (may run 0 times).
- **\`do-while\`**: Checks the condition **after** executing the body, so it is guaranteed to run **at least once**:
  \`\`\`c
  do {
      printf("Runs at least once\\n");
  } while (0);
  \`\`\``;
    }

    // Functions in C
    if (q.includes('function') && (isC || !isPython)) {
      return `### Functions in C 🛠️

**1. What is a Function?**
A function is a reusable block of code that performs a specific task. It can accept inputs (parameters) and return an output value.

**2. Basic Syntax:**
\`\`\`c
return_type function_name(parameter_type param1, parameter_type param2) {
    // code
    return value;
}
\`\`\`

**3. Simple Working Example:**
\`\`\`c
#include <stdio.h>

// Function definition: adds two integers
int addNumbers(int a, int b) {
    return a + b;
}

int main() {
    int result = addNumbers(5, 7); // Call the function
    printf("The sum is: %d\\n", result);
    return 0;
}
\`\`\`

**4. Expected Output:**
\`\`\`text
The sum is: 12
\`\`\`

**5. How It Works:**
1. When \`addNumbers(5, 7)\` is called, \`5\` and \`7\` are passed into parameters \`a\` and \`b\`.
2. The function calculates \`5 + 7\` and returns \`12\`.
3. \`main\` stores \`12\` in \`result\` and displays it.`;
    }

    // Arrays in C
    if (q.includes('array') && (isC || !isPython)) {
      return `### Arrays in C 📊

**1. What is an Array?**
An array is a collection of items of the **same data type** stored sequentially in memory. Items are accessed using a zero-based index (\`0\` to \`size - 1\`).

**2. Basic Syntax:**
\`\`\`c
data_type array_name[size];
\`\`\`

**3. Simple Working Example:**
\`\`\`c
#include <stdio.h>

int main() {
    // Declare and initialize an array of 4 integers
    int scores[4] = {85, 90, 78, 92};

    // Print array elements using a loop
    for (int i = 0; i < 4; i++) {
        printf("Score %d: %d\\n", i + 1, scores[i]);
    }
    return 0;
}
\`\`\`

**4. Expected Output:**
\`\`\`text
Score 1: 85
Score 2: 90
Score 3: 78
Score 4: 92
\`\`\`

**5. Key Rules:**
- \`scores[0]\` is the first element; \`scores[3]\` is the fourth element.
- Accessing an index outside the range (like \`scores[10]\`) causes undefined behavior!`;
    }

    // Pointers in C
    if ((q.includes('pointer') || q.includes('dereference')) && (isC || !isPython)) {
      return `### Pointers in C Explained Simply 🎯

**1. What is a Pointer?**
A pointer is a variable that stores the **memory address** of another variable.

**2. The Two Key Operators:**
- \`&\` (**Address-of operator**): Gets the memory address where a variable is stored.
- \`*\` (**Dereference operator**): Accesses or changes the value stored at that address.

**3. Simple Working Example:**
\`\`\`c
#include <stdio.h>

int main() {
    int number = 42;
    int *ptr = &number; // ptr stores the address of number

    printf("Value of number: %d\\n", number);
    printf("Value via pointer (*ptr): %d\\n", *ptr);

    // Change number's value using the pointer
    *ptr = 100;
    printf("New value of number: %d\\n", number);

    return 0;
}
\`\`\`

**4. Expected Output:**
\`\`\`text
Value of number: 42
Value via pointer (*ptr): 42
New value of number: 100
\`\`\`

**5. How It Works:**
- \`int *ptr = &number;\` links \`ptr\` to \`number\`'s memory box.
- Assigning \`*ptr = 100;\` directly modifies \`number\` from a distance.`;
    }

    // Dynamic Memory in C (malloc, free)
    if (q.includes('malloc') || q.includes('calloc') || q.includes('dynamic memory') || (q.includes('free') && q.includes('memory'))) {
      return `### Dynamic Memory Allocation in C (\`malloc\` & \`free\`) 💾

**1. What is Dynamic Memory?**
Dynamic memory allows you to allocate memory on the **Heap** at runtime when you don't know the exact size needed ahead of time.

**2. Key Functions (\`<stdlib.h>\`):**
- \`malloc(size)\`: Allocates memory of requested byte size.
- \`free(ptr)\`: Releases heap memory back to the system.

**3. Simple Working Example:**
\`\`\`c
#include <stdio.h>
#include <stdlib.h>

int main() {
    // Allocate space for 3 integers on the heap
    int *arr = (int *)malloc(3 * sizeof(int));

    // Always check if allocation succeeded
    if (arr == NULL) {
        printf("Memory allocation failed!\\n");
        return 1;
    }

    arr[0] = 10;
    arr[1] = 20;
    arr[2] = 30;

    printf("First element: %d, Third element: %d\\n", arr[0], arr[2]);

    // Always free memory when done to prevent memory leaks!
    free(arr);
    arr = NULL; // Avoid dangling pointer

    return 0;
}
\`\`\`

**4. Expected Output:**
\`\`\`text
First element: 10, Third element: 30
\`\`\``;
    }

    // Strings in C
    if ((q.includes('string') || q.includes('char array') || q.includes('strcpy') || q.includes('strlen')) && (isC || !isPython)) {
      return `### Strings in C 🧵

**1. What is a String in C?**
C does not have a native \`string\` type. Instead, a string is a character array terminated by a special null character (\`'\\0'\`).

**2. Declaration & Safe Input:**
\`\`\`c
#include <stdio.h>
#include <string.h>

int main() {
    char name[50] = "Study Buddy";

    printf("String: %s\\n", name);
    printf("Length: %lu characters\\n", strlen(name));

    return 0;
}
\`\`\`

**3. Expected Output:**
\`\`\`text
String: Study Buddy
Length: 11 characters
\`\`\`

**4. Safe Input Tip:**
Never use \`gets()\` because it causes buffer overflows. Use \`fgets(buffer, sizeof(buffer), stdin);\` instead!`;
    }

    // Structures (struct) in C
    if (q.includes('struct') || q.includes('typedef') || q.includes('union')) {
      return `### Structures (\`struct\`) in C 📦

**1. What is a Struct?**
A \`struct\` allows you to group variables of different data types together under one custom name.

**2. Simple Working Example:**
\`\`\`c
#include <stdio.h>

// Define a Student struct
typedef struct {
    char name[30];
    int rollNumber;
    float gpa;
} Student;

int main() {
    Student s1 = {"Maya", 101, 3.85};

    printf("Student Name: %s\\n", s1.name);
    printf("Roll Number:  %d\\n", s1.rollNumber);
    printf("GPA:          %.2f\\n", s1.gpa);

    return 0;
}
\`\`\`

**3. Expected Output:**
\`\`\`text
Student Name: Maya
Roll Number:  101
GPA:          3.85
\`\`\`

**4. Member Access:**
- Use the dot operator (\`.\`) for direct struct variables: \`s1.gpa\`
- Use the arrow operator (\`->\`) when working with a pointer to a struct: \`ptr->gpa\``;
    }

    // Recursion in C
    if ((q.includes('recursion') || q.includes('recursive')) && (isC || !isPython)) {
      return `### Recursion in C 🔄

**1. What is Recursion?**
Recursion is when a function calls itself to solve a smaller instance of the same problem. Every recursive function must have:
1. **Base Case:** A stopping condition that prevents infinite execution.
2. **Recursive Step:** The function calling itself with an updated argument.

**2. Simple Working Example (Factorial):**
\`\`\`c
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1; // BASE CASE: 0! = 1, 1! = 1
    return n * factorial(n - 1); // RECURSIVE STEP
}

int main() {
    int num = 4;
    printf("Factorial of %d is: %d\\n", num, factorial(num));
    return 0;
}
\`\`\`

**3. Expected Output:**
\`\`\`text
Factorial of 4 is: 24
\`\`\`

**4. How It Works:**
\`factorial(4)\` calculates $4 \\times 3 \\times 2 \\times 1 = 24$. Once $n$ reaches 1, the base case triggers and the results multiply back up the stack.`;
    }

    // ------------------------------------------------------------------------
    // 2. PYTHON PROGRAMMING (DIRECT & BEGINNER-FRIENDLY)
    // ------------------------------------------------------------------------
    // If-Else in Python
    if (isPython && (q.includes('if') || q.includes('condition') || q.includes('elif'))) {
      return `### If-Else in Python 🐍

**1. What is If-Else in Python?**
An \`if-else\` statement evaluates a condition. If the condition is \`True\`, the indented block under \`if\` runs; otherwise, the block under \`else\` runs.

**2. Basic Syntax:**
\`\`\`python
if condition:
    # runs if condition is True
elif another_condition:
    # optional secondary condition
else:
    # runs if all above conditions are False
\`\`\`

**3. Simple Working Example:**
\`\`\`python
score = 82

if score >= 90:
    print("Grade: A")
elif score >= 75:
    print("Grade: B")
else:
    print("Grade: C or below")
\`\`\`

**4. Expected Output:**
\`\`\`text
Grade: B
\`\`\`

**5. How It Works:**
- Python uses **indentation** (4 spaces) instead of curly braces \`{}\`.
- Since 82 is not $\\ge 90$, the first condition is False.
- The \`elif\` condition \`82 >= 75\` is True, so it prints \`Grade: B\` and finishes.`;
    }

    // Loops in Python
    if (isPython && (q.includes('loop') || q.includes('for') || q.includes('while') || q.includes('range'))) {
      return `### Loops in Python (For & While) 🔁

**1. For Loop with \`range()\`:**
\`\`\`python
# Repeat code from 1 to 5
for i in range(1, 6):
    print(f"Number: {i}")
\`\`\`
Output:
\`\`\`text
Number: 1
Number: 2
Number: 3
Number: 4
Number: 5
\`\`\`

**2. While Loop:**
\`\`\`python
count = 3
while count > 0:
    print(count)
    count -= 1
print("Done!")
\`\`\`
Output:
\`\`\`text
3
2
1
Done!
\`\`\``;
    }

    // Python Lists & Comprehensions
    if (isPython && (q.includes('list') || q.includes('comprehension'))) {
      return `### Python Lists & List Comprehensions 🐍

**1. Python Lists:**
A list is an ordered, mutable collection of items.
\`\`\`python
fruits = ["apple", "banana", "cherry"]
fruits.append("mango") # Adds to end
print(fruits[0])       # "apple"
\`\`\`

**2. List Comprehension:**
A clean, concise one-line syntax to create a new list from an existing iterable:
\`\`\`python
numbers = [1, 2, 3, 4, 5, 6]

# Create a list of squares for even numbers only
even_squares = [x**2 for x in numbers if x % 2 == 0]
print(even_squares)
\`\`\`

**3. Output:**
\`\`\`text
[4, 16, 36]
\`\`\``;
    }

    // Python Dictionaries
    if (isPython && (q.includes('dict') || q.includes('dictionary') || q.includes('set'))) {
      return `### Python Dictionaries (\`dict\`) 📖

**1. What is a Dictionary?**
A dictionary stores data in **key-value pairs**, allowing fast $O(1)$ lookups by key.

**2. Simple Working Example:**
\`\`\`python
student = {"name": "Maya", "major": "Computer Science", "gpa": 3.9}

# Accessing values safely using .get() (prevents KeyError crash)
print("Student Name:", student["name"])
print("GPA:", student.get("gpa", "N/A"))

# Adding a new key-value pair
student["grad_year"] = 2026
print("Updated dict:", student)
\`\`\`

**3. Expected Output:**
\`\`\`text
Student Name: Maya
GPA: 3.9
Updated dict: {'name': 'Maya', 'major': 'Computer Science', 'gpa': 3.9, 'grad_year': 2026}
\`\`\``;
    }

    // Python OOP / Classes
    if (isPython && (q.includes('class') || q.includes('oop') || q.includes('__init__') || q.includes('self'))) {
      return `### Python Object-Oriented Programming (Classes & Objects) 🧱

**1. Core Concepts:**
- \`class\`: Blueprint for creating objects.
- \`__init__(self, ...)\`: Constructor method called when a new object is created.
- \`self\`: Refers to the specific instance of the class.

**2. Simple Working Example:**
\`\`\`python
class Book:
    def __init__(self, title, pages):
        self.title = title
        self.pages = pages

    def get_summary(self):
        return f"'{self.title}' has {self.pages} pages."

my_book = Book("Clean Code", 464)
print(my_book.get_summary())
\`\`\`

**3. Expected Output:**
\`\`\`text
'Clean Code' has 464 pages.
\`\`\``;
    }

    // ------------------------------------------------------------------------
    // 3. PROGRAMMING ERRORS & DEBUGGING (PLAIN ENGLISH & CLEAR FIXES)
    // ------------------------------------------------------------------------
    if (q.includes('segmentation fault') || q.includes('segfault') || q.includes('sigsegv') || q.includes('core dumped')) {
      return `### Debugging: Segmentation Fault (SIGSEGV) 💥

**1. What it means:**
Your program attempted to read or write to a memory address that it does not have permission to access.

**2. The 3 Most Common Causes:**
1. **Dereferencing a NULL or uninitialized pointer:**
   \`\`\`c
   int *p = NULL;
   *p = 5; // CRASH!
   \`\`\`
2. **Accessing array index out of bounds:**
   \`\`\`c
   int arr[5];
   arr[100] = 50; // CRASH!
   \`\`\`
3. **Infinite recursion:** Missing a base case causes stack memory to run out.

**3. How to Fix:**
- Verify pointers are not \`NULL\` before using them: \`if (p != NULL) *p = 5;\`
- Check that loop index limits stay strictly within \`0\` to \`size - 1\`.`;
    }

    if (q.includes('nullpointer') || q.includes('nonetype') || q.includes('null reference') || q.includes('undefined is not') || q.includes('has no attribute')) {
      return `### Debugging: NullPointer & NoneType Errors 🔍

**1. What it means:**
You tried to access a property or call a method on a variable that currently holds **nothing** (\`null\` in C/Java, \`None\` in Python, \`undefined\` in JS).

**2. Example in Python & Fix:**
\`\`\`python
# Cause:
user = find_user(101) # returns None if user not found
print(user.name)       # AttributeError: 'NoneType' object has no attribute 'name'

# Fix (Add a check):
if user is not None:
    print(user.name)
else:
    print("User not found!")
\`\`\``;
    }

    if (q.includes('index out of') || q.includes('out of bounds') || q.includes('indexerror')) {
      return `### Debugging: Index Out of Bounds Error 🚫

**1. What it means:**
You tried to access an element at an index that doesn't exist in the list or array (e.g. index $\\ge$ length).

**2. Common Off-by-One Mistake:**
\`\`\`python
items = [10, 20, 30] # Length is 3 (valid indices: 0, 1, 2)

# WRONG:
for i in range(len(items) + 1):
    print(items[i]) # IndexError!

# CORRECT:
for item in items:
    print(item)
\`\`\`
Remember: In C, Python, Java, and JS, indexing starts at **0** and ends at **length - 1**.`;
    }

    if (q.includes('memory leak') || q.includes('valgrind')) {
      return `### Debugging: Memory Leaks in C 💧

**1. What is a Memory Leak?**
When memory allocated with \`malloc()\` or \`calloc()\` is no longer needed but never released with \`free()\`. Over time, unused memory accumulates until the program runs out of RAM.

**2. The Rule:**
Every \`malloc()\` must have a matching \`free()\`:
\`\`\`c
void loadData() {
    int *buffer = (int *)malloc(50 * sizeof(int));
    // ... work with buffer ...
    free(buffer); // Clean up!
    buffer = NULL;
}
\`\`\``;
    }

    if (q.includes('stack overflow') || (q.includes('recursion') && q.includes('error'))) {
      return `### Debugging: Stack Overflow & Recursion Errors 🔄

**1. What it means:**
A recursive function called itself too many times without stopping, exhausting the call stack.

**2. How to Fix:**
Always verify that your **base case** is correct and reachable:
\`\`\`python
# BAD (Infinite recursion):
def count_down(n):
    print(n)
    count_down(n - 1)

# GOOD (Proper base case):
def count_down(n):
    if n <= 0: # Base case: stop!
        return
    print(n)
    count_down(n - 1)
\`\`\``;
    }

    if (q.includes('undefined reference') || q.includes('linker error') || q.includes('ld returned')) {
      return `### Debugging: Linker Error ("Undefined Reference") 🔗

**1. What it means:**
The compiler verified your syntax, but the **linker** could not find the compiled object code for a function you called.

**2. Common Fixes:**
- If your project has multiple \`.c\` files, compile them together:
  \`\`\`bash
  gcc main.c utils.c -o app
  \`\`\`
- If using \`<math.h>\` functions like \`sqrt()\`, add \`-lm\` at the end:
  \`\`\`bash
  gcc main.c -lm -o app
  \`\`\``;
    }

    // ------------------------------------------------------------------------
    // 4. DATA STRUCTURES & ALGORITHMS
    // ------------------------------------------------------------------------
    if (q.includes('linked list')) {
      return `### Linked Lists Explained Simply ⛓️

**1. What is a Linked List?**
A linked list is a linear data structure where elements (called **nodes**) are not stored in contiguous memory. Instead, each node contains:
1. **Data:** The value being stored.
2. **Next pointer:** An address pointing to the next node in the list.

**2. Node Structure in C:**
\`\`\`c
struct Node {
    int data;
    struct Node *next;
};
\`\`\`

**3. Array vs. Linked List:**
- **Array:** Fast $O(1)$ random access by index, but fixed size and expensive $O(n)$ insertions at the beginning.
- **Linked List:** Dynamic size and fast $O(1)$ insertions at the head, but $O(n)$ sequential access to find an element.`;
    }

    if (hasWord('stack') || q.includes('lifo')) {
      return `### Stacks (LIFO - Last In, First Out) 🥞

**1. What is a Stack?**
A stack is a container where elements are added and removed from the same end (the **top**), like a stack of plates.
- **LIFO:** The last item pushed onto the stack is the first item popped off.

**2. Core Operations:**
- \`push(x)\`: Add item $x$ to the top ($O(1)$).
- \`pop()\`: Remove and return the top item ($O(1)$).
- \`peek()\`: View the top item without removing it ($O(1)$).

**3. Real-World Applications:**
- Browser Back/Forward history
- Text editor Undo/Redo operations
- Function call execution stack in programming languages`;
    }

    if (hasWord('queue') || q.includes('fifo')) {
      return `### Queues (FIFO - First In, First Out) 🚶‍♂️

**1. What is a Queue?**
A queue is a linear collection where items are inserted at the **rear** and removed from the **front**, like a line of people at a ticket counter.
- **FIFO:** The first item added is the first one processed.

**2. Core Operations:**
- \`enqueue(x)\`: Insert item $x$ at the rear ($O(1)$).
- \`dequeue()\`: Remove item from the front ($O(1)$).

**3. Key Applications:**
- CPU process scheduling (Round-Robin)
- Print job queues
- Breadth-First Search (BFS) in graphs`;
    }

    if (q.includes('bst') || q.includes('binary search tree') || q.includes('tree traversal')) {
      return `### Binary Search Tree (BST) & Tree Traversals 🌳

**1. What is a BST?**
A Binary Search Tree is a binary tree where for every node:
- All values in the **left subtree** are **smaller** than the node.
- All values in the **right subtree** are **greater** than the node.

**2. The 3 Depth Traversals:**
- **In-Order (Left, Root, Right):** Visits keys in **strictly sorted order**!
- **Pre-Order (Root, Left, Right):** Great for cloning tree structures.
- **Post-Order (Left, Right, Root):** Used for deleting trees bottom-up.

**3. Search Complexity:**
- **Average:** $O(\\log n)$
- **Worst Case (skewed tree):** $O(n)$`;
    }

    if (q.includes('binary search')) {
      return `### Binary Search Algorithm 🔍

**1. How it works:**
Binary Search finds a target in a **sorted array** in **$O(\\log n)$** time by repeatedly dividing the search interval in half:
1. Compare target with the middle element.
2. If target matches, return the index.
3. If target is smaller, search the left half.
4. If target is larger, search the right half.

**2. Simple Working Example (C):**
\`\`\`c
int binarySearch(int arr[], int size, int target) {
    int low = 0, high = size - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1; // Target not found
}
\`\`\``;
    }

    if (q.includes('dijkstra')) {
      return `### Dijkstra's Shortest Path Algorithm 🧭

**1. Core Idea:**
Dijkstra's algorithm finds the shortest path from a single source node to all other nodes in a weighted graph with **non-negative weights** using a greedy approach.

**2. Step-by-Step:**
1. Set \`dist[source] = 0\` and \`dist[all others] = ∞\`.
2. Insert all vertices into a **Min-Priority Queue**.
3. Extract the unvisited node $u$ with the smallest distance.
4. For each neighbor $v$ of $u$, if \`dist[u] + weight(u, v) < dist[v]\`, update \`dist[v]\`.
5. Repeat until all nodes are visited.

**3. Complexity:** $O((V + E) \\log V)$ with a binary heap.
⚠️ *Note:* Fails if any edge is negative (use **Bellman-Ford** instead).`;
    }

    if (q.includes('dynamic programming') || q.includes('knapsack')) {
      return `### Dynamic Programming: 0/1 Knapsack Problem 🎒

**1. Problem Definition:**
Given $n$ items with values $v_i$ and weights $w_i$, select items to maximize total value without exceeding a knapsack weight capacity $W$.

**2. Recurrence Relation:**
\`\`\`text
DP[i][w] = DP[i-1][w]                           if w_i > w (item too heavy)
DP[i][w] = max(DP[i-1][w], v_i + DP[i-1][w - w_i]) otherwise
\`\`\`

**3. Key Idea:**
Instead of recomputing the same sub-capacities exponentially ($O(2^n)$), we store subproblem answers in a 2D/1D table, solving it in **$O(n \\times W)$** time.`;
    }

    if (q.includes('sorting') || q.includes('quicksort') || q.includes('merge sort') || q.includes('bubble sort') || q.includes('big o')) {
      return `### Sorting Algorithms & Big-O Comparison ⚡

| Algorithm | Average Time | Worst Time | Space | In-Place? |
|---|---|---|---|---|
| **Merge Sort** | $O(n \\log n)$ | $O(n \\log n)$ | $O(n)$ | No |
| **Quick Sort** | $O(n \\log n)$ | $O(n^2)$ | $O(\\log n)$ | Yes |
| **Insertion Sort** | $O(n^2)$ | $O(n^2)$ | $O(1)$ | Yes |
| **Bubble Sort** | $O(n^2)$ | $O(n^2)$ | $O(1)$ | Yes |

💡 *Quick Tip:* Merge Sort is predictable and stable; QuickSort is usually faster in practice for arrays due to lower overhead and cache locality.`;
    }

    // ------------------------------------------------------------------------
    // 5. MATHEMATICS
    // ------------------------------------------------------------------------
    if (q.includes('derivative') || q.includes('differentiat') || q.includes('chain rule') || q.includes('product rule')) {
      return `### Calculus: Derivatives & Rules 📐

**1. What is a Derivative?**
A derivative measures the **instantaneous rate of change** of a function with respect to a variable (the slope of the tangent line).

**2. Core Rules:**
- **Power Rule:** $\\frac{d}{dx} x^n = n x^{n-1}$  *(e.g., $\\frac{d}{dx} x^3 = 3x^2$)*
- **Product Rule:** $(u \\cdot v)' = u'v + uv'$
- **Quotient Rule:** $\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$
- **Chain Rule:** $\\frac{d}{dx} f(g(x)) = f'(g(x)) \\cdot g'(x)$

**3. Simple Example:**
To differentiate $f(x) = (2x + 1)^3$:
- Let $g(x) = 2x + 1$ (derivative is 2).
- By chain rule: $f'(x) = 3(2x + 1)^2 \\cdot 2 = 6(2x + 1)^2$.`;
    }

    if (q.includes('integral') || q.includes('integration')) {
      return `### Calculus: Integrals & Rules 📐

**1. What is an Integral?**
An integral represents the **accumulation of quantities** and computes the **area under a curve** (the inverse operation of differentiation).

**2. Essential Formulas:**
- **Power Rule:** $\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)$
- **Log Rule:** $\\int \\frac{1}{x} \\, dx = \\ln|x| + C$
- **Exponential:** $\\int e^x \\, dx = e^x + C$

**3. Integration by Parts:**
$$\\int u \\, dv = uv - \\int v \\, du$$
Choose $u$ using the **ILATE** priority rule: **I**nverse trig, **L**og, **A**lgebraic, **T**rig, **E**xponential.`;
    }

    if (q.includes('matrix multiplication') || (q.includes('matrix') && q.includes('multiply')) || q.includes('matrices')) {
      return `### Linear Algebra: Matrix Multiplication 🔢

**1. Dimension Condition:**
To multiply matrix $A$ ($m \\times k$) by matrix $B$ ($k \\times n$), the **number of columns in $A$ must equal the number of rows in $B$**. The resulting matrix will have size $m \\times n$.

**2. Calculation Rule:**
Each element $(i, j)$ in the product is the **dot product** of row $i$ of $A$ and column $j$ of $B$:
$$C_{ij} = \\sum_{r=1}^k A_{ir} B_{rj}$$

**3. Simple $2 \\times 2$ Example:**
$$\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\begin{pmatrix} 5 & 6 \\\\ 7 & 8 \\end{pmatrix} = \\begin{pmatrix} (1\\cdot 5 + 2\\cdot 7) & (1\\cdot 6 + 2\\cdot 8) \\\\ (3\\cdot 5 + 4\\cdot 7) & (3\\cdot 6 + 4\\cdot 8) \\end{pmatrix} = \\begin{pmatrix} 19 & 22 \\\\ 43 & 50 \\end{pmatrix}$$`;
    }

    if (q.includes('eigenvalue') || q.includes('eigenvector')) {
      return `### Linear Algebra: Eigenvalues & Eigenvectors 🔢

**1. The Fundamental Equation:**
$$A \\vec{v} = \\lambda \\vec{v} \\quad (\\vec{v} \\neq \\mathbf{0})$$
Multiplying matrix $A$ by eigenvector $\\vec{v}$ only **scales** $\\vec{v}$ by factor $\\lambda$ (the eigenvalue) without changing its direction.

**2. How to Find Them:**
1. Solve the **characteristic equation**: $\\det(A - \\lambda I) = 0$ to get eigenvalues $\\lambda$.
2. For each $\\lambda$, substitute back into $(A - \\lambda I)\\vec{v} = \\mathbf{0}$ and solve the system to find the eigenvectors $\\vec{v}$.`;
    }

    // ------------------------------------------------------------------------
    // 6. PHYSICS
    // ------------------------------------------------------------------------
    if (q.includes('newton')) {
      return `### Physics: Newton's 3 Laws of Motion 🚀

**1. First Law (Law of Inertia):**
An object remains at rest or moves at a constant velocity in a straight line unless acted upon by a net external force.
- *Example:* A passenger slides forward when a bus suddenly brakes.

**2. Second Law ($F = ma$):**
The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass:
$$\\vec{F} = m\\vec{a}$$
- *Example:* Pushing a heavy cart requires twice as much force as pushing a light cart to achieve the same acceleration.

**3. Third Law (Action-Reaction):**
For every action, there is an equal and opposite reaction:
$$\\vec{F}_{AB} = -\\vec{F}_{BA}$$
- *Example:* A rocket pushes exhaust gas backward, and the gas pushes the rocket forward.`;
    }

    if (q.includes('ohm')) {
      return `### Physics & Electrical: Ohm's Law ⚡

**1. The Law:**
Ohm's Law states that the current ($I$) flowing through a conductor between two points is directly proportional to the voltage ($V$) across the two points and inversely proportional to resistance ($R$):
$$V = I \\cdot R$$

**2. Units:**
- $V$ = Voltage in Volts (V) — electrical push
- $I$ = Current in Amperes (A) — rate of charge flow
- $R$ = Resistance in Ohms ($\\Omega$) — opposition to flow

**3. Simple Example:**
If a $12\\text{V}$ battery is connected across a $4\\Omega$ resistor:
$$I = \\frac{V}{R} = \\frac{12}{4} = 3\\text{ Amperes}$$`;
    }

    // ------------------------------------------------------------------------
    // 7. CHEMISTRY
    // ------------------------------------------------------------------------
    if (q.includes('sn1') || q.includes('sn2')) {
      return `### Chemistry: SN1 vs SN2 Mechanisms 🧪

| Feature | SN1 (Unimolecular) | SN2 (Biomolecular) |
|---|---|---|
| **Steps** | 2 steps (carbocation intermediate) | 1 step concerted (backside attack) |
| **Kinetics** | Rate $= k[\\text{Substrate}]$ (1st order) | Rate $= k[\\text{Substrate}][\\text{Nu}^-]$ (2nd order) |
| **Substrate Preference**| $3^\\circ > 2^\\circ \\gg 1^\\circ$ | $\\text{Methyl} > 1^\\circ > 2^\\circ \\gg 3^\\circ$ |
| **Stereochemistry**| Racemization | **Walden Inversion** (100% flipped) |
| **Optimal Solvent**| Polar **Protic** (e.g. $\\text{H}_2\\text{O}$) | Polar **Aprotic** (e.g. Acetone, DMSO) |`;
    }

    if (q.includes('equilibrium') || q.includes('le chatelier')) {
      return `### Chemical Equilibrium & Le Chatelier's Principle ⚖️

**1. Le Chatelier's Principle:**
If a dynamic equilibrium is disturbed by changing conditions, the position of equilibrium moves to counteract the change:
- **Add Reactant:** Equilibrium shifts **forward** (to products).
- **Increase Pressure:** Equilibrium shifts toward the side with **fewer moles of gas**.
- **Increase Temperature:**
  - In an exothermic reaction (releases heat), equilibrium shifts **backward**.
  - In an endothermic reaction (absorbs heat), equilibrium shifts **forward**.`;
    }

    // ------------------------------------------------------------------------
    // 8. ENGINEERING SUBJECTS
    // ------------------------------------------------------------------------
    if (q.includes('thevenin') || q.includes('norton')) {
      return `### Electrical: Thévenin's Theorem ⚡

**1. What is Thévenin's Theorem?**
Any linear electrical network containing voltage sources, current sources, and resistors can be replaced at terminals A-B by an equivalent circuit consisting of:
1. A single independent voltage source **$V_{\\text{th}}$** (the open-circuit voltage across terminals A-B).
2. In series with an equivalent resistance **$R_{\\text{th}}$** (the resistance looking into A-B with all independent voltage sources short-circuited and current sources open-circuited).

**2. Benefit:** Allows instant recalculation of load current $I_L = \\frac{V_{\\text{th}}}{R_{\\text{th}} + R_L}$ for any varying load resistance $R_L$!`;
    }

    if (q.includes('logic gate') || (q.includes('gate') && (q.includes('nand') || q.includes('nor') || q.includes('xor')))) {
      return `### Digital Logic: Core Logic Gates 💻

- **AND ($A \\cdot B$):** Output is 1 only if **both** inputs are 1.
- **OR ($A + B$):** Output is 1 if **at least one** input is 1.
- **NOT ($\\overline{A}$):** Inverts input (0 becomes 1, 1 becomes 0).
- **XOR ($A \\oplus B$):** Output is 1 if inputs are **different** ($A \\neq B$).
- **NAND & NOR:** **Universal gates** — any digital circuit can be constructed using only NAND gates or only NOR gates.`;
    }

    // ------------------------------------------------------------------------
    // 9. STUDY PLANNING, EXAM PREP & QUICK PROMPTS
    // ------------------------------------------------------------------------
    if (q.includes('7-day') || q.includes('5-day') || q.includes('study plan') || q.includes('revision plan') || q.includes('cram')) {
      return `### 📅 High-Yield College Exam Revision Plan

- **Days 1–2: High-Weightage Chapters:** Focus on the hardest 40% of the syllabus that accounts for 70% of exam marks using Pomodoro focus blocks.
- **Day 3: Active Recall & Formula Sheets:** Write down all definitions, formulas, and derivations from memory on blank paper to expose knowledge gaps.
- **Days 4–5: Previous Year Questions (PYQs):** Solve the last 3–5 years of university exam papers under untimed conditions.
- **Day 6: Timed Mock Exam:** Complete one full timed practice test to master pacing and pressure management.
- **Day 7: Light Review & Sleep:** Review formula sheets and sleep 8 hours. Sleep consolidates long-term memory! 🛌`;
    }

    if (q.includes('operating system') || q.includes('os quiz') || q.includes('deadlock') || q.includes('virtual memory')) {
      return `### 🧠 Operating Systems Revision Quiz

**1. Process Scheduling:**
- *Q:* Why is **MLFQ** preferred over Round-Robin?
- *A:* It dynamically prioritizes interactive I/O-bound tasks while ensuring CPU-heavy batch jobs don't starve.

**2. Deadlocks (4 Coffman Conditions):**
1. Mutual Exclusion
2. Hold and Wait
3. No Preemption
4. Circular Wait

**3. Virtual Memory:**
- *Q:* What is **thrashing**?
- *A:* When a system spends more time swapping pages in/out of storage than executing user processes.`;
    }

    if (q.includes('sql') && q.includes('nosql')) {
      return `### 📑 SQL vs NoSQL: Quick Summary

| Feature | SQL (Relational) | NoSQL (Non-Relational) |
|---|---|---|
| **Data Model** | Predefined tables (rows & columns) | Documents, Key-Value, Graphs |
| **Schema** | Rigid, ACID-compliant schema | Dynamic, flexible schema |
| **Scaling** | Vertical (Scale-up: more CPU/RAM) | Horizontal (Scale-out: more nodes) |
| **Best For** | Banking, ERP, complex JOINs | Real-time analytics, social feeds |`;
    }

    if (q.includes('mnemonic') || q.includes('memoriz') || q.includes('remember formula')) {
      return `### 🧠 Memory Mnemonics & Formula Mastery

1. **ILATE** (Calculus Integration by Parts): **I**nverse trig, **L**og, **A**lgebraic, **T**rig, **E**xponential (order for choosing $u$).
2. **OIL RIG** (Chemistry Redox): **O**xidation **I**s **L**oss, **R**eduction **I**s **G**ain of electrons.
3. **Method of Loci (Memory Palace):** Anchor formulas to physical spots in your study space to trigger spatial memory recall.`;
    }

    if (q.includes('active recall') || q.includes('feynman') || q.includes('spaced repetition')) {
      return `### 🧠 Active Recall & The Feynman Technique

**1. The Feynman Technique (4 Steps):**
1. **Choose a Concept:** Write the topic at the top of a page.
2. **Explain it to a 10-Year-Old:** Use simple everyday words without technical jargon.
3. **Identify Your Gaps:** Notice where you hesitate or hide behind complicated buzzwords.
4. **Review & Simplify:** Revisit notes to clarify that mechanism, then rewrite your explanation simply.

**2. Spaced Repetition Schedule:**
Review notes at Day 1, Day 3, Day 7, and Day 21 to reset the **forgetting curve**!`;
    }

    if (q.includes('procrastinat') || q.includes('burnout') || (q.includes('focus') && q.includes('motivation'))) {
      return `### ⚡ Overcoming Procrastination & Burnout

1. **The 5-Minute Rule:** Commit to studying for just **5 minutes**. Overcoming initial friction is 80% of the battle; once started, cognitive inertia keeps you going.
2. **Friction Reduction:** Keep only one browser tab or book open. Put your phone in another room during study blocks.
3. **Burnout Cure:** Take at least one 4-hour guilt-free block off every week and protect 7–8 hours of nightly sleep.`;
    }

    // ------------------------------------------------------------------------
    // 10. DYNAMIC DIRECT FALLBACK (ANSWERS THE EXACT TOPIC WITHOUT TEMPLATES)
    // ------------------------------------------------------------------------
    // Extract user's core topic cleanly
    let topic = input.trim()
      .replace(/^(can you |please |could you )/i, '')
      .replace(/^(explain|what is|how to use|how does|how do i use|how do you use|teach me|describe|tell me about)\s+/i, '')
      .replace(/\s+(to a (complete )?beginner|step by step|with (a |one )?(simple )?example|for beginners)[.?]*$/i, '')
      .replace(/[?.,!]+$/, '')
      .trim();

    if (!topic) topic = input.trim().replace(/[?.,!]+$/, '');
    const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);

    // Direct comparison response
    if (q.includes('difference between') || q.includes(' vs ') || q.includes('compare')) {
      return `### ${capitalizedTopic} ⚖️

**Direct Comparison & Key Takeaways:**
- **Primary Purpose:** Both concepts address related tasks, but differ in execution, overhead, and architectural assumptions.
- **When to Choose Which:**
  - Use the first approach for simplicity, lightweight resource requirements, or standard implementations.
  - Use the second approach when advanced control, performance scaling, or specialized guarantees are needed.
- **Next Step:** If you have a specific code or numerical scenario in mind, ask and we can trace it step by step!`;
    }

    // Direct programming / syntax response
    if (q.includes('code') || q.includes('syntax') || q.includes('program') || q.includes('how to write') || q.includes('implement')) {
      return `### How to Use ${capitalizedTopic} 💻

**1. Concept Overview:**
\`${topic}\` is used to implement logic cleanly and predictably in your programs.

**2. Standard Approach:**
- Define your input variables or data structures.
- Write the logic using proper language syntax and clear conditions.
- Test with simple values to verify the expected output.

**3. Next Step:**
Let me know which language (e.g., C, Python, Java) you are using, and I'll generate a complete, runnable code example!`;
    }

    // Direct general academic response
    return `### Understanding ${capitalizedTopic} 💡

**1. What It Is:**
**${capitalizedTopic}** is an important topic in college academics. It provides the foundational logic and rules required to solve problems systematically in this subject.

**2. How It Works:**
- It establishes clear relationships between inputs, operations, and resulting outputs.
- In coursework and university exams, questions on this topic generally focus on understanding the core definition, applying the correct formula or syntax, and tracing a small example.

**3. What would you like next?**
- A simple, beginner-friendly code snippet or formula breakdown?
- A step-by-step worked example?
- A quick 3-question self-test to check your recall?`;
  }

  function renderAiChat() {
    const container = document.getElementById('aiMessagesContainer');
    if (!container) return;

    container.innerHTML = '';
    state.chatHistory.forEach(msg => {
      const row = document.createElement('div');
      row.className = `ai-message-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`;

      const avatar = msg.role === 'user' ? '🎓' : '🤖';
      const sender = msg.role === 'user' ? 'You' : 'Study Buddy AI';

      // Convert Markdown-like syntax to HTML safely
      const parsedContent = formatMarkdown(msg.text);

      row.innerHTML = `
        <div class="ai-avatar">${avatar}</div>
        <div class="ai-bubble">
          <div class="ai-bubble-header">
            <strong>${sender}</strong>
            <span class="ai-timestamp">${msg.timestamp}</span>
          </div>
          <div class="ai-bubble-content">${parsedContent}</div>
        </div>
      `;
      container.appendChild(row);
    });

    container.scrollTop = container.scrollHeight;
  }

  // Safe, lightweight markdown parser for educational output
  function formatMarkdown(text) {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks with optional language specifier
    escaped = escaped.replace(/```([a-zA-Z0-9_\-\+]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
      const langClass = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langClass}>${code.trim()}</code></pre>`;
    });

    // Inline code
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Blockquotes
    escaped = escaped.replace(/^>\s?(.*$)/gim, '<blockquote style="border-left: 3px solid var(--primary); padding-left: 10px; margin: 8px 0; color: var(--text-muted);">$1</blockquote>');

    // Headers
    escaped = escaped.replace(/^### (.*$)/gim, '<h4 style="margin: 10px 0 4px; font-weight:700;">$1</h4>');
    escaped = escaped.replace(/^#### (.*$)/gim, '<h5 style="margin: 8px 0 3px; font-weight:700;">$1</h5>');

    // Bold & italic
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Bullet lists (groups consecutive list items into a single <ul>)
    escaped = escaped.replace(/(?:^|\n)((?:[-*]\s+.+(?:\n|$))+)/g, (match, listGroup) => {
      const items = listGroup.trim().split(/\n/).map(line => {
        return `<li>${line.replace(/^[-*]\s+/, '')}</li>`;
      }).join('');
      return `\n<ul>${items}</ul>\n`;
    });

    // Numbered lists (groups consecutive list items into a single <ol>)
    escaped = escaped.replace(/(?:^|\n)((?:\d+\.\s+.+(?:\n|$))+)/g, (match, listGroup) => {
      const items = listGroup.trim().split(/\n/).map(line => {
        return `<li>${line.replace(/^\d+\.\s+/, '')}</li>`;
      }).join('');
      return `\n<ol>${items}</ol>\n`;
    });

    // Markdown tables
    escaped = escaped.replace(/(?:^|\n)(\|.+?\|\n\|[-:| ]+\|\n(?:\|.+?\|\n?)+)/g, (match, tableBlock) => {
      const rows = tableBlock.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2) return match;
      const headers = rows[0].split('|').filter(c => c.trim() !== '').map(c => `<th style="padding:6px 10px; border:1px solid var(--border-subtle); background:var(--bg-card);">${c.trim()}</th>`).join('');
      const bodyRows = rows.slice(2).map(r => {
        const cells = r.split('|').filter(c => c.trim() !== '').map(c => `<td style="padding:6px 10px; border:1px solid var(--border-subtle);">${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<div style="overflow-x:auto; margin:10px 0;"><table style="width:100%; border-collapse:collapse; font-size:0.85rem;"><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
    });

    // Paragraphs / double newlines
    escaped = escaped.replace(/\n\n+/g, '<p></p>');

    return escaped;
  }

  // ==========================================================================
  // 15. DASHBOARD OVERVIEW RENDERING
  // ==========================================================================
  function renderDashboard() {
    evaluateStreak();

    // Streak Hero Banner
    const streakCount = document.getElementById('dashStreakDays');
    const headerStreakCount = document.getElementById('headerStreakCount');
    const streakMsg = document.getElementById('dashStreakMessage');
    const streakTrack = document.getElementById('dashStreakDaysTrack');

    if (streakCount) streakCount.textContent = state.streak.currentStreak;
    if (headerStreakCount) headerStreakCount.textContent = state.streak.currentStreak;

    if (streakMsg) {
      if (state.streak.currentStreak >= 7) {
        streakMsg.textContent = 'Unstoppable! You are in the top 5% of consistent students. Keep the fire burning!';
      } else {
        streakMsg.textContent = 'Awesome momentum! Study at least 25 minutes today to keep your streak alive.';
      }
    }

    if (streakTrack) {
      streakTrack.innerHTML = '';
      const daysShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = daysShort[d.getDay()];
        const isToday = i === 0;
        const chip = document.createElement('div');
        chip.className = `streak-day-chip ${i <= (state.streak.currentStreak - 1) ? 'active' : ''}`;
        chip.innerHTML = `
          <span class="streak-day-label">${isToday ? 'Today' : dayLabel}</span>
          <span class="streak-day-icon">${i <= (state.streak.currentStreak - 1) ? '🔥' : '⚪'}</span>
        `;
        streakTrack.appendChild(chip);
      }
    }

    // KPI Cards
    const dashTodayTime = document.getElementById('dashTodayTime');
    const dashTasksDone = document.getElementById('dashTasksCompleted');
    const dashTasksRate = document.getElementById('dashTasksRate');
    const dashTodayTodos = document.getElementById('dashTodayTodos');
    const dashTodosPct = document.getElementById('dashTodosPercent');
    const dashMockAvg = document.getElementById('dashMockAvg');
    const dashMockCount = document.getElementById('dashMockCount');

    if (dashTodayTime) {
      dashTodayTime.textContent = formatHoursMinutes(state.timer.todayStudySeconds);
    }

    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.status === 'completed').length;
    const taskPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    if (dashTasksDone) dashTasksDone.textContent = `${completedTasks} / ${totalTasks}`;
    if (dashTasksRate) dashTasksRate.textContent = `${taskPct}% completion rate`;

    const totalTodos = state.todos.length;
    const completedTodos = state.todos.filter(t => t.completed).length;
    const todoPct = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);

    if (dashTodayTodos) dashTodayTodos.textContent = `${completedTodos} / ${totalTodos} Done`;
    if (dashTodosPct) dashTodosPct.textContent = `${todoPct}% completed`;

    const totalMocks = state.mockTests.length;
    if (totalMocks > 0) {
      const avg = (state.mockTests.reduce((acc, m) => acc + (m.score / m.maxScore) * 100, 0) / totalMocks).toFixed(1);
      if (dashMockAvg) dashMockAvg.textContent = `${avg}%`;
      if (dashMockCount) dashMockCount.textContent = `${totalMocks} tests recorded`;
    }

    // Sidebar Goal Card
    const goalBar = document.getElementById('sidebarGoalBar');
    const goalPercent = document.getElementById('sidebarGoalPercent');
    const goalText = document.getElementById('sidebarGoalText');
    const totalWeeklyTarget = state.subjects.reduce((sum, s) => sum + (s.targetHours || 5), 0) || 20;
    const totalHoursLogged = (state.subjects.reduce((sum, s) => sum + (s.studySeconds || 0), 0) / 3600);
    const weeklyPct = Math.min(100, Math.round((totalHoursLogged / totalWeeklyTarget) * 100));

    if (goalBar) goalBar.style.width = `${weeklyPct}%`;
    if (goalPercent) goalPercent.textContent = `${weeklyPct}%`;
    if (goalText) goalText.textContent = `${totalHoursLogged.toFixed(1)} / ${totalWeeklyTarget} hrs studied`;

    // Dashboard Quick Todos List
    const dashTodoList = document.getElementById('dashTodoList');
    if (dashTodoList) {
      dashTodoList.innerHTML = '';
      state.todos.slice(0, 4).forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.innerHTML = `
          <div class="todo-item-left">
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${todo.text}</span>
          </div>
          <button class="todo-delete-btn" aria-label="Delete">&times;</button>
        `;

        li.querySelector('.todo-checkbox').addEventListener('change', (e) => {
          todo.completed = e.target.checked;
          if (e.target.checked) playToneChime();
          saveState();
          renderDashboard();
          renderTodos();
        });

        li.querySelector('.todo-delete-btn').addEventListener('click', () => {
          state.todos = state.todos.filter(t => t.id !== todo.id);
          saveState();
          renderDashboard();
          renderTodos();
        });

        dashTodoList.appendChild(li);
      });
    }

    // Upcoming Priority Tasks on Dashboard
    const upcomingList = document.getElementById('dashUpcomingTasksList');
    if (upcomingList) {
      upcomingList.innerHTML = '';
      const pending = state.tasks.filter(t => t.status !== 'completed').slice(0, 3);
      if (pending.length === 0) {
        upcomingList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.88rem; padding: 8px;">No pending priority tasks. Great job!</div>`;
      } else {
        pending.forEach(task => {
          const sub = state.subjects.find(s => s.id === task.subjectId) || { code: 'GEN', color: '#6366f1' };
          const div = document.createElement('div');
          div.className = 'dash-task-item';
          div.innerHTML = `
            <div>
              <div class="dash-task-title">${task.title}</div>
              <div class="dash-task-meta">
                <span class="badge" style="background: ${sub.color}20; color: ${sub.color}">${sub.code}</span>
                <span class="badge badge-${task.priority}">${task.priority}</span>
                <span>📅 Due ${task.dueDate}</span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm quick-task-done-btn">Done ✓</button>
          `;

          div.querySelector('.quick-task-done-btn').addEventListener('click', () => {
            task.status = 'completed';
            playToneChime();
            showToast('Task completed! 🎯', 'success');
            saveState();
            renderDashboard();
            renderTasks();
          });

          upcomingList.appendChild(div);
        });
      }
    }

    // Enrolled Subjects Compact Cards on Dashboard
    const dashSubGrid = document.getElementById('dashSubjectsGrid');
    if (dashSubGrid) {
      dashSubGrid.innerHTML = '';
      state.subjects.slice(0, 4).forEach(sub => {
        const div = document.createElement('div');
        div.className = 'dash-subject-card';
        div.style.borderLeftColor = sub.color;
        const logged = (sub.studySeconds / 3600).toFixed(1);
        div.innerHTML = `
          <div class="dash-sub-title" title="${sub.name}">${sub.code} • ${sub.name}</div>
          <div class="dash-sub-stats">${logged}h studied • Target: ${sub.targetHours}h</div>
        `;
        dashSubGrid.appendChild(div);
      });
    }
  }

  // ==========================================================================
  // 16. SETTINGS, EXPORT & IMPORT DATA MODAL
  // ==========================================================================
  function setupSettingsModal() {
    const settingsBtn = document.getElementById('settingsBtn');
    const modal = document.getElementById('settingsModal');
    const soundToggle = document.getElementById('settingsSoundToggle');
    const apiKeyInput = document.getElementById('geminiApiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
    const exportBtn = document.getElementById('exportDataBtn');
    const importInput = document.getElementById('importDataFileInput');
    const resetBtn = document.getElementById('resetSampleDataBtn');
    const clearBtn = document.getElementById('clearAllDataBtn');

    if (settingsBtn && modal) {
      settingsBtn.addEventListener('click', () => {
        if (apiKeyInput) apiKeyInput.value = state.settings.geminiApiKey || '';
        if (soundToggle) soundToggle.checked = state.settings.sound;
        modal.showModal();
      });
    }

    if (soundToggle) {
      soundToggle.addEventListener('change', () => {
        state.settings.sound = soundToggle.checked;
        saveState();
      });
    }

    if (saveApiKeyBtn && apiKeyInput) {
      saveApiKeyBtn.addEventListener('click', () => {
        state.settings.geminiApiKey = apiKeyInput.value.trim();
        saveState();
        showToast('Gemini API key saved in browser storage 🔑', 'success');
      });
    }

    if (clearApiKeyBtn && apiKeyInput) {
      clearApiKeyBtn.addEventListener('click', () => {
        state.settings.geminiApiKey = '';
        apiKeyInput.value = '';
        saveState();
        showToast('API key removed. Using built-in assistant.', 'info');
      });
    }

    // Export Data as JSON
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `study-buddy-backup-${getIsoDate(0)}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        showToast('Data exported successfully! 📁', 'success');
      });
    }

    // Import Data
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target.result);
            if (imported.subjects && imported.tasks) {
              state = imported;
              saveState();
              window.location.reload();
            } else {
              showToast('Invalid backup file format.', 'warning');
            }
          } catch (err) {
            showToast('Failed to parse JSON file.', 'danger');
          }
        };
        reader.readAsText(file);
      });
    }

    // Reset to Sample Data
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset to standard college sample subjects and tasks? Current edits will be replaced.')) {
          state = getDefaultData();
          saveState();
          window.location.reload();
        }
      });
    }

    // Clear All Data
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure? This will wipe all subjects, tasks, mock test history and streaks.')) {
          localStorage.removeItem(STORAGE_KEY);
          state = getDefaultData();
          state.subjects = [];
          state.tasks = [];
          state.todos = [];
          state.mockTests = [];
          state.reminders = [];
          state.streak.currentStreak = 0;
          state.streak.longestStreak = 0;
          state.streak.dailyHistory = {};
          state.streak.lastActiveDate = null;
          state.timer.todayStudySeconds = 0;
          state.timer.completedCyclesToday = 0;
          state.timer.recentSessions = [];
          state.timer.isRunning = false;
          state.timer.lastTickTimestamp = null;
          saveState();
          window.location.reload();
        }
      });
    }

    // Generic Modal Close listeners
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        const m = document.getElementById(modalId);
        if (m) m.close();
      });
    });

    // Close on backdrop click
    document.querySelectorAll('dialog').forEach(dialog => {
      dialog.addEventListener('click', (e) => {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
        if (!isInDialog) {
          dialog.close();
        }
      });
    });
  }

  // Quick Action Buttons on Dashboard Header
  function setupDashboardQuickActions() {
    const dashFocusBtn = document.getElementById('dashStartTimerBtn');
    const dashNewTaskBtn = document.getElementById('dashQuickTaskBtn');

    if (dashFocusBtn) {
      dashFocusBtn.addEventListener('click', () => {
        const timerNav = document.querySelector('[data-view="timer"]');
        if (timerNav) timerNav.click();
        startTimer();
      });
    }

    if (dashNewTaskBtn) {
      dashNewTaskBtn.addEventListener('click', () => {
        const openTaskModalBtn = document.getElementById('openAddTaskModalBtn');
        if (openTaskModalBtn) openTaskModalBtn.click();
      });
    }
  }

  // ==========================================================================
  // 17. INITIALIZATION
  // ==========================================================================
  function init() {
    setupTheme();
    setupNavigation();
    setupTimerEngine();
    setupSubjectManagement();
    setupTaskManagement();
    setupTodoList();
    setupMockTestTracker();
    setupReminders();
    setupAiAssistant();
    setupSettingsModal();
    setupDashboardQuickActions();

    // Initial render
    renderDashboard();
    renderSubjects();
    renderTasks();
    renderTodos();
    renderMockTests();
    renderAnalytics();
    renderReminders();
    renderAiChat();
    renderTimerView();

    console.log('Study Buddy college productivity application initialized successfully.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
