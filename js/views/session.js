/**
 * Active Workout Session – the core logging experience.
 * This is the most interaction-heavy screen in IronPlan.
 */

import { Store } from '../store.js';
import { navigate, back } from '../router.js';
import {
  uid, fmtWeight, today, fmtDuration, esc, clamp,
} from '../utils.js';
import {
  EXERCISES_MAP, MUSCLE_LABELS, EQUIPMENT_LABELS, getSubstitutions, checkOverload, suggestWeight,
} from '../data/exercises.js';
import { toast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

let _timerInterval = null;

export function renderSession({ workoutId }) {
  const workout = Store.getWorkout(workoutId);
  if (!workout) { navigate('/'); return; }

  // Resume active session or create a new one
  let session = Store.getState().activeSession;
  if (!session || session.workout_id !== workoutId) {
    session = _buildSession(workout);
    Store.startSession(session);
  }

  _renderSessionUI(workout, session);
}

function _buildSession(workout) {
  const lastLog = Store.getLastLog(workout.id);

  return {
    id: uid(),
    workout_id: workout.id,
    date: today(),
    started_at: new Date().toISOString(),
    completed: false,
    exercises: workout.exercises.map(ei => {
      const prevExLog = lastLog?.exercises.find(e => e.exercise_instance_id === ei.id);
      return {
        exercise_instance_id: ei.id,
        exercise_id: ei.exercise_id,
        substituted_exercise_id: null,
        sets: Array.from({ length: ei.sets }, (_, i) => {
          const prev = prevExLog?.sets[i];
          return {
            set_number: i + 1,
            weight: prev?.weight ?? 0,
            reps: prev?.reps ?? ei.rep_range[0],
            completed: false,
          };
        }),
      };
    }),
  };
}

function _renderSessionUI(workout, session) {
  if (_timerInterval) clearInterval(_timerInterval);

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--session" id="session-page">
      <header class="session-header">
        <button class="btn-icon btn-back" id="session-back-btn" aria-label="Back">‹</button>
        <div class="session-header__info">
          <div class="session-header__name">${esc(workout.name)}</div>
          <div class="session-header__timer" id="session-timer">00:00</div>
        </div>
        <button class="btn btn--green btn--sm" id="finish-btn">Finish ✓</button>
      </header>

      <div class="session-body" id="session-body">
        ${session.exercises.map((exLog, idx) => _exerciseBlock(exLog, workout, idx)).join('')}
      </div>

      <div class="bottom-spacer"></div>
    </div>
  `;

  // Start timer
  const started = new Date(session.started_at);
  function updateTimer() {
    const elapsed = Math.floor((Date.now() - started) / 1000);
    const el = document.getElementById('session-timer');
    if (el) el.textContent = _fmtElapsed(elapsed);
  }
  updateTimer();
  _timerInterval = setInterval(updateTimer, 1000);

  // Back / exit
  document.getElementById('session-back-btn').addEventListener('click', () => {
    if (confirm('Leave this session? Progress is saved and you can resume later.')) {
      clearInterval(_timerInterval);
      navigate('/');
    }
  });

  // Finish
  document.getElementById('finish-btn').addEventListener('click', () => {
    const completed = Store.completeSession();
    clearInterval(_timerInterval);
    toast('Workout complete! Great work.', 'success', 4000);
    navigate('/');
  });

  _bindSessionEvents(workout, session);
}

function _exerciseBlock(exLog, workout, exIdx) {
  const ei = workout.exercises.find(e => e.id === exLog.exercise_instance_id);
  if (!ei) return '';

  const effectiveExId = exLog.substituted_exercise_id || exLog.exercise_id;
  const ex = EXERCISES_MAP[effectiveExId];
  if (!ex) return '';

  const lastLog = Store.getLastExerciseLog(effectiveExId);
  const prevSets = lastLog?.sets.filter(s => s.completed) || [];
  const repRange = ei.rep_range;

  const allDone = exLog.sets.every(s => s.completed);
  const overload = allDone ? checkOverload(exLog.sets, repRange) : null;

  return `
    <div class="ex-block ${allDone ? 'ex-block--done' : ''}" id="ex-block-${exIdx}" data-ex-idx="${exIdx}">
      <div class="ex-block__header">
        <div class="ex-block__num">${exIdx + 1}</div>
        <div class="ex-block__info">
          <div class="ex-block__name">${esc(ex.name)}</div>
          <div class="ex-block__meta">
            <span class="muscle-chip muscle-chip--sm">${MUSCLE_LABELS[ex.primary_muscle] || ex.primary_muscle}</span>
            <span class="ex-block__range">${repRange[0]}–${repRange[1]} reps</span>
            ${exLog.substituted_exercise_id ? '<span class="badge badge--blue">Swapped</span>' : ''}
          </div>
        </div>
        <div class="ex-block__actions">
          <button class="btn btn--ghost btn--xs swap-btn" data-swap-idx="${exIdx}" aria-label="Swap exercise">⇄</button>
          <button class="btn-icon btn-icon--sm info-btn" data-info-id="${effectiveExId}" aria-label="Exercise info">ⓘ</button>
        </div>
      </div>

      ${prevSets.length ? `
        <div class="ex-block__prev">
          <span class="ex-block__prev-label">Last session:</span>
          ${prevSets.map(s => `<span class="prev-set">${fmtWeight(s.weight)}kg×${s.reps}</span>`).join('')}
        </div>
      ` : ''}

      <div class="ex-block__sets" id="sets-${exIdx}">
        <div class="sets-header">
          <span class="sets-col sets-col--num">Set</span>
          <span class="sets-col sets-col--weight">Weight (kg)</span>
          <span class="sets-col sets-col--reps">Reps</span>
          <span class="sets-col sets-col--check"></span>
        </div>
        ${exLog.sets.map((s, sIdx) => _setRow(s, sIdx, exIdx, prevSets[sIdx])).join('')}
      </div>

      ${overload ? `
        <div class="overload-banner">
          <span class="overload-banner__icon">🔥</span>
          <span class="overload-banner__text">
            All sets hit ${repRange[1]} reps! Try
            <strong>${fmtWeight(suggestWeight(overload.topWeight, ex.primary_muscle))}kg</strong>
            next session.
          </span>
        </div>
      ` : ''}

      <div class="ex-block__add-set">
        <button class="btn btn--ghost btn--xs add-set-btn" data-add-set-idx="${exIdx}">+ Add Set</button>
      </div>
    </div>
  `;
}

function _setRow(s, sIdx, exIdx, prevSet) {
  const done = s.completed;
  return `
    <div class="set-row ${done ? 'set-row--done' : ''}" id="set-row-${exIdx}-${sIdx}">
      <span class="sets-col sets-col--num set-num">${sIdx + 1}</span>
      <div class="sets-col sets-col--weight">
        <div class="stepper">
          <button class="stepper__btn stepper__btn--dec" data-stepper-dec data-ex="${exIdx}" data-set="${sIdx}" data-field="weight">−</button>
          <input
            type="number"
            class="stepper__input"
            value="${s.weight}"
            min="0"
            max="500"
            step="2.5"
            data-weight-input
            data-ex="${exIdx}"
            data-set="${sIdx}"
          />
          <button class="stepper__btn stepper__btn--inc" data-stepper-inc data-ex="${exIdx}" data-set="${sIdx}" data-field="weight">+</button>
        </div>
      </div>
      <div class="sets-col sets-col--reps">
        <div class="stepper">
          <button class="stepper__btn stepper__btn--dec" data-stepper-dec data-ex="${exIdx}" data-set="${sIdx}" data-field="reps">−</button>
          <input
            type="number"
            class="stepper__input"
            value="${s.reps}"
            min="1"
            max="100"
            step="1"
            data-reps-input
            data-ex="${exIdx}"
            data-set="${sIdx}"
          />
          <button class="stepper__btn stepper__btn--inc" data-stepper-inc data-ex="${exIdx}" data-set="${sIdx}" data-field="reps">+</button>
        </div>
      </div>
      <div class="sets-col sets-col--check">
        <button
          class="check-btn ${done ? 'check-btn--done' : ''}"
          data-complete-set
          data-ex="${exIdx}"
          data-set="${sIdx}"
          aria-label="${done ? 'Undo set' : 'Complete set'}"
        >${done ? '✓' : '○'}</button>
      </div>
    </div>
  `;
}

function _bindSessionEvents(workout, session) {
  const body = document.getElementById('session-body');
  if (!session) return;

  // Delegate all events from session body
  body.addEventListener('click', e => {
    // Complete / undo set
    const completeBtn = e.target.closest('[data-complete-set]');
    if (completeBtn) {
      const exIdx = parseInt(completeBtn.dataset.ex);
      const sIdx = parseInt(completeBtn.dataset.set);
      _toggleSet(workout, session, exIdx, sIdx);
      return;
    }

    // Stepper dec/inc
    const stepDec = e.target.closest('[data-stepper-dec]');
    const stepInc = e.target.closest('[data-stepper-inc]');
    if (stepDec || stepInc) {
      const btn = stepDec || stepInc;
      const exIdx = parseInt(btn.dataset.ex);
      const sIdx = parseInt(btn.dataset.set);
      const field = btn.dataset.field;
      const delta = stepDec ? -1 : 1;
      _stepField(session, exIdx, sIdx, field, delta);
      return;
    }

    // Swap exercise
    const swapBtn = e.target.closest('[data-swap-idx]');
    if (swapBtn) {
      const exIdx = parseInt(swapBtn.dataset.swapIdx);
      _openSubstitutionModal(workout, session, exIdx);
      return;
    }

    // Exercise info
    const infoBtn = e.target.closest('[data-info-id]');
    if (infoBtn) {
      navigate(`/exercises/${infoBtn.dataset.infoId}`);
      return;
    }

    // Add extra set
    const addSetBtn = e.target.closest('[data-add-set-idx]');
    if (addSetBtn) {
      const exIdx = parseInt(addSetBtn.dataset.addSetIdx);
      _addSet(workout, session, exIdx);
      return;
    }
  });

  // Weight / reps direct input changes (delegated)
  body.addEventListener('change', e => {
    const weightInput = e.target.closest('[data-weight-input]');
    const repsInput = e.target.closest('[data-reps-input]');
    if (weightInput) {
      const exIdx = parseInt(weightInput.dataset.ex);
      const sIdx = parseInt(weightInput.dataset.set);
      const val = parseFloat(weightInput.value) || 0;
      session.exercises[exIdx].sets[sIdx].weight = Math.max(0, val);
      weightInput.value = session.exercises[exIdx].sets[sIdx].weight;
      Store.updateSession(session);
    }
    if (repsInput) {
      const exIdx = parseInt(repsInput.dataset.ex);
      const sIdx = parseInt(repsInput.dataset.set);
      const val = parseInt(repsInput.value) || 1;
      session.exercises[exIdx].sets[sIdx].reps = Math.max(1, val);
      repsInput.value = session.exercises[exIdx].sets[sIdx].reps;
      Store.updateSession(session);
    }
  });
}

function _toggleSet(workout, session, exIdx, sIdx) {
  const set = session.exercises[exIdx].sets[sIdx];
  set.completed = !set.completed;
  Store.updateSession(session);

  // Update set row in-place
  const row = document.getElementById(`set-row-${exIdx}-${sIdx}`);
  if (row) {
    const btn = row.querySelector('[data-complete-set]');
    if (btn) {
      btn.textContent = set.completed ? '✓' : '○';
      btn.classList.toggle('check-btn--done', set.completed);
    }
    row.classList.toggle('set-row--done', set.completed);
  }

  // Recheck overload banner and block done state
  _refreshExBlock(workout, session, exIdx);

  if (set.completed) {
    // Vibrate for haptic feedback on mobile
    if (navigator.vibrate) navigator.vibrate(30);
  }
}

function _stepField(session, exIdx, sIdx, field, delta) {
  const set = session.exercises[exIdx].sets[sIdx];
  if (field === 'weight') {
    set.weight = Math.max(0, Math.round((set.weight + delta * 2.5) * 10) / 10);
    const input = document.querySelector(`[data-weight-input][data-ex="${exIdx}"][data-set="${sIdx}"]`);
    if (input) input.value = set.weight;
  } else {
    set.reps = Math.max(1, set.reps + delta);
    const input = document.querySelector(`[data-reps-input][data-ex="${exIdx}"][data-set="${sIdx}"]`);
    if (input) input.value = set.reps;
  }
  Store.updateSession(session);
}

function _addSet(workout, session, exIdx) {
  const exLog = session.exercises[exIdx];
  const lastSet = exLog.sets[exLog.sets.length - 1];
  exLog.sets.push({
    set_number: exLog.sets.length + 1,
    weight: lastSet?.weight ?? 0,
    reps: lastSet?.reps ?? 8,
    completed: false,
  });
  Store.updateSession(session);

  // Re-render just this block's sets
  _refreshExBlock(workout, session, exIdx);
}

function _refreshExBlock(workout, session, exIdx) {
  const exLog = session.exercises[exIdx];
  const ei = workout.exercises.find(e => e.id === exLog.exercise_instance_id);
  if (!ei) return;

  const effectiveExId = exLog.substituted_exercise_id || exLog.exercise_id;
  const ex = EXERCISES_MAP[effectiveExId];
  if (!ex) return;

  // Update block done state
  const block = document.getElementById(`ex-block-${exIdx}`);
  if (!block) return;
  const allDone = exLog.sets.every(s => s.completed);
  block.classList.toggle('ex-block--done', allDone);

  // Update sets
  const setsContainer = document.getElementById(`sets-${exIdx}`);
  if (setsContainer) {
    const lastLog = Store.getLastExerciseLog(effectiveExId);
    const prevSets = lastLog?.sets.filter(s => s.completed) || [];
    const headerHTML = `
      <div class="sets-header">
        <span class="sets-col sets-col--num">Set</span>
        <span class="sets-col sets-col--weight">Weight (kg)</span>
        <span class="sets-col sets-col--reps">Reps</span>
        <span class="sets-col sets-col--check"></span>
      </div>
    `;
    setsContainer.innerHTML = headerHTML +
      exLog.sets.map((s, sIdx) => _setRow(s, sIdx, exIdx, prevSets[sIdx])).join('');
  }

  // Update overload banner
  const overload = allDone ? checkOverload(exLog.sets, ei.rep_range) : null;
  let banner = block.querySelector('.overload-banner');
  if (overload && !banner) {
    const suggested = fmtWeight(suggestWeight(overload.topWeight, ex.primary_muscle));
    const addSetBtn = block.querySelector('.ex-block__add-set');
    const newBanner = document.createElement('div');
    newBanner.className = 'overload-banner';
    newBanner.innerHTML = `
      <span class="overload-banner__icon">🔥</span>
      <span class="overload-banner__text">
        All sets hit ${ei.rep_range[1]} reps! Try <strong>${suggested}kg</strong> next session.
      </span>
    `;
    block.insertBefore(newBanner, addSetBtn);
  } else if (!overload && banner) {
    banner.remove();
  }
}

function _openSubstitutionModal(workout, session, exIdx) {
  const exLog = session.exercises[exIdx];
  const currentExId = exLog.substituted_exercise_id || exLog.exercise_id;
  const currentEx = EXERCISES_MAP[currentExId];
  if (!currentEx) return;

  const subs = getSubstitutions(currentExId);

  const body = `
    <div class="sub-modal">
      <p class="sub-modal__replacing">
        Replacing: <strong>${esc(currentEx.name)}</strong>
      </p>
      ${subs.length === 0
        ? `<p class="sub-modal__empty">No substitutions found for this exercise.</p>`
        : `<div class="sub-list">
             ${subs.map(ex => `
               <button class="sub-item" data-sub-id="${ex.id}">
                 <div class="sub-item__main">
                   <div class="sub-item__name">${esc(ex.name)}</div>
                   <div class="sub-item__meta">
                     <span class="muscle-chip muscle-chip--sm">${MUSCLE_LABELS[ex.primary_muscle] || ex.primary_muscle}</span>
                     <span class="equip-label">${EQUIPMENT_LABELS[ex.equipment] || ex.equipment}</span>
                   </div>
                 </div>
                 <span class="sub-item__arrow">›</span>
               </button>
             `).join('')}
           </div>`
      }
    </div>
  `;

  openModal({
    title: 'Swap Exercise',
    body,
    classes: 'modal--sub',
  });

  document.querySelectorAll('[data-sub-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const newExId = btn.dataset.subId;
      const newEx = EXERCISES_MAP[newExId];
      if (!newEx) return;

      // Update session
      exLog.substituted_exercise_id = newExId;

      // Reset sets with new defaults
      const ei = workout.exercises.find(e => e.id === exLog.exercise_instance_id);
      const lastLog = Store.getLastExerciseLog(newExId);
      exLog.sets = exLog.sets.map((s, i) => ({
        ...s,
        weight: lastLog?.sets[i]?.weight ?? s.weight,
        reps: lastLog?.sets[i]?.reps ?? (ei?.rep_range[0] ?? s.reps),
        completed: false,
      }));

      Store.updateSession(session);
      closeModal();
      toast(`Swapped to ${newEx.name}`, 'success');

      // Re-render the block
      const block = document.getElementById(`ex-block-${exIdx}`);
      if (block) {
        block.outerHTML = _exerciseBlock(exLog, workout, exIdx);
      }
    });
  });
}

function _fmtElapsed(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
