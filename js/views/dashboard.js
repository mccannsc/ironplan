import { Store } from '../store.js';
import { navigate } from '../router.js';
import { fmtDate, fmtWeight, fmtDuration, timeAgo, today, esc } from '../utils.js';
import { EXERCISES_MAP, MUSCLE_LABELS } from '../data/exercises.js?v=6';
import { logout } from '../app.js';
import { clearRestTimer } from './session.js';
import { toast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

export function renderDashboard() {
  const { workouts, workoutLogs, activeSession } = Store.getState();
  const weekStats = Store.getWeeklyStats();
  const nextWorkout = Store.getNextWorkout();
  const thisWeekLogs = Store.getThisWeekLogs();
  const pbs = Store.getPBsThisWeek();

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

      ${nextWorkout && !activeSession ? _nextWorkoutCard(nextWorkout, workouts) : ''}

      ${_weekSection(weekStats, thisWeekLogs, pbs, workouts)}

      ${workouts.length === 0 ? `
        <section class="section">
          <div class="empty-state">
            <div class="empty-state__icon">🏋️</div>
            <p class="empty-state__text">Start your first workout</p>
            <button class="btn btn--accent" id="create-first-btn">Create Workout</button>
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

  document.getElementById('create-first-btn')?.addEventListener('click', () => navigate('/workouts/new'));

  document.getElementById('resume-session-btn')?.addEventListener('click', () => {
    if (activeSession) navigate(`/session/${activeSession.workout_id}`);
  });

  document.getElementById('cancel-session-btn')?.addEventListener('click', () => {
    if (confirm('Discard this active session?')) {
      clearRestTimer();
      Store.cancelSession();
      renderDashboard();
    }
  });

  document.getElementById('next-workout-start')?.addEventListener('click', () => {
    if (nextWorkout) navigate(`/session/${nextWorkout.id}`);
  });

  document.getElementById('next-workout-plan')?.addEventListener('click', () => {
    if (nextWorkout) navigate(`/workouts/${nextWorkout.id}/plan`);
  });

  document.getElementById('next-workout-past')?.addEventListener('click', () => {
    if (!nextWorkout) return;
    _openWorkoutPicker(workouts, (selected) => {
      navigate(`/session/${selected.id}`);
    });
  });

  document.getElementById('bw-save-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('bw-input');
    const val = parseFloat(input?.value);
    if (!val || val <= 0) return;
    await Store.addBodyweight(val);
    toast('Weight logged', 'success');
    input.value = '';
    renderDashboard();
  });

  document.getElementById('bw-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('bw-save-btn')?.click();
  });
}

function _nextWorkoutCard(workout, workouts) {
  const exCount = workout.exercises.length;
  const muscles = _topMuscles(workout.exercises);
  const lastLog = Store.getLastLog(workout.id);

  return `
    <section class="section section--next">
      <div class="section__header">
        <h2 class="section__title">Next Workout</h2>
        <button class="btn btn--ghost btn--xs" id="next-workout-plan">Plan →</button>
      </div>
      <div class="next-workout-card">
        <div class="next-workout-card__info">
          <div class="next-workout-card__name">${esc(workout.name)}</div>
          <div class="next-workout-card__meta">${exCount} exercise${exCount !== 1 ? 's' : ''}${lastLog ? ` · Last: ${timeAgo(lastLog.date)}` : ''}</div>
          ${muscles ? `<div class="next-workout-card__muscles">${muscles}</div>` : ''}
        </div>
        <div class="next-workout-card__btns">
          <button class="btn btn--accent next-workout-card__start" id="next-workout-start">▶ Start</button>
          <button class="btn btn--ghost btn--sm" id="next-workout-past">+ Past</button>
        </div>
      </div>
    </section>
  `;
}

function _weekSection(stats, thisWeekLogs, pbs, workouts) {
  const { thisWeek, prevWeek, latestBodyweight } = stats;
  const volumeDelta = prevWeek.volume > 0
    ? Math.round(((thisWeek.volume - prevWeek.volume) / prevWeek.volume) * 100)
    : null;
  const volSign = volumeDelta > 0 ? '+' : '';
  const volColor = volumeDelta > 0 ? 'green' : volumeDelta < 0 ? 'red' : '';
  const fmtVol = v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toString();

  const weekWorkoutNames = thisWeekLogs.map(l => {
    const w = workouts.find(w => w.id === l.workout_id);
    return `<div class="week-workout-item">
      <span class="week-workout-item__dot">✓</span>
      <span class="week-workout-item__name">${esc(w?.name || 'Workout')}</span>
      <span class="week-workout-item__date">${fmtDate(l.date)}</span>
    </div>`;
  }).join('');

  const pbList = pbs.length > 0 ? `
    <div class="week-pbs">
      <div class="week-pbs__label">🏆 PBs this week</div>
      ${pbs.map(pb => {
        const ex = EXERCISES_MAP[pb.exerciseId];
        return `<span class="week-pb-chip">${esc(ex?.name || 'Exercise')}: ${fmtWeight(pb.weight)}kg×${pb.reps}</span>`;
      }).join('')}
    </div>
  ` : '';

  return `
    <section class="section">
      <h2 class="section__title">This Week</h2>
      <div class="week-stats">
        <div class="week-stat">
          <div class="week-stat__value">${thisWeek.workouts}</div>
          <div class="week-stat__label">Workouts</div>
          ${prevWeek.workouts > 0 ? `<div class="week-stat__delta">vs ${prevWeek.workouts} last wk</div>` : ''}
        </div>
        <div class="week-stat">
          <div class="week-stat__value">${thisWeek.sets}</div>
          <div class="week-stat__label">Sets</div>
        </div>
        <div class="week-stat">
          <div class="week-stat__value">${fmtVol(thisWeek.volume)}</div>
          <div class="week-stat__label">Volume kg</div>
          ${volumeDelta !== null ? `<div class="week-stat__delta week-stat__delta--${volColor}">${volSign}${volumeDelta}%</div>` : ''}
        </div>
      </div>

      ${thisWeekLogs.length > 0 ? `<div class="week-workouts">${weekWorkoutNames}</div>` : ''}
      ${pbList}

      <div class="bw-row">
        <div class="bw-row__current">
          ${latestBodyweight
            ? `<span class="bw-row__label">Weight</span>
               <span class="bw-row__value">${latestBodyweight.weight}kg</span>`
            : `<span class="bw-row__label">Body weight</span>`
          }
        </div>
        <div class="bw-row__input">
          <input
            type="number"
            id="bw-input"
            class="bw-input"
            placeholder="${latestBodyweight ? latestBodyweight.weight : '70'}kg"
            min="20" max="300" step="0.1"
          />
          <button class="btn btn--ghost btn--sm" id="bw-save-btn">Log</button>
        </div>
      </div>
    </section>
  `;
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
        <div class="resume-card__name">${esc(name)}</div>
        <div class="resume-card__sub">Started ${fmtDuration(elapsed)} ago – in progress</div>
      </div>
      <div class="resume-card__actions">
        <button class="btn btn--accent btn--sm" id="resume-session-btn">Resume</button>
        <button class="btn btn--ghost btn--sm btn--danger" id="cancel-session-btn">Discard</button>
      </div>
    </div>
  `;
}

function _openWorkoutPicker(workouts, onSelect) {
  if (workouts.length === 0) { navigate('/workouts/new'); return; }
  if (workouts.length === 1) { onSelect(workouts[0]); return; }

  const body = `
    <div class="picker-simple">
      ${workouts.map(w => `
        <button class="picker-simple-item" data-pick-workout="${w.id}">
          <span class="picker-simple-item__name">${esc(w.name)}</span>
          <span class="picker-simple-item__arrow">›</span>
        </button>
      `).join('')}
    </div>
  `;

  openModal({ title: 'Log Past Workout', body });

  document.querySelectorAll('[data-pick-workout]').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = workouts.find(x => x.id === btn.dataset.pickWorkout);
      if (w) { closeModal(); onSelect(w); }
    });
  });
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

function _greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function _fmtToday() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
