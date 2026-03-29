import { Store } from '../store.js';
import { navigate, back } from '../router.js';
import { esc, fmtWeight } from '../utils.js';
import { EXERCISES_MAP, MUSCLE_LABELS, getNextWeight } from '../data/exercises.js?v=5';

export function renderPlan({ id }) {
  const workout = Store.getWorkout(id);
  if (!workout) { navigate('/workouts'); return; }

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--plan">
      <header class="page-header page-header--back">
        <button class="btn-icon btn-back" id="back-btn" aria-label="Back">‹</button>
        <div class="page-header__title">Next Session</div>
        <button class="btn btn--accent btn--sm" id="plan-start-btn">Start ▶</button>
      </header>

      <div class="plan-workout-name">${esc(workout.name)}</div>

      <div class="plan-list">
        ${workout.exercises.map((ei, idx) => _planRow(ei, idx)).join('')}
      </div>

      <div class="bottom-spacer"></div>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => back());
  document.getElementById('plan-start-btn').addEventListener('click', () => navigate(`/session/${id}`));
}

function _planRow(ei, idx) {
  const ex = EXERCISES_MAP[ei.exercise_id];
  if (!ex) return '';

  const lastLog = Store.getLastExerciseLog(ei.exercise_id);
  const prevSets = lastLog?.sets.filter(s => s.completed) || [];
  const bestLift = Store.getBestLift(ei.exercise_id);
  const nextWeight = getNextWeight(prevSets, ei.rep_range, ex.primary_muscle);
  const flag = Store.getProgressFlag(ei.exercise_id);
  const plateau = Store.getPlateauSuggestion(ei.exercise_id);
  const note = Store.getNote(ei.exercise_id);

  const flagDot = flag
    ? `<span class="progress-dot progress-dot--${flag}"></span>`
    : '';

  return `
    <div class="plan-ex">
      <div class="plan-ex__header">
        <div class="plan-ex__num">${idx + 1}</div>
        <div class="plan-ex__info">
          <div class="plan-ex__name">${flagDot}${esc(ex.name)}</div>
          <div class="plan-ex__meta">
            <span class="muscle-chip muscle-chip--sm">${MUSCLE_LABELS[ex.primary_muscle] || ex.primary_muscle}</span>
            <span class="plan-ex__sets-label">${ei.sets}×${ei.rep_range[0]}–${ei.rep_range[1]}</span>
          </div>
        </div>
      </div>

      <div class="plan-ex__stats">
        ${nextWeight !== null ? `
          <div class="plan-stat plan-stat--next">
            <div class="plan-stat__label">Target</div>
            <div class="plan-stat__value">${fmtWeight(nextWeight)}kg</div>
          </div>
        ` : ''}
        ${bestLift ? `
          <div class="plan-stat plan-stat--pb">
            <div class="plan-stat__label">Best</div>
            <div class="plan-stat__value">${fmtWeight(bestLift.weight)}kg×${bestLift.reps}</div>
          </div>
        ` : ''}
        ${prevSets.length ? `
          <div class="plan-stat plan-stat--last">
            <div class="plan-stat__label">Last</div>
            <div class="plan-stat__value">${prevSets.slice(0, 3).map(s => `${fmtWeight(s.weight)}×${s.reps}`).join(' · ')}</div>
          </div>
        ` : `
          <div class="plan-stat plan-stat--new">
            <div class="plan-stat__label">New exercise</div>
          </div>
        `}
      </div>

      ${plateau ? `<div class="plan-ex__plateau"><span class="plan-ex__plateau-icon">⚠</span> ${esc(plateau)}</div>` : ''}
      ${note ? `<div class="plan-ex__note">"${esc(note)}"</div>` : ''}
    </div>
  `;
}
