import { Store } from '../store.js';
import { navigate } from '../router.js';
import { esc, fmtWeight, fmtDuration, fmtDate } from '../utils.js';
import { EXERCISES_MAP, MUSCLE_LABELS } from '../data/exercises.js?v=5';

// Module-level storage for the just-completed session
let _session = null;
let _workout = null;

/** Called by session.js instead of navigate('/') */
export function showSummary(completedSession, workout) {
  _session = completedSession;
  _workout = workout;
  navigate('/summary');
}

export function renderSummary() {
  if (!_session || !_workout) { navigate('/'); return; }

  const session = _session;
  const workout = _workout;

  const duration = session.completed_at && session.started_at
    ? Math.floor((new Date(session.completed_at) - new Date(session.started_at)) / 1000)
    : null;

  const totalSets = session.exercises.reduce((n, ex) => n + ex.sets.filter(s => s.completed).length, 0);
  const totalVolume = Math.round(session.exercises.reduce((total, ex) =>
    total + ex.sets.filter(s => s.completed).reduce((s2, s) => s2 + s.weight * s.reps, 0)
  , 0));

  // Collect new PBs from this session
  const newPBs = [];
  for (const exLog of session.exercises) {
    const exId = exLog.substituted_exercise_id || exLog.exercise_id;
    const ex = EXERCISES_MAP[exId];
    if (!ex) continue;
    const best = Store.getBestLift(exId);
    let sessionBest = null;
    for (const s of exLog.sets) {
      if (!s.completed || s.weight === 0) continue;
      if (!sessionBest || s.weight > sessionBest.weight || (s.weight === sessionBest.weight && s.reps > sessionBest.reps)) {
        sessionBest = s;
      }
    }
    if (sessionBest && best && sessionBest.weight === best.weight && sessionBest.reps === best.reps) {
      newPBs.push({ name: ex.name, weight: sessionBest.weight, reps: sessionBest.reps });
    }
  }

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--summary">
      <div class="summary-hero">
        <div class="summary-hero__icon">🏁</div>
        <div class="summary-hero__title">Workout Complete</div>
        <div class="summary-hero__workout">${esc(workout.name)}</div>
        <div class="summary-hero__date">${fmtDate(session.date)}</div>
      </div>

      <div class="summary-stats">
        ${duration !== null ? `
          <div class="summary-stat">
            <div class="summary-stat__value">${fmtDuration(duration)}</div>
            <div class="summary-stat__label">Duration</div>
          </div>
        ` : ''}
        <div class="summary-stat">
          <div class="summary-stat__value">${totalSets}</div>
          <div class="summary-stat__label">Sets</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat__value">${totalVolume > 0 ? _fmtVolume(totalVolume) : '—'}</div>
          <div class="summary-stat__label">Volume (kg)</div>
        </div>
      </div>

      ${newPBs.length > 0 ? `
        <div class="summary-section">
          <div class="summary-section__title">🏆 New Personal Bests</div>
          <div class="summary-pbs">
            ${newPBs.map(pb => `
              <div class="summary-pb">
                <span class="summary-pb__name">${esc(pb.name)}</span>
                <span class="summary-pb__value">${fmtWeight(pb.weight)}kg × ${pb.reps}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="summary-section">
        <div class="summary-section__title">Exercise Breakdown</div>
        <div class="summary-exercises">
          ${session.exercises.map(exLog => _exerciseSummaryRow(exLog)).join('')}
        </div>
      </div>

      <div class="summary-actions">
        <button class="btn btn--accent btn--lg" id="summary-done-btn">Done</button>
      </div>

      <div class="bottom-spacer"></div>
    </div>
  `;

  document.getElementById('summary-done-btn').addEventListener('click', () => navigate('/'));
}

function _exerciseSummaryRow(exLog) {
  const exId = exLog.substituted_exercise_id || exLog.exercise_id;
  const ex = EXERCISES_MAP[exId];
  if (!ex) return '';

  const completedSets = exLog.sets.filter(s => s.completed);
  if (!completedSets.length) return '';

  const maxWeight = Math.max(...completedSets.map(s => s.weight));

  return `
    <div class="summary-ex">
      <div class="summary-ex__name">${esc(ex.name)}</div>
      <div class="summary-ex__sets">
        ${completedSets.map((s, i) => `
          <span class="summary-ex__set">${fmtWeight(s.weight)}×${s.reps}</span>
        `).join('')}
      </div>
    </div>
  `;
}

function _fmtVolume(v) {
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toString();
}
