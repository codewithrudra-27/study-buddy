/**
 * Study Buddy - College Productivity & Study Tracker
 * Main Application Logic, State Store, Timer Engine, Analytics & AI Copilot
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. CONSTANTS & INITIAL DATA STORE
  // ==========================================================================
  const STORAGE_KEY = 'study_buddy_data_v2';
  const THEME_KEY = 'study_buddy_theme';

  // Helpers to get today's and past dates in YYYY-MM-DD
  function getIsoDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }

  // Realistic sample starter data for college students
  function getDefaultData() {
    const today = getIsoDate(0);
    const yesterday = getIsoDate(-1);
    const twoDaysAgo = getIsoDate(-2);
    const threeDaysAgo = getIsoDate(-3);
    const fourDaysAgo = getIsoDate(-4);

    return {
      subjects: [
        {
          id: 'sub-cs201',
          name: 'Data Structures & Algorithms',
          code: 'CS201',
          targetHours: 6,
          color: '#6366f1',
          instructor: 'Dr. Turing (Hall B)',
          studySeconds: 21600 // 6 hours
        },
        {
          id: 'sub-math102',
          name: 'Linear Algebra & Matrix Theory',
          code: 'MATH102',
          targetHours: 5,
          color: '#3b82f6',
          instructor: 'Prof. Gauss (Room 302)',
          studySeconds: 16200 // 4.5 hours
        },
        {
          id: 'sub-cs304',
          name: 'Operating Systems',
          code: 'CS304',
          targetHours: 5,
          color: '#10b981',
          instructor: 'Dr. Ritchie (Lab 4)',
          studySeconds: 14400 // 4 hours
        },
        {
          id: 'sub-econ101',
          name: 'Principles of Microeconomics',
          code: 'ECON101',
          targetHours: 4,
          color: '#f59e0b',
          instructor: 'Prof. Smith (Auditorium 1)',
          studySeconds: 10800 // 3 hours
        }
      ],
      tasks: [
        {
          id: 'task-1',
          title: 'Implement Binary Search Tree traversal & balancing lab',
          subjectId: 'sub-cs201',
          dueDate: getIsoDate(1),
          priority: 'high',
          category: 'Assignment',
          status: 'in-progress',
          notes: 'Write clean C++/Java code for AVL rotations and inorder/postorder print.'
        },
        {
          id: 'task-2',
          title: 'Eigenvalues and Diagonalization practice problem set',
          subjectId: 'sub-math102',
          dueDate: getIsoDate(3),
          priority: 'medium',
          category: 'Exam Prep',
          status: 'todo',
          notes: 'Solve problems 12 through 28 in Chapter 5. Review characteristic polynomial.'
        },
        {
          id: 'task-3',
          title: 'Virtual Memory & Paging implementation writeup',
          subjectId: 'sub-cs304',
          dueDate: getIsoDate(4),
          priority: 'high',
          category: 'Lab Work',
          status: 'todo',
          notes: 'Prepare flowchart of TLB miss and page fault handler routines.'
        },
        {
          id: 'task-4',
          title: 'Consumer Surplus and Price Elasticity study case',
          subjectId: 'sub-econ101',
          dueDate: getIsoDate(6),
          priority: 'low',
          category: 'Reading',
          status: 'todo',
          notes: 'Read pages 88-112 of Krugman Microeconomics.'
        },
        {
          id: 'task-5',
          title: 'Review CLRS Chapter 6 (Heapsort & Priority Queues)',
          subjectId: 'sub-cs201',
          dueDate: yesterday,
          priority: 'medium',
          category: 'Review',
          status: 'completed',
          notes: 'Finished all exercise questions and max-heapify analysis.'
        }
      ],
      todos: [
        { id: 'todo-1', text: 'Review QuickSort 3-way partition logic', completed: true },
        { id: 'todo-2', text: 'Solve 5 Linear Algebra matrix inverse problems', completed: true },
        { id: 'todo-3', text: 'Read OS lecture 12 slides on Deadlock Prevention', completed: true },
        { id: 'todo-4', text: 'Draft microeconomics essay outline on market equilibrium', completed: false }
      ],
      timer: {
        mode: 'pomodoro', // 'pomodoro' | 'shortBreak' | 'longBreak' | 'stopwatch'
        durations: {
          pomodoro: 25 * 60,
          shortBreak: 5 * 60,
          longBreak: 15 * 60
        },
        timeRemaining: 25 * 60,
        stopwatchSeconds: 0,
        isRunning: false,
        activeSubjectId: 'sub-cs201',
        soundEnabled: true,
        completedCyclesToday: 3,
        todayStudySeconds: 9900, // 2h 45m
        recentSessions: [
          { subjectId: 'sub-cs201', subjectName: 'Data Structures', durationMin: 50, date: today, timeStr: '10:30 AM' },
          { subjectId: 'sub-math102', subjectName: 'Linear Algebra', durationMin: 45, date: today, timeStr: '11:45 AM' },
          { subjectId: 'sub-cs304', subjectName: 'Operating Systems', durationMin: 45, date: today, timeStr: '02:15 PM' },
          { subjectId: 'sub-econ101', subjectName: 'Microeconomics', durationMin: 25, date: yesterday, timeStr: '04:00 PM' }
        ]
      },
      mockTests: [
        {
          id: 'mock-1',
          title: 'CS201 Midterm Mock Exam 2024',
          subjectId: 'sub-cs201',
          type: 'Full Mock',
          score: 86,
          maxScore: 100,
          timeMinutes: 85,
          date: today,
          weakTopics: 'Lost marks on amortized analysis and AVL delete cases.'
        },
        {
          id: 'mock-2',
          title: 'MATH102 Fall 2023 PYQ Paper',
          subjectId: 'sub-math102',
          type: 'PYQ',
          score: 92,
          maxScore: 100,
          timeMinutes: 80,
          date: yesterday,
          weakTopics: 'Gram-Schmidt orthonormalization arithmetic error on Q4.'
        },
        {
          id: 'mock-3',
          title: 'CS304 Process Scheduling Test',
          subjectId: 'sub-cs304',
          type: 'Sectional',
          score: 74,
          maxScore: 100,
          timeMinutes: 60,
          date: twoDaysAgo,
          weakTopics: 'Multilevel feedback queue priority aging calculation.'
        },
        {
          id: 'mock-4',
          title: 'GATE 2022 CS Data Structures PYQ Set',
          subjectId: 'sub-cs201',
          type: 'PYQ',
          score: 42,
          maxScore: 50,
          timeMinutes: 45,
          date: threeDaysAgo,
          weakTopics: 'Quadratic probing hash collision lookup complexity.'
        },
        {
          id: 'mock-5',
          title: 'ECON101 Unit 2 Revision Test',
          subjectId: 'sub-econ101',
          type: 'Sectional',
          score: 47,
          maxScore: 50,
          timeMinutes: 40,
          date: fourDaysAgo,
          weakTopics: 'Consumer surplus tax deadweight loss graphical depiction.'
        }
      ],
      reminders: [
        {
          id: 'rem-1',
          title: 'Evening DSA LeetCode & Lab coding session',
          time: '19:00',
          subjectId: 'sub-cs201',
          frequency: 'daily',
          active: true
        },
        {
          id: 'rem-2',
          title: 'Linear Algebra matrix homework review',
          time: '16:30',
          subjectId: 'sub-math102',
          frequency: 'weekdays',
          active: true
        },
        {
          id: 'rem-3',
          title: 'Operating Systems lecture notes recap',
          time: '21:00',
          subjectId: 'sub-cs304',
          frequency: 'weekdays',
          active: false
        }
      ],
      streak: {
        currentStreak: 5,
        longestStreak: 12,
        lastActiveDate: today,
        dailyHistory: {
          [getIsoDate(-13)]: 3600,
          [getIsoDate(-12)]: 5400,
          [getIsoDate(-11)]: 7200,
          [getIsoDate(-10)]: 0,
          [getIsoDate(-9)]: 4800,
          [getIsoDate(-8)]: 9000,
          [getIsoDate(-7)]: 7200,
          [getIsoDate(-6)]: 10800,
          [getIsoDate(-5)]: 5400,
          [fourDaysAgo]: 7200,
          [threeDaysAgo]: 8400,
          [twoDaysAgo]: 6300,
          [yesterday]: 9000,
          [today]: 9900
        }
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
        return { ...getDefaultData(), ...parsed };
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
      state.streak.currentStreak = 1;
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
  // 7. POMODORO & STOPWATCH TIMER ENGINE
  // ==========================================================================
  let timerInterval = null;

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function formatHoursMinutes(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

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

    // Mode switching
    modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode');
        switchTimerMode(mode);
      });
    });

    // Control triggers
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

    updateTimerDisplay();
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

    if (mode === 'stopwatch') {
      state.timer.stopwatchSeconds = 0;
    } else {
      state.timer.timeRemaining = state.timer.durations[mode] || (25 * 60);
    }

    saveState();
    updateTimerDisplay();
  }

  function startTimer() {
    if (state.timer.isRunning) return;
    state.timer.isRunning = true;

    // Start tone for pleasant feedback
    getAudioContext();

    timerInterval = setInterval(timerTick, 1000);
    updatePlayPauseIcons(true);
    showToast(`Timer started (${state.timer.mode.toUpperCase()}) 🎯`, 'info');
  }

  function pauseTimer() {
    if (!state.timer.isRunning) return;
    state.timer.isRunning = false;
    clearInterval(timerInterval);
    timerInterval = null;
    updatePlayPauseIcons(false);
  }

  function resetTimer() {
    pauseTimer();
    if (state.timer.mode === 'stopwatch') {
      state.timer.stopwatchSeconds = 0;
    } else {
      state.timer.timeRemaining = state.timer.durations[state.timer.mode] || (25 * 60);
    }
    saveState();
    updateTimerDisplay();
    showToast('Timer reset to start.', 'info');
  }

  function skipTimer() {
    pauseTimer();
    if (state.timer.mode === 'pomodoro') {
      switchTimerMode('shortBreak');
    } else {
      switchTimerMode('pomodoro');
    }
    showToast('Skipped to next session interval.', 'info');
  }

  function timerTick() {
    if (state.timer.mode === 'stopwatch') {
      state.timer.stopwatchSeconds += 1;
      // Increment study seconds every minute
      if (state.timer.stopwatchSeconds % 60 === 0) {
        logStudyTime(60);
      }
      updateTimerDisplay();
      return;
    }

    // Pomodoro / Breaks countdown
    if (state.timer.timeRemaining > 0) {
      state.timer.timeRemaining -= 1;
      // Credit study time only during active pomodoro work
      if (state.timer.mode === 'pomodoro') {
        logStudyTime(1);
      }
      updateTimerDisplay();
    } else {
      // Session finished!
      handleTimerComplete();
    }
  }

  function logStudyTime(seconds) {
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

  function handleTimerComplete() {
    pauseTimer();
    playToneChime();

    if (state.timer.mode === 'pomodoro') {
      state.timer.completedCyclesToday += 1;

      // Add to recent sessions list
      const sub = state.subjects.find(s => s.id === state.timer.activeSubjectId);
      const sessionName = sub ? sub.name : 'General Study';
      state.timer.recentSessions.unshift({
        subjectId: state.timer.activeSubjectId,
        subjectName: sessionName,
        durationMin: 25,
        date: getIsoDate(0),
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      if (state.timer.recentSessions.length > 20) state.timer.recentSessions.pop();

      showToast('🎉 Focus session complete! Fantastic job! Take a well-deserved break.', 'success');

      // Next is Short Break or Long Break (every 4 cycles)
      if (state.timer.completedCyclesToday % 4 === 0) {
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
      if (mainBtnText) mainBtnText.textContent = 'Start Focus';
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
      dashModeBadge.textContent = state.timer.mode.toUpperCase() + (state.timer.mode === 'pomodoro' ? ' • Focus' : ' • Break');
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
        statusLabel.textContent = 'Ready to Focus';
      } else {
        statusLabel.textContent = state.timer.mode === 'pomodoro' ? 'Focusing...' : 'Recharging...';
      }
    }

    // Update SVG progress ring (circumference = 2 * PI * 120 ≈ 754)
    if (progressRing) {
      const circumference = 754;
      let progress = 0;
      if (state.timer.mode === 'stopwatch') {
        progress = (currentSeconds % 3600) / 3600;
      } else {
        progress = (totalTarget - currentSeconds) / totalTarget;
      }
      const offset = circumference - (progress * circumference);
      progressRing.style.strokeDashoffset = offset;
    }
  }

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
  // 14. BUILT-IN AI STUDY ASSISTANT (FRONTEND & SIMULATED REPLIES)
  // ==========================================================================
  function setupAiAssistant() {
    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const clearBtn = document.getElementById('clearAiChatBtn');
    const chipBtns = document.querySelectorAll('.ai-chip, .quick-chip');

    chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-ai-text') || btn.getAttribute('data-ai-prompt');
        if (text) {
          // Switch to assistant view if clicked from dashboard
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
        sendUserMessage(input.value);
        input.value = '';
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendUserMessage(input.value);
          input.value = '';
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
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

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
        <div class="ai-bubble-content"><em>Thinking and analyzing your study query...</em></div>
      </div>`;
    if (scrollContainer) {
      scrollContainer.appendChild(typingIndicator);
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }

    // If user has provided a custom Gemini API key in settings, attempt live call
    if (state.settings.geminiApiKey) {
      fetchLiveGeminiResponse(cleanText, typingIndicator);
    } else {
      // Simulate realistic intelligent response after 700ms
      setTimeout(() => {
        if (typingIndicator) typingIndicator.remove();
        const reply = generateCollegeAiResponse(cleanText);
        state.chatHistory.push({
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: reply
        });
        saveState();
        renderAiChat();
        playToneChime();
      }, 700);
    }
  }

  async function fetchLiveGeminiResponse(prompt, typingIndicator) {
    const key = state.settings.geminiApiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `You are Study Buddy, an encouraging, sharp, and structured college study tutor. Answer the student's question clearly with headings, bullet points, and code/math notation where appropriate:\n\n${prompt}` }]
          }]
        })
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned.';

      if (typingIndicator) typingIndicator.remove();
      state.chatHistory.push({
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: text
      });
      saveState();
      renderAiChat();
      playToneChime();
    } catch (err) {
      console.warn('Gemini API call failed, falling back to simulated tutor response:', err);
      if (typingIndicator) typingIndicator.remove();
      const fallback = generateCollegeAiResponse(prompt);
      state.chatHistory.push({
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `*(API note: live request failed or key is invalid. Switched to offline simulated tutor)*\n\n` + fallback
      });
      saveState();
      renderAiChat();
    }
  }

  // Academic knowledge base simulation for college subjects
  function generateCollegeAiResponse(input) {
    const q = input.toLowerCase();

    if (q.includes('dijkstra')) {
      return `### Dijkstra's Shortest Path Algorithm 🧭

**Core Idea:**
Dijkstra's algorithm finds the shortest path from a starting vertex to all other vertices in a weighted graph with **non-negative edge weights**. It follows a **greedy** approach.

#### Step-by-Step Execution:
1. **Initialize Distances:**
   - Set \`dist[source] = 0\` and \`dist[v] = ∞\` for all other vertices $v$.
   - Insert all vertices into a **Min-Priority Queue** (ordered by distance).
2. **Greedy Traversal:**
   - Extract vertex $u$ with the minimum distance from the queue.
   - For every neighbor $v$ of $u$:
     \`\`\`text
     if dist[u] + weight(u, v) < dist[v]:
         dist[v] = dist[u] + weight(u, v)
         decreaseKey(priorityQueue, v)
     \`\`\`
3. **Complexity:**
   - **Time:** $O((V + E) \\log V)$ using a Min-Heap.
   - **Space:** $O(V)$ for the distance array and priority queue.

💡 *Exam Tip:* Remember that Dijkstra fails if there are negative edge weights — use **Bellman-Ford** instead!`;
    }

    if (q.includes('dynamic programming') || q.includes('knapsack')) {
      return `### Dynamic Programming: 0/1 Knapsack Problem 🎒

**Problem Definition:**
Given $n$ items with values $v_i$ and weights $w_i$, find the maximum value that fits in a knapsack of capacity $W$.

#### Recurrence Relation:
For item $i$ and capacity $w$:
\`\`\`text
DP[i][w] = DP[i-1][w]                           if w_i > w (item too heavy)
DP[i][w] = max(DP[i-1][w], v_i + DP[i-1][w - w_i]) otherwise
\`\`\`

#### Key Characteristics:
- **Optimal Substructure:** The optimal solution is constructed from optimal solutions to subproblems.
- **Overlapping Subproblems:** Subproblem values are reused multiple times, saving exponential recursion via memoization or tabulation.

⏱️ **Time Complexity:** $O(n \\times W)$ (pseudo-polynomial).  
💾 **Space Optimization:** Can be reduced to $O(W)$ space using a single 1D array traversed backwards.`;
    }

    if (q.includes('7-day') || q.includes('plan') || q.includes('schedule') || q.includes('cram')) {
      return `### 📅 High-Yield 7-Day College Final Exam Roadmap

Here is a scientifically proven **Spaced Repetition & Pomodoro** schedule:

- **Day 1: Syllabus Audit & High-Weightage Chapters**
  - Group chapters by exam weightage.
  - Complete 4 Pomodoro blocks tackling the single most difficult topic.
- **Day 2: Active Recall & Formula Sheets**
  - Write down core theorems, derivations, and definitions from memory.
  - Fix conceptual gaps using textbooks or lecture slides.
- **Day 3: Previous Year Questions (PYQs) - Part 1**
  - Solve the last 3 years of question papers in an untimed, deep-learning mode.
- **Day 4: Timed Mock Exam 1**
  - Sit down for a full 3-hour timed exam without notes.
  - Log your score in the Study Buddy **Mock Test Tracker**!
- **Day 5: Error Analysis & Weak Area Sprint**
  - Dedicate 3-4 hours strictly to the questions you got wrong on Mock 1.
- **Day 6: Timed Mock Exam 2 & High-Speed Flashcards**
  - Second timed mock test + rapid active recall review.
- **Day 7: Light Review & Mental Reset**
  - Review formula sheets and sleep 8 hours. Do not pull an all-nighter! 🛌`;
    }

    if (q.includes('quiz') || q.includes('test me') || q.includes('operating system')) {
      return `### 🧠 Operating Systems Revision Quiz (Test Your Recall!)

**Question 1 (Process Scheduling):**
What is the primary advantage of the **Multi-Level Feedback Queue (MLFQ)** over standard Round-Robin?
- *Answer Hint:* Think about how CPU-bound vs I/O-bound processes are prioritized.

**Question 2 (Deadlocks):**
What are the **4 Coffman conditions** necessary for a deadlock to occur?
1. Mutual Exclusion
2. Hold and Wait
3. No Preemption
4. Circular Wait

**Question 3 (Virtual Memory):**
What phenomenon occurs when a system spends more time servicing page faults than executing actual user processes?
- *Answer:* **Thrashing**. It is resolved by reducing the degree of multiprogramming or adjusting the Working Set Model.`;
    }

    if (q.includes('sql') || q.includes('nosql')) {
      return `### 📑 SQL vs NoSQL: Quick Comparative Summary

| Feature | Relational (SQL) | Non-Relational (NoSQL) |
|---|---|---|
| **Data Model** | Structured tables (rows & columns) | Documents, Key-Value, Graphs, Wide-column |
| **Schema** | Rigid, predefined ACID schema | Dynamic, flexible schema (schema-on-read) |
| **Scaling** | Vertical scaling (Scale-up: CPU/RAM) | Horizontal scaling (Scale-out: sharding across nodes) |
| **Guarantees** | Strong ACID transactions | BASE (Basically Available, Soft-state, Eventual consistency) |
| **Best For** | Financial transactions, ERP, complex JOINs | Real-time analytics, social feeds, high-throughput writes |

💡 *Example:* Use **PostgreSQL** for an e-commerce payment system, and **MongoDB/Redis** for session carts and product catalog feeds.`;
    }

    // General academic answer
    return `### Academic Analysis & Strategy 💡

Great question! In college academics, mastering **${input.slice(0, 40)}...** requires breaking it down into three pillars:

1. **Foundational Concept:** Understand the underlying mechanics before memorizing formulas or syntax.
2. **Worked Example:** Trace a small test case by hand on paper (e.g. input $n=3$ or $x=0$).
3. **Common Pitfalls in Exams:** Beware of edge cases (boundary conditions, null pointers, divide-by-zero, or missing constraints).

Would you like me to:
- Generate a 5-question multiple choice quiz on this topic?
- Break down a step-by-step numerical solution?
- Write clean sample code with time/space complexity analysis?`;
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

    // Code blocks
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Headers
    escaped = escaped.replace(/^### (.*$)/gim, '<h4 style="margin: 8px 0 4px; font-weight:700;">$1</h4>');
    escaped = escaped.replace(/^#### (.*$)/gim, '<h5 style="margin: 6px 0 2px; font-weight:700;">$1</h5>');
    // Bold & italic
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Bullet points
    escaped = escaped.replace(/^\- (.*$)/gim, '<li>$1</li>');
    escaped = escaped.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    // Newlines to breaks
    escaped = escaped.replace(/\n\n/g, '<p></p>');

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
          state.timer.recentSessions = [];
          state.streak.currentStreak = 1;
          state.streak.dailyHistory = {};
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

    console.log('Study Buddy college productivity application initialized successfully.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
