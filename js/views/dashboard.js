import { Store } from '../store.js';
import { navigate } from '../router.js';
import { fmtDate, timeAgo, fmtDuration, today } from '../utils.js';
import { EXERCISES_MAP, MUSCLE_LABELS } from '../data/exercises.js';
import { logout } from '../app.js';

export function renderDashboard() {
  const { workouts, workoutLogs, activeSession } = Store.getState();

  // Sort workouts by usage recency
  const workoutWithDates = workouts.map(w => {
    const lastLog = Store.getLastLog(w.id);
    return { ...w, lastDate: lastLog?.date || null };
  }).sort((a, b) => {
    if (!a.lastDate && !b.lastDate) return 0;
    if (!a.lastDate) return 1;
    if (!b.lastDate) return -1;
    return new Date(b.lastDate) - new Date(a.lastDate);
  });

  const recentLogs = [...workoutLogs]
    .filter(l => l.completed)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const lastLog = recentLogs[0] || null;
  const lastWorkout = lastLog ? workouts.find(w => w.id === lastLog.workout_id) : null;

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--dashboard">
      <header class="page-header">
        <div class="page-header__inner">
          <div>
            <div class="page-header__label">Today</div>
            <h1 class="page-header__title">${_greeting()}</h1>
          </div>
          <div class="page-header__actions">
            <div class="page-header__date">${_fmtToday()}</div>
            <button class="btn-icon btn--ghost btn--sm" id="logout-btn" aria-label="Sign out" title="Sign out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      ${activeSession ? _resumeCard(activeSession, workouts) : ''}

      ${lastWorkout ? `
        <section class="section">
          <h2 class="section__title">Last Workout</h2>
          <div class="last-workout-card">
            <div class="last-workout-card__name">${lastWorkout.name}</div>
            <div class="last-workout-card__date">${fmtDate(lastLog.date)}</div>
          </div>
        </section>
      ` : ''}

      <section class="section">
        <div class="section__header">
          <h2 class="section__title">Your Workouts</h2>
          <button class="btn btn--ghost btn--sm" id="new-workout-btn">+ New</button>
        </div>
        ${workoutWithDates.length === 0
          ? _emptyWorkouts()
          : `<div class="workout-grid">${workoutWithDates.map(_workoutCard).join('')}</div>`
        }
      </section>

      ${recentLogs.length > 0 ? `
        <section class="section">
          <h2 class="section__title">Recent Activity</h2>
          <div class="activity-list">
            ${recentLogs.map(l => _activityRow(l, workouts)).join('')}
          </div>
        </section>
      ` : ''}

      <div class="bottom-spacer"></div>
    </div>
  `;

  // Events
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('Sign out of IronPlan?')) logout();
  });

  document.getElementById('new-workout-btn')?.addEventListener('click', () => navigate('/workouts/new'));
  document.getElementById('create-first-btn')?.addEventListener('click', () => navigate('/workouts/new'));

  document.querySelectorAll('[data-start-workout]').forEach(btn => {
    btn.addEventListener('click', () => navigate(`/session/${btn.dataset.startWorkout}`));
  });

  document.querySelectorAll('[data-view-workout]').forEach(btn => {
    btn.addEventListener('click', () => navigate(`/workouts/${btn.dataset.viewWorkout}`));
  });

  document.getElementById('resume-session-btn')?.addEventListener('click', () => {
    if (activeSession) navigate(`/session/${activeSession.workout_id}`);
  });

  document.getElementById('cancel-session-btn')?.addEventListener('click', () => {
    if (confirm('Discard this active session?')) {
      Store.cancelSession();
      renderDashboard();
    }
  });
}

function _greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function _fmtToday() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function _resumeCard(session, workouts) {
  const workout = workouts.find(w => w.id === session.workout_id);
  const name = workout?.name || 'Workout';
  const started = new Date(session.started_at);
  const elapsed = Math.floor((Date.now() - started) / 1000);
  return `
    <div class="resume-card">
      <div class="resume-card__icon">▶</div>
      <div class="resume-card__info">
        <div class="resume-card__name">${name}</div>
        <div class="resume-card__sub">Started ${fmtDuration(elapsed)} ago – in progress</div>
      </div>
      <div class="resume-card__actions">
        <button class="btn btn--accent btn--sm" id="resume-session-btn">Resume</button>
        <button class="btn btn--ghost btn--sm btn--danger" id="cancel-session-btn">Discard</button>
      </div>
    </div>
  `;
}

function _workoutCard(w) {
  const exCount = w.exercises.length;
  const ago = w.lastDate ? timeAgo(w.lastDate) : 'Never done';
  const muscles = _topMuscles(w.exercises);

  return `
    <div class="workout-card">
      <div class="workout-card__main" data-view-workout="${w.id}">
        <div class="workout-card__name">${w.name}</div>
        <div class="workout-card__meta">${exCount} exercise${exCount !== 1 ? 's' : ''}</div>
        ${muscles ? `<div class="workout-card__muscles">${muscles}</div>` : ''}
        <div class="workout-card__date">${ago}</div>
      </div>
      <button class="workout-card__start btn btn--accent" data-start-workout="${w.id}" aria-label="Start ${w.name}">
        ▶
      </button>
    </div>
  `;
}

function _topMuscles(exercises) {
  const counts = {};
  exercises.forEach(ei => {
    const ex = EXERCISES_MAP[ei.exercise_id];
    if (ex) counts[ex.primary_muscle] = (counts[ex.primary_muscle] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => `<span class="muscle-chip">${MUSCLE_LABELS[m] || m}</span>`)
    .join('');
}

function _activityRow(log, workouts) {
  const workout = workouts.find(w => w.id === log.workout_id);
  const name = workout?.name || 'Workout';
  const totalSets = log.exercises.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0);
  const duration = log.completed_at && log.started_at
    ? fmtDuration(Math.floor((new Date(log.completed_at) - new Date(log.started_at)) / 1000))
    : '';

  return `
    <div class="activity-row">
      <div class="activity-row__icon">✓</div>
      <div class="activity-row__info">
        <div class="activity-row__name">${name}</div>
        <div class="activity-row__meta">${timeAgo(log.date)} · ${totalSets} sets${duration ? ` · ${duration}` : ''}</div>
      </div>
    </div>
  `;
}

function _emptyWorkouts() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">🏋️</div>
      <p class="empty-state__text">No workouts yet.<br>Build your first split.</p>
      <button class="btn btn--accent" id="create-first-btn">Create Workout</button>
    </div>
  `;
}
